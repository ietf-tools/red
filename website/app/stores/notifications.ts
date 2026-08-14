/**
 * A queue of site notifications that are displayed as toasts.
 *
 * Each notification is displayed after its own `delayMs` has elapsed, which is
 * measured from when the notification was added to the queue (or, for
 * notifications that were in the queue before the client mounted, from the
 * moment the client mounted).
 *
 * Closing a toast and dismissing it are different acts. Closing — the toast's close button,
 * a swipe, or the duration running out — only takes it off the screen, and it is offered
 * again on the next page load. Dismissing is the user saying they're finished with it: only
 * notifications that opt in with `allowDismiss` offer it, and only a dismissal is recorded in
 * localStorage, which stops that notification being shown on this device again.
 */

import { z } from 'zod'

const DismissedIdsSchema = z.string().array()

const LOCALSTORAGE_KEY = 'notifications-dismissed'

export type NotificationPosition = 'top' | 'bottom'

export type Notification = {
  id: string
  title: string
  description?: string
  url?: string
  /**
   * Delay in milliseconds, after which the toast is displayed
   */
  delayMs: number
  /**
   * How long in milliseconds the toast stays on screen once displayed, defaulting to
   * DEFAULT_TOAST_DURATION_MS. The countdown pauses while the toast is hovered or focused.
   * `Number.POSITIVE_INFINITY` (or any value at or below zero) leaves it up until the user
   * dismisses it.
   */
  durationMs?: number
  /**
   * Which corner the toast appears in, defaulting to DEFAULT_TOAST_POSITION. Each position is
   * a separate toast viewport, so this also decides which group the toast stacks with.
   */
  position?: NotificationPosition
  /**
   * Whether the toast is announced assertively by screen readers. Use `foreground` for a
   * toast that's a direct result of something the user just did (eg. confirming a sign-in),
   * and `background` for one that arrives unprompted. Defaults to `background`.
   */
  type?: 'background' | 'foreground'
  /**
   * Whether the toast offers a Dismiss button, for a notification the user can be finished
   * with — typically an announcement they're only meant to read once. Defaults to false,
   * which is right for a toast reporting something that just happened: there's nothing to be
   * finished with, and a confirmation must never be suppressed by something the user did on
   * an earlier one.
   */
  allowDismiss?: boolean
}

const PLACEHOLDER_NOTIFICATIONS: Notification[] = [
  {
    id: 'placeholder',
    title: 'Placeholder notification',
    description: 'This is a placeholder notification to demonstrate the toast queue.',
    url: '/info/rfc9000/',
    delayMs: 2000,
    // Stays up until the user decides. An announcement is meant to be read once, and this is
    // the toast that offers Dismiss — timing out would take that choice off the screen before
    // they'd made it, though it would now be offered again on the next page load.
    durationMs: Number.POSITIVE_INFINITY,
    position: 'bottom',
    allowDismiss: true
  }
]

export const useNotificationsStore = defineStore('notifications', () => {
  const queue = ref<Notification[]>([...PLACEHOLDER_NOTIFICATIONS])
  const visibleIds = ref<string[]>([])
  const dismissedIds = ref<string[]>([])
  const hasLoadedDismissedIds = ref(false)

  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const visibleNotifications = computed(() => queue.value.filter(({ id }) => visibleIds.value.includes(id)))

  const loadDismissedIds = () => {
    hasLoadedDismissedIds.value = true
    try {
      const valString = window.localStorage.getItem(LOCALSTORAGE_KEY)
      if (!valString) {
        // no value in local storage
        return
      }
      const val = JSON.parse(valString)
      const { data, error } = DismissedIdsSchema.safeParse(val)
      if (error || !data) {
        const errorTitle = 'Unable to validate dismissed notifications JSON. Resetting localStorage config.'
        console.log(`[rfc-notifications] ${errorTitle}`, error, valString)
        window.localStorage.removeItem(LOCALSTORAGE_KEY)
        return
      }
      dismissedIds.value = data
    } catch (e: unknown) {
      const errorTitle = `Error loading from localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-notifications] ${errorTitle}`, e)
    }
  }

  const saveDismissedIds = () => {
    try {
      window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(dismissedIds.value))
    } catch (e: unknown) {
      const errorTitle = `Error writing to localStorage (this is expected behaviour if localStorage is disabled). ${e}`
      console.log(`[rfc-notifications] ${errorTitle}`, e)
    }
  }

  const findById = (id: string) => queue.value.find((item) => item.id === id)

  const isDismissed = (notification: Notification) => {
    const { id, allowDismiss } = notification
    if (!allowDismiss) {
      // nothing can dismiss this notification, so no stored id can suppress it — including a
      // leftover one under the same id, which must never silence a confirmation
      return false
    }
    if (!import.meta.client) {
      // localStorage is per-device so dismissals can only be known client-side
      return false
    }
    if (!hasLoadedDismissedIds.value) {
      loadDismissedIds()
    }
    return dismissedIds.value.includes(id)
  }

  const show = (id: string) => {
    const notification = findById(id)
    if (!notification || isDismissed(notification)) {
      return
    }
    if (!visibleIds.value.includes(id)) {
      visibleIds.value = [...visibleIds.value, id]
    }
  }

  const schedule = (notification: Notification) => {
    const { id, delayMs } = notification
    if (timers.has(id)) {
      // already scheduled
      return
    }
    if (isDismissed(notification)) {
      // already dismissed on this device
      return
    }
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        show(id)
      }, delayMs)
    )
  }

  const add = (notification: Notification) => {
    const { id } = notification
    queue.value = [...queue.value.filter((item) => item.id !== id), notification]
    if (!import.meta.client) {
      return
    }
    schedule(notification)
  }

  // Take the toast off the screen for this page load only — the close button, a swipe, or the
  // duration running out. Nothing is recorded, so the notification is offered again next time.
  const hide = (id: string) => {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    visibleIds.value = visibleIds.value.filter((visibleId) => visibleId !== id)
    queue.value = queue.value.filter((item) => item.id !== id)
  }

  // The user actively choosing to stop seeing this notification, which only the Dismiss button
  // does. Takes the whole notification rather than an id so the decision doesn't depend on the
  // queue lookup still resolving — hide() has already emptied it by the time this reads.
  const dismiss = (notification: Notification) => {
    const { id, allowDismiss } = notification
    hide(id)
    if (!allowDismiss) {
      return
    }
    if (!dismissedIds.value.includes(id)) {
      dismissedIds.value = [...dismissedIds.value, id]
      saveDismissedIds()
    }
  }

  // Deliberately not onMounted/onUnmounted: a store's setup runs inside whichever component
  // happened to call useNotificationsStore() first, so component lifecycle hooks here would
  // bind the timers' lifetime to that arbitrary component. Every candidate sits inside a
  // layout, and pages choose their own layout, so navigating between two pages with different
  // layouts would unmount it and clear the timers of a store that carries on living — silently
  // dropping every pending notification for the rest of the session. The store's own effect
  // scope lasts as long as the app, which is the lifetime the timers actually have.
  if (import.meta.client) {
    loadDismissedIds()
    queue.value.forEach(schedule)
  }

  onScopeDispose(() => {
    timers.forEach((timer) => clearTimeout(timer))
    timers.clear()
  })

  return {
    queue,
    visibleNotifications,
    add,
    hide,
    dismiss
  }
})
