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

const targetDir = path.join(__dirname, 'src', 'app', '(app)');

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Only process files that import auth from @/lib/auth
    if (!content.includes("@/lib/auth")) return;

    // Replace the import
    content = content.replace(/import\s+\{\s*auth\s*\}\s+from\s+['"]@\/lib\/auth['"]/g, "import { requireAuth } from '@/lib/auth'");

    // Pattern 1: session, userId, accessToken
    content = content.replace(/const\s+session\s*=\s*await\s+auth\(\)\s*[\r\n]+(?:\s*if\s*\(!session\?\.user\?\.id\).*[\r\n]+)?\s*const\s+userId\s*=\s*session\??\.user\??\.id(?:\s*as\s+string)?\s*[\r\n]+\s*const\s+accessToken\s*=\s*session\??\.supabaseAccessToken(?:\s*as\s+string\s*\|\s*undefined)?/gm, 
      'const { userId, accessToken, session } = await requireAuth()');

    // Pattern 2: session, userId
    content = content.replace(/const\s+session\s*=\s*await\s+auth\(\)\s*[\r\n]+(?:\s*if\s*\(!session\?\.user\?\.id\).*[\r\n]+)?\s*const\s+userId\s*=\s*session\??\.user\??\.id(?:\s*as\s+string)?/gm, 
      'const { userId, session } = await requireAuth()');

    // Pattern 3: session, accessToken (e.g. in exercises)
    content = content.replace(/const\s+session\s*=\s*await\s+auth\(\)\s*[\r\n]+(?:\s*if\s*\(!session\?\.user\?\.id\).*[\r\n]+)?\s*const\s+accessToken\s*=\s*session\??\.supabaseAccessToken(?:\s*as\s+string\s*\|\s*undefined)?/gm, 
      'const { accessToken, session } = await requireAuth()');

    // Pattern 4: session with explicit redirect
    content = content.replace(/const\s+session\s*=\s*await\s+auth\(\)\s*[\r\n]+\s*if\s*\(!session\??\.user\??\.id\)\s*redirect\('\/login'\)/gm,
      'const { session } = await requireAuth()');

    // Pattern 5: session with explicit return/throw (e.g. actions)
    content = content.replace(/const\s+session\s*=\s*await\s+auth\(\)\s*[\r\n]+\s*if\s*\(!session\??\.user\??\.id\)\s*(return|throw)[^\r\n]*/gm,
      'const { session } = await requireAuth()');

    // For any remaining `const session = await auth()`, convert to `const { session } = await requireAuth()`
    content = content.replace(/const\s+session\s*=\s*await\s+auth\(\)/g, 'const { session } = await requireAuth()');

    // For any layout or missing bits that still say `session.user.id`, change to `userId` if we destructured it
    // Wait, replacing `session.user.id` globally might break things if `session.user.id` is used inside a map or something, but it's usually `session.user.id`.
    // Actually, `const { userId, session }` preserves `session.user.id`. Let's leave `session.user.id` as is, since `session` still has it!

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
