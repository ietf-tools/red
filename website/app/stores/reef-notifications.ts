// This reader's own web notification feed (~/utilities/reef's `getNotifications`), kept for the
// life of the tab once loaded.
//
// Populated reactively rather than on demand: unlike ~/stores/reef, which loads a document's state
// only once some card asks for it, there's no per-page trigger for "show this reader's
// notifications" — the feed is meant to be there as soon as they're signed in, wherever they are on
// the site. So this store watches the signed-in subject itself and loads as soon as one appears,
// the same way ~/utilities/oidc's own comment describes ~/stores/reef doing for its own state.
// `initReefNotifications` (called once from app.vue) only exists to instantiate the store early
// enough for that watch to be listening before the first sign-in.

import type { AsyncDataRequestStatus } from 'nuxt/app'
import { useAuthStore } from '~/stores/auth'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type WebNotification
} from '~/utilities/reef'

export const useReefNotificationsStore = defineStore('reefNotifications', () => {
  const authStore = useAuthStore()

  const notifications = ref<WebNotification[]>([])
  const status = ref<AsyncDataRequestStatus>('idle')

  // Reef's cursor for the page after the one held, or undefined once there isn't one. Kept as the
  // bare cursor value rather than the `next` URL it arrived on: reefFetch always builds its own
  // request under reefBase, so a caller here has no use for a full URL, only the query param it
  // carries.
  const nextCursor = ref<string>()
  const hasMore = computed(() => nextCursor.value !== undefined)

  // Whose feed is held, so a response landing after a sign-out — or after a second reader signs in
  // on the same tab before the first request returns — is recognisable as stale and dropped.
  const subject = ref<string>()

  let loadController: AbortController | undefined

  const isReadable = computed(() => import.meta.client && authStore.isAuthenticated)

  const cursorFromNext = (next: string | null | undefined): string | undefined => {
    if (!next) {
      return undefined
    }
    try {
      return new URL(next).searchParams.get('cursor') ?? undefined
    } catch {
      // Not a URL this build can parse: treated as "no further page" rather than thrown, since a
      // malformed `next` is Reef's problem and the page already loaded is still good.
      return undefined
    }
  }

  const reset = (): void => {
    loadController?.abort()
    loadController = undefined
    notifications.value = []
    nextCursor.value = undefined
    status.value = 'idle'
  }

  // The first page, replacing whatever's held. Called automatically on sign-in below; exposed too,
  // for a "Try again" control after a failed load.
  const load = async (): Promise<void> => {
    if (!isReadable.value) {
      return
    }
    loadController?.abort()
    loadController = new AbortController()
    const { signal } = loadController
    const loadingFor = subject.value

    status.value = 'pending'
    try {
      const page = await getNotifications(undefined, signal)
      if (signal.aborted || subject.value !== loadingFor) {
        return
      }
      console.log('got', page.results)
      notifications.value = page.results
      nextCursor.value = cursorFromNext(page.next)
      status.value = 'success'
    } catch (error) {
      if (signal.aborted || subject.value !== loadingFor) {
        return
      }
      console.error('[reef] unable to load your notifications.', error)
      status.value = 'error'
    }
  }

  // An older page, appended after what's already held.
  const loadMore = async (): Promise<void> => {
    if (!isReadable.value || nextCursor.value === undefined) {
      return
    }
    const cursor = nextCursor.value
    const loadingFor = subject.value
    loadController ??= new AbortController()
    const { signal } = loadController
    try {
      const page = await getNotifications(cursor, signal)
      if (signal.aborted || subject.value !== loadingFor) {
        return
      }
      notifications.value = [...notifications.value, ...page.results]
      nextCursor.value = cursorFromNext(page.next)
    } catch (error) {
      if (signal.aborted || subject.value !== loadingFor) {
        return
      }
      console.error('[reef] unable to load more of your notifications.', error)
    }
  }

  // Marks one notification read, both locally (so a click's grey background shows straight away)
  // and in Reef. Reef's own operation is idempotent, so a second click, or one that races another
  // reader's tab, is never an error — it just confirms what's already shown.
  const markRead = async (id: number): Promise<void> => {
    const target = notifications.value.find((notification) => notification.id === id)
    if (!target || target.read) {
      return
    }
    notifications.value = notifications.value.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    )
    try {
      await markNotificationRead(id)
    } catch (error) {
      console.error('[reef] unable to mark this notification read.', error)
    }
  }

  // Marks everything read in Reef with one call, including pages not yet loaded here, and locally
  // for what is held.
  const markAllRead = async (): Promise<void> => {
    notifications.value = notifications.value.map((notification) => ({ ...notification, read: true }))
    try {
      await markAllNotificationsRead()
    } catch (error) {
      console.error('[reef] unable to mark your notifications read.', error)
    }
  }

  // The only thing that empties the feed, and what loads it for whoever signs in — including a
  // second reader replacing the first on the same tab, which is why this is keyed on the subject
  // rather than only on isAuthenticated flipping true.
  watch(
    () => authStore.user?.sub,
    (sub) => {
      subject.value = sub
      reset()
      if (sub !== undefined) {
        void load()
      }
    },
    // Synchronous, for the same reason as ~/stores/reef's identical watch: a queued watcher would
    // leave a gap where this store still held the previous reader's notifications after the auth
    // store had already moved on, and a response landing in that gap would find `subject` not yet
    // caught up and let their feed through.
    { immediate: true, flush: 'sync' }
  )

  return { notifications, status, hasMore, load, loadMore, markRead, markAllRead, reset }
})

export const filterNotificationsByUnread = (notifications: WebNotification[]): WebNotification[] =>
  notifications.filter((notification) => !notification.read)

// Called once from app.vue. The store does everything else itself once it exists — this only
// makes sure that happens early, so its watch is listening before the reader's session restores.
export const initReefNotifications = (): void => {
  useReefNotificationsStore()
}
