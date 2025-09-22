const esbuild = require('esbuild');
const path = require('path');

(async () => {
  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'content.ts')],
    bundle: true,
    format: 'iife', // classic script (no ESM)
    target: ['chrome100'],
    outfile: path.join(__dirname, '..', 'dist', 'content.enhanced.js'),
    sourcemap: false,
    logLevel: 'info',
  });
  console.log('Content script bundled to dist/content.enhanced.js');
})();


