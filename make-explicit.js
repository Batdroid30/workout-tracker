const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'src', 'lib', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const filePath = path.join(dataDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace `accessToken?: string` with `accessToken: string | undefined`
  content = content.replace(/accessToken\?:\s*string/g, 'accessToken: string | undefined');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
