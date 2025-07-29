<template>
    <div class="flex ml-2 flex-row justify-between items-center flex-wrap">
        <div class="flex align-middle">
            <Pill
                v-if="tagText.length > 0"
                size="normal"
                :text="tagText"
                class="print:m-0 my-2"
            />
            <PopoverRoot>
                <PopoverTrigger class="p-2 cursor-help">
                    <GraphicsQuestionMarkCircle />
                </PopoverTrigger>

                <PopoverPortal to="body">
                    <PopoverContent
                        class="shadow-lg border-1 bg-white dark:bg-black dark:shadow-blue-900 border-gray-400 flex flex-col px-3 py-1 rounded"
                    >
                        <PopoverArrow
                            class="fill-white stroke-gray-400 dark:fill-black dark:stroke-gray-300 relative -top-[1px]"
                        />
                        <p>
                            For the definition of <b>Status</b>, see
                            <A
                                :href="infoRfcPathBuilder('rfc2026')"
                                :class="ANCHOR_TAILWIND_STYLE"
                            >
                                <component :is="formatTitleAsVNode('rfc2026')" />
                            </A>.
                        </p>
                        <p>
                            For the definition of <b>Stream</b>, see
                            <A
                                :href="infoRfcPathBuilder('rfc8729')"
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
import { infoRfcPathBuilder } from '~/utilities/url'

type Props = {
    rfc: RfcCommon
}

const props = defineProps<Props>()

const tagText = computed(() => getRfcPillText(props.rfc))
</script>
