<template>
  <div class="abnf-section">
    <div v-if="hasRules" class="abnf-zoom-bar" role="group" aria-label="Diagram zoom">
      <button
        type="button"
        class="abnf-zoom-btn"
        :disabled="zoom <= MIN_ZOOM"
        aria-label="Zoom out"
        @click="adjustZoom(-STEP)">
        −
      </button>
      <output class="abnf-zoom-value">{{ zoomLabel }}</output>
      <button
        type="button"
        class="abnf-zoom-btn"
        :disabled="zoom >= MAX_ZOOM"
        aria-label="Zoom in"
        @click="adjustZoom(+STEP)">
        +
      </button>
    </div>

    <!-- aria-hidden is on the diagram container, not the outer wrapper, so the
         zoom controls above remain in the accessibility tree. aria-hidden hides
         from AT but does not remove keyboard focus, so if the buttons were
         inside it they would create phantom Tab stops — the same problem
         addressed by focusable="false" on each SVG in abnf-railroad.ts. -->
    <div ref="containerRef" class="abnf-diagrams" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
type Props = { abnfText: string }
const props = defineProps<Props>()

const containerRef = ref<HTMLDivElement>()
const hasRules = ref(false)

// 50 % is the practical floor — diagrams become illegible below it.
// 300 % keeps even long rules legible at large base font sizes.
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const STEP = 0.25

const zoom = ref(1)
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)

function adjustZoom(delta: number) {
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((zoom.value + delta) * 100) / 100))
}

// Zoom by mutating the SVG width/height attributes rather than CSS
// transform: scale(). transform scales visually but does not affect layout
// dimensions, so the overflow-x scroll container would still measure the
// original size and the scrollable area would not grow with the diagram.
// Mutating width/height updates layout correctly because the library always
// emits a viewBox, so the coordinate space re-maps without distortion.
watch(zoom, (z) => {
  const container = containerRef.value
  if (!container) {
    console.log('[internal error] Container not found during zoom')
    return
  }
  for (const svg of container.querySelectorAll<SVGSVGElement>('svg.railroad-diagram')) {
    const nw = parseFloat(svg.dataset.naturalWidth ?? '0')
    const nh = parseFloat(svg.dataset.naturalHeight ?? '0')
    if (nw > 0 && nh > 0) {
      svg.setAttribute('width', String(Math.round(nw * z)))
      svg.setAttribute('height', String(Math.round(nh * z)))
    }
  }
})

onMounted(async () => {
  const el = containerRef.value
  if (!el) {
    console.log('[Internal error] container not found onMounted().')
    return
  }
  try {
    const { renderAbnfDiagrams } = await import('~/utilities/abnf-railroad')
    renderAbnfDiagrams(props.abnfText, el)
    hasRules.value = el.children.length > 0
  } catch (e) {
    console.warn('[ABNF diagrams]', e)
  }
})
</script>

<style>
/* ── railroad-diagrams base styles ───────────────────────────────────────── */
svg.railroad-diagram {
  background-color: hsl(30, 20%, 95%);
  border-radius: 4px;
  display: block;
}

svg.railroad-diagram path {
  stroke-width: 3;
  stroke: black;
  fill: rgba(0, 0, 0, 0);
}

svg.railroad-diagram text {
  font: bold 14px monospace;
  text-anchor: middle;
}

svg.railroad-diagram text.label {
  text-anchor: start;
}

svg.railroad-diagram text.comment {
  font: italic 12px monospace;
}

svg.railroad-diagram rect {
  stroke-width: 3;
  stroke: black;
  fill: hsl(120, 100%, 90%);
}

/* ── dark mode ───────────────────────────────────────────────────────────── */
html.dark svg.railroad-diagram {
  background-color: hsl(30, 10%, 15%);
}

html.dark svg.railroad-diagram path {
  stroke: hsl(30, 20%, 75%);
}

html.dark svg.railroad-diagram text {
  fill: hsl(30, 20%, 85%);
  stroke: none;
}

html.dark svg.railroad-diagram rect {
  stroke: hsl(120, 30%, 55%);
  fill: hsl(120, 30%, 22%);
}

/* ── zoom controls ───────────────────────────────────────────────────────── */
.abnf-zoom-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.abnf-zoom-btn {
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: 1px solid currentColor;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.1s;
}

.abnf-zoom-btn:hover:not(:disabled) {
  opacity: 1;
}

.abnf-zoom-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.abnf-zoom-value {
  font-family: monospace;
  font-size: 0.75rem;
  min-width: 2.8rem;
  text-align: center;
  display: inline-block;
}

/* ── diagram container layout ────────────────────────────────────────────── */
.abnf-diagrams {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-block: 0.75rem;
}

.abnf-rule-diagram {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.abnf-rule-label {
  font-family: monospace;
  font-size: 0.85em;
  opacity: 0.6;
  margin: 0;
  padding-left: 2px;
}

.abnf-diagram-svg-wrap {
  overflow-x: auto;
  overflow-y: hidden;
}
</style>
