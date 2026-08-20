// Feature logic for a user's document sets, as used by the "Add to set" dialog on an RFC page.
//
// Lives here rather than in RFCDocumentSets/RFCDocumentReef so that reading the caller's sets,
// working out which of them hold a given RFC, and changing that membership are one definition
// shared by the dialog and whatever else comes to need them — the account page's own "Your sets"
// section, when it grows past its placeholder.

import { ref, watch, type Ref } from 'vue'
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { REEF_CACHE_PREFIX } from '~/utilities/reef-cache'
import {
  createSet,
  deleteSetDocument,
  getSets,
  putSetDocument,
  ReefError,
  useReefRequests,
  watchReefUserDocument,
  type DocumentSet,
  type DocumentSetEntry
} from '~/utilities/reef'

// From DocumentSet.title's maxLength in reef_api.yaml. Enforced on the input as well as here, so
// the reader is stopped at the field rather than by a 400 after submitting.
export const SET_TITLE_MAX_LENGTH = 200

// Reef canonicalizes document identifiers — the sets_documents_update description spells out that
// `.../documents/RFC%209110/` and `.../documents/rfc9110/` are the same entry — so the compact
// form is what we send, and what a stored membership is compared against.
export const setDocumentKey = (rfcNumber: number): string => `rfc${rfcNumber}`

// Alphabetical, because this list is something the reader picks from rather than reads as news.
// Reef returns no particular order, and a pick-list that reorders itself between visits is harder
// to use than one that doesn't.
export const sortSets = (sets: DocumentSet[]): DocumentSet[] => sets.toSorted((a, b) => a.title.localeCompare(b.title))

export const setContainsRFC = ({ documents }: DocumentSet, rfcNumber: number): boolean => {
  const key = setDocumentKey(rfcNumber)
  return documents.some((entry) => entry.doc === key)
}

// The ids of the sets holding this RFC. Reef's set ids are uuid strings, which is already what a
// checkbox group's value is, so the dialog binds this directly and nothing converts.
export const setIdsContainingRFC = (sets: DocumentSet[], rfcNumber: number): string[] =>
  sets.filter((set) => setContainsRFC(set, rfcNumber)).map(({ id }) => id)

// --- Cache ------------------------------------------------------------------------------
//
// The reader's own sets, remembered for the lifetime of the tab, for the same reason and on the
// same terms as the subscription cache in ~/utilities/reef-subscriptions: Reef answers only with the
// caller's whole list, so an RFC page otherwise pays a full fetch to settle which sets hold this
// one document, and pays it again on the next RFC.
//
// sessionStorage rather than localStorage because the tab is the honest lifetime: within one tab
// the only things that change this list are addRFCToSet and removeRFCFromSet below, and both write
// through, so a hit needs no expiry to be trusted. Sets changed in another tab, on another device,
// or by anything that creates or deletes a whole set are not picked up until this tab reloads.

const SETS_CACHE_PREFIX = `${REEF_CACHE_PREFIX}sets.`

// Keyed by the OIDC subject, because sessionStorage outlives a sign-out: two readers using the
// same tab in turn must not be shown each other's sets. Signed out there's nothing to key by and
// nothing worth caching either, since the list is per-caller.
const setsCacheKey = (): string | undefined => {
  const { user } = useAuthStore()
  return user === undefined ? undefined : `${SETS_CACHE_PREFIX}${user.sub}`
}

// What a set and its membership entries are, mirroring the generated DocumentSet and
// DocumentSetEntry schemas field for field. Each `satisfies` stops compiling if the schema beneath it
// ever covers less than the generated type, so regenerating the client after a spec change points
// here instead of leaving a hand-written schema to drift quietly from reef_api.yaml.
//
// Every field, not only the ones something reads, because parsing drops what it doesn't declare and
// a cached set is written back as it was read — including through patchCachedSet, which edits one
// set's membership and leaves the rest of it as it found it.
const DocumentSetEntrySchema = z.object({
  doc: z.string(),
  rank: z.number(),
  added_at: z.string()
}) satisfies z.ZodType<DocumentSetEntry>

const DocumentSetSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  owner_name: z.string(),
  documents: z.array(DocumentSetEntrySchema),
  created_at: z.string(),
  updated_at: z.string()
}) satisfies z.ZodType<DocumentSet>

const CachedSetsSchema = z.array(DocumentSetSchema)

