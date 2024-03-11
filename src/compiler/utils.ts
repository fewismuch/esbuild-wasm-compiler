import * as esbuild from 'esbuild-wasm'
import { compileFile } from './vue.compiler'

// 字节地址 https://pdn.zijieapi.com/esm/bv
export const ESM_SERVER_URL = 'https://esm.sh'

export const css2Js = async (name: string, value?: string) => {
  let cssCode = value
  if (name.startsWith('/http')) {
    cssCode = await fetch(name.replace('/', '')).then((res) => res.text())
  }
  const randomId = new Date().getTime()
  return `(() => {
            let stylesheet = document.getElementById('style_${randomId}_${name}');
            if (!stylesheet) {
              stylesheet = document.createElement('style')
              stylesheet.setAttribute('id', 'style_${randomId}_${name}')
              document.head.appendChild(stylesheet)
            }
            const styles = document.createTextNode(\`${cssCode}\`)
            stylesheet.innerHTML = ''
            stylesheet.appendChild(styles)
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
    // @a/b/c
    if (!dependencies?.[importName]) {
      let pkgName = ''
      const secondSlashIndex = importName.indexOf('/', importName.indexOf('/') + 1)
      if (secondSlashIndex !== -1) {
        // 第二个'/'之前的字符 -> @a/b
        pkgName = importName.substring(0, secondSlashIndex)
        return pkgName
      }
      return importName
    } else {
      return importName
    }
  } else {
    // @a/b
    return importName.split('/')[0]
  }
}

export const getEsmVersion = (dependencies: Record<string, string> | null, pkgName: string) => {
  let version = dependencies?.[pkgName] || ''
  const prefixes = ['^', '~', 'latest', '=', '>', '>=', '<=', '<', '*']
  prefixes.forEach((item) => {
    version = version.replace(item, '')
  })
  return version
}

// 生成esm地址
export const getEsmUrl = (
  dependencies: Record<string, string> | null,
  path: string,
  esmServerUrl = ESM_SERVER_URL
) => {
  const esmName = getEsmName(dependencies, path)
  const version = getEsmVersion(dependencies, esmName)

  if (['react', 'react-dom'].includes(esmName)) {
    return `${esmServerUrl}/stable/${esmName}@18.2.0`
  }
  if (version) {
    // 处理类似这种资源导入  import '@rainetian/file-explorer/dist/FileExplorer/index.css'
    if (!![dependencies?.[esmName]])
      return `${esmServerUrl}/${esmName}@${version}${path.replace(esmName, '')}`
    return `${esmServerUrl}/${esmName}@${version}`
  } else {
    if (path.length > esmName.length) return `${esmServerUrl}/${path}`
    return `${esmServerUrl}/${esmName}`
  }
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
  if (!Array.isArray(vueCode)) {
    const { js, css } = vueCode
    const style = await css2Js(fileName, css)
    return js + ';\n' + style
  } else {
    // vue编译异常处理
    return contents
  }
}
