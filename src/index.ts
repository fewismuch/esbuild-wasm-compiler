//export * from './compiler'

import {
  parse,
  compileTemplate,
  compileScript,
  SFCDescriptor,
  BindingMetadata,
  CompilerOptions,
  rewriteDefault,
  compileStyleAsync,
} from '@vue/compiler-sfc'

const COMP_IDENTIFIER = `__sfc__`

const code = `<script setup>
import { ref } from 'vue'
const msg = ref('Hello World!')
</script>

<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg">
</template>
<style scoped>
h1 {
  color:red
}
</style>`

async function compileFile(filename: string, code: string) {
  // 随机数
  const id = 'abc'
  const { errors, descriptor } = parse(code, {
    filename,
    sourceMap: true,
    // templateParseOptions: store.sfcOptions?.template?.compilerOptions,
  })
  if (errors.length) {
    return errors
  }

  if (descriptor.styles.some((s) => s.lang) || (descriptor.template && descriptor.template.lang)) {
    return [`lang="x" pre-processors for <template> or <style> are currently not ` + `supported.`]
  }

  const scriptLang =
    (descriptor.script && descriptor.script.lang) ||
    (descriptor.scriptSetup && descriptor.scriptSetup.lang)
  const isTS = scriptLang === 'ts'
  if (scriptLang && !isTS) {
    return [`Only lang="ts" is supported for <script> blocks.`]
  }

  const hasScoped = descriptor.styles.some((s) => s.scoped)
  let clientCode = ''
  const appendSharedCode = (code: string) => {
    clientCode += code
  }

  let clientScript: string
  let bindings: BindingMetadata | undefined
  try {
    ;[clientScript, bindings] = await doCompileScript(descriptor, id)
  } catch (e: any) {
    return [e.stack.split('\n').slice(0, 12).join('\n')]
  }

  clientCode += clientScript

  // template
  if (descriptor.template && !descriptor.scriptSetup) {
    const clientTemplateResult = await doCompileTemplate(descriptor, id, bindings)
    if (Array.isArray(clientTemplateResult)) {
      return clientTemplateResult
    }
    clientCode += `;${clientTemplateResult}`
  }

  if (hasScoped) {
    appendSharedCode(`\n${COMP_IDENTIFIER}.__scopeId = ${JSON.stringify(`data-v-${id}`)}`)
  }

  let compiled: any = {
    css: undefined,
    js: undefined,
  }
  // styles
  const ceFilter = /\.ce\.vue$/
  function isCustomElement(filters: typeof ceFilter): boolean {
    if (typeof filters === 'boolean') {
      return filters
    }
    if (typeof filters === 'function') {
      // @ts-ignore
      return filters(filename)
    }
    return filters.test(filename)
  }
  let isCE = isCustomElement(ceFilter)

  let css = ''
  let styles: string[] = []
  for (const style of descriptor.styles) {
    if (style.module) {
      return [`<style module> is not supported in the playground.`]
    }

    const styleResult = await compileStyleAsync({
      source: style.content,
      filename,
      id,
      scoped: style.scoped,
      modules: !!style.module,
    })
    if (styleResult.errors.length) {
      // postcss uses pathToFileURL which isn't polyfilled in the browser
      // ignore these errors for now
      if (!styleResult.errors[0].message.includes('pathToFileURL')) {
        //store.errors = styleResult.errors
      }
      // proceed even if css compile errors
    } else {
      isCE ? styles.push(styleResult.code) : (css += styleResult.code + '\n')
    }
  }
  if (css) {
    compiled.css = css.trim()
  } else {
    compiled.css = isCE
      ? (compiled.css =
          '/* The component style of the custom element will be compiled into the component object */')
      : '/* No <style> tags present */'
  }

  if (clientCode) {
    const ceStyles = isCE ? `\n${COMP_IDENTIFIER}.styles = ${JSON.stringify(styles)}` : ''
    appendSharedCode(
      `\n${COMP_IDENTIFIER}.__file = ${JSON.stringify(filename)}` +
        ceStyles +
        `\nexport default ${COMP_IDENTIFIER}`
    )
    compiled.js = clientCode.trimStart()
  }
  console.log(compiled.js)
  return []
}

function doCompileTemplate(
  descriptor: SFCDescriptor,
  id: string,
  bindingMetadata: BindingMetadata | undefined
) {
  let { code, errors } = compileTemplate({
    isProd: false,
    ast: descriptor.template!.ast,
    source: descriptor.template!.content,
    filename: descriptor.filename,
    id,
    scoped: descriptor.styles.some((s) => s.scoped),
    slotted: descriptor.slotted,
    compilerOptions: {
      bindingMetadata,
      expressionPlugins: ['typescript'],
    },
  })
  if (errors.length) {
    return errors
  }

  const fnName = `render`

  code =
    `\n${code.replace(/\nexport (function|const) (render|ssrRender)/, `$1 ${fnName}`)}` +
    `\n${COMP_IDENTIFIER}.${fnName} = ${fnName}`

  return code
}

function doCompileScript(descriptor: SFCDescriptor, id: string): any {
  if (descriptor.script || descriptor.scriptSetup) {
    const expressionPlugins: CompilerOptions['expressionPlugins'] = ['typescript']
    const compiledScript = compileScript(descriptor, {
      inlineTemplate: true,
      id,
      templateOptions: {
        compilerOptions: {
          expressionPlugins,
        },
      },
    })
    let code = ''
    if (compiledScript.bindings) {
      code += `\n/* Analyzed bindings: ${JSON.stringify(compiledScript.bindings, null, 2)} */`
    }
    code += `\n` + rewriteDefault(compiledScript.content, COMP_IDENTIFIER, expressionPlugins)

    return [code, compiledScript.bindings]
  } else {
    return [`\nconst ${COMP_IDENTIFIER} = {}`, undefined]
  }
}

compileFile('a.vue', code)
