const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, 'src', 'app', '(app)');
walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const original = fs.readFileSync(filePath, 'utf8');
    // Remove the redundant check
    let modified = original.replace(/^[ \t]*if \(!session\?\.user\?\.id\) redirect\('\/login'\);?\r?\n/gm, '');
    
    // Some lines might not have newline at the end if it's EOF, but usually it does.
    if (modified !== original) {
      fs.writeFileSync(filePath, modified, 'utf8');
      console.log(`Cleaned redundant auth check from: ${filePath}`);
    }
  }
});
