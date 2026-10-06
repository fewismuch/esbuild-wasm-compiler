import * as esbuild from 'esbuild-wasm'
import { compileFile } from './vue.compiler'

// unpkg https://unpkg.com/
// 字节 https://pdn.zijieapi.com/esm/bv
export const ESM_SERVER_URL = 'https://esm.sh'

export const css2Js = async (name: string, value?: string) => {
  const cssCode = value ?? ''
  return `(() => {
            const id = ${JSON.stringify(`style_${name}`)};
            let stylesheet = document.getElementById(id);
            if (!stylesheet) {
              stylesheet = document.createElement('style')
              stylesheet.id = id
              document.head.appendChild(stylesheet)
            }
            stylesheet.textContent = ${JSON.stringify(cssCode)}
          })()`
}

export const getLoaderByLang = (lang: string) => {
  let loader: esbuild.Loader
  switch (lang) {
    case '.ts':
      loader = 'ts'
      break
    case '.tsx':
      loader = 'tsx'
      break
    case '.js':
      loader = 'jsx'
      break
    case '.jsx':
      loader = 'jsx'
      break
    case '.json':
      loader = 'json'
      break
    case '.css':
      loader = 'js'
      break
    case '.vue':
      loader = 'ts'
      break
    default:
      loader = 'tsx'
      break
  }
  return loader
}

export const omit = (obj = {}, props: string[]) => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key)))
}

export const getEsmName = (dependencies: Record<string, string> | null, importName: string) => {
  if (importName.startsWith('@')) {
    return importName.split('/').slice(0, 2).join('/')
  }
  return importName.split('/')[0]
}

export const getEsmVersion = (dependencies: Record<string, string> | null, pkgName: string) => {
  const version = dependencies?.[pkgName] || ''
  return /^[~^]?\d+(?:\.\d+){0,2}(?:[-+][\w.-]+)?$/.test(version) ? version : ''
}

// 生成esm地址
export const getEsmUrl = (
  dependencies: Record<string, string> | null,
  path: string,
  esmServerUrl = ESM_SERVER_URL
) => {
  const esmName = getEsmName(dependencies, path)
  const version = getEsmVersion(dependencies, esmName)

  return `${esmServerUrl.replace(/\/$/, '')}/${esmName}${version ? `@${version}` : ''}${path.slice(esmName.length)}`
}

export const beforeTransformCodeHandler = (code: string) => {
  let _code = code
  // 如果没有引入React，开头添加React引用
  const regexReact = /import\s+React/g
  if (!regexReact.test(code)) {
    _code = `import React from 'react';\n${code}`
  }
  return _code
}

export const transformVueCode = async (fileName: string, contents: string) => {
  const vueCode = await compileFile(fileName, contents.trim())
  if (Array.isArray(vueCode)) {
    throw new Error(vueCode.map(String).join('\n'))
  }
  const { js, css } = vueCode
  const style = await css2Js(fileName, css)
  return js + ';\n' + style
}
