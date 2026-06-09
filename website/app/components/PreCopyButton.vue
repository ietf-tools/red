<template>
  <div :style="{ 'max-width': `${preWidthPx}px` }" class="relative text-right">
    <ButtonSuccessFailure
      v-if="Boolean(featureFlags.showPreCopyButton)"
      button-label="Copy"
      :click-handler="handleCopy"
      button-class="mb-2"
      bubble-container-class="absolute -right-10 top-0 pt-10"
      bubble-class="mx-auto shadow-3xl">
      {{
        featureFlags.showPreCopyButton === 'copy'
          ? 'Copy'
          : featureFlags.showPreCopyButton === 'unfolded-copy'
            ? 'Copy unfolded'
            : 'Copy unmodified source'
      }}
    </ButtonSuccessFailure>
  </div>
  <pre ref="preElement" v-bind="$attrs">
    <slot />
  </pre>
</template>

<script setup lang="ts">
import { BUBBLE_DURATION_MS } from '~/utilities/buttonSuccessFailure'
import type { ButtonResult, Message } from '~/utilities/buttonSuccessFailure'
import { copyToClipboard } from '~/utilities/clipboard'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { getRfc8792CopyText } from '~/utilities/rfc8792'

defineOptions({ inheritAttrs: false })

const isMounted = ref(false)

const preWidthPx = ref(
  320 // a default width that won't stretch layouts on mobile or wider. We can't use 0 as that would squash the button.
)

const featureFlags = useFeatureFlags()

const pre = useTemplateRef('preElement')

onMounted(() => {
  isMounted.value = true
  if (pre.value) {
    preWidthPx.value = pre.value.offsetWidth
  }
})

onUnmounted(() => {
  isMounted.value = false
})

const handleCopy = async (): Promise<ButtonResult> => {
  const preElement = pre.value
  if (preElement) {
    let txt = preElement.innerText
    if (txt) {
      const unfoldedTxt = getRfc8792CopyText(txt)
      txt = unfoldedTxt ?? txt
      const unfoldedMessage: Message[] =
        unfoldedTxt !== null ? [{ type: 'medium', innerText: '(text unfolded per RFC 8792)' }] : []

      if (await copyToClipboard(txt)) {
        return {
          type: 'success',
          message: [{ type: 'big', innerText: 'Text copied' }, ...unfoldedMessage],
          timeoutMs: BUBBLE_DURATION_MS
        }
      }
    }
  } else {
    console.error('Internal error: expected to find <pre>')
  }

  return {
    type: 'error',
    message: [{ type: 'big', innerText: 'Copy error.' }],
    timeoutMs: BUBBLE_DURATION_MS
  }
}
</script>
