<template>
  <div
    v-if="featureFlags.isPublicationStreamActive"
    data-publication-stream
    class="flex flex-col sm:flex-row sm:items-center gap-x-4 sm:gap-x-8 gap-y-2 ml-2 mt-2 mb-4 print:hidden">
    <!-- The column sizes to its logo, so a wider logo takes more room without a fixed width. -->
    <template v-if="logo">
      <img
        :src="logo.light"
        alt=""
        :width="logo.width"
        :height="logo.height"
        :class="[LOGO_CLASSES, 'h-12 w-auto', logo.dark && 'dark:hidden']" />
      <!-- The inverted file has no padding in its viewBox but the light one does, so at the same box size its artwork
           renders about a quarter larger. This padding gives it the same box as the light file and the same artwork height. -->
      <img
        v-if="logo.dark"
        :src="logo.dark"
        alt=""
        :width="logo.width"
        :height="logo.height"
        :class="[LOGO_CLASSES, 'hidden dark:block h-12 w-[5.25rem] px-1.5 py-[0.305rem] object-contain']" />
    </template>
    <p class="text-xs">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import ietfLogo from 'assets/ietf-logo.svg'
import ietfLogoInverted from 'assets/ietf-nor-dense-inverted-duotone.svg'
import iabLogo from 'assets/iab-logo.svg'
import irtfLogo from 'assets/irtf-logo.svg'
import { useFeatureFlags } from '~/utilities/feature-flags'
import type { RfcCommon } from '~/utilities/rfc'
import { STREAM_MESSAGES } from '~/utilities/rfc-stream-message'

type Props = {
  rfc: RfcCommon
}

type Logo = {
  light: string
  // The size it displays at, in pixels, so the browser reserves its space before the file arrives and the text
  // beside it doesn't move when it loads. The height matches the image's height class.
  width: number
  height: number
  // Only for logos drawn in white, which vanish against a light page.
  dark?: string
}

const props = defineProps<Props>()

const featureFlags = useFeatureFlags()

const LOGO_CLASSES = 'shrink-0 self-start sm:self-center'

// The logo is decorative: the sentence beside it names the organisation. Streams without a logo are omitted.
const LOGOS: Partial<Record<RfcCommon['stream']['slug'], Logo>> = {
  IETF: { light: ietfLogo, dark: ietfLogoInverted, width: 84, height: 48 },
  IAB: { light: iabLogo, width: 100, height: 48 },
  IRTF: { light: irtfLogo, width: 67, height: 48 }
}

const logo = computed(() => LOGOS[props.rfc.stream.slug])
const message = computed(() => STREAM_MESSAGES[props.rfc.stream.slug])
</script>
