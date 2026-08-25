// What Reef knows about the documents on screen, for as long as this tab is open.
//
// One store rather than a cache per feature. The rating, the subscription and the set membership
// of one document arrive together in one response and are read together by one card, so keeping
// them apart only ever meant three requests and three copies of the same bookkeeping.
//
// Two kinds of state, with different lifetimes, which is why they're separate maps:
//
//   stats         public, the same for every visitor. Seeded from whatever data the route already
//                 loaded — the RFC page's bucket JSON, the homepage's latest, the search index —
//                 never fetched from Reef. Survives a sign-out, because it was never this
//                 reader's to begin with.
//   userDocuments this reader's own. Loaded from Reef, in the browser, only while somebody is
//                 signed in, and cleared the moment they aren't.
//
// Nothing here is persisted. The per-reader half costs one request per page and belongs to a
// session; the public half arrives with the page. If a cold page proves slow enough to be worth
// it, a single serialised snapshot keyed by `subject` is the shape to add — not a cache per
// feature, which is what this replaced.

import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getMyDocuments, MY_DOCUMENTS_BATCH_LIMIT, type MyDocument, type MyDocumentSet } from '~/utilities/reef'
import type { ReefRFCStats } from '~/utilities/rfc-validators'

// How many documents Red names in one request. Under Reef's own limit rather than at it, so a
// page that grows by a few documents doesn't start failing at the boundary.
const BATCH_SIZE = 50

/**
 * Whether this reader's half of a document has been loaded.
 *
 * `unknown` is the one that earns its place: it's what tells a document nobody has asked about
 * from one that came back with nothing to say, which is the whole basis of loading only what's
 * missing. `failed` is retried the next time the document is asked for, so navigating back to a
 * page is the retry.
 */
export type ReefDocumentStatus = 'unknown' | 'loading' | 'ready' | 'failed'

/** One document as it stands with this reader. */
export type ReefUserDocument = {
  status: Exclude<ReefDocumentStatus, 'unknown'>
  yourRating: number | undefined
  /**
   * Whether this reader subscribes to this document.
   *
   * Held apart from the id rather than derived from it, because a subscription the reader has just
   * ticked is real to them before Reef has assigned it one: the checkbox has to move under their
   * finger, and the id only exists once the POST comes back.
   */
  isSubscribed: boolean
  /** The id of that subscription, which is the only handle unsubscribing has. */
  yourSubscriptionId: number | undefined
  yourSetIds: string[]
}

export type ReefSet = MyDocumentSet

/**
 * What became of one write.
 *
 * There is no `superseded`: writes for one document and concern are queued rather than cancelled,
 * so every one of them runs and the last still wins. Cancelling was what the per-component
 * coordination this replaced did, and it could leave a subscription created by an aborted POST
 * that nothing afterwards held the id to remove.
 */
export type ReefWriteOutcome<T> = { status: 'done'; value: T } | { status: 'failed'; error: unknown }

/** A document nobody has told us anything about yet, in whichever state it is in. */
const blankUserDocument = (status: Exclude<ReefDocumentStatus, 'unknown'>): ReefUserDocument => ({
  status,
  yourRating: undefined,
  isSubscribed: false,
  yourSubscriptionId: undefined,
  yourSetIds: []
})

// Reef sends null for "no rating" and "not subscribed"; undefined is the one absent value the rest
// of Red deals in, and it's what a `v-model` on a star rating already means.
const toUserDocument = ({ your_rating, your_subscription_id, your_set_ids }: MyDocument): ReefUserDocument => ({
  status: 'ready',
  yourRating: your_rating ?? undefined,
  isSubscribed: your_subscription_id !== null,
  yourSubscriptionId: your_subscription_id ?? undefined,
  yourSetIds: your_set_ids
})

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

