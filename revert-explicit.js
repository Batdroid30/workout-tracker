const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'src', 'lib', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const filePath = path.join(dataDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Revert `accessToken: string | undefined` back to `accessToken?: string`
  content = content.replace(/accessToken:\s*string\s*\|\s*undefined/g, 'accessToken?: string');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
