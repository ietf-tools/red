<template>
    <component :is="formattedAuthor" />
</template>

<script setup lang="ts">
import type { RfcCommonAuthor } from '../utilities/rfc-validators'

type Props = {
    author: RfcCommonAuthor
}

const props = defineProps<Props>()

// Author is formatted with some very specific whitespace which is harder to do in a Vue template
// so we'll use `h()` render functions to generate a formatted author
const formattedAuthor = computed(() => {
    // titlepage_name can have trailing spaces which affects rendering of comma-separated lists
    // we want 'name, name, name' NOT 'name , name , name '
    // or 'name, Ed., name, name' NOT 'name , Ed., name , name '
    const normalised_titlepage_name = props.author.titlepage_name?.trim()

    return h('span', [
        // titlepage_name might be an empty string, so don't use `??` as fallback, use `||`
        `${normalised_titlepage_name || '(unnamed)'}`,
        ...[
            props.author.is_editor ? [
                ', ',
                h('abbr', { title: 'Editor', class: 'no-underline' }, 'Ed.')
            ] : []
        ]
    ])
})
</script>