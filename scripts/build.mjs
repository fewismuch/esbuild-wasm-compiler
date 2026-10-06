import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const entryPoints = ['src/index.ts']

await rm('dist', { recursive: true, force: true })
await mkdir('dist/esm', { recursive: true })
await build({
  entryPoints,
  outfile: 'dist/esm/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2018',
})

const result = await build({
  entryPoints,
  bundle: true,
  format: 'iife',
  globalName: '__compilerExports',
  platform: 'browser',
  target: 'es2018',
  minify: true,
  write: false,
})
const source = result.outputFiles[0].text
const umd = `(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else Object.assign(root, factory());
})(typeof self !== 'undefined' ? self : globalThis, function() {
${source}
  return __compilerExports;
});\n`
await writeFile('dist/esbuild-wasm-compiler.min.js', umd)

const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
execFileSync(process.execPath, [tsc, '--emitDeclarationOnly', '--outDir', 'dist/esm', '--rootDir', 'src'], {
  stdio: 'inherit',
})
