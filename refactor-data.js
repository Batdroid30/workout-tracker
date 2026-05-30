const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const targetDir = path.join(__dirname, 'src', 'lib', 'data');

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. resolveSupabaseClient
    content = content.replace(/resolveSupabaseClient\(\s*accessToken\s*,\s*/g, 'resolveSupabaseClient(');
    content = content.replace(/resolveSupabaseClient\(\s*accessToken\s*\)/g, 'resolveSupabaseClient()');
    content = content.replace(/getSupabaseServer\(\s*accessToken\s*\)/g, 'getSupabaseServer()');

    // 2. Type definitions for accessToken
    content = content.replace(/,\s*accessToken\??\s*:\s*string\s*/g, '');
    content = content.replace(/accessToken\??\s*:\s*string\s*,\s*/g, '');
    content = content.replace(/\s*accessToken\??\s*:\s*string\s*/g, '');

    // 3. accessToken passed as argument (other than the specific client calls above)
    content = content.replace(/,\s*accessToken\b/g, '');
    content = content.replace(/\baccessToken\s*,\s*/g, '');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
