# esbuild-wasm-compiler

![NPM version](https://img.shields.io/npm/v/esbuild-wasm-compiler.svg?style=flat)

File Resolution for Esbuild running in the Browser

## Install

```bash
$ npm install @carbontian/esbuild-wasm-compiler
```

## Usage

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

## Options


| name | type | default | description |
| ---- | ---- | ------- |-------------|
|      |      |         |             |
|      |      |         |             |

## LICENSE

MIT
