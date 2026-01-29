#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { mcp } from "./index.js";

const args = process.argv.slice(2);

function exitWithUsage(code = 1) {
  console.error(`
Usage:
  quick-mcp build <entry-file> [-o output-file]

Examples:
  quick-mcp build server.ts
  quick-mcp build server.ts -o output.js
  quick-mcp build server.ts --out dist/server.mcp.js
`);
  process.exit(code);
}

if (args.length === 0) {
  exitWithUsage(1);
}

const command = args[0];

if (command !== "build") {
  console.error(`Unknown command: ${command}`);
  exitWithUsage(1);
}

const entry = args[1];

if (!entry) {
  console.error("Error: entry file required");
  exitWithUsage(1);
}

let outfile: string | undefined;

for (let i = 2; i < args.length; i++) {
  const arg = args[i];

  if (arg === "-o" || arg === "--out") {
    const value = args[i + 1];
    if (!value) {
      console.error("Error: output file missing after -o/--out");
      process.exit(1);
    }
    outfile = value;
    i++; 
    continue;
  }

  console.error(`Unknown option: ${arg}`);
  exitWithUsage(1);
}

if (!outfile) {
  const parsed = path.parse(entry);
  outfile = path.join(
    parsed.dir || ".",
    `${parsed.name}.mcp.js`
  );
}

(async () => {
  try {
    await mcp.build({ entry, outfile });
  } catch (err: any) {
    console.error("✖ Build failed");
    console.error(err?.message ?? err);
    process.exit(1);
  }
})();
