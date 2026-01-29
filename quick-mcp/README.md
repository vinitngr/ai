# quick-mcp

Minimal MCP server builder. Define tools with Zod, get stdio or HTTP transport.

## Install

```bash
npm install @vinitngr/quick-mcp zod
```

## Usage

```javascript
import { z } from "zod";
import { mcp } from "@vinitngr/quick-mcp";

mcp.run({
  name: "my-server",
  tools: {
    add: {
      description: "Add two numbers",
      schema: z.object({ a: z.number(), b: z.number() }),
      run: ({ a, b }) => a + b
    }
  }
});
```

## Transports

**stdio** (default) - for Claude Desktop, Cursor, etc:
```javascript
mcp.run({ name: "my-server", tools: {...} });
```

**HTTP** - for web clients:
```javascript
mcp.run({
  name: "my-server",
  transport: {
    type: "http",
    port: 4000,
    cors: true,
    apiKey: "secret"  // optional
  },
  tools: {...}
});
```

## How it works

```
┌─────────────────────────────────────────────────────────┐
│                      Your Code                          │
│  mcp.run({ tools: { add: { schema, run } } })           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    quick-mcp                            │
│  - Validates args with Zod                              │
│  - Converts schema to JSON Schema                       │
│  - Handles MCP protocol                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    ┌───────────┐           ┌───────────┐
    │   stdio   │           │   HTTP    │
    │ JSON-RPC  │           │   REST    │
    └─────┬─────┘           └─────┬─────┘
          │                       │
          ▼                       ▼
    Claude Desktop          curl/fetch
    Cursor, etc.            web apps
```

## CLI

Bundle for distribution:
```bash
npx quick-mcp build server.js -o server.mcp.js
```

## HTTP API

```bash
# With auth
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer secret" \
  -d '{"tool":"add","args":{"a":2,"b":3}}'

# Response
{"content":[{"type":"text","text":"5"}]}
```

## Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| name | string | required | Server name |
| version | string | "1.0.0" | Server version |
| tools | object | required | Tool definitions |
| transport | object | stdio | Transport config |
| banner | boolean | true | Show startup banner |
| jsonIndent | number | undefined | JSON output indent |
