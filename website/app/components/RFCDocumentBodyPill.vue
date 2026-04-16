<template>
    <div class="flex ml-[1px] flex-row justify-between items-center flex-wrap print:justify-center">
        <div class="flex items-center gap-4 print:text-center">
            <Pill
                v-if="tagText.length > 0"
                size="normal"
                :text="tagText"
                class="print:mt-3 my-2"
            />
            <AValidHref
                href="/series/rfc-tips/"
                :class="ANCHOR_COLOR_TAILWIND_STYLE"
            >
                RFC Tips
            </AValidHref>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getRfcPillText } from '~/utilities/rfc'
import type { RfcCommon } from '~/utilities/rfc'
import { ANCHOR_COLOR_TAILWIND_STYLE } from '~/utilities/theme'

type Props = {
    rfc: RfcCommon
}

const props = defineProps<Props>()

const tagText = computed(() => getRfcPillText(props.rfc))
</script>
