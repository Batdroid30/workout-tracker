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

const targetDir = path.join(__dirname, 'src', 'app');

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. JSX empty attributes: `accessToken={}` -> ``
    content = content.replace(/\s*accessToken=\{\}/g, '');
    
    // 2. Argument passing: `(accessToken)` -> `()`
    content = content.replace(/\(\s*accessToken\s*\)/g, '()');
    content = content.replace(/,\s*accessToken\b/g, '');
    
    // 3. Destructuring in component arguments: `({ accessToken })` -> `()`
    content = content.replace(/\{\s*accessToken\s*\}/g, '{}');
    // `({ userId, accessToken })` -> `({ userId })`
    content = content.replace(/,\s*accessToken\b/g, '');
    
    // 4. Type definitions
    content = content.replace(/;\s*accessToken\??:\s*string/g, '');
    content = content.replace(/,\s*accessToken\??:\s*string/g, '');
    content = content.replace(/accessToken\??:\s*string\s*;/g, '');
    content = content.replace(/accessToken\??:\s*string\s*,/g, '');
    // If it's the only type: `{ accessToken?: string }` -> `{}`
    content = content.replace(/\{\s*accessToken\??:\s*string\s*\}/g, '{}');
    
    // Replace signOut with signOutUser
    content = content.replace(/import\s*\{\s*requireAuth\s*,\s*signOut\s*\}\s*from\s*['"]@\/lib\/auth['"]/g, "import { requireAuth, signOutUser } from '@/lib/auth'");
    content = content.replace(/await\s+signOut\(\)/g, "await signOutUser()");
    content = content.replace(/import\s*\{\s*signOut\s*\}\s*from\s*['"]@\/lib\/auth['"]/g, "import { signOutUser } from '@/lib/auth'");

    // Fix API routes `import { auth }` -> `import { requireAuth }`
    content = content.replace(/import\s*\{\s*auth\s*\}\s*from\s*['"]@\/lib\/auth['"]/g, "import { requireAuth } from '@/lib/auth'");
    content = content.replace(/await\s+auth\(\)/g, "await requireAuth()");

    // Fix remaining `Property 'supabaseAccessToken' does not exist`
    content = content.replace(/const\s+token\s*=\s*\([^)]*\)\?.supabaseAccessToken.*/g, '');
    content = content.replace(/const\s+token\s*=\s*session\?.supabaseAccessToken.*/g, '');
    content = content.replace(/if\s*\(!token\)\s*throw\s*new\s*UnauthorizedError.*/g, '');
    content = content.replace(/if\s*\(!token\)\s*throw\s*new\s*Error.*/g, '');

    // Cleanup empty destructured objects `{}`
    content = content.replace(/async\s+function\s+[A-Za-z0-9_]+\(\{\}\s*:\s*\{\}\)\s*\{/g, match => match.replace('({}: {})', '()'));
    content = content.replace(/async\s+function\s+ExercisesTab\(\{\}\)/g, 'async function ExercisesTab()');
    content = content.replace(/<ExercisesTab\s*\/>/g, '<ExercisesTab />');

    // Remove any remaining dangling `accessToken` usages as arguments
    // `getExercises(accessToken)`
    content = content.replace(/\(\s*accessToken\s*\)/g, '()');
    
    // In API routes `getSupabaseServer(token)` -> `getSupabaseServer()`
    content = content.replace(/getSupabaseServer\(token\)/g, 'getSupabaseServer()');
    content = content.replace(/getSupabaseServer\(accessToken\)/g, 'getSupabaseServer()');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${filePath}`);
    }
  }
});
