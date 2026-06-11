<template>
  <div
    :style="{ 'max-width': `${preWidthPx}px` }"
    :class="`relative text-right ${
      // Copy to clipboard requires JS, so button shouldn't be in the server render, and
      // button should be revealed after mount.
      //
      // So we need a minimum height to allocate browser layout space until button is revealed.
      //
      // Minimum height value should be same height or slightly-taller than button height
      // to avoid layout shift
      'min-h-[2.5em]'
    }`">
    <ButtonSuccessFailure v-if="isMounted" :click-handler="handleCopy" button-class="mb-1">
      <Icon name="fluent:copy-16-regular" size="1.4em" alt="" class="text-black dark:text-white" />
      Copy
    </ButtonSuccessFailure>
  </div>
  <pre
    ref="preElement"
    v-bind="
      $attrs // in <pre> make sure no whitespace before/after <slot />
    "><slot /></pre>
</template>

<script setup lang="ts">
/**
 * Feature primarily developed by [Filip Skokan (Panva)](https://github.com/panva) see [PR](https://github.com/ietf-tools/red/pull/404).
 *
 * When the `<pre>` text is unfolded the success message says that text was modified from the raw `<pre>` innerText.
 *
 * It is intentional not to have multiple buttons to copy different variations of text.
 * Instead, users wanting the wrapped text must select the `<pre>` text like any other webpage text.
 *
 * See discussion on https://github.com/ietf-tools/red/pull/404
 */
import { BUBBLE_DURATION_MS } from '~/utilities/buttonSuccessFailure'
import type { ButtonResult, Message } from '~/utilities/buttonSuccessFailure'
import { copyToClipboard } from '~/utilities/clipboard'
import { getRfc8792CopyText } from '~/utilities/rfc8792'

defineOptions({ inheritAttrs: false })

const isMounted = ref(false)

const preWidthPx = ref(
  320 // a default width that won't stretch layouts on mobile or wider. We can't use 0 as that would squash the button.
)

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
