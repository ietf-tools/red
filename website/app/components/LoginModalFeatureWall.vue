<template>
  <div>
    <ul class="flex flex-col items-center md:flex-row gap-2">
      <li class="max-w-54 md:max-w-auto flex-1 flex flex-col items-center gap-1 md:gap-2">
        <GraphicsStarFilled class="inline-block w-[24px] h-[24px] text-yellow-200 dark:text-yellow-700" />
        <Heading level="3" style-level="5" class="text-center"> Rate RFCs</Heading>
        <p class="text-sm text-center text-gray-800">Give feedback about an RFC by giving it a star rating</p>
      </li>
      <li
        class="max-w-54 md:max-w-auto flex-1 flex flex-col items-center gap-1 md:gap-2 md:px-2 md:border-r-1 md:border-l-1 md:border-gray-200">
        <GraphicsAlert class="inline-block w-[24px] h-[24px]" />
        <Heading level="3" style-level="5" class="text-center"> Subscribe to RFCs</Heading>
        <p class="text-sm text-center text-gray-800">Get notified when there's news about a published RFC</p>
      </li>
      <li class="max-w-54 md:max-w-auto flex-1 flex flex-col items-center gap-1 md:gap-2">
        <GraphicsStackAddRegular class="inline-block w-[24px] h-[24px]" />
        <Heading level="3" style-level="5" class="text-center"> Create RFC sets</Heading>
        <p class="text-sm text-center text-gray-800">Organise the RFCs most useful to you and your projects</p>
      </li>
    </ul>
    <ul class="mt-8 mb-4 flex flex-row justify-center items-center gap-4">
      <li>
        <a :href="registerUrl" class="inline-block bg-blue-800 text-white px-3 py-2 no-underline rounded font-bold"
          >Create an account</a
        >
      </li>
      <li>
        <button
          @click="oidcLogin"
          class="inline-block text-blue-800 border-1 border-blue-800 px-3 py-2 rounded font-bold">
          Sign in
        </button>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { oidcLogin } from '~/utilities/oidc'
import { useOidcRegisterUrl } from '~/utilities/url'

const registerUrl = useOidcRegisterUrl()
</script>
