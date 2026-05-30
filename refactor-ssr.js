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

const targetDir = path.join(__dirname, 'src');

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Remove accessToken from requireAuth destructurings
    content = content.replace(/,\s*accessToken/g, '');
    content = content.replace(/accessToken\s*,/g, '');
    content = content.replace(/\{\s*accessToken\s*\}/g, '{}');
    
    // 2. Remove accessToken from getSupabaseServer and resolveSupabaseClient calls
    content = content.replace(/getSupabaseServer\(\s*accessToken\s*\)/g, 'getSupabaseServer()');
    content = content.replace(/resolveSupabaseClient\(\s*accessToken\s*\)/g, 'resolveSupabaseClient()');
    content = content.replace(/resolveSupabaseClient\(\s*accessToken\s*,\s*/g, 'resolveSupabaseClient(');

    // 3. Remove accessToken from function signatures (e.g. accessToken?: string)
    content = content.replace(/,\s*accessToken\??\s*:\s*string/g, '');
    content = content.replace(/accessToken\??\s*:\s*string\s*,/g, '');
    
    // 4. Remove accessToken passed as arguments (e.g. someFunction(id, accessToken))
    // We already handled `, accessToken` in step 1, which works for arguments too!

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
