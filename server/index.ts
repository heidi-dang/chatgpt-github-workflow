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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

const SAMPLE_SNAPSHOT = {
    repo: "octocat/Hello-World",
    focused_pr: 1347,
    board_groups: {
        open: [
            {
                pr: 1347,
                title: "Amazing new feature",
                head: "feat-amazing",
                base: "main",
                ci_state: "success",
                short_sha: "a1b2c3d",
                updated_rel: "2 hours ago",
                pr_url: "https://github.com/octocat/Hello-World/pull/1347"
            }
        ],
        in_review: [],
        changes_req: [],
        ci_failing: [],
        mergeable: [
            {
                pr: 1348,
                title: "Fix bug in calculation",
                head: "fix-bug",
                base: "main",
                ci_state: "success",
                short_sha: "e5f6g7h",
                updated_rel: "1 day ago",
                pr_url: "https://github.com/octocat/Hello-World/pull/1348"
            }
        ]
    },
    commits: {
        count: 2,
        items: [
            {
                sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
                short_sha: "a1b2c3d",
                title: "Add amazing feature",
                author: "octocat",
                time_rel: "2 hours ago",
                ci_state: "success",
                commit_url: "https://github.com/octocat/Hello-World/commit/a1b2c3d"
            },
            {
                sha: "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0",
                short_sha: "z9y8x7w",
                title: "Initial commit",
                author: "octocat",
                time_rel: "1 day ago",
                ci_state: "success",
                commit_url: "https://github.com/octocat/Hello-World/commit/z9y8x7w"
            }
        ]
    },
    checks_rollup: {
        passed: 12,
        failed: 1,
        running: 2,
        top_failing: [
            {
                name: "Linting / checks",
                url: "https://github.com/octocat/Hello-World/actions/runs/1"
            }
        ],
        pr_url: "https://github.com/octocat/Hello-World/pull/1347"
    },
    last_updated_iso: new Date().toISOString()
};

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

    if (name === "render_workflow_monitor") {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(SAMPLE_SNAPSHOT),
                },
            ],
            _meta: {
                ui: {
                    resourceUri: `http://localhost:3001/ui/index.html`,
                }
            }
        };
    } else if (name === "get_dashboard_state") {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(SAMPLE_SNAPSHOT),
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
