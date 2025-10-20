// This Nuxt module is supposed to be standalone so it intentionally doesn't import shared code from the rest of the project
import { defineNuxtModule, createResolver, addPlugin } from 'nuxt/kit'

export default defineNuxtModule({
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    nuxt.options.build.transpile.push(resolve('runtime'))

    addPlugin({
      src: resolve('runtime/client'),
      mode: 'client',
    })
  },
})