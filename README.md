# esbuild-wasm-compiler

![NPM version](https://img.shields.io/npm/v/@rainetian/esbuild-wasm-compiler.svg?style=flat)

一个运行在浏览器中`esbuild-wasm`的文件解析器

## 介绍

`esbuild-wasm-compiler`是`esbuild-wasm`的文件解析器。由于Web浏览器不能直接访问文件系统，`esbuild-wasm-compiler`在编译过程中，允许应用程序从外部解析文件。

使`esbuild-wasm`可以解析来自IndexedDB、LocalStorage、Http或任何其他浏览器可访问的可读设备的文件。

`esbuild-wasm-compiler`主要提供给编辑器使用，或者在浏览器中编译执行项目代码。

## 安装

```bash
$ npm install @rainetian/esbuild-wasm-compiler
```
## 示例

[//]: # (在浏览器中执行react项目)

## 使用

### html中使用

[example](https://github.com/fewismuch/esbuild-wasm-compiler/blob/main/example/index.html)

### 项目中使用

```javascript
import {Compiler,kvFilesResolver} from '@rainetian/esbuild-wasm-compiler'
import {files} from './files'

const compiler = new Compiler({
  getFileContent: path => {
    const filePath = Object.keys(files).find(item=>item.startsWith(path))
    const content = filePath ? files[filePath] : null
    if (!content) {
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

`./files`

```javascript
const AppCode = `
import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  const [num, setNum] = React.useState<number>(1)
  return <>
    <button onClick={() => setNum(num + 1)}>click</button>
    <span>{num}</span>
  </>
}
ReactDOM.render(<App/>, document.getElementById("root"));
`;

const packageJson = `
{
    "name": "react-ts",
    "version": "0.0.1",
    "private": true,
    "dependencies": {
        "react": "^18.1.0",
        "react-dom": "^18.1.0"
    },
    "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test --env=jsdom",
        "eject": "react-scripts eject"
    },
    "devDependencies": {
        "react-scripts": "latest",
        "typescript": "latest"
    }
}
`

export const files = {
  "/App.tsx": AppCode,
  "package.json":packageJson
};
```

## 配置项

```typescript
export interface FilesResolver {
  getFileContent(path: string): Promise<string> | string;
}
export interface CompilerOptions extends esbuild.InitializeOptions {
  /**
   * package.json文件内容
   */
  packageJson?: Record<string, any>;
  /**
   * 是否替换第三方依赖包包名为importMap中的url，默认true
   */
  replaceImports?: boolean;
}

export declare class Compiler {
  constructor(resolver: FilesResolver, options?: CompilerOptions | undefined);
  compile(entryPoint: string, options?: esbuild.BuildOptions): Promise<string>;
  /**
   * 获取importmap script标签
   */
  getImportsScriptElement(): HTMLScriptElement;
}

```

## 参考

[sinclairzx81/esbuild-wasm-resolve](https://github.com/sinclairzx81/esbuild-wasm-resolve)
