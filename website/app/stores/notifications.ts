/**
 * A queue of site notifications that are displayed as toasts.
 *
 * Each notification is displayed after its own `delayMs` has elapsed, which is
 * measured from when the notification was added to the queue (or, for
 * notifications that were in the queue before the client mounted, from the
 * moment the client mounted).
 *
 * Dismissed notification ids are recorded in localStorage so that a
 * notification is only ever shown once per device.
 */

import { z } from 'zod'

const DismissedIdsSchema = z.string().array()

const LOCALSTORAGE_KEY = 'notifications-dismissed'

export type Notification = {
  id: string
  title: string
  description: string
  url: string
  /**
   * Delay in milliseconds, after which the toast is displayed
   */
  delayMs: number
}

const PLACEHOLDER_NOTIFICATIONS: Notification[] = [
  {
    id: 'placeholder',
    title: 'Placeholder notification',
    description: 'This is a placeholder notification to demonstrate the toast queue.',
    url: '/info/rfc9000/',
    delayMs: 2000
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

  const isDismissed = (id: string) => {
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
    if (isDismissed(id)) {
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
    if (isDismissed(id)) {
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

  const dismiss = (id: string) => {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    visibleIds.value = visibleIds.value.filter((visibleId) => visibleId !== id)
    queue.value = queue.value.filter((item) => item.id !== id)
    if (!dismissedIds.value.includes(id)) {
      dismissedIds.value = [...dismissedIds.value, id]
      saveDismissedIds()
    }
  }

  onMounted(() => {
    loadDismissedIds()
    queue.value.forEach(schedule)
  })

  onUnmounted(() => {
    timers.forEach((timer) => clearTimeout(timer))
    timers.clear()
  })

  return {
    queue,
    visibleNotifications,
    add,
    dismiss
  }
})
