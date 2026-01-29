import { z } from "zod";
import { mcp } from "../dist/index.js";

mcp.run({
  name: "math-tools",
  tools: {
    add: {
      description: "Add two numbers",
      schema: z.object({
        a: z.number(),
        b: z.number()
      }),
      run: ({ a, b }) => a + b
    },

    ping: {
      description: "Health check",
      schema: z.object({}),
      run: () => "pong"
    }
  }
});
