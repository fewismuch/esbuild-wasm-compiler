import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { Compiler } = require('../dist/esbuild-wasm-compiler.min.js')

test('resolves local paths and pinned package subpaths', async () => {
  const compiler = new Compiler({ getFileContent: () => '' }, {
    packageJson: { dependencies: { '@scope/pkg': '^2.3.4' } },
  })
  await compiler.compile('/entry.ts') // Consume the browser-only initialization error in Node.

  assert.deepEqual(await compiler.onResolveCallback({ kind: 'entry-point', path: '/entry.ts' }), {
    path: '/entry.ts', namespace: 'local',
  })
  assert.deepEqual(await compiler.onResolveCallback({
    kind: 'import-statement', path: '../style.css', importer: '/src/main.ts',
  }), { path: '/style.css', namespace: 'local' })
  assert.deepEqual(await compiler.onResolveCallback({
    kind: 'import-statement', path: '@scope/pkg/theme.css', importer: '/src/main.ts',
  }), { path: 'https://esm.sh/@scope/pkg@^2.3.4/theme.css', namespace: 'remote-css' })
})

test('CSS content is safe inside generated JavaScript', async () => {
  const css = 'p::after { content: "` ${alert(1)}"; }'
  const compiler = new Compiler({ getFileContent: () => css })
  await compiler.compile('/entry.ts')
  const loaded = await compiler.onLoadCallback({ path: '/style.css', namespace: 'local' })
  let style
  const document = {
    head: { appendChild: (element) => { style = element } },
    getElementById: () => style,
    createElement: () => ({}),
  }
  new Function('document', loaded.contents)(document)
  assert.equal(style.textContent, css)
  assert.equal(Compiler.getFileContent('/empty.ts', { '/empty.ts': '' }), '')
  assert.equal(Compiler.getFileContent('/App', { '/App.tsx': 'export default 1' }), 'export default 1')
})

test('invalid Vue files report errors', async () => {
  const compiler = new Compiler({ getFileContent: () => '<template><div></template>' })
  await compiler.compile('/entry.ts')
  await assert.rejects(() => compiler.onLoadCallback({ path: '/bad.vue', namespace: 'local' }))
})
