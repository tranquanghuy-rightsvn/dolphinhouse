// Parses the site's `const NAME = <json-literal>;` data files (js/data/*.data.js)
// without eval — those files are plain JSON payloads assigned to a global const.
import { readFileSync } from "node:fs";

export function loadDataFile(path) {
  const src = readFileSync(path, "utf8");
  const out = {};
  const re = /const\s+([A-Z_][A-Z0-9_]*)\s*=\s*/g;
  let match;
  const starts = [];
  while ((match = re.exec(src))) {
    starts.push({ name: match[1], valueStart: re.lastIndex });
  }
  for (let i = 0; i < starts.length; i++) {
    const { name, valueStart } = starts[i];
    const sliceEnd = i + 1 < starts.length ? findStatementEnd(src, valueStart, starts[i + 1].valueStart) : findStatementEnd(src, valueStart, src.length);
    const literal = src.slice(valueStart, sliceEnd).trim().replace(/;\s*$/, "");
    out[name] = JSON.parse(literal);
  }
  return out;
}

// The value literal ends at the last `;` before the next `const` starts (or EOF).
function findStatementEnd(src, from, upperBound) {
  const chunk = src.slice(from, upperBound);
  const lastSemi = chunk.lastIndexOf(";");
  return lastSemi === -1 ? upperBound : from + lastSemi + 1;
}
