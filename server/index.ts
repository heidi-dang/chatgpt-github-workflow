import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { GitHubClient, MissingGitHubTokenError, InvalidGitHubTokenError } from "./github.js";
import { SnapshotCache } from "./cache.js";
import { fastLog, logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["*", "mcp-session-id", "mcp-protocol-version", "content-type", "accept"],
    exposedHeaders: ["mcp-session-id"]
}));

app.use((req, res, next) => {
    const sessionId = req.headers["mcp-session-id"] || req.query.sessionId || "none";
    fastLog(`${new Date().toISOString()} [${req.method}] ${req.path} (Session: ${sessionId})`);

    res.setHeader("Access-Control-Allow-Private-Network", "true");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src *;");

    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

app.use(express.json());

const CACHE_TTL_MS = process.env.CACHE_TTL_MS ? Number(process.env.CACHE_TTL_MS) : 30000;
const cache = new SnapshotCache(CACHE_TTL_MS, 100);

// Default repo used when callers omit the repo parameter. Keeps tool robust for
// manual curl calls and other clients that may not supply arguments.
const DEFAULT_REPO = 'heidi-dang/heidi-kernel';

async function getSnapshot(repoStr: string, prNumber?: number, options?: { refresh?: boolean }) {
    const refresh = options?.refresh === true;
    const cached = refresh ? undefined : cache.get(repoStr, prNumber);
    if (cached) {
        // Return a shallow copy so callers can inspect cache metadata without mutating the cached entry
        return { ...(cached as any), cache: "hit", __schema: "v2-object-result" } as any;
    }
    const [owner, name] = repoStr.split("/");
    if (!owner || !name) throw new McpError(ErrorCode.InvalidParams, "Repo must be in owner/repo format");

    try {
        const token = process.env.GITHUB_TOKEN;
        let github: GitHubClient;
        try {
            github = new GitHubClient(token);
        } catch (e: any) {
            if (e instanceof MissingGitHubTokenError) {
                throw new McpError(-32010, "Missing GITHUB_TOKEN environment variable. Create a fine-grained PAT and set GITHUB_TOKEN before calling GitHub-backed tools.");
            }
            throw e;
        }

        const snapshot = await github.fetchSnapshot(owner, name, prNumber);
        // Stamp schema version for runtime verification and cache diagnostics
        (snapshot as any).__schema = "v2-object-result";
        (snapshot as any).cache = refresh ? "bypass" : "miss";
        cache.set(repoStr, prNumber, snapshot);
        return snapshot;
    } catch (error: any) {
        if (error instanceof InvalidGitHubTokenError) {
            throw new McpError(-32011, `Invalid GITHUB_TOKEN: ${String(error.message || error)}`);
        }
        if (error instanceof McpError) throw error;
        logger.error("GitHub fetch error:", error);
        throw new McpError(ErrorCode.InternalError, `GitHub error: ${String(error?.message || error)}`);
    }
}

const server = new Server(
    { name: "workflow-monitor", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.info("Handling ListToolsRequest...");
    return {
        tools: [
            {
                name: "render_workflow_monitor",
                description: "Return widget meta and initial snapshot for repo/pr.",
                inputSchema: {
                    type: "object",
                    properties: { repo: { type: "string" }, pr: { type: "number" } },
                    required: ["repo"]
                }
            },
            {
                name: "get_dashboard_state",
                description: "Return snapshot JSON only for refresh.",
                inputSchema: {
                    type: "object",
                    properties: { repo: { type: "string" }, pr: { type: "number" } },
                    required: ["repo"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // Make repo default to DEFAULT_REPO when missing and normalize. Fail-closed
    // if the repo doesn't look like owner/name.
    const repoRaw = (args?.repo ?? DEFAULT_REPO) as string;
    const repo = String(repoRaw || '').trim();
    const pr = args?.pr as number | undefined;
    logger.info(`Tool call: ${name} for ${repo} (PR: ${pr})`);
    try {
        if (name === "get_dashboard_state") {
            // Tool-level mapping: support refresh flag and return structured JSON result
            try {
                const parts = repo.split('/');
                const owner = parts[0];
                const repoName = parts[1];
                if (!owner || !repoName) throw new McpError(ErrorCode.InvalidParams, 'Repo must be in owner/repo format');
                const refresh = !!args?.refresh || false;
                const snapshot = await getSnapshot(repo, pr, { refresh });
                // Minimal: return the snapshot object directly as the tool result (SDK will wrap it)
                return snapshot as any;
            } catch (e: any) {
                if (e?.name === "MissingGitHubTokenError" || String(e?.message).includes("Missing GITHUB_TOKEN")) {
                    throw new McpError(-32010, "Missing GITHUB_TOKEN. Set it (fine-grained PAT recommended) and restart the server.");
                }
                if (e?.name === "InvalidGitHubTokenError" || /401|Bad credentials/i.test(String(e?.message))) {
                    throw new McpError(-32011, "Invalid GITHUB_TOKEN (GitHub 401 Bad credentials). Regenerate token and restart.");
                }
                throw e instanceof McpError ? e : new McpError(-32603, String(e?.message || e));
            }
        }

        // Fallback for other tools using shared getSnapshot
        const snapshot = await getSnapshot(repo, pr);
        if (name === "render_workflow_monitor") {
            return {
                content: [],
                structuredContent: snapshot,
                _meta: { ui: { resourceUri: `http://localhost:3001/index.html` } }
            };
        }
        return { content: [], structuredContent: snapshot };
    } catch (e: any) {
        if (e instanceof McpError) throw e;
        throw new McpError(-32603, String(e?.message || e));
    }
});

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
});

import sanitizeJsonRpcPayload from "./src/server/jsonrpc_sanitize.js";

// Pre-transport sanitizer: mutate outgoing JSON-RPC messages before any serialization/streaming.
{
    const t: any = transport as any;
    const origSend = typeof t.send === "function" ? t.send.bind(transport) : null;

    if (origSend) {
        t.send = async (message: any, opts?: any) => {
            try {
                sanitizeJsonRpcPayload(message);
            } catch {
                // Best-effort: never break outbound messages due to sanitizer issues.
            }
            return origSend(message, opts);
        };
    }
}

server.connect(transport).catch(error => {
    logger.error("Failed to connect transport:", error);
});

app.all("/mcp", async (req, res) => {
    try {
        // Let the transport handle streaming responses. If it returns a Response-like
        // object with a text() body, sanitize that JSON before sending.
        const result: any = await (transport as any).handleRequest(req, res, req.body);
        if (result && typeof result === 'object' && typeof result.text === 'function') {
            try {
                const raw = await result.text();
                const parsed = JSON.parse(raw);
                sanitizeJsonRpcPayload(parsed);
                // mirror headers/status from transport result
                const mcpHeader = result.headers && typeof result.headers.get === 'function' ? result.headers.get('mcp-session-id') : undefined;
                if (mcpHeader) res.setHeader('mcp-session-id', mcpHeader);
                res.status(result.status || 200).setHeader('content-type', 'application/json').send(JSON.stringify(parsed));
                return;
            } catch (e) {
                // fallthrough to letting transport handle streaming directly
            }
        }
        return;
    } catch (error) {
        logger.error("MCP Request Error:", error);
        if (!res.headersSent) res.status(500).json({ error: "Internal MCP error" });
    }
});

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, "../dist")));
app.use("/ui", express.static(path.join(__dirname, "../dist")));

const PORT = 3001;
const listener = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server listening on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at promise", { promise, reason });
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
});
