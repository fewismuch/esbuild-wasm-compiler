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
  private readonly initialization: Promise<void>
  private static initialization: Promise<void> | undefined
  private esmServiceUrl: string
  private entryPoint?: string
  private packageJsonPath?: string

  constructor(
    private readonly resolver: FilesResolver,
    private readonly options?: CompilerOptions
  ) {
    this.esmServiceUrl = options?.esmServiceUrl || ESM_SERVER_URL
    this.decoder = new TextDecoder()
    this.initialization = (Compiler.initialization ??= esbuild.initialize({
        wasmURL: `${ESM_SERVER_URL}/esbuild-wasm@0.28.2/esbuild.wasm`,
        worker: true,
        wasmModule: undefined,
        ...omit(options, ['packageJson', 'esmServiceUrl']),
      }).catch((error) => {
        Compiler.initialization = undefined
        throw error
      }))
  }

  private async onResolveCallback(args: esbuild.OnResolveArgs, pkgJson?: IPackageJson) {
    if (args.kind === 'entry-point') {
      return { path: Path.resolve('/', args.path), namespace: 'local' }
    }
    if (args.path.startsWith('.') || args.path.startsWith('/')) {
      return {
        path: Path.resolve(Path.dirname(args.importer), args.path),
        namespace: 'local',
      }
    }
    const modulePath = /^https?:\/\//.test(args.path)
      ? args.path
      : getEsmUrl(
          pkgJson?.dependencies || this.options?.packageJson?.dependencies || null,
          args.path,
          this.esmServiceUrl
        )
    if (new URL(modulePath).pathname.endsWith('.css')) {
      return { path: modulePath, namespace: 'remote-css' }
    }
    return { path: modulePath, external: true }
  }

  private async onLoadCallback(args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult> {
    const extname = args.namespace === 'remote-css' ? '.css' : Path.extname(args.path)
    let contents: string
    if (args.namespace === 'remote-css') {
      const response = await fetch(args.path)
      if (!response.ok) throw new Error(`Failed to load ${args.path}: ${response.status}`)
      contents = await response.text()
    } else {
      contents = await this.resolver.getFileContent(args.path)
    }
    if (extname === '.vue') {
      const fileName = Path.basename(args.path)
      contents = await transformVueCode(fileName, contents)
    }
    const loader = getLoaderByLang(extname)
    // css content to js
    if (extname === '.css') {
      contents = await css2Js(args.path, contents)
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
    try {
      await this.initialization
      const result = await esbuild.build({
        entryPoints: [entryPoint],
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
        ...omit(options, ['plugins']),
        // required
        bundle: true,
        write: false,
      })
      const output =
        result.outputFiles?.find((file) => file.path.endsWith('.js')) ?? result.outputFiles?.[0]
      if (!output) throw new Error('Build produced no JavaScript output')
      const contents = output.contents
      return this.decoder.decode(contents)
    } catch (e: unknown) {
      const errors = (e as { errors?: esbuild.Message[] }).errors
      const formatted = errors
        ? await esbuild.formatMessages(errors, {
            kind: 'error',
            color: false,
            terminalWidth: 100,
          })
        : [e instanceof Error ? e.message : String(e)]
      return {
        error: true,
        message: formatted.join('\n'),
      }
    }
  }

  public static createApp(path: string, packageJsonPath?: string) {
    const compiler = new Compiler({
      getFileContent: async (filePath) => {
        const response = await fetch(`.${filePath}`)
        if (!response.ok) throw new Error(`File not found: ${filePath}`)
        return response.text()
      },
    })
    compiler.packageJsonPath = packageJsonPath
    return compiler.createApp(path)
  }

  public static getFileContent(path: string, files: Record<string, string>) {
    const filePath = [
      path,
      ...['.ts', '.tsx', '.js', '.jsx', '.vue', '.json', '.css'].map((ext) => path + ext),
    ].find((candidate) => Object.prototype.hasOwnProperty.call(files, candidate))
    const content = filePath ? files[filePath] : null
    if (content == null) {
      throw new Error('File not found')
    }
    return content
  }

  public createApp(path: string) {
    this.entryPoint = path
    return this
  }

  public async mount(selector: string): Promise<void> {
    if (!this.entryPoint) throw new Error('Call createApp(path) before mount()')
    const root = document.querySelector(selector)
    if (!root) throw new Error('Root element not found')
    let packageJson: IPackageJson | undefined
    if (this.packageJsonPath) {
      const response = await fetch(this.packageJsonPath)
      if (!response.ok) throw new Error(`File not found: ${this.packageJsonPath}`)
      packageJson = await response.json()
    }
    const code = await this.compile(this.entryPoint, {}, packageJson)
    if (typeof code !== 'string') {
      root.textContent = code.message
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = code
    document.body.appendChild(script)
  }
}