export const useReefStore = defineStore('reef', () => {
  const authStore = useAuthStore()

  const stats = ref<Record<string, ReefRFCStats>>({})
  const userDocuments = ref<Record<string, ReefUserDocument>>({})
  const sets = ref<ReefSet[]>([])

  // Whose the per-reader half is. Held rather than read from the auth store at the point of use,
  // because a response that lands after a sign-out has to be recognisable as the previous
  // reader's and dropped — by then the auth store no longer remembers who that was.
  const subject = ref<string>()

  // In-flight loads, abandoned when the reader changes. Reads only: a write the reader has just
  // made should reach Reef even if they navigate away, and unlike a read it leaves no state
  // behind for a late response to corrupt.
  let loadController: AbortController | undefined

  // Documents asked for but not yet sent, and the microtask that will send them. Everything asked
  // for in one tick goes out as one request, whether that was one list declaring fifty documents
  // or several parts of a page declaring their own — so the guarantee holds however the page is
  // put together, rather than only when a single caller happens to own the whole list.
  let pendingDocs = new Set<string>()
  let pendingLoad: Promise<void> | undefined

  // The last write queued per key — one document and one concern, so a rating and a subscription
  // for the same document don't wait on each other. Deliberately not reactive: nothing renders
  // from it, and a write in flight is not a state the page shows.
  const writeQueues = new Map<string, Promise<unknown>>()

  /**
   * Whether there's anything to ask Reef for. Browser-only, because the access token lives in the
   * browser; signed-in-only, because every field is the caller's own.
   *
   * The oidc feature flag isn't checked here even though it gates the whole feature: signing in is
   * only reachable when the flag is on, so an authenticated reader implies it.
   */
  const isReadable = computed(() => import.meta.client && authStore.isAuthenticated)

  /**
   * Remember the public numbers a route already loaded.
   *
   * First one wins. A route that renders the same document twice, or is returned to later, seeds
   * again with the same precomputed figures — but by then this reader may have rated it, and the
   * average held here would have moved to include their rating. Overwriting would quietly undo
   * that, so the later seed is ignored.
   */
  const seedStats = (doc: string, documentStats: ReefRFCStats | undefined): void => {
    if (documentStats === undefined || stats.value[doc] !== undefined) {
      return
    }
    stats.value[doc] = documentStats
  }

  /** Adjust the numbers to account for something this reader just did. */
  const adjustStats = (doc: string, adjust: (current: ReefRFCStats) => ReefRFCStats): void => {
    stats.value[doc] = adjust(stats.value[doc] ?? {})
  }

  /**
   * Change one document's per-reader state.
   *
   * The document need not have been loaded: a reader can act on a control before its state has
   * arrived, and a change they made is a better answer than the nothing that was there.
   */
  const patchUserDocument = (doc: string, patch: Partial<ReefUserDocument>): void => {
    userDocuments.value[doc] = { ...(userDocuments.value[doc] ?? blankUserDocument('ready')), ...patch }
  }

  /** Add a set the reader has just made, so the dialog can offer it immediately. */
  const addSet = (set: ReefSet): void => {
    sets.value = [...sets.value, set]
  }

  /**
   * Run one write, after any write already queued for the same key.
   *
   * Queued rather than cancelled, and per key so that ticking two sets starts two independent
   * chains. Cancelling is what the per-component coordination this replaced did, and it had a hole
   * in it: a subscribe cancelled mid-flight can still have been recorded by Reef, and nothing
   * afterwards holds the id needed to undo it. Running every write in order costs a request when
   * somebody toggles a checkbox twice, and in exchange the last thing they did is what Reef ends
   * up holding.
   *
   * Never rejects. Callers read the outcome instead, so a failure is something to put right on
   * screen rather than an exception to catch.
   */
  const runWrite = <T>(key: string, run: () => Promise<T>): Promise<ReefWriteOutcome<T>> => {
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

  /** Forget the per-reader half. The public numbers stay: they were never this reader's. */
  const reset = (): void => {
    loadController?.abort()
    loadController = undefined
    // Dropped rather than left to go out under the new reader: what's on screen is re-declared by
    // the pages showing it as soon as there's a reader to declare it for.
    pendingDocs = new Set()
    pendingLoad = undefined
    userDocuments.value = {}
    sets.value = []
  }

  const loadBatch = async (docs: string[], signal: AbortSignal, loadingFor: string | undefined): Promise<void> => {
    try {
      const { sets: loadedSets, documents } = await getMyDocuments(docs, signal)

      // A response belonging to a reader who has since signed out, or to the previous one of two
      // readers using this tab in turn, must not land. Checked on the way out as well as in the
      // catch, because an aborted request can still resolve.
      if (signal.aborted || subject.value !== loadingFor) {
        return
      }

      sets.value = loadedSets
      documents.forEach((document) => {
        // Only into a document still waiting on this load. A reader can act on a control before
        // its state has arrived — the row renders straight away — and the answer to a question
        // asked before their change must not undo it.
        if (userDocuments.value[document.doc]?.status === 'loading') {
          userDocuments.value[document.doc] = toUserDocument(document)
        }
      })
      // Reef promises a row for every document named, so this only covers a Reef that didn't.
      // Marked ready-with-nothing rather than left loading, which would never be asked for again.
      docs.forEach((doc) => {
        if (userDocuments.value[doc]?.status === 'loading') {
          userDocuments.value[doc] = blankUserDocument('ready')
        }
      })
    } catch (error) {
      if (signal.aborted || subject.value !== loadingFor) {
        return
      }
      // Not worth interrupting the page over: the controls still render, showing nothing rather
      // than claiming a state we couldn't confirm. `failed` is retried when the document is next
      // asked for. A document the reader has changed in the meantime keeps their change: the load
      // failed, so it has nothing better to offer than what they just did.
      docs.forEach((doc) => {
        if (userDocuments.value[doc]?.status === 'loading') {
          userDocuments.value[doc] = blankUserDocument('failed')
        }
      })
      console.error('[reef] unable to load your ratings, subscriptions and sets for these documents.', error)
    }
  }

  /**
   * Load this reader's state for these documents, skipping the ones already held or already in
   * flight.
   *
   * Marking `loading` before awaiting is what makes that true: without it every card on a page
   * would find the store empty in the same tick and start a request of its own, which is exactly
   * the pile-up this store exists to end.
   */
  const ensureDocuments = async (docs: string[]): Promise<void> => {
    if (!isReadable.value) {
      return
    }

    const missing = [...new Set(docs)].filter((doc) => {
      const status = userDocuments.value[doc]?.status
      return status === undefined || status === 'failed'
    })

    if (missing.length === 0) {
      return
    }

    missing.forEach((doc) => {
      userDocuments.value[doc] = blankUserDocument('loading')
      pendingDocs.add(doc)
    })

    pendingLoad ??= Promise.resolve().then(sendPendingDocs)
    await pendingLoad
  }

  // Everything asked for since the last send, as one request per batch. The pending set is taken
  // and cleared before the first await, so a document asked for while this is in flight starts a
  // send of its own rather than joining one that has already gone out.
  const sendPendingDocs = async (): Promise<void> => {
    const docs = [...pendingDocs]
    pendingDocs = new Set()
    pendingLoad = undefined

    if (docs.length === 0) {
      return
    }

    loadController ??= new AbortController()
    const { signal } = loadController
    const loadingFor = subject.value

    await Promise.all(chunk(docs, BATCH_SIZE).map((batch) => loadBatch(batch, signal, loadingFor)))
  }

  // Whose data this is, and the only thing that empties the per-reader half. Watching the subject
  // rather than isAuthenticated covers both the sign-out and the case two readers use one tab in
  // turn, where the second sign-in would otherwise inherit the first reader's answers.
  watch(
    () => authStore.user?.sub,
    (sub) => {
      subject.value = sub
      reset()
    },
    // Synchronous, not because anything renders sooner for it, but because the gap a queued
    // watcher leaves is one in which this store still holds the previous reader's answers while
    // the auth store has already moved on. A load resolving in that gap would check a subject
    // that had not caught up yet and let their data land.
    { immediate: true, flush: 'sync' }
  )

  return {
    stats,
    userDocuments,
    sets,
    subject,
    isReadable,
    seedStats,
    adjustStats,
    patchUserDocument,
    addSet,
    runWrite,
    ensureDocuments,
    reset,
    BATCH_SIZE,
    MY_DOCUMENTS_BATCH_LIMIT
  }
})
