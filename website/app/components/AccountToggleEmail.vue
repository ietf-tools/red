<template>
  <section aria-labelledby="account-toggle-email-heading">
    <Heading id="account-toggle-email-heading" level="2">Send email digest?</Heading>

    <p v-if="status.type === 'loading'" class="flex items-center gap-2 py-3" aria-live="polite" aria-atomic="true">
      <GraphicsLoading class="inline-block w-5 h-5" />
      Loading...
    </p>

    <AlertBox v-else-if="status.type === 'error'" variant="warning" role="alert">
      <p>
        {{ status.message }}
        <button type="button" class="underline cursor-pointer" @click="load">Try again</button>
      </p>
    </AlertBox>

    <CheckboxRoot
      v-else-if="status.type === 'success'"
      v-model="receivesDigestEmail"
      class="flex items-start gap-2 cursor-pointer w-full text-left py-3">
      <span
        class="inline-flex shrink-0 items-center justify-center w-[20px] h-[20px] mt-0.5 border-1 rounded border-current/60">
        <CheckboxIndicator>
          <GraphicsCheckmark class="block w-[14px] h-[14px]" />
        </CheckboxIndicator>
      </span>
      <span>Send me a digest of my subscriptions by email</span>
    </CheckboxRoot>
  </section>
</template>

<script setup lang="ts">
/**
 * The account page's "Send email digest?" checkbox, for whether this reader receives Reef's
 * subscription digest by mail.
 *
 * Only rendered for a signed-in user — the caller is responsible for that check. The checkbox
 * itself waits on `status` reaching 'success' before it shows: while the load is still in flight
 * there's no true state to tick it to, and showing it unticked would read as "off" rather than
 * "not known yet".
 */
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { useDigestEmailPreference } from '~/utilities/reef-digest-preference'

const { receivesDigestEmail, status, load } = useDigestEmailPreference()
</script>
