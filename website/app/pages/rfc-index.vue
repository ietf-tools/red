<template>
  <div class="min-h-screen">
    <NuxtLayout name="default">
      <div class="container mx-auto">
        <Heading level="1" style-level="2" class="text-left mt-10 mb-4 pl-5"> RFC Index </Heading>
        <div @click="handleAnchorClick">
          <RFCIndexTable :canonicalPath="canonicalPath" />
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { RFC_INDEX_PATH } from '~/utilities/url'

const route = useRoute()

const canonicalPath = RFC_INDEX_PATH

if (
  // only compare route.path not route.fullPath as that will clobber ?search#id params
  route.path !== canonicalPath
) {
  await navigateTo({
    path: canonicalPath
  })
}

const router = useRouter()

/**
 * The RFCIndexPageTable.server.vue renders HTML on the server
 * which means SPA nav <a> links will be conventional href navigation,
 * not SPA nav links, so we'll capture bubbling events and navigate via SPA
 */
const handleAnchorClick = (e: Event) => {
  const { target } = e
  if (!(target instanceof HTMLElement)) {
    console.log('Click from non-HTMLElement, ignoring')
    return
  }
  const anchor = target.closest('a')
  if (!(anchor instanceof HTMLAnchorElement)) {
    console.log('Click from non-<a>, ignoring')
    return
  }
  const href = anchor.getAttribute('href')
  if (!href) {
    return
  }
  console.log('Intercepted <a> click from server rendered component. Overriding link click with SPA navigation')
  e.preventDefault()
  router.push(href)
}

definePageMeta({
  layout: false
})
</script>
