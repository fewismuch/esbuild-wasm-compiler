# esbuild-wasm-compiler

![NPM version](https://img.shields.io/npm/v/@rainetian/esbuild-wasm-compiler.svg?style=flat)

一个运行在浏览器中打包编译器，基于`esbuild-wasm`

## 介绍

`esbuild-wasm-compiler`是`esbuild-wasm`的文件解析器。由于Web浏览器不能直接访问文件系统，`esbuild-wasm-compiler`在编译过程中，允许应用程序从外部解析文件。

使`esbuild-wasm`可以解析来自IndexedDB、LocalStorage、Http或任何其他浏览器可访问的可读设备的文件。

`esbuild-wasm-compiler`主要提供给编辑器使用，或者示例演示，或者在浏览器中编译执行项目代码。

## 安装

```bash
npm install @rainetian/esbuild-wasm-compiler
```
or
```html
<script src="https://cdn.jsdelivr.net/npm/@rainetian/esbuild-wasm-compiler/dist/esbuild-wasm-compiler.min.js"></script>
```

## 示例

[//]: # (在浏览器中执行react项目)

#### 从js对象中读取文件

[example](https://github.com/fewismuch/esbuild-wasm-compiler/blob/main/example/demo1/index.html)

```javascript
import {Compiler} from '@rainetian/esbuild-wasm-compiler'
import {files} from './files'

const compiler = new Compiler({
  getFileContent: path => {
    const content = files[path]
    if (content == null) {
      throw new Error("File not found");
    }
    return content;
  }
},{
  packageJson: JSON.parse(files["package.json"]),
})

const code = await compiler.compile('/App.tsx')
console.log(code);


```

#### 从文件系统中读取文件

[example2](https://github.com/fewismuch/esbuild-wasm-compiler/blob/main/example/demo2/index.html)


```javascript
import {Compiler} from '@rainetian/esbuild-wasm-compiler'

Compiler.createApp('./main.tsx').mount('#root')
```

🔥现已支持vue

[example3](https://github.com/fewismuch/esbuild-wasm-compiler/blob/main/example/demo3/index.html)


## 配置项

```typescript
export interface FilesResolver {
  getFileContent(path: string): Promise<string> | string;
}

export interface CompilerOptions extends esbuild.InitializeOptions {
  // package.json文件内容
  packageJson?: Record<string, any>;
  // esm服务地址
  esmServiceUrl?: string
  // 可覆盖默认的 esbuild-wasm 0.28.2 CDN 地址
  wasmURL?: string
}
export declare class Compiler {
  constructor(resolver: FilesResolver, options?: CompilerOptions | undefined);
  compile(entryPoint: string, options?: esbuild.BuildOptions, packageJson?: Record<string, any>): Promise<string | {
    error: boolean;
    message: string;
  }>;
  static createApp(path: string, packageJsonPath?: string): Compiler;
  createApp(path: string): this;
  mount(selector: string): Promise<void>;
}
```

`mount()` 会在当前页面执行编译后的代码，只适合可信的项目。若输入来自不可信用户，请在隔离的 iframe 中运行，并限制其权限。

## 开发

使用 pnpm 安装依赖，然后运行 `pnpm typecheck`、`pnpm test` 和 `pnpm audit`。`pnpm build` 生成 ESM、UMD 和类型声明。示例目录的 `package.json` 仅用于指定浏览器 CDN 依赖版本，无需单独安装旧版 Vue CLI 或 Create React App。

## 参考

[sinclairzx81/esbuild-wasm-resolve](https://github.com/sinclairzx81/esbuild-wasm-resolve)
