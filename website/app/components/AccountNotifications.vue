<template>
  <div>
    <p
      v-if="loadingStatus.type === 'loading'"
      class="flex items-center gap-2 py-3"
      aria-live="polite"
      aria-atomic="true">
      <GraphicsLoading class="inline-block w-5 h-5" />
      Loading your notifications...
    </p>

    <AlertBox v-else-if="loadingStatus.type === 'error'" variant="warning" role="alert">
      <p>
        {{ loadingStatus.message }}
        <button type="button" class="underline cursor-pointer" @click="load">Try again</button>
      </p>
    </AlertBox>

    <template v-else-if="loadingStatus.type === 'success'">
      <ul v-if="subscriptions.length > 0" class="flex flex-col gap-2 py-3">
        <li v-for="subscription in subscriptions" :key="subscription.id" class="border rounded px-3 py-2">
          <span class="font-bold">{{ subscriptionLabel(subscription) }}</span>
          <span v-if="subscriptionParamsSummary(subscription)" class="block">
            {{ subscriptionParamsSummary(subscription) }}
          </span>
          <span v-if="!subscription.verified" class="block italic"> Awaiting email verification </span>
        </li>
      </ul>
      <p v-else class="italic py-3">You have no notifications yet.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * The account page's list of notification subscriptions.
 *
 * Only rendered for a signed-in user — the caller is responsible for that check — and the
 * Reef API client is browser-only, so the fetch happens on mount rather than during SSR.
 */
import type { LoadingStatus } from '~/utilities/loading-status'
import { getSubscriptions, ReefError, type Subscription } from '~/utilities/reef'
import { sortSubscriptions, subscriptionLabel, subscriptionParamsSummary } from '~/utilities/subscriptions'

const loadingStatus = ref<LoadingStatus>({ type: 'idle' })
const subscriptions = ref<Subscription[]>([])

// One controller per attempt so that unmounting, or a retry click landing while the previous
// request is still open, abandons the older request instead of letting it set state later.
let controller: AbortController | undefined

const load = async () => {
  controller?.abort()
  controller = new AbortController()
  const { signal } = controller

  loadingStatus.value = { type: 'loading' }

  try {
    const loaded = await getSubscriptions(signal)
    subscriptions.value = sortSubscriptions(loaded)
    loadingStatus.value = { type: 'success' }
  } catch (error) {
    if (signal.aborted) {
      // superseded by a newer attempt, or the component has gone away
      return
    }
    console.error('Unable to load notification subscriptions.', error)
    loadingStatus.value = {
      type: 'error',
      message:
        error instanceof ReefError && error.status === 403
          ? "You don't have permission to view these notifications."
          : 'Unable to load your notifications. See the web console for details.'
    }
  }
}

onMounted(load)

onBeforeUnmount(() => {
  controller?.abort()
})
</script>
