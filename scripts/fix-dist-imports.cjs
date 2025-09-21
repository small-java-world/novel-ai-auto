// Simple fixer to append .js to relative import specifiers in dist/*.js
// Usage: node scripts/fix-dist-imports.cjs
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (entry.isFile() && entry.name.endsWith('.js')) cb(full);
  }
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  // Add .js to import specifiers that are relative and lack extension
  // Matches: import ... from './foo'; or "./foo" (single/ double quotes)
  src = src.replace(/(from\s+['"])(\.\.?\/[^'"\n]+?)(['"])/g, (m, p1, spec, p3) => {
    if (/\.(js|mjs|cjs)$/.test(spec)) return m; // already has extension
    return p1 + spec + '.js' + p3;
  });

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Fixed imports in', path.relative(distDir, file));
  }
}

walk(distDir, fixFile);
console.log('Import specifier fix complete.');


