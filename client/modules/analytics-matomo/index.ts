import { defineNuxtModule, createResolver, addPlugin } from 'nuxt/kit'

export default defineNuxtModule({
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.build.transpile.push(resolve('runtime'))

    addPlugin({
      src: resolve('runtime/client'),
      mode: 'client',
    })
  },
})