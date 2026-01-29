import { z } from "zod";
import { mcp } from "../dist/index.js";

mcp.run({
  name: "math-tools",
  transport: {
    type: "http",
    port: 4000,
    cors: true,
    apiKey: "my-secret-key"
  },
  tools: {
    add: {
      description: "Add two numbers",
      schema: z.object({ a: z.number(), b: z.number() }),
      run: ({ a, b }) => a + b
    }
  }
});

