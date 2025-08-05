<template>
  <footer class="bg-blue-900 text-white dark:bg-blue-950 relative print:hidden">
    <div class="container mx-auto flex flex-col md:flex-row py-4 lg:py-8 gap-4">
      <div class="flex-1 flex flex-col gap-5 pr-4">
        <p class="text-base pl-3">
          rfc-editor.org is maintained by the
          <A
            :href="IETF_URL"
            class="underline text-blue-100 font-semibold md:text-nowrap"
            >Internet Engineering Task Force</A
          >
          and funded by the
          <A
            :href="INTERNET_SOCIETY_URL"
            class="underline text-blue-100 font-semibold md:text-nowrap"
          >
            Internet Society
          </A>
        </p>
        <div class="flex gap-7 items-center mt-2 pl-3 lg:mt-5">
          <A :href="IETF_URL">
            <GraphicsIETFLogo width="105" height="60" />
          </A>
          <A :href="INTERNET_SOCIETY_URL">
            <GraphicsInternetSocietyLogo width="112" height="36" />
          </A>
        </div>
      </div>
      <div class="flex-1 flex flex-col lg:flex-row gap-10 p-3 lg:p-0">
        <div v-for="(menuItem, index) in menuData" :key="index">
          <Heading level="4" class="text-base text-white">
            {{ menuItem.label }}
          </Heading>
          <ul class="mt-3 flex flex-col gap-2">
            <li
              v-for="(child, childIndex) in menuItem.children"
              :key="childIndex"
              class="text-base"
            >
              <A :href="child.href" class="underline text-white md:text-nowrap">
                {{ child.label }}
              </A>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { IETF_URL, INTERNET_SOCIETY_URL } from '../utilities/url'
import { menuData } from './FooterNavData'
</script>