const readCachedSets = (): DocumentSet[] | undefined => {
  if (!import.meta.client) {
    return undefined
  }
  try {
    const key = setsCacheKey()
    if (key === undefined) {
      return undefined
    }
    const stored = window.sessionStorage.getItem(key)
    if (stored === null) {
      return undefined
    }
    const { data, error } = CachedSetsSchema.safeParse(JSON.parse(stored))
    if (error) {
      // Written by an older version of this code, or edited by hand. Discard it and ask Reef, which
      // is the only thing that can restore a list we're able to trust.
      window.sessionStorage.removeItem(key)
      return undefined
    }
    // An empty array is a real cached answer — "this reader has no sets" — and worth a hit of its
    // own, or every visit by someone who keeps no sets would ask Reef again.
    return data
  } catch (error) {
    // sessionStorage throws outright when browser storage is disabled, and JSON.parse throws on a
    // truncated value. Either way the cache is unavailable, which is a miss rather than a failure.
    console.warn('[sets] unable to read the cached sets; asking Reef instead', error)
    return undefined
  }
}

const writeCachedSets = (sets: DocumentSet[]): void => {
  if (!import.meta.client) {
    return
  }
  try {
    const key = setsCacheKey()
    if (key === undefined) {
      return
    }
    window.sessionStorage.setItem(key, JSON.stringify(sets))
  } catch (error) {
    // Storage disabled, or the quota is full. Nothing to do about it: the next read is a miss and
    // Reef answers as it did before this cache existed. Never rethrown: this runs after Reef has
    // already accepted the change, so a failure to remember it locally is not a failed write.
    console.warn('[sets] unable to cache the sets', error)
  }
}

// Keep a cached list in step with a change Reef has already accepted, by id. A miss is left alone
// rather than seeded from the one set at hand: a list of one would be a hit, and would then answer
// for every other set as though the reader had none. Leaving it absent costs one fetch, which
// comes back with this change already in it.
const patchCachedSet = (id: string, patch: (set: DocumentSet) => DocumentSet): void => {
  const cached = readCachedSets()
  if (cached === undefined) {
    return
  }
  writeCachedSets(cached.map((set) => (set.id === id ? patch(set) : set)))
}

// --- Reads and writes -------------------------------------------------------------------

// The caller's own sets, from the tab's cache once they've been read or written already.
// Browser-only, like the rest of the Reef client, and it needs a token — sets are per-caller, so
// an anonymous call has nothing to return.
export const getUserSets = async (signal?: AbortSignal): Promise<DocumentSet[]> => {
  const cached = readCachedSets()
  if (cached !== undefined) {
    return sortSets(cached)
  }

  const sets = await getSets(signal)
  writeCachedSets(sets)
  return sortSets(sets)
}

// What the reader fills in. Everything else about a set is server-assigned, and membership can't be
// set at creation — `documents` is read-only, so a new set is always born empty.
//
// Nothing about who can see it either: the sets endpoints carry no visibility at all — a set is
// public, as their own description says — so there's nothing for the form to ask.
export type NewSet = {
  title: string
  description: string
}

// Create one set for the caller. Reef answers with the stored set, which is what goes into the
// cache — the title may have been trimmed and the slug is assigned here, so the response is the
// only trustworthy copy.
export const createUserSet = async ({ title, description }: NewSet, signal?: AbortSignal) => {
  const created = await createSet(
    {
      title: title.trim(),
      // Omitted rather than sent empty, so Reef stores its own default for a field the reader left
      // alone instead of an empty string that would read as a deliberate blanking.
      ...(description.trim() === '' ? {} : { description: description.trim() })
    },
    signal
  )
  // Only once Reef has accepted it, so the tab never caches a set Reef isn't holding. A miss is
  // left alone for the same reason patchCachedSet leaves one alone.
  const cached = readCachedSets()
  if (cached !== undefined) {
    writeCachedSets([...cached, created])
  }
  return created
}

// A creation failure is reported in the form rather than as a toast, so it needs wording rather
// than a console line. Reef rejects a bad title with DRF's field-errors shape — `{title: ["..."]}`
// — which names the problem far better than anything this could invent, so it's preferred when
// present and a generic line is the fallback.
const FieldErrorsSchema = z.record(z.string(), z.array(z.string()).nonempty())

export const setCreationErrorMessage = (error: unknown): string => {
  if (error instanceof ReefError) {
    const { data } = FieldErrorsSchema.safeParse(error.body)
    const firstMessage = data === undefined ? undefined : Object.values(data)[0]?.[0]
    if (firstMessage !== undefined) {
      return firstMessage
    }
    if (error.status === 401) {
      return 'Your session has expired. Sign in again to create a set.'
    }
  }
  return 'Your set could not be created. Please try again.'
}

