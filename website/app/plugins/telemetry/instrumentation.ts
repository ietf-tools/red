async function initializeTelemetry() {
  // See code comment below about why this is a dynamic import
  const [
    { BatchSpanProcessor, WebTracerProvider },
    { OTLPTraceExporter },
    { defaultResource, resourceFromAttributes },
    { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
    { ZoneContextManager },
    { getWebAutoInstrumentations },
    { registerInstrumentations }
  ] = await Promise.all([
    import('@opentelemetry/sdk-trace-web'),
    import('@opentelemetry/exporter-trace-otlp-proto'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/semantic-conventions'),
    import('@opentelemetry/context-zone'),
    import('@opentelemetry/auto-instrumentations-web'),
    import('@opentelemetry/instrumentation')
  ])

  const provider = new WebTracerProvider({
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'red',
        [ATTR_SERVICE_VERSION]: '0.0.1'
      })
    ),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: 'https://heimdall-otlp.ietf.org/v1/traces'
        })
      )
    ]
  })

  provider.register({
    contextManager: new ZoneContextManager()
  })

  registerInstrumentations({
    instrumentations: getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [new RegExp(`\\/api\\/*`)]
      }
    })
  })
}

const isVitest = typeof import.meta.env.VITEST !== 'undefined'

const name = 'opentelemetry-plugin'

export default defineNuxtPlugin({
  name,
  async setup() {
    if (isVitest) {
      /**
       * Importing the OTEL `@opentelemetry/*` libraries during a Vitest test fails with an error that looks like,
       *
       *   "Cannot find module 'website/node_modules/@opentelemetry/api/build/esm/baggage/utils' imported from website/node_modules/@opentelemetry/api/build/esm/index.js"
       *
       * This is seemingly caused by OTEL bundling quirks https://github.com/open-telemetry/opentelemetry-lambda/issues/1715#issuecomment-2685044356
       * rather than a missing dependency.
       *
       * The fix is to,
       * 1) Use lazy dynamic imports `import('@opentelementry/*')` so that we can conditionally import these libraries that would break Vitest
       * 2) When Vitest is detected don't call initializeTelemetry().
       *
       **/
      console.info(`${JSON.stringify(name)} is inactive during tests. This is intentional.`)
      return
    }
    initializeTelemetry()
  }
})
