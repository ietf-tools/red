// Feature logic for the account page's "Send email digest?" checkbox — whether this reader
// receives Reef's subscription digest by mail. Reef holds one preference per account rather than
// one row per subscription, so there's nothing to key this by and no reef store entry already
// holding it — the same shape as ~/utilities/reef-subscriptions.ts's new_rfc toggle, which this
// mirrors.

import { computed, onMounted, ref, watch, type Ref, type WritableComputedRef } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { LoadingStatus } from '~/utilities/loading-status'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useReefStore } from '~/stores/reef'
import { getDigestPreference, patchDigestPreference } from '~/utilities/reef'

export const digestPreferenceFailedNotification = (wasEnabling: boolean): Notification => ({
  id: 'digest-preference',
  title: wasEnabling ? 'Unable to turn on email digests' : 'Unable to turn off email digests',
  description: wasEnabling
    ? 'You have not been signed up for the email digest. Please try again.'
    : 'You are still signed up for the email digest. Please try again.',
  delayMs: 0,
  position: 'top',
  type: 'foreground'
})

/**
 * Whether this reader receives Reef's subscription digest by mail, as a model for the account
 * page's checkbox: loaded from Reef on mount, and written back when they tick or untick it.
 *
 * `status` is exposed alongside the checkbox model so a caller can hold off showing it until the
 * load settles — while it's in flight there's no true state to show yet, and an unticked box
 * would read as "off" rather than "not known yet".
 */
export const useDigestEmailPreference = (): {
  receivesDigestEmail: WritableComputedRef<boolean>
  status: Ref<LoadingStatus>
  load: () => Promise<void>
} => {
  const authStore = useAuthStore()
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()

  const receivesDigest = ref(false)
  const status = ref<LoadingStatus>({ type: 'idle' })

  const load = async () => {
    if (!authStore.isAuthenticated) {
      receivesDigest.value = false
      status.value = { type: 'idle' }
      return
    }
    status.value = { type: 'loading' }
    try {
      const preference = await getDigestPreference()
      receivesDigest.value = preference.receive_digest_email ?? false
      status.value = { type: 'success' }
    } catch (error) {
      console.error('Unable to load your email digest preference.', error)
      status.value = {
        type: 'error',
        message: 'Unable to load your email digest preference. See the web console for details.'
      }
    }
  }

  // Reef is browser-only, so the initial load happens on mount rather than during SSR; the watch
  // (not immediate — that's what onMounted is for) covers a reader who signs in or out while this
  // stays on screen.
  onMounted(load)
  watch(() => authStore.isAuthenticated, load)

  const write = async (receive: boolean) => {
    if (receive === receivesDigest.value) {
      return
    }
    const previous = receivesDigest.value
    receivesDigest.value = receive

    const outcome = await reefStore.runWrite(
      'digest-preference',
      (): Promise<void> => patchDigestPreference({ receive_digest_email: receive }).then(() => undefined)
    )

    if (outcome.status === 'failed') {
      receivesDigest.value = previous
      notificationsStore.add(digestPreferenceFailedNotification(receive))
      console.error('Unable to change your email digest preference.', outcome.error)
    }
  }

  const receivesDigestEmail = computed({
    get: () => receivesDigest.value,
    set: (receive) => {
      void write(receive)
    }
  })

  return { receivesDigestEmail, status, load }
}