// Add this RFC to one set. Reef answers with the updated set, so the cached copy is replaced
// wholesale rather than patched by hand — membership, ranks and updated_at all come from Reef.
export const addRFCToSet = async (setId: string, rfcNumber: number, signal?: AbortSignal): Promise<DocumentSet> => {
  const updated = await putSetDocument(setId, setDocumentKey(rfcNumber), signal)
  // Only once Reef has accepted it. A PUT that fails, or one aborted because the reader unticked
  // the box, rejects before this line, so the tab never caches a membership Reef isn't holding.
  patchCachedSet(setId, () => updated)
  return updated
}

// Remove this RFC from one set. The DELETE answers 204, so unlike the add there's no updated set
// to copy in and the cached membership is edited directly.
export const removeRFCFromSet = async (setId: string, rfcNumber: number, signal?: AbortSignal): Promise<void> => {
  const key = setDocumentKey(rfcNumber)
  await deleteSetDocument(setId, key, signal)
  patchCachedSet(setId, (set) => ({
    ...set,
    documents: set.documents.filter((entry) => entry.doc !== key)
  }))
}

// --- Announcements ----------------------------------------------------------------------
//
// Only failures are announced, as with subscriptions. An add or a remove that works needs no
// toast: the checkbox stays on screen with its state flipped, and a screen reader reads that from
// aria-checked. A failure is different — the checkbox is put back the way it was, so without this
// the only visible result of pressing it would be nothing happening.

// Keyed by set as well as RFC, because unlike the subscribe checkbox this dialog has a row per set
// and two of them can fail independently.
const setMembershipFailureNotificationId = (setId: string, rfcNumber: number): string =>
  `rfc-set-membership.${setId}.${setDocumentKey(rfcNumber)}`

export const setMembershipFailedNotification = (
  { id, title }: DocumentSet,
  rfcNumber: number,
  wasAdding: boolean
): Notification => ({
  id: setMembershipFailureNotificationId(id, rfcNumber),
  title: wasAdding ? 'Unable to add to set' : 'Unable to remove from set',
  // Names the set, because the reader may have several and the toast appears away from the row
  // that failed.
  description: wasAdding
    ? `RFC ${rfcNumber} has not been added to “${title}”. Please try again.`
    : `RFC ${rfcNumber} is still in “${title}”. Please try again.`,
  delayMs: 0,
  position: 'top',
  // A direct result of the reader pressing the checkbox, so it's announced rather than left to be
  // noticed.
  type: 'foreground'
})

// --- The models an RFC page binds --------------------------------------------------------

// The dialog reports a creation failure inline, next to the field that caused it, so this hands
// back a message rather than leaving the caller to interpret a ReefError.
export type CreateSetOutcome = { ok: true; set: DocumentSet } | { ok: false; message: string }

export type UserSets = {
  // The reader's sets, in the order the dialog lists them. Empty while nobody is signed in.
  sets: Ref<DocumentSet[]>
  // Which of those sets hold this RFC, as the checkbox group's value.
  setIdsWithThisRFC: Ref<string[]>
  // Create a set and put this RFC in it. Resolves once the set exists; see the note on the
  // implementation for why it doesn't wait for the membership.
  createSet: (newSet: NewSet) => Promise<CreateSetOutcome>
}

