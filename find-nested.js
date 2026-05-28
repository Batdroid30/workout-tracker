const fs = require('fs');
const path = require('path');
const dir = './src/lib/data';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

// Get all exported function names
let funcs = [];
files.forEach(f => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  const matches = code.matchAll(/export (?:async )?function ([a-zA-Z0-9_]+)/g);
  for (const match of matches) funcs.push(match[1]);
  const constMatches = code.matchAll(/export const ([a-zA-Z0-9_]+) =/g);
  for (const match of constMatches) funcs.push(match[1]);
});

funcs = [...new Set(funcs)];

// Find calls to these functions inside the data layer
files.forEach(f => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  funcs.forEach(func => {
    // Only look for calls, not definitions
    const callRegex = new RegExp('(?<!function )\\b' + func + '\\s*\\(([^)]*)\\)', 'g');
    let match;
    while ((match = callRegex.exec(code)) !== null) {
      const args = match[1];
      if (!args.includes('accessToken')) {
        console.log(`File: ${f}, Calls: ${func}(${args}) without accessToken!`);
      }
    }
  });
});
