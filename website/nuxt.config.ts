import tailwindcss from '@tailwindcss/vite'

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
    'nuxt-vitalizer'
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
    preference: 'system',
    fallback: 'light'
  },
  eslint: {
    config: {
      stylistic: true
    }
  },
  css: ['~/assets/css/tailwind.css'],
  vitalizer: {
    disablePrefetchLinks: true,
    disablePreloadLinks: true
  },
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
      // These settings are available client-side (others are server-side only). The following are default values overriden by env varss
      datatrackerBase: 'http://localhost:8000', // NUXT_PUBLIC_DATATRACKER_BASE env var
      siteBase: 'https://www.rfc-editor.org', // NUXT_PUBLIC_SITE_BASE env var
      apiV1Base: '', // NUXT_PUBLIC_API_V1_BASE env var
      errataBase: 'https://errata.rfc-editor.org', // NUXT_PUBLIC_ERRATA_BASE env var
      queueBase: 'https://queue.rfc-editor.org', // NUXT_PUBLIC_QUEUE_BASE env var
      materialsBase: 'https://materials.rfc-editor.org', // NUXT_PUBLIC_MATERIALS_BASE env var
      iadBase: 'https://iad.rfc-editor.org', // NUXT_PUBLIC_IAD_BASE env var
      dashboardBase: 'https://dashboard.rfc-editor.org', // NUXT_PUBLIC_DASHBOARD_BASE env var
      matomoSiteId: '12', // NUXT_PUBLIC_MATOMO_SITE_ID
      typesenseApiKey: '2Ic06V287miUyJ32ee25q0ccXK0Dr3RO', // NUXT_PUBLIC_TYPESENSE_API_KEY Be sure to use an API key that only allows search operations
      typesenseHost: 'typesense.ietf.org', // NUXT_PUBLIC_TYPESENSE_HOST
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
  // $development: {
  //   routeRules: {
  //     /**
  //      * In development mode (`npm run dev`) the website fetches API data from either a local dev api or some
  //      * staging / prod environment.
  //      * Uncomment/comment out the lines to adjust the config.
  //      */
  //     '/api/v1/homepage-latest.json': {
  //       proxy: 'https://www.staging.rfc-editor.org/api/v1/homepage-latest.json'
  //       // proxy: 'http://localhost:3001/api/v1/homepage-latest.json'
  //     },
  //     '/api/v1/rfc-html/**': {
  //       proxy: 'https://www.staging.rfc-editor.org/api/v1/rfc-html/**'
  //       // proxy: 'http://localhost:3001/api/v1/rfc-html/**'
  //     },
  //     '/api/v1/info-subseries/**': {
  //       proxy: 'https://www.staging.rfc-editor.org/api/v1/info-subseries/**'
  //       // proxy: 'http://localhost:3001/api/v1/info-subseries/**'
  //     },
  //     '/api/v1/rfc-common/**': {
  //       proxy: 'https://www.staging.rfc-editor.org/api/v1/rfc-common/**'
  //       // proxy: 'http://localhost:3001/api/v1/rfc-common/**'
  //     },
  //   },
  // }
})
