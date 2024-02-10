import * as esbuild from "esbuild-wasm";

export const cleanVersion = (version: string) => {
  const prefixes = ['^', '~', 'latest', '=', '>', '>=', '<=', '<', '*'];
  prefixes.forEach(item => {
    version = version.replace(item, '')
  })
  return version;
}

export const css2Js = (name: string, value: string) => {
  const randomId = new Date().getTime()
  return `(() => {
            let stylesheet = document.getElementById('style_${randomId}_${name}');
            if (!stylesheet) {
              stylesheet = document.createElement('style')
              stylesheet.setAttribute('id', 'style_${randomId}_${name}')
              document.head.appendChild(stylesheet)
            }
            const styles = document.createTextNode(\`${value}\`)
            stylesheet.innerHTML = ''
            stylesheet.appendChild(styles)
          })()`
}


export const getLoaderByLang = (lang: string) => {
  let loader: esbuild.Loader;
  switch (lang) {
    case '.ts':
      loader = 'ts';
      break;
    case '.tsx':
      loader = 'tsx';
      break;
    case '.js':
      loader = 'jsx';
      break;
    case '.jsx':
      loader = 'jsx';
      break;
    case '.json':
      loader = 'json';
      break;
    case '.css':
      loader = 'js';
    default:
      loader = 'tsx';
      break;
  }
  return loader
}

export const omit = (obj = {}, props: string[]) => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key)))
}

export const getEsmUrl = (name: string, version?: string) => {
  if (version) {
    return `https://esm.sh/${name}@${version}`
  } else {
    return `https://esm.sh/${name}`
  }
}
