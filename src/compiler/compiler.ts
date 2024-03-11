import * as esbuild from 'esbuild-wasm'
import { Path } from '../path'
import {
  beforeTransformCodeHandler,
  transformVueCode,
  css2Js,
  getEsmUrl,
  getLoaderByLang,
  omit,
  ESM_SERVER_URL,
} from './utils'

export interface FilesResolver {
  getFileContent(path: string): Promise<string> | string
}

export interface IPackageJson {
  dependencies?: Record<string, string>

  [propName: string]: any
}

export interface CompilerOptions extends esbuild.InitializeOptions {
  packageJson?: IPackageJson
  esmServiceUrl?: string
}

export class Compiler {
  private readonly decoder: TextDecoder
  private initialized: boolean = false
  private static instance: Compiler | null = null
  private mount: ((selector: string) => Promise<void>) | undefined
  private esmServiceUrl: string

  constructor(
    private readonly resolver: FilesResolver,
    private readonly options?: CompilerOptions
  ) {
    this.esmServiceUrl = options?.esmServiceUrl || ESM_SERVER_URL
    this.decoder = new TextDecoder()
    esbuild
      .initialize({
        wasmURL: `${ESM_SERVER_URL}/esbuild-wasm@0.20.0/esbuild.wasm`,
        worker: true,
        wasmModule: undefined,
        ...omit(options, ['packageJson', 'esmServiceUrl']),
      })
      .then(() => {
        this.initialized = true
      })
  }

  private async onResolveCallback(args: esbuild.OnResolveArgs, pkgJson?: IPackageJson) {
    if (args.kind === 'entry-point') {
      return { path: '/' + args.path }
    }
    if (args.kind === 'import-statement') {
      // 第三方依赖包
      if (!args.path.startsWith('.')) {
        let modulePath = ''
        let packageJson = pkgJson || this.options?.packageJson
        if (packageJson) {
          const dependencies = packageJson.dependencies
          modulePath = getEsmUrl(dependencies || null, args.path, this.esmServiceUrl)
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
    if (extname === '.vue') {
      const fileName = Path.basename(args.path)
      contents = await transformVueCode(fileName, contents)
    }
    let loader = getLoaderByLang(extname)
    // css content to js
    if (extname === '.css') {
      const name = args.path
      contents = await css2Js(name, contents)
    }
    if (['.jsx', '.tsx'].includes(extname)) {
      contents = beforeTransformCodeHandler(contents)
    }
    return { contents, loader }
  }

  public async compile(
    entryPoint: string,
    options: esbuild.BuildOptions = {},
    packageJson?: IPackageJson
  ) {
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
              build.onResolve({ filter: /.*/ }, async (args) =>
                this.onResolveCallback(args, packageJson)
              )
              build.onLoad({ filter: /.*/ }, (args) => this.onLoadCallback(args))
            },
          },
          ...(options?.plugins || []),
        ],
        sourcemap: 'inline',
        target: 'es2015',
        platform: 'browser',
        format: 'esm',
        ...omit(options, ['plugins', 'esmServiceUrl', 'packageJson']),
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

  public static createApp(path: string, packageJsonPath?: string) {
    if (!Compiler.instance) {
      Compiler.instance = new Compiler({
        getFileContent: async (path) => {
          const contents = await fetch(`.${path}`).then((res) => {
            if (!res.ok) {
              throw new Error('File not found')
            }
            return res.text()
          })
          if (path.endsWith('.vue')) {
            const fileName = Path.basename(path)
            return await transformVueCode(fileName, contents)
          }
          return contents
        },
      })
    }

    Compiler.instance.mount = async (selector: string) => {
      // TODO 改成创建iframe sandbox
      const root = document.querySelector(selector)
      if (!root) {
        throw new Error('Root element not found')
      }
      // 获取package.json文件内容
      let packageJson
      if (packageJsonPath) {
        const packageJsonText = await fetch(`${packageJsonPath}`).then((res) => {
          if (!res.ok) throw new Error('File not found')
          return res.text()
        })
        packageJson = JSON.parse(packageJsonText)
      }
      const code = await Compiler.instance?.compile(path, {}, packageJson)
      if (code && typeof code !== 'string' && code.error) {
        root.innerHTML = code.message
        return
      }
      if (typeof code === 'string') {
        const script = document.createElement('script')
        script.type = 'module'
        script.innerHTML = code
        document.body.appendChild(script)
      }
    }

    return Compiler.instance
  }

  public static getFileContent(path: string, files: Record<string, string>) {
    const filePath = Object.keys(files).find((item) => item.startsWith(path))
    const content = filePath ? files[filePath] : null
    if (!content) {
      throw new Error('File not found')
    }
    return content
  }

  public createApp(path: string) {
    this.mount = async (selector: string) => {
      const code = await this.compile(path)
      if (typeof code !== 'string' && code.error) {
        const root = document.querySelector(selector)
        if (!root) {
          throw new Error('Root element not found')
        }
        root.innerHTML = code.message
        return
      }
      const script = document.createElement('script')
      script.type = 'module'
      if (typeof code === 'string') {
        script.innerHTML = code
      }
      document.body.appendChild(script)
    }
    return this
  }
}
