import tailwindcss from '@tailwindcss/vite'
import redirects from './redirects.json'
import { isMiddlewareRedirect } from './app/utilities/redirects'

type RouteRules = NonNullable<
  Parameters<typeof defineNuxtConfig>[0]['routeRules']
>

const oneHourInSeconds = 60 * 60
const oneDayInSeconds = 24 * oneHourInSeconds

// inserted in the <head> some inline JS to determine scrollbar width so that CSS can use it in calc()
// this is intentionally inserted in the <head> so that it runs immediately in the browser
const scrollbarWidthInlineJS = `function _updateScrollbarWidth(){document.body.style.setProperty('--rfc-editor-org-scrollbar-width',(window.innerWidth-document.documentElement.clientWidth)+'px')}window.addEventListener('resize', _updateScrollbarWidth, false);document.addEventListener('DOMContentLoaded', _updateScrollbarWidth, false);window.addEventListener('load', _updateScrollbarWidth);window.setInterval(_updateScrollbarWidth,1000)`

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-05',
  devtools: { enabled: false },
  typescript: { strict: true },
  modules: [
    // Note: don't use 'Nuxt Device' see note in responsiveMode.ts
    '@nuxt/content',
    'reka-ui/nuxt',
    '@nuxt/test-utils/module',
    '@nuxt/eslint',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/icon',
    '@nuxt/fonts'
  ],
  content: {
    build: {
      markdown: {
        remarkPlugins: {
          'remark-heading-id': {
            /* Options */
          }
        }
      }
    }
  },
  colorMode: {
    classSuffix: '',
    preference: 'light',
    fallback: 'light'
  },
  eslint: {
    config: {
      stylistic: true
    }
  },
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        preserveEntrySignatures: 'strict',
        output: {
          preserveModules: true
        }
      }
    }
  },
  nitro: {
    // Production
    storage: {
      db: {
        driver: 'fs',
        base: './data/db'
      }
    },
    // Development
    devStorage: {
      db: {
        driver: 'fs',
        base: './data/db'
      }
    }
  },
  // https://nuxt.com/docs/guide/going-further/runtime-config
  runtimeConfig: {
    cfServiceTokenId: '', // NUXT_CF_SERVICE_TOKEN_ID env var
    cfServiceTokenSecret: '', // NUXT_CF_SERVICE_TOKEN_SECRET env var
    public: {
      // These settings are available client-side (others are server-side only)
      datatrackerBase: 'http://localhost:8000/' // NUXT_PUBLIC_DATATRACKER_BASE env var
    }
  },
  postcss: {
    plugins: {
      // 'postcss-nested': {},
      // 'postcss-custom-media': {},
      'postcss-nested-import': {
        // used to scope RFC HTML styles so external CSS doesn't affect the rest of the site
        // see @nested-import
      }
    }
  },
  app: {
    head: {
      script: [
        {
          innerHTML: scrollbarWidthInlineJS
        }
      ]
    }
  },
  $development: {
    routeRules: {
      '/api/v1/homepage-latest.json': {
        proxy: 'https://red.staging.rfc-editor.org/api/v1/homepage-latest.json'
      },
      '/api/v1/rfc-mini-index.json': {
        proxy: 'https://red.staging.rfc-editor.org/api/v1/rfc-mini-index.json'
      },
      '/api/v1/rfc-html/**': {
        proxy: 'https://red.staging.rfc-editor.org/api/v1/rfc-html/**'
      },
      '/api/v1/rfc/**': {
        proxy: 'https://red.staging.rfc-editor.org/api/v1/rfc/**'
      },
      '/api/v1/info-subseries/**': {
        proxy: 'https://red.staging.rfc-editor.org/api/v1/info-subseries/**'
      },
      '/api/v1/rfc-common/**': {
        proxy: 'https://red.staging.rfc-editor.org/api/v1/rfc-common/**'
      }
    }
  },
  $production: {
    routeRules: {
      // https://nitro.build/config#routerules
      // https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering
      '/': {
        swr: oneDayInSeconds,
        prerender: true
      },
      ...redirects.redirects
        .filter((redirect) => redirect[0] && !isMiddlewareRedirect(redirect[0]))
        .reduce((acc, redirect) => {
          const [fromPath, toPathOrUrl] = redirect
          if (typeof fromPath !== 'string' || typeof toPathOrUrl !== 'string') {
            throw Error('Bad redirects.json file should only contain strings')
          }
          acc[fromPath] = { redirect: { to: toPathOrUrl, statusCode: 301 } }
          return acc
        }, {} as RouteRules)
    }
  }
})