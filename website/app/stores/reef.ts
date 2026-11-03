// What Reef knows about this reader: their subscriptions and their sets.
//
// All of it, loaded once when they sign in, rather than a document at a time as the page asks. The
// two endpoints are unpaginated and a reader's own data is small, so every control on every page
// reads the same answer, and none of them has to ask — or to wait on a request of its own.
//
// Only this reader's own state. The public numbers beside these controls — the subscriber and set
// totals — are not here and never fetched: they arrive with whatever data the
// route already loaded and are passed down as props, so an anonymous visitor never reaches Reef.
//
// Nothing here is persisted. Client-side navigation keeps this store, so moving between pages
// re-asks for nothing; only a full page load starts empty. It is brought up to date again when the
// tab regains focus, never on a timer, so a page left open makes no requests.

import { useEventListener } from '@vueuse/core'
import { omit } from 'es-toolkit'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import type { LoadingStatus } from '~/utilities/loading-status'
import { getSets, getSubscriptions, type DocumentSet, type Subscription } from '~/utilities/reef'

// How soon after one load another may be started by the tab regaining focus. Switching between
// windows fires focus events in bursts, and nothing a reader changes elsewhere is worth a request
// every time they glance back.
const REFRESH_MIN_INTERVAL_MS = 30_000

/** One of this reader's sets, without its membership — that is held per document, below. */
export type ReefSet = Omit<DocumentSet, 'documents' | 'description'> & { description: string }

/** The two things loaded for a reader, each of which succeeds or fails on its own. */
export type ReefSlice = 'subscriptions' | 'sets'

/**
 * What a subscription is to, in the terms Red subscribes by. Reef has more kinds than this
 * (`by_status`, `obsoleted`, `set`), but nothing in Red creates or shows a control for them, so
 * they're held in the list for the account page and left out of the index.
 */
export type SubscriptionTarget =
  | { kind: 'new_rfc' }
  | { kind: 'rfc'; doc: string }
  | { kind: 'subject'; subject: number }

/** One string per target, which is what a control looks its subscription up by. */
export const subscriptionKey = (target: SubscriptionTarget): string => {
  switch (target.kind) {
    case 'new_rfc':
      return 'new_rfc'
    case 'rfc':
      return `rfc:${target.doc}`
    case 'subject':
      return `subject:${target.subject}`
  }
}

/**
 * The target an existing subscription is to, or undefined for a kind Red has no control for, or
 * for one whose params aren't in the shape this build expects — `params` is free-form in the spec,
 * so it's checked rather than trusted.
 */
export const subscriptionTargetOf = ({ kind, params, subject }: Subscription): SubscriptionTarget | undefined => {
  if (kind === 'new_rfc') {
    return { kind }
  }
  if (kind === 'rfc' && typeof params === 'object' && params !== null && 'rfc' in params) {
    return typeof params.rfc === 'string' ? { kind, doc: params.rfc } : undefined
  }
  if (kind === 'subject' && typeof subject === 'number') {
    return { kind, subject }
  }
  return undefined
}

/**
 * What became of one write.
 *
 * There is no `superseded`: writes for one document and concern are queued rather than cancelled,
 * so every one runs and the last still wins. Cancelling a subscribe mid-flight can leave a
 * subscription Reef recorded but nothing afterwards holds the id to remove.
 */
export type ReefWriteOutcome<T> = { status: 'done'; value: T } | { status: 'failed'; error: unknown }

/**
 * A subscription change the reader has made that Reef hasn't answered yet: the state they asked
 * for, and how many writes are still out. Subscribing has no id until the POST comes back, so the
 * list can't hold it yet, but the checkbox has to move under their finger.
 */
export type PendingSubscription = { desired: boolean; inFlight: number }

/**
 * How the changes to which sets hold one document are going, per set. Each set is its own write, so
 * what a dialog can say about them as a whole is whether any is still out, which were refused (and
 * which way they were going, to say what the reader is left with), and whether any has been kept.
 */
export type SetMembershipSync = {
  inFlight: Record<string, number>
  failed: Record<string, { adding: boolean }>
  hasSaved: boolean
}

const idleStatuses = (): Record<ReefSlice, LoadingStatus> => ({
  subscriptions: { type: 'idle' },
  sets: { type: 'idle' }
})

export const useReefStore = defineStore('reef', () => {
  const authStore = useAuthStore()

  // Keyed by canonical document id (`rfc9110`), the same key ~/utilities/reef-documents builds.
  const subscriptions = ref<Subscription[]>([])
  const pendingSubscriptions = ref<Record<string, PendingSubscription>>({})
  const setMembershipSync = ref<Record<string, SetMembershipSync>>({})
  const sets = ref<ReefSet[]>([])
  // Which of the reader's sets hold each document, inverted from what Reef sends per set so that
  // a card asking about one document doesn't search every set for it.
  const setIdsByDoc = ref<Record<string, string[]>>({})

  const status = ref<Record<ReefSlice, LoadingStatus>>(idleStatuses())

  // Whose the per-reader half is. Held rather than read from the auth store at the point of use,
  // because a response that lands after a sign-out has to be recognisable as the previous
  // reader's and dropped — by then the auth store no longer remembers who that was.
  const subject = ref<string>()

  // The in-flight load, abandoned when the reader changes or a newer load starts. Reads only: a
  // write the reader has just made should reach Reef even if they navigate away, and unlike a read
  // it leaves no state behind for a late response to corrupt.
  let loadController: AbortController | undefined
  let lastLoadedAt = 0

  // The last write queued per key — one document and one concern, so a subscription and a set
  // change for the same document don't wait on each other. Deliberately not reactive: nothing renders
  // from it, and a write in flight is not a state the page shows.
  const writeQueues = new Map<string, Promise<unknown>>()

  // Bumped whenever a write starts, so a refresh can tell that the answer it is holding was read
  // before a change the reader has since made, and must not undo it.
  let writeEpoch = 0

  /**
   * Whether there's anything to ask Reef for. Browser-only, because the access token lives in the
   * browser; signed-in-only, because every field is the caller's own.
   */
  const isReadable = computed(() => import.meta.client && authStore.isAuthenticated)

  const subscriptionByKey = computed(() => {
    const byKey = new Map<string, Subscription>()
    subscriptions.value.forEach((subscription) => {
      const target = subscriptionTargetOf(subscription)
      if (target !== undefined) {
        byKey.set(subscriptionKey(target), subscription)
      }
    })
    return byKey
  })

  /** Whether this reader subscribes to the target with this key, counting a change not yet confirmed. */
  const isSubscribedTo = (key: string): boolean =>
    pendingSubscriptions.value[key]?.desired ?? subscriptionByKey.value.has(key)

  /** Note a subscription change that has been started and not yet answered. */
  const beginSubscriptionChange = (key: string, desired: boolean): void => {
    pendingSubscriptions.value[key] = { desired, inFlight: (pendingSubscriptions.value[key]?.inFlight ?? 0) + 1 }
  }

  /** Note that one such change has been answered, one way or the other. The list is what shows once none is left. */
  const endSubscriptionChange = (key: string): void => {
    const pending = pendingSubscriptions.value[key]
    if (pending === undefined) {
      return
    }
    if (pending.inFlight <= 1) {
      delete pendingSubscriptions.value[key]
      return
    }
    pending.inFlight -= 1
  }

  /** Note a change to whether one set holds one document that has been started and not yet answered. */
  const beginSetMembershipChange = (doc: string, setId: string): void => {
    const sync = (setMembershipSync.value[doc] ??= { inFlight: {}, failed: {}, hasSaved: false })
    sync.inFlight[setId] = (sync.inFlight[setId] ?? 0) + 1
    delete sync.failed[setId]
  }

  /**
   * Note that one such change has been answered. A refusal is only recorded once no later change to
   * the same set is still out, because that later one decides where the set ends up.
   */
  const endSetMembershipChange = (doc: string, setId: string, failure?: { adding: boolean }): void => {
    const sync = setMembershipSync.value[doc]
    if (sync === undefined) {
      return
    }
    const remaining = (sync.inFlight[setId] ?? 1) - 1
    if (remaining > 0) {
      sync.inFlight[setId] = remaining
    } else {
      delete sync.inFlight[setId]
      if (failure !== undefined) {
        sync.failed[setId] = failure
      }
    }
    if (failure === undefined) {
      sync.hasSaved = true
    }
  }

  const addSubscription = (subscription: Subscription): void => {
    subscriptions.value = [...subscriptions.value, subscription]
  }

  const removeSubscription = (id: number): void => {
    subscriptions.value = subscriptions.value.filter((subscription) => subscription.id !== id)
  }

  /** Change which of the reader's sets hold one document. */
  const setSetIds = (doc: string, setIds: string[]): void => {
    setIdsByDoc.value = { ...setIdsByDoc.value, [doc]: setIds }
  }

  /** Add a set the reader has just made, so the dialog can offer it immediately. */
  const addSet = (set: ReefSet): void => {
    sets.value = [...sets.value, set]
  }

  /**
   * Run one write, after any write already queued for the same key.
   *
   * Queued rather than cancelled, and per key so that ticking two sets starts two independent
   * chains. Running every write in order costs a request when somebody toggles twice; in exchange
   * the last thing they did is what Reef holds.
   *
   * Never rejects. Callers read the outcome instead, so a failure is something to put right on
   * screen rather than an exception to catch.
   */
  const runWrite = <T>(key: string, run: () => Promise<T>): Promise<ReefWriteOutcome<T>> => {
    writeEpoch += 1
    const queued: Promise<ReefWriteOutcome<T>> = (writeQueues.get(key) ?? Promise.resolve()).then(run).then(
      (value) => ({ status: 'done', value }),
      (error) => ({ status: 'failed', error })
    )
    writeQueues.set(key, queued)
    void queued.then(() => {
      // Only if this is still the last write for the key, so the one that replaced it isn't
      // dropped from the chain while it is still running.
      if (writeQueues.get(key) === queued) {
        writeQueues.delete(key)
      }
    })
    return queued
  }

  /** Forget everything of the reader's. The public numbers stay: they were never this reader's. */
  const reset = (): void => {
    loadController?.abort()
    loadController = undefined
    lastLoadedAt = 0
    subscriptions.value = []
    pendingSubscriptions.value = {}
    setMembershipSync.value = {}
    sets.value = []
    setIdsByDoc.value = {}
    status.value = idleStatuses()
  }

  const applySets = (loaded: DocumentSet[]): void => {
    sets.value = loaded.map((set) => ({ ...omit(set, ['documents']), description: set.description ?? '' }))

    const byDoc: Record<string, string[]> = {}
    loaded.forEach(({ id, documents }) => {
      documents.forEach(({ doc }) => {
        byDoc[doc] = [...(byDoc[doc] ?? []), id]
      })
    })
    setIdsByDoc.value = byDoc
  }

  /**
   * Load everything this reader has, both requests at once.
   *
   * Also how a failed load is retried. A load that finds a slice already loaded is a refresh: the
   * data stays on screen and no loading state is shown, a failure leaves what was there, and an
   * answer that was read before a change the reader has since made is dropped rather than undoing
   * it.
   */
  const load = async (): Promise<void> => {
    if (!isReadable.value) {
      return
    }

    loadController?.abort()
    const controller = new AbortController()
    loadController = controller
    const { signal } = controller
    const loadingFor = subject.value
    const epoch = writeEpoch
    lastLoadedAt = Date.now()

    const loadSlice = async <T>(
      slice: ReefSlice,
      fetchSlice: (signal: AbortSignal) => Promise<T>,
      apply: (loaded: T) => void,
      failureMessage: string
    ): Promise<void> => {
      const isRefresh = status.value[slice].type === 'success'
      if (!isRefresh) {
        status.value[slice] = { type: 'loading' }
      }

      try {
        const loaded = await fetchSlice(signal)

        // A response belonging to a reader who has since signed out, or to the previous one of two
        // readers using this tab in turn, must not land. Checked on the way out as well as in the
        // catch, because an aborted request can still resolve.
        if (signal.aborted || subject.value !== loadingFor) {
          return
        }
        if (isRefresh && (writeEpoch !== epoch || writeQueues.size > 0)) {
          return
        }
        apply(loaded)
        status.value[slice] = { type: 'success' }
      } catch (error) {
        if (signal.aborted || subject.value !== loadingFor) {
          return
        }
        console.error(`[reef] unable to load your ${slice}.`, error)
        // The controls still render, showing nothing rather than claiming a state we couldn't
        // confirm. A refresh that fails has nothing to say: what's on screen was true a moment ago.
        if (!isRefresh) {
          status.value[slice] = { type: 'error', message: failureMessage }
        }
      }
    }

    await Promise.all([
      loadSlice(
        'subscriptions',
        getSubscriptions,
        (loaded) => {
          subscriptions.value = loaded
        },
        'Unable to load your Subscriptions.'
      ),
      loadSlice('sets', getSets, applySets, 'Unable to load your Sets.')
    ])
  }

  /** Load again, unless that was done a moment ago. For things a reader does that say nothing about whether Reef changed. */
  const refreshIfStale = (): void => {
    if (Date.now() - lastLoadedAt >= REFRESH_MIN_INTERVAL_MS) {
      void load()
    }
  }

  // A tab left in the background is the one most likely to be out of date — another tab changed a
  // subscription, an email link removed one — and coming back to it is the moment that matters. No
  // timer: a page nobody is looking at asks for nothing.
  if (import.meta.client) {
    useEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshIfStale()
      }
    })
    useEventListener(window, 'focus', refreshIfStale)
  }

  // Whose data this is, and the only thing that empties the per-reader half. Watching the subject
  // rather than isAuthenticated covers both the sign-out and the case two readers use one tab in
  // turn, where the second sign-in would otherwise inherit the first reader's answers. It is also
  // what starts the load, so it begins the moment the session restores rather than when a control
  // first renders.
  watch(
    () => authStore.user?.sub,
    (sub) => {
      subject.value = sub
      reset()
      void load()
    },
    // Synchronous, not because anything renders sooner for it, but because the gap a queued
    // watcher leaves is one in which this store still holds the previous reader's answers while
    // the auth store has already moved on. A load resolving in that gap would check a subject
    // that had not caught up yet and let their data land.
    { immediate: true, flush: 'sync' }
  )

  return {
    subscriptions,
    pendingSubscriptions,
    setMembershipSync,
    sets,
    setIdsByDoc,
    status,
    subject,
    isReadable,
    subscriptionByKey,
    isSubscribedTo,
    beginSubscriptionChange,
    endSubscriptionChange,
    beginSetMembershipChange,
    endSetMembershipChange,
    addSubscription,
    removeSubscription,
    setSetIds,
    addSet,
    runWrite,
    load,
    refreshIfStale,
    reset
  }
})
