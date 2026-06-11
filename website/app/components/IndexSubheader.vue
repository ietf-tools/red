<template>
  <div class="container mx-auto pl-5 pr-3">
    <div class="absolute pointer-events-none inset-0 overflow-hidden">
      <GraphicsIETFMotif class="absolute w-[90vw] h-[90vh] -left-[10vw] -top-[20vh] print:hidden" :opacity="0.04" />
      <GraphicsIETFMotif
        class="absolute w-[40vw] h-[40vh] left-[57vw] md:left-[47vw] xl:left-[37vw] top-[17vh] print:hidden"
        :opacity="0.04" />
    </div>
    <div class="lg:flex w-full">
      <Heading level="1" style-level="1" class="w-full mt-4 md:mt-6 xs:mt-12 md:mb-3 px-2 font-semibold text-balance">
        The official home of RFCs
      </Heading>
      <div class="self-end lg:text-right">
        <AValidHref
          href="/series/rfc/"
          class="rounded text-blue-100 border-1 border-transparent lg:text-white inline-block px-2 md:px-5 py-2 md:py-3 font-semibold whitespace-nowrap hover:bg-black focus:bg-black hover:border-blue-400 focus:border-blue-400">
          What is an RFC?
          <GraphicsChevron class="-rotate-90 w-[16px] inline-block" />
        </AValidHref>
      </div>
    </div>

    <div class="lg:w-2/3 xl:w-1/2 mb-2 md:mb-4 md:pt-2 md:pl-2">
      <p class="mb-4 px-2 md:px-0">
        Welcome to the new RFC-Editor.org website. Read
        <Anchor href="https://www.ietf.org/blog/new-tools-coming-for-editing-and-publishing-rfcs/">
          this recent blog post for more details about the new suite
          <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" />
        </Anchor>
        of modern tools for editing and publishing RFCs.
      </p>
      <p class="hidden leading-6 lg:block pl-5 md:p-0 text-pretty">
        RFCs outline computer networking and Internet foundations, including
        <AValidHref :href="searchPathBuilder({ status: ['Internet Standard'] })">Internet Standards</AValidHref>
        and historical or informative content. They are published by the RFC Editor for the
        <AValidHref :href="IETF_URL_ORIGIN">
          <abbr title="Internet Engineering Task Force">IETF</abbr>
          <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" /> </AValidHref
        >,
        <AValidHref :href="IRTF_URL_ORIGIN">
          <abbr title="Internet Research Task Force">IRTF</abbr>
          <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" /> </AValidHref
        >,
        <AValidHref :href="IAB_URL_ORIGIN">
          <abbr title="Internet Architecture Board">IAB</abbr>
          <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" /> </AValidHref
        >, and
        <AValidHref href="/authors/rfc-independent-submissions/">
          <abbr title="Independent Submission Editor">ISE</abbr>
          <Icon name="fluent:window-new-20-regular" class="text-lg align-middle ml-1" /> </AValidHref
        >, which collectively form the authoritative source for RFCs.
      </p>
      <IndexSubheaderSearchBox />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IAB_URL_ORIGIN, IETF_URL_ORIGIN, IRTF_URL_ORIGIN, searchPathBuilder } from '~/utilities/url'
</script>
