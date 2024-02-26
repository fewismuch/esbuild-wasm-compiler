import * as esbuild from 'esbuild-wasm'
import { Path } from '../path'
import { css2Js, getEsmUrl, getLoaderByLang, omit } from './utils'

export interface FilesResolver {
  getFileContent(path: string): Promise<string> | string
}

export interface CompilerOptions extends esbuild.InitializeOptions {
  /**
   * package.json文件内容
   */
  packageJson?: Record<string, any>
}

/**
 * esbuild.wasm 默认文件地址
 */
const ESBUILD_WASM_URL = 'https://esm.sh/esbuild-wasm@0.20.0/esbuild.wasm'

const DEFAULT_COMPILER_OPTIONS: CompilerOptions = {
  wasmURL: ESBUILD_WASM_URL,
  worker: true,
  wasmModule: undefined,
}

export class Compiler {
  private readonly decoder: TextDecoder
  private initialized: boolean = false

  constructor(
    private readonly resolver: FilesResolver,
    private readonly options?: CompilerOptions
  ) {
    this.decoder = new TextDecoder()
    esbuild
      .initialize({
        ...DEFAULT_COMPILER_OPTIONS,
        ...omit(options, ['packageJson']),
      })
      .then(() => {
        this.initialized = true
      })
  }

  public async compile(entryPoint: string, options: esbuild.BuildOptions = {}) {
    while (!this.initialized) {
      // Wait until initialization is complete
      await new Promise((resolve) => setTimeout(resolve, 16))
    }

    let result
    try {
      result = await esbuild.build({
        entryPoints: [entryPoint.charAt(0) === '/' ? entryPoint.slice(1) : entryPoint],
        plugins: [
          {
            name: 'browserResolve',
            setup: (build) => {
              build.onResolve({ filter: /.*/ }, async (args) => this.onResolveCallback(args))
              build.onLoad({ filter: /.*/ }, (args) => this.onLoadCallback(args))
            },
          },
          ...(options.plugins || []),
        ],
        sourcemap: 'inline',
        target: 'es2015',
        platform: 'browser',
        format: 'esm',
        ...omit(options, ['plugins']),
        // required
        bundle: true,
        write: false,
      })
      const contents = result.outputFiles![0].contents
      return this.decoder.decode(contents)
    } catch (e: any) {
      let formatted = await esbuild.formatMessages(e.errors, {
        kind: 'error',
        color: false,
        terminalWidth: 100,
      })
      return {
        error: true,
        message: formatted.join('\n'),
      }
    }
  }

  private async onResolveCallback(args: esbuild.OnResolveArgs) {
    if (args.kind === 'entry-point') {
      return { path: '/' + args.path }
    }
    if (args.kind === 'import-statement') {
      // 第三方依赖包
      if (!args.path.startsWith('.')) {
        let modulePath = ''
        const packageJson = this.options?.packageJson
        if (packageJson) {
          const dependencies = packageJson.dependencies
          modulePath = getEsmUrl(dependencies, args.path)
          if (modulePath.endsWith('.css')) {
            return {
              path: '/' + modulePath,
            }
          }
          return {
            path: modulePath,
            external: true,
          }
        } else {
          // 没有配置packageJson，默认使用cdn最新版
          const modulePath = getEsmUrl(null, args.path)
          if (modulePath.endsWith('.css')) {
            return {
              path: '/' + modulePath,
            }
          }
          return {
            path: modulePath,
            external: true,
          }
        }
      }
      const dirname = Path.dirname(args.importer)
      const path = Path.join(dirname, args.path)
      return { path }
    }
    throw Error('not resolvable')
  }

  private async onLoadCallback(args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult> {
    const extname = Path.extname(args.path)
    let contents = ''
    if (!args.path.startsWith('/http'))
      contents = await Promise.resolve(this.resolver.getFileContent(args.path))
    let loader = getLoaderByLang(extname)
    // css content to js
    if (extname === '.css') {
      const name = args.path
      contents = await css2Js(name, contents)
    }
    return { contents, loader }
  }
}
