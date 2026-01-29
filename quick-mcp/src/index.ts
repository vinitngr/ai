import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

import { zodToJsonSchema } from "zod-to-json-schema";
import { build as esbuild } from "esbuild";
import path from "node:path";
import http from "node:http";

export type ToolDefinition = {
  schema: any;
  run: (args: any) => any | Promise<any>;
  description?: string;
};

export type TransportConfig =
  | { type: "stdio" }
  | {
      type: "http";
      port: number;
      host?: string;
      cors?: boolean;
      apiKey?: string;
    };

export type RunConfig = {
  name: string;
  version?: string;
  tools: Record<string, ToolDefinition>;
  transport?: TransportConfig;
  banner?: boolean;
  jsonIndent?: number;
};

function printBanner({
  name,
  version,
  transport
}: {
  name: string;
  version: string;
  transport: TransportConfig;
}) {
  const transportLine =
    transport.type === "stdio"
      ? "stdio"
      : `http://${transport.host ?? "localhost"}:${transport.port}`;

  console.error(`
╔══════════════════════════════════════╗
║        QUICK-MCP SERVER UP           ║
║                                      ║
║  Name: ${name}
║  Version: ${version}
║  Transport: ${transportLine}
║  Status: ${transport.type === "http" ? "listening" : "waiting for requests…"}
╚══════════════════════════════════════╝
`);
}

function startHttpServer(
  tools: Record<string, ToolDefinition>,
  {
    port,
    host = "localhost",
    cors = false,
    apiKey
  }: Extract<TransportConfig, { type: "http" }>
) {
  const server = http.createServer((req, res) => {
    if (cors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
    }

    if (req.method !== "POST") {
      res.writeHead(405);
      return res.end("POST only");
    }

    if (apiKey) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${apiKey}`) {
        res.writeHead(401);
        return res.end("Unauthorized");
      }
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { tool, args } = JSON.parse(body);
        const toolDef = tools[tool];

        if (!toolDef) {
          res.writeHead(404);
          return res.end(`Unknown tool: ${tool}`);
        }

        const parsed = toolDef.schema.safeParse(args);
        if (!parsed.success) {
          res.writeHead(400);
          return res.end(parsed.error.message);
        }

        const result = await toolDef.run(parsed.data);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            content: [
              {
                type: "text",
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result)
              }
            ]
          })
        );
      } catch (e: any) {
        res.writeHead(500);
        res.end(e.message);
      }
    });
  });

  server.listen(port, host);
}

async function run({
  name,
  version = "1.0.0",
  tools,
  transport = { type: "stdio" },
  banner = true,
  jsonIndent
}: RunConfig) {
  if (!name) throw new Error("MCP server name required");
  if (!tools || Object.keys(tools).length === 0) {
    throw new Error("At least one tool is required");
  }

  const server = new Server(
    { name, version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.entries(tools).map(([toolName, tool]) => ({
      name: toolName,
      description: tool.description ?? "",
      inputSchema: zodToJsonSchema(tool.schema)
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools[req.params.name];
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);

    const parsed = tool.schema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) throw new Error(parsed.error.message);

    const result = await tool.run(parsed.data);

    return {
      content: [
        {
          type: "text",
          text:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, jsonIndent)
        }
      ]
    };
  });

  if (banner) {
    printBanner({ name, version, transport });
  }

  if (transport.type === "stdio") {
    await server.connect(new StdioServerTransport());
    return;
  }

  if (transport.type === "http") {
    startHttpServer(tools, transport);
    return;
  }
}

type BuildConfig = {
  entry: string;
  outfile?: string;
};

async function build({
  entry,
  outfile = "bundle.mcp.js"
}: BuildConfig) {
  if (!entry) throw new Error("entry file required");

  await esbuild({
    entryPoints: [path.resolve(entry)],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    sourcemap: false,
    minify: false,
    external: ["esbuild"]
  });

  console.log(`✔ MCP bundle created → ${outfile}`);
}

export const mcp = {
  run,
  build
};