// This reader's sets and which of them hold one RFC, as models for the "Add to set" dialog: loaded
// from Reef when the reader or the RFC changes, and the membership written back as they tick rows.
// The dialog needs both — the sets to label its rows, and the ids to tick.
export const useUserSets = (rfcNumber: () => number): UserSets => {
  const notificationsStore = useNotificationsStore()
  const requests = useReefRequests()

  const sets = ref<DocumentSet[]>([])
  const setIdsWithThisRFC = ref<string[]>([])

  // Reef's own answer about membership, playing the same part syncedRating and syncedSubscription
  // do in the other two features. A list rather than a single value, so the write below diffs it to
  // find what the reader actually changed.
  let syncedSetIds: string[] = []

  const load = async (rfc: number, isAuthenticated: boolean) => {
    // Sets are per-user and the token is what identifies them, so there's nothing to ask for while
    // logged out. Reset rather than leave the previous reader's sets on screen.
    if (!isAuthenticated) {
      requests.abortLoad()
      syncedSetIds = []
      sets.value = []
      setIdsWithThisRFC.value = []
      return
    }

    const outcome = await requests.load((signal) => getUserSets(signal))

    if (outcome.status === 'failed') {
      // Same treatment as a failed rating or subscription load: the row still renders, and the
      // dialog shows no sets rather than claiming a membership we couldn't confirm.
      console.error('Unable to load your sets.', outcome.error)
      return
    }
    if (outcome.status !== 'done') {
      return
    }
    // Before the assignment, so the write watcher — which fires on the next tick — already sees
    // this as Reef's own answer and leaves it alone.
    syncedSetIds = setIdsContainingRFC(outcome.value, rfc)
    sets.value = outcome.value
    setIdsWithThisRFC.value = syncedSetIds
  }

  // Put one set's checkbox back to what Reef is actually holding. Only that set is touched, so a
  // failure on one row can't undo a change the reader made to another while it was in flight.
  const revertSetId = (setId: string, shouldBeTicked: boolean) => {
    const current = setIdsWithThisRFC.value
    if (shouldBeTicked) {
      setIdsWithThisRFC.value = current.includes(setId) ? current : [...current, setId]
      return
    }
    setIdsWithThisRFC.value = current.filter((id) => id !== setId)
  }

  const persistMembership = async (set: DocumentSet, isAdding: boolean) => {
    const { id: setId } = set
    const rfc = rfcNumber()

    // Keyed by set id, so the reader ticking two rows starts two independent writes and neither
    // supersedes the other — only changing their mind about this same set does.
    //
    // The updated set the add answers with is dropped: what it changes about the cached copy is
    // applied by addRFCToSet itself, and the dialog's rows are labelled from titles that this
    // membership change doesn't touch.
    const outcome = await requests.writeFor(setId, async (signal): Promise<void> => {
      if (isAdding) {
        await addRFCToSet(setId, rfc, signal)
        return
      }
      await removeRFCFromSet(setId, rfc, signal)
    })

    if (outcome.status === 'superseded') {
      return
    }
    if (outcome.status === 'failed') {
      // Untick or re-tick just this row and name the set in the toast, since the reader may have
      // several and nothing else on screen would tell them which one failed.
      revertSetId(setId, !isAdding)
      notificationsStore.add(setMembershipFailedNotification(set, rfc, isAdding))
      console.error('Unable to change which of your sets hold this RFC.', outcome.error)
      return
    }

    if (isAdding) {
      syncedSetIds = syncedSetIds.includes(setId) ? syncedSetIds : [...syncedSetIds, setId]
    } else {
      syncedSetIds = syncedSetIds.filter((id) => id !== setId)
    }
  }

  // A checkbox group hands back the whole list, so what the reader actually did is the difference
  // between it and what Reef holds. Diffing rather than trusting the list wholesale is also what
  // makes a load, and a revert above, pass through without writing anything.
  const persist = (setIds: string[]) => {
    const added = setIds.filter((id) => !syncedSetIds.includes(id))
    const removed = syncedSetIds.filter((id) => !setIds.includes(id))

    const setById = new Map(sets.value.map((set) => [set.id, set]))

    added.forEach((id) => {
      const set = setById.get(id)
      if (set !== undefined) {
        void persistMembership(set, true)
      }
    })
    removed.forEach((id) => {
      const set = setById.get(id)
      if (set !== undefined) {
        void persistMembership(set, false)
      }
    })
  }

  watchReefUserDocument(rfcNumber, (rfc, isAuthenticated) => {
    void load(rfc, isAuthenticated)
  })

  watch(setIdsWithThisRFC, (setIds) => {
    persist(setIds)
  })

  // Creating a set from the "Add to set" dialog means the reader wants this RFC in it — offering a
  // set they'd then have to tick separately would be a strange place to stop. So the new set is
  // ticked here, and the membership goes out through the same watcher a tick does, which brings its
  // own retry-less error handling and toast with it.
  //
  // That's also why this resolves as soon as the set exists rather than waiting for the membership:
  // the form has nothing left to do once the set is created, and holding it open through a second
  // request would leave the reader looking at a form for a set that already exists.
  const create = async (newSet: NewSet): Promise<CreateSetOutcome> => {
    // Deliberately not requests.write: that aborts any in-flight load and supersedes other writes,
    // and a creation is neither — it stands alone, and cancelling it because a membership tick came
    // along would lose a set the reader has already filled a form in for.
    try {
      const created = await createUserSet(newSet)
      // Before the tick, so the watcher below already finds the new set when it looks up what the
      // added id refers to. Both land in the same tick, and the watcher runs after it.
      sets.value = sortSets([...sets.value, created])
      setIdsWithThisRFC.value = [...setIdsWithThisRFC.value, created.id]
      return { ok: true, set: created }
    } catch (error) {
      console.error('Unable to create a set.', error)
      return { ok: false, message: setCreationErrorMessage(error) }
    }
  }

  return { sets, setIdsWithThisRFC, createSet: create }
}
