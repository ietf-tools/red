<template>
  <div class="container mx-auto">
    <div class="absolute pointer-events-none inset-0 overflow-hidden">
      <GraphicsIETFMotif
        class="absolute w-[90vw] h-[90vh] -left-[10vw] -top-[20vh] print:hidden"
        :opacity="0.04"
      />
      <GraphicsIETFMotif
        class="absolute w-[40vw] h-[40vh] left-[57vw] md:left-[47vw] xl:left-[37vw] top-[17vh] print:hidden"
        :opacity="0.04"
      />
    </div>
    <div class="lg:flex w-full">
      <Heading level="1" class="w-full mt-8 mb-3 pl-5 md:p-0 text-balance">
        The official home of RFCs
      </Heading>
      <div class="self-end lg:text-right">
        <AValidHref
          href="/series/rfc/"
          class="rounded text-blue-100 lg:text-white inline-block px-5 py-3 font-bold text-nowrap hover:bg-black"
        >
          What is an RFC?
          <GraphicsChevron class="-rotate-90 w-[16px] inline-block" />
        </AValidHref>
      </div>
    </div>

    <div class="lg:w-2/3 xl:w-1/2 mb-4">
      <p class="hidden leading-6 lg:block pl-5 md:p-0 text-pretty">
        RFCs outline computer networking and Internet foundations, including
        <AValidHref href="/standards/">Internet Standards</AValidHref>
        and historical or informative content. They are published by the RFC
        Editor for the
        <AValidHref :href="IETF_URL">
          <abbr title="Internet Engineering Task Force">IETF</abbr>
        </AValidHref>
        ,
        <AValidHref :href="IRTF_URL">
          <abbr title="Internet Research Task Force">IRTF</abbr>
        </AValidHref>
        ,
        <AValidHref :href="IAB_URL">
          <abbr title="Internet Architecture Board">IAB</abbr>
        </AValidHref>
        , and
        <AValidHref href="/authors/rfc-independent-submissions/">
          <abbr title="Independent Submission Editor">ISE</abbr>
        </AValidHref>
        , which collectively form the authoritative source for RFCs
      </p>
      <SearchBox />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IAB_URL, IETF_URL, IRTF_URL } from '~/utilities/url'
</script>
