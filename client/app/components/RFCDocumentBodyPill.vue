<template>
    <div class="flex ml-2 flex-row justify-between items-center flex-wrap print:justify-center">
        <div class="flex align-middle print:text-center">
            <Pill
                v-if="tagText.length > 0"
                size="normal"
                :text="tagText"
                class="print:mt-3 my-2"
            />
            <PopoverRoot>
                <PopoverTrigger class="p-2 cursor-help print:hidden">
                    <GraphicsQuestionMarkCircle />
                </PopoverTrigger>

                <PopoverPortal to="body">
                    <PopoverContent
                        class="shadow-lg border-1 bg-white dark:bg-black dark:shadow-blue-900 border-gray-400 flex flex-col px-3 py-1 rounded"
                    >
                        <PopoverArrow
                            class="fill-white stroke-gray-400 dark:fill-black dark:stroke-gray-300 relative -top-[1px]"
                        />
                        <p class="text-balance">
                            For the definition of <b>Status</b>, see
                            <A
                                :href="infoSeriesPathBuilder('rfc2026')"
                                :class="ANCHOR_TAILWIND_STYLE"
                            >
                                <component :is="formatTitleAsVNode('rfc2026')" />
                            </A>.
                        </p>
                        <p class="text-balance">
                            For the definition of <b>Stream</b>, see
                            <A
                                :href="infoSeriesPathBuilder('rfc8729')"
                                :class="ANCHOR_TAILWIND_STYLE"
                            >
                                <component :is="formatTitleAsVNode('rfc8729')" />
                            </A>.
                        </p>
                    </PopoverContent>
                </PopoverPortal>
            </PopoverRoot>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    PopoverArrow,
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger
} from 'reka-ui'
import {
    formatTitleAsVNode,
    getRfcPillText,
    type RfcCommon
} from '~/utilities/rfc'
import { ANCHOR_TAILWIND_STYLE } from '~/utilities/theme'
import { infoSeriesPathBuilder } from '~/utilities/url'

type Props = {
    rfc: RfcCommon
}

const props = defineProps<Props>()

const tagText = computed(() => getRfcPillText(props.rfc))
</script>
