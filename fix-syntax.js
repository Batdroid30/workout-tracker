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
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix `totalWorkouts: number?: string, runAsAdmin` -> `totalWorkouts: number, runAsAdmin`
    content = content.replace(/:\s*([^,]+)\?:\s*string\s*,/g, ': $1,');
    
    // Fix `foo?: string` leftover (if there's no colon before)
    // Actually, let's just match the specific broken patterns left by `accessToken?: string` replacing `accessToken` with empty string.
    
    // The string was `accessToken?: string` or `accessToken: string`.
    // My first replace replaced `,\s*accessToken` with ``.
    // So `, accessToken?: string` became `?: string`.
    content = content.replace(/,\s*\?:\s*string/g, '');
    
    // My second replace replaced `accessToken\s*,` with ``.
    // So `accessToken?: string,` became `?: string,`
    content = content.replace(/\?:\s*string\s*,/g, '');
    
    // `accessToken: string,` became `: string,`
    content = content.replace(/:\s*string\s*,/g, (match, offset, fullStr) => {
       // Only replace if it looks broken like `userId: string, : string, runAsAdmin: boolean`
       // This is a bit risky to do globally if it matches a valid type like `{ id: string, name: string }`.
       return match;
    });

    // Let's fix the exact error patterns seen in tsc:
    // "error TS1005: ',' expected." -> typically from `userId: string ?: string` -> which is `userId: string, accessToken?: string` where `, accessToken` became empty string, leaving `userId: string ?: string`!
    // Yes! `userId: string ?: string`
    content = content.replace(/:\s*([a-zA-Z0-9_]+)\s*\?:\s*string/g, ': $1');

    // And `userId: string : string`
    content = content.replace(/:\s*([a-zA-Z0-9_]+)\s*:\s*string/g, ': $1');

    // Let's just fix the exact ones in `insights.ts`, `bodyweight.ts`, etc.
    // Wait, the regex `userId: string ?: string` -> `userId: string`
    content = content.replace(/(:\s*[a-zA-Z0-9_\[\]]+)\s*\?:\s*string/g, '$1');
    content = content.replace(/(:\s*[a-zA-Z0-9_\[\]]+)\s*:\s*string/g, '$1');

    // Also `getSupabaseServer( runAsAdmin)` -> wait getSupabaseServer takes 0 args now.
    // `resolveSupabaseClient( runAsAdmin)` -> valid.

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${filePath}`);
    }
  }
});
