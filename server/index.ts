import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { GitHubClient } from "./github.js";
import { SnapshotCache } from "./cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    console.warn("WARNING: GITHUB_TOKEN not set in environment.");
}

const github = new GitHubClient(GITHUB_TOKEN || "");
const cache = new SnapshotCache(15, 100);

const server = new Server(
    {
        name: "workflow-monitor",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

async function getSnapshot(repoStr: string, prNumber?: number) {
    const cached = cache.get(repoStr, prNumber);
    if (cached) return cached;

    const [owner, name] = repoStr.split("/");
    if (!owner || !name) {
        throw new McpError(ErrorCode.InvalidParams, "Repo must be in owner/repo format");
    }

    try {
        const snapshot = await github.fetchSnapshot(owner, name, prNumber);
        cache.set(repoStr, prNumber, snapshot);
        return snapshot;
    } catch (error: any) {
        if (error.status === 403 || error.status === 429) {
            // Simple rate limit handling as prescribed
            throw new McpError(ErrorCode.InternalError, `GitHub rate limited. Retry later.`);
        }
        throw new McpError(ErrorCode.InternalError, `GitHub error: ${error.message}`);
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "render_workflow_monitor",
                description: "Return widget meta and initial snapshot for repo/pr.",
                inputSchema: {
                    type: "object",
                    properties: {
                        repo: { type: "string", description: "GitHub repository (owner/repo)" },
                        pr: { type: "number", description: "Optional Pull Request number" }
                    },
                    required: ["repo"]
                }
            },
            {
                name: "get_dashboard_state",
                description: "Return snapshot JSON only for refresh.",
                inputSchema: {
                    type: "object",
                    properties: {
                        repo: { type: "string", description: "GitHub repository (owner/repo)" },
                        pr: { type: "number", description: "Optional Pull Request number" }
                    },
                    required: ["repo"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const repo = args?.repo as string;
    const pr = args?.pr as number | undefined;

    if (name === "render_workflow_monitor") {
        const snapshot = await getSnapshot(repo, pr);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(snapshot),
                },
            ],
            _meta: {
                ui: {
                    resourceUri: `http://localhost:3001/ui/index.html`,
                }
            }
        };
    } else if (name === "get_dashboard_state") {
        const snapshot = await getSnapshot(repo, pr);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(snapshot),
                }
            ]
        };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
});

let transport: SSEServerTransport | null = null;

app.get("/mcp", async (req, res) => {
    transport = new SSEServerTransport("/mcp/message", res);
    await server.connect(transport);
});

app.post("/mcp/message", async (req, res) => {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(404).send("No active session");
    }
});

// Serve static files from the build directory (dist in root)
app.use("/ui", express.static(path.join(__dirname, "../dist")));

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`UI served at: http://localhost:${PORT}/ui/index.html`);
});
