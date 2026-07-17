import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// inserted in the <head> some inline JS to determine scrollbar width so that CSS can use it in calc()
// this is intentionally inserted in the <head> so that it runs immediately in the browser
const scrollbarWidthInlineJS = `function _updateScrollbarWidth(){if(!document.body||!document.body.style)return;document.body.style.setProperty('--rfc-editor-org-scrollbar-width',(window.innerWidth-document.documentElement.clientWidth)+'px')}window.addEventListener('resize', _updateScrollbarWidth, false);document.addEventListener('DOMContentLoaded', _updateScrollbarWidth, false);window.addEventListener('load', _updateScrollbarWidth);window.setInterval(_updateScrollbarWidth,1000)`

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-05',
  devtools: { enabled: false },
  typescript: { strict: true },
  modules: [
    // Note: don't use 'Nuxt Device' see note in hasTouch.ts
    'reka-ui/nuxt',
    '@nuxt/test-utils/module',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    './modules/color-mode/module.ts',
    'nuxt-vitalizer'
  ],
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light'
  },
  experimental: {
    componentIslands: true
  },
  css: ['~/assets/css/tailwind.css'],
  vitalizer: {
    disablePrefetchLinks: true,
    disablePreloadLinks: true
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        preserveEntrySignatures: 'strict',
        output: {
          preserveModules: false,
          manualChunks(id) {
            if (id.includes('node_modules/luxon')) {
              return 'vendor-luxon'
            }
            // if (id.includes('node_modules/nuxt') || id.includes('node_modules/@nuxt')) {
            //   return 'vendor-nuxt'
            // }
            if (id.includes('app/components/content')) {
              return 'components-content'
            }
            if (id.includes('app/components/Graphics')) {
              return 'components-graphics'
            }
            if (id.includes('app/components/RFC')) {
              return 'components-rfc'
            }
            if (id.includes('app/components/TableOf')) {
              return 'components-tableof'
            }
            if (id.includes('app/components/Table')) {
              return 'components-table'
            }
            if (id.includes('app/components/Vertical') || id.includes('app/components/Horizontal')) {
              return 'components-vertical-horizontal'
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'es-toolkit',
        'es-toolkit/compat',
        'luxon',
        'zod',
        '@vueuse/core',
        'core-js/actual/array/to-sorted',
        'vue-instantsearch/vue3/es',
        'typesense-instantsearch-adapter/src/TypesenseInstantsearchAdapter.js'
      ]
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
      // These settings are available client-side (others are server-side only). The following are default values overriden by env varss
      datatrackerBase: 'http://localhost:8000', // NUXT_PUBLIC_DATATRACKER_BASE env var
      siteBase: 'https://www.rfc-editor.org', // NUXT_PUBLIC_SITE_BASE env var
      apiV1Base: '', // NUXT_PUBLIC_API_V1_BASE env var
      errataBase: 'https://errata.rfc-editor.org', // NUXT_PUBLIC_ERRATA_BASE env var
      queueBase: 'https://queue.rfc-editor.org', // NUXT_PUBLIC_QUEUE_BASE env var
      iadBase: 'https://iad.rfc-editor.org', // NUXT_PUBLIC_IAD_BASE env var
      dashboardBase: 'https://dashboard.rfc-editor.org', // NUXT_PUBLIC_DASHBOARD_BASE env var
      matomoSiteId: '12', // 12 is Red non-production ie local dev. Otherwise will be provided by env var NUXT_PUBLIC_MATOMO_SITE_ID
      typesenseApiKey: '2Ic06V287miUyJ32ee25q0ccXK0Dr3RO', // NUXT_PUBLIC_TYPESENSE_API_KEY Be sure to use an API key that only allows search operations
      typesenseHost: 'typesense.staging.ietf.org', // NUXT_PUBLIC_TYPESENSE_HOST
      websiteVersion: version
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
  plugins: [
    // '~/plugins/telemetry/instrumentation'
  ],
  app: {
    buildAssetsDir: `/_nuxt/${version}/`,
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      link: [
        { rel: 'preconnect', href: 'https://static.ietf.org' },
        {
          rel: 'stylesheet',
          href: 'https://static.ietf.org/fonts/inter/import.css'
        }
      ],
      script: [
        {
          innerHTML: scrollbarWidthInlineJS
        }
      ]
    }
  },
  $development: {
    routeRules: {
      /**
       * In development mode (`npm run dev`) the website fetches API data from either a local dev api or some
       * staging / prod environment.
       * Uncomment/comment out the lines to adjust the config.
       */
      '/api/v1/**': {
        proxy: 'https://www.rfc-editor.org/api/v1/**'
        // proxy: 'http://localhost:3001/api/v1/**'
      }
    }
  },
  devServer: {
    host: '0.0.0.0'
  }
})
