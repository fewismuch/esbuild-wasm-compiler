# esbuild-wasm-compiler

![NPM version](https://img.shields.io/npm/v/@carbontian/esbuild-wasm-compiler.svg?style=flat)

一个运行在浏览器中`esbuild-wasm`的文件解析器

## 介绍
`esbuild-wasm-compiler`是`esbuild-wasm`的文件解析器。由于Web浏览器不能直接访问文件系统，`esbuild-wasm-compiler`在编译过程中拦截esbuild发出的文件“读”请求，允许应用程序从外部解析文件。通过这种机制，esbuild可以解析来自IndexedDB、LocalStorage、Http或任何其他浏览器可访问的可读设备的文件。

`esbuild-wasm-compiler`主要提供给编辑器使用。

参考了 [sinclairzx81/esbuild-wasm-resolve](https://github.com/sinclairzx81/esbuild-wasm-resolve) ，在此基础上添加了第三方依赖包解析和css文件解析，以及一些工具函数。

## 安装

```bash
$ npm install @carbontian/esbuild-wasm-compiler
```

## 使用

```javascript
import {Compiler,kvFilesResolver} from '@carbontian/esbuild-wasm-compiler'
import {files} from './files'

const compiler = new Compiler({
  filesResolver: path => {
    return kvFilesResolver(files, path)
  },
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

### html中使用
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>esbuild-wasm-demo</title>
</head>
<body>
<div id="root"></div>
<script
    src="https://cdn.jsdelivr.net/npm/@carbontian/esbuild-wasm-compiler@0.0.4/dist/esbuild-wasm-compiler.min.js">
</script>
<script>
  let Main = `
    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import App from './App'
    
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
`
  let AppCode = `
    import React from 'react'
    import {Button} from './Button'
    import './index.css'

     const App = ()=>{
      const [num,setNum]=React.useState<number>(1)
      return <>
          <button onClick={()=>setNum(num+1)}>click</button>
          <span className='ty'>{num}</span>
          <Button/>
        </>
    }
    export default App
    `;

  const ButtonCode = `
    import React from 'react'
    import {round} from 'lodash-es'
    
    export const Button = ()=>{
      return <button>{round(1.23456,2)}</button>
    }`;

  const constCode = `export const name = 'abc';`;

  const indexCssCode = `.ty{color:red}`;

  const files = {
    "/main.tsx": Main,
    "/App.tsx": AppCode,
    "/Button.tsx": ButtonCode,
    "/index.css": indexCssCode,
  };
</script>
<script>
  const compiler = new Compiler({
    filesResolver: path => {
      return kvFilesResolver(files, path)
    }
  })
  document.body.appendChild(compiler.getImportsScriptElement())
  
  const init = async () => {
    const code = await compiler.compile('/main.tsx')
    console.log(code)
    const script = document.createElement("script");
    script.type = "module";
    script.innerHTML = code
    document.body.appendChild(script);
  }
  
  init()
</script>

</body>
</html>
```

## 配置项

```typescript
export interface FilesResolver {
  filesResolver(path: string): Promise<string> | string;
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
/**
 * files对象格式 文件解析器
 * @param files
 * @param path
 * @example const files = {
 *   "/index.ts": `
 *      import {count} from './count'
 *      const name = 'home'
 *   `,
 *   "/count":`export const count = 1`
 * }
 * @example kvFilesResolver(files,'/count')=>`export const count = 1`
 */
export declare const kvFilesResolver: (files: Record<string, string>, path: string) => string;
export declare class Compiler {
  constructor(resolver: FilesResolver, options?: CompilerOptions | undefined);
  compile(entryPoint: string, options?: esbuild.BuildOptions): Promise<string>;
  /**
   * 获取importmap script标签
   */
  getImportsScriptElement(): HTMLScriptElement;
}

// 默认esbuild-wasm url
const ESBUILD_WASM_URL = 'https://esm.sh/esbuild-wasm@0.20.0/esbuild.wasm'


```

## LICENSE

MIT
