const fs = require("fs");
const code = fs.readFileSync("js/portfolio.js", "utf8");
const lines = code.split("\n");

let depth = 0;
let parenDepth = 0;
let inString = false;
let inTemplate = false;
let escape = false;
let parenStartLine = null;
let parenStartChar = null;

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  const lineNo = code.slice(0, i).split("\n").length;
  const colNo = i - code.lastIndexOf("\n", i);
  if (escape) { escape = false; continue; }
  if (ch === "\\" && (inString || inTemplate)) { escape = true; continue; }
  if (inString) { if (ch === inString) inString = false; continue; }
  if (inTemplate) {
    if (ch === "`") inTemplate = false;
    continue;
  }
  if (ch === "'" || ch === '"') { inString = ch; continue; }
  if (ch === "`") { inTemplate = true; continue; }
  if (ch === "{") depth++;
  else if (ch === "}") depth--;
  else if (ch === "(") {
    parenDepth++;
    if (parenDepth === 1) { parenStartLine = lineNo; parenStartChar = colNo; }
  }
  else if (ch === ")") {
    parenDepth--;
    if (parenDepth === 0) { parenStartLine = null; parenStartChar = null; }
  }
  if (depth < 0) { console.log("NEGATIVE BRACE at line", lineNo, "col", colNo); process.exit(1); }
  if (parenDepth < 0) { console.log("NEGATIVE PAREN at line", lineNo, "col", colNo); process.exit(1); }
}
console.log("Final brace depth:", depth);
console.log("Final paren depth:", parenDepth);
if (parenDepth > 0 && parenStartLine) {
  const line = lines[parenStartLine - 1];
  console.log("UNCLOSING PAREN started at line", parenStartLine, "col", parenStartChar);
  console.log("Line content:", line);
  console.log("Context (3 lines before/after):");
  const start = Math.max(0, parenStartLine - 4);
  const end = Math.min(lines.length, parenStartLine + 3);
  for (let l = start; l < end; l++) {
    console.log((l + 1) + ": " + lines[l]);
  }
}
if (depth !== 0) console.log("BRACE IMBALANCE!");
if (parenDepth !== 0) console.log("PAREN IMBALANCE!");
