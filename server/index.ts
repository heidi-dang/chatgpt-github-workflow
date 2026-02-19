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
    console.log(`${new Date().toISOString()} [${req.method}] ${req.path} (Session: ${sessionId})`);

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
        console.error("GitHub fetch error:", error);
        throw new McpError(ErrorCode.InternalError, `GitHub error: ${String(error?.message || error)}`);
    }
}

const server = new Server(
    { name: "workflow-monitor", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log("Handling ListToolsRequest...");
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
    console.log(`Tool call: ${name} for ${repo} (PR: ${pr})`);
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

server.connect(transport).catch(error => {
    console.error("Failed to connect transport:", error);
});

import sanitizeJsonRpcPayload from "./src/server/jsonrpc_sanitize.js";

app.all("/mcp", async (req, res) => {
    try {
        // The transport returns a Response-like object or handles streaming directly.
        // Monkeypatch res.write/res.end for this request to capture JSON bodies written
        // directly by the transport, without buffering event-stream responses.
        const origWrite = (res as any).write?.bind(res);
        const origEnd = (res as any).end?.bind(res);
        const origJson = (res as any).json?.bind(res);

        let chunks: Buffer[] = [];
        // We'll decide whether to buffer on the first write chunk. Treat the
        // client as SSE-only only when Accept includes text/event-stream but
        // does NOT also include application/json. This allows clients that
        // accept both to still receive buffered JSON and be sanitized.
        const acceptHeader = String(req.headers['accept'] || '');
        const sseAccepted = acceptHeader.includes('text/event-stream') && !acceptHeader.includes('application/json');
        let decided = false;
        let buffering = false;
        const decideBufferingFromChunk = (chunkBuf: Buffer) => {
            // If client/server negotiate event-stream, do not buffer
            if (sseAccepted) return false;
            const ct = String(res.getHeader?.('content-type') || '') || '';
            if (ct.includes('text/event-stream')) return false;
            if (ct.includes('application/json')) return true;
            const s = chunkBuf.toString('utf8');
            const first = s.trimStart().slice(0,1);
            if (first === '{' || first === '[') return true;
            return false;
        };

        if (origWrite && origEnd) {
            (res as any).write = function (chunk: any, encoding?: any, cb?: any) {
                try {
                    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding || 'utf8');
                    if (!decided) {
                        decided = true;
                        buffering = decideBufferingFromChunk(buf);
                    }
                    if (buffering) {
                        chunks.push(buf);
                        if (typeof cb === 'function') cb();
                        return true;
                    }
                    return origWrite(chunk, encoding, cb);
                } catch (e) {
                    return origWrite(chunk, encoding, cb);
                }
            } as any;

            (res as any).end = function (chunk: any, encoding?: any, cb?: any) {
                try {
                    if (chunk) {
                        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding || 'utf8');
                        if (!decided) {
                            decided = true;
                            buffering = decideBufferingFromChunk(buf);
                        }
                        if (buffering) chunks.push(buf);
                        else return origEnd(chunk, encoding, cb);
                    }

                    if (!buffering) return origEnd(chunk, encoding, cb);

                    const bodyBuf = Buffer.concat(chunks);
                    const bodyStr = bodyBuf.toString('utf8');
                    try {
                        const parsed = JSON.parse(bodyStr);
                        // detect whether we'll strip empty content
                        const hadEmptyContent = !!(parsed && parsed.result && parsed.result.__schema === 'v2-object-result' && Array.isArray(parsed.result.content) && parsed.result.content.length === 0);
                        const sanitized = sanitizeJsonRpcPayload(parsed);
                        const out = JSON.stringify(sanitized);
                        // set content-length to new value
                        try { res.setHeader('content-length', Buffer.byteLength(out).toString()); } catch {}
                        // ensure content-type
                        if (!String(res.getHeader('content-type') || '').includes('application/json')) {
                            try { res.setHeader('content-type', 'application/json'); } catch {}
                        }
                        if (hadEmptyContent) console.log('[mcp] sanitized v2-object-result: stripped empty content');
                        return origEnd(out, 'utf8', cb);
                    } catch (e) {
                        // parse failed — send original body
                        return origEnd(bodyBuf, 'utf8', cb);
                    }
                } catch (e) {
                    return origEnd(chunk, encoding, cb);
                }
            } as any;
        }

        // Also override res.json to sanitize objects passed directly to it
        if (origJson) {
            (res as any).json = function (body: any) {
                try {
                    const beforeHadEmpty = !!(body && body.result && body.result.__schema === 'v2-object-result' && Array.isArray(body.result.content) && body.result.content.length === 0);
                    const sanitized = sanitizeJsonRpcPayload(body);
                    if (beforeHadEmpty) console.log('[mcp] sanitized v2-object-result: stripped empty content');
                    return origJson(sanitized);
                } catch (err) {
                    return origJson(body);
                }
            } as any;
        }

        // Call into transport. It may either return a Response-like object or write
        // directly to `res`.
        const result: any = await (transport as any).handleRequest(req, res, req.body);

        // If the transport returned a Response (Web standard) with JSON body, extract and sanitize
        if (result && typeof result === 'object' && typeof result.text === 'function') {
            try {
                const raw = await result.text();
                const parsed = JSON.parse(raw);
                const hadEmptyContent = !!(parsed && parsed.result && parsed.result.__schema === 'v2-object-result' && Array.isArray(parsed.result.content) && parsed.result.content.length === 0);
                const sanitized = sanitizeJsonRpcPayload(parsed);
                if (hadEmptyContent) console.log('[mcp] sanitized v2-object-result: stripped empty content');
                // mirror headers/status from transport result
                const headers: Record<string,string> = {};
                const mcpHeader = result.headers && typeof result.headers.get === 'function' ? result.headers.get('mcp-session-id') : undefined;
                if (mcpHeader) headers['mcp-session-id'] = mcpHeader;
                // restore original res.json/end/write before using express responder
                if (origJson) (res as any).json = origJson;
                if (origWrite) (res as any).write = origWrite;
                if (origEnd) (res as any).end = origEnd;
                res.set(headers).status(result.status || 200).json(sanitized);
                return;
            } catch (e) {
                // fallthrough to letting transport handle streaming response
            }
        }

        // restore originals now that transport has either written or will write
        if (origJson) (res as any).json = origJson;
        if (origWrite) (res as any).write = origWrite;
        if (origEnd) (res as any).end = origEnd;
        return;
    } catch (error) {
        console.error("MCP Request Error:", error);
        if (!res.headersSent) res.status(500).json({ error: "Internal MCP error" });
    }
});

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, "../dist")));
app.use("/ui", express.static(path.join(__dirname, "../dist")));

const PORT = 3001;
const listener = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});
