import tailwindcss from '@tailwindcss/vite'
import redirects from './redirects.json'
import { isMiddlewareRedirect } from './app/utilities/redirects'
import { API_ROUTES_TO_PRERENDER } from './app/utilities/url'

type RouteRules = NonNullable<
  Parameters<typeof defineNuxtConfig>[0]['routeRules']
>

const oneHourInSeconds = 60 * 60
const oneDayInSeconds = 24 * oneHourInSeconds

// inserted in the <head> some inline JS to determine scrollbar width so that CSS can use it in calc()
const scrollbarWidthInlineJS = `function _updateScrollbarWidth(){document.body.style.setProperty('--rfc-editor-org-scrollbar-width',(window.innerWidth-document.documentElement.clientWidth)+'px')}window.addEventListener('resize', _updateScrollbarWidth, false);document.addEventListener('DOMContentLoaded', _updateScrollbarWidth, false);window.addEventListener('load', _updateScrollbarWidth);`

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
        // used to scope RFC generator HTML styles
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
  $production: {
    /**
     * Only apply route rules in production builds, because prerendering takes a while
     */
    routeRules: {
      // https://nitro.build/config#routerules
      // https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering
      '/': {
        swr: oneDayInSeconds,
        prerender: true
      },
      ...Object.assign(
        // merge the array of route config into a single object so we can spread it into routeRules
        {},
        ...API_ROUTES_TO_PRERENDER.map((routePath) => ({
          [routePath]: {
            swr: oneDayInSeconds,
            // The prerenders for API routes can increase build time by 10 minutes but it's
            // better than users waiting for responses.
            prerender: true
          }
        }))
      ),
      '/rfc/rfc**.json': {
        swr: oneDayInSeconds,
        prerender: false // there are too many RFCs to prerender them, but we can at least cache rendering via `swr`
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
