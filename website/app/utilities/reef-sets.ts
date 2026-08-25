// Feature logic for a user's document sets, as used by the "Add to set" dialog on an RFC page and
// by the /set page.
//
// Which of this reader's sets hold a document, and what their sets are, are read from
// ~/stores/reef along with every other per-reader answer. Reef used to offer only the caller's
// whole list with every set's full membership attached, so an RFC page paid that to settle one
// document's rows; now the membership arrives per document and the sets carry only what labels a
// row. What's left here is what's particular to sets: creating one, changing what it holds, and
// the /set page's read of a single set by id.

import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref, type WritableComputedRef } from 'vue'
import { z } from 'zod'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useReefStore, type ReefSet } from '~/stores/reef'
import { createSet, deleteSetDocument, getSet, putSetDocument, ReefError, type DocumentSet } from '~/utilities/reef'
import { reefDocumentKey, useReefDocument } from '~/utilities/reef-documents'
import { infoSeriesPathBuilder } from '~/utilities/url'

// From DocumentSet.title's maxLength in reef_api.yaml. Enforced on the input as well as here, so
// the reader is stopped at the field rather than by a 400 after submitting.
export const SET_TITLE_MAX_LENGTH = 200

// Alphabetical, because this list is something the reader picks from rather than reads as news.
// Reef returns no particular order, and a pick-list that reorders itself between visits is harder
// to use than one that doesn't.
export const sortSets = <T extends { title: string }>(sets: T[]): T[] =>
  sets.toSorted((a, b) => a.title.localeCompare(b.title))

// What the reader fills in. Everything else about a set is server-assigned, and membership can't be
// set at creation — `documents` is read-only, so a new set is always born empty.
//
// Nothing about who can see it either: the sets endpoints carry no visibility at all — a set is
// public, as their own description says — so there's nothing for the form to ask.
export type NewSet = {
  title: string
  description: string
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

// --- Announcements ----------------------------------------------------------------------
//
// Only failures are announced, as with subscriptions. An add or a remove that works needs no
// toast: the checkbox stays on screen with its state flipped, and a screen reader reads that from
// aria-checked. A failure is different — the checkbox is put back the way it was, so without this
// the only visible result of pressing it would be nothing happening.

export const setMembershipFailedNotification = (
  { id, title }: ReefSet,
  rfcNumber: number,
  wasAdding: boolean
): Notification => ({
  // Keyed by set as well as document, because unlike the subscribe checkbox this dialog has a row
  // per set and two of them can fail independently.
  id: `rfc-set-membership.${id}.${reefDocumentKey(rfcNumber)}`,
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

// --- Writing ------------------------------------------------------------------------------

// Add this document to one set, or take it out. Ticked first and put back if Reef refuses, and
// keyed by set so a failure on one row can't undo a change the reader made to another.
const writeSetMembership = async (set: ReefSet, rfcNumber: number, isAdding: boolean): Promise<void> => {
  const reefStore = useReefStore()
  const notificationsStore = useNotificationsStore()
  const doc = reefDocumentKey(rfcNumber)
  const { id: setId } = set

  const outcome = await reefStore.runWrite(`${doc}:set:${setId}`, async (): Promise<void> => {
    if (isAdding) {
      // The updated set the add answers with is dropped: the dialog's rows are labelled from
      // titles this membership change doesn't touch, and the membership itself is already held.
      await putSetDocument(setId, doc)
      return
    }
    await deleteSetDocument(setId, doc)
  })

  if (outcome.status === 'failed') {
    // Untick or re-tick just this row and name the set in the toast, since the reader may have
    // several and nothing else on screen would tell them which one failed.
    const current = reefStore.userDocuments[doc]?.yourSetIds ?? []
    reefStore.patchUserDocument(doc, {
      yourSetIds: isAdding ? current.filter((id) => id !== setId) : [...current, setId]
    })
    notificationsStore.add(setMembershipFailedNotification(set, rfcNumber, isAdding))
    console.error('Unable to change which of your sets hold this RFC.', outcome.error)
  }
}

/**
 * Change which of this reader's sets hold one document.
 *
 * A checkbox group hands back the whole list, so what the reader actually did is the difference
 * between it and what the store holds. Each change is written independently, so ticking two rows
 * starts two writes and neither waits on the other.
 */
export const writeUserSetMembership = (rfcNumber: number, setIds: string[]): void => {
  const reefStore = useReefStore()
  const doc = reefDocumentKey(rfcNumber)

  const held = reefStore.userDocuments[doc]?.yourSetIds ?? []
  const added = setIds.filter((id) => !held.includes(id))
  const removed = held.filter((id) => !setIds.includes(id))

  if (added.length === 0 && removed.length === 0) {
    return
  }

  reefStore.patchUserDocument(doc, { yourSetIds: setIds })

  const setById = new Map(reefStore.sets.map((set) => [set.id, set]))
  added.forEach((id) => {
    const set = setById.get(id)
    if (set !== undefined) {
      void writeSetMembership(set, rfcNumber, true)
    }
  })
  removed.forEach((id) => {
    const set = setById.get(id)
    if (set !== undefined) {
      void writeSetMembership(set, rfcNumber, false)
    }
  })
}

// The dialog reports a creation failure inline, next to the field that caused it, so this hands
// back a message rather than leaving the caller to interpret a ReefError.
export type CreateSetOutcome = { ok: true; set: ReefSet } | { ok: false; message: string }

/**
 * Create one set and put this document in it.
 *
 * Creating a set from the "Add to set" dialog means the reader wants this document in it —
 * offering a set they'd then have to tick separately would be a strange place to stop. So the new
 * set is ticked here, and the membership goes out through the same path a tick does, bringing its
 * error handling and toast with it.
 *
 * That's also why this resolves as soon as the set exists rather than waiting for the membership:
 * the form has nothing left to do once the set is created, and holding it open through a second
 * request would leave the reader looking at a form for a set that already exists.
 */
export const createUserSet = async (rfcNumber: number, { title, description }: NewSet): Promise<CreateSetOutcome> => {
  const reefStore = useReefStore()
  const doc = reefDocumentKey(rfcNumber)

  try {
    const created = await createSet({
      title: title.trim(),
      // Omitted rather than sent empty, so Reef stores its own default for a field the reader left
      // alone instead of an empty string that would read as a deliberate blanking.
      ...(description.trim() === '' ? {} : { description: description.trim() })
    })

    // Reef's own copy: the title may have been trimmed and the id is assigned here, so the
    // response is the only trustworthy version. Narrowed to the shape the store lists, which is
    // the same set without its membership — and with a description rather than maybe one, since
    // the create response leaves the field out when it holds nothing and every read fills it in.
    const createdSet: ReefSet = { ...created, description: created.description ?? '' }

    reefStore.addSet(createdSet)
    writeUserSetMembership(rfcNumber, [...(reefStore.userDocuments[doc]?.yourSetIds ?? []), createdSet.id])

    return { ok: true, set: createdSet }
  } catch (error) {
    console.error('Unable to create a set.', error)
    return { ok: false, message: setCreationErrorMessage(error) }
  }
}

// --- The models an RFC page binds --------------------------------------------------------

export type UserSets = {
  // The reader's sets, in the order the dialog lists them. Empty while nobody is signed in.
  sets: Ref<ReefSet[]>
  // Which of those sets hold this document, as the checkbox group's value.
  setIdsWithThisRFC: WritableComputedRef<string[]>
  // Create a set and put this document in it.
  createSet: (newSet: NewSet) => Promise<CreateSetOutcome>
}

// This reader's sets and which of them hold one document, as models for the "Add to set" dialog.
// The dialog needs both — the sets to label its rows, and the ids to tick.
export const useUserSets = (rfcNumber: MaybeRefOrGetter<number>): UserSets => {
  const reefStore = useReefStore()
  const { yourSetIds } = useReefDocument(rfcNumber)

  return {
    sets: computed(() => sortSets(reefStore.sets)),
    setIdsWithThisRFC: computed({
      get: () => yourSetIds.value,
      set: (setIds) => {
        writeUserSetMembership(toValue(rfcNumber), setIds)
      }
    }),
    createSet: (newSet) => createUserSet(toValue(rfcNumber), newSet)
  }
}

// --- One set, for the /set page ---------------------------------------------------------

// What the set page renders. `notFound` is a state of its own rather than an error: Reef leaves a
// set the caller may not read out of the queryset instead of refusing it, so one 404 covers deleted,
// taken down, private-and-not-theirs and never-existed, and the page can only say the one thing
// about all of them. `failed` is the honest other case — something went wrong on the way — and is
// worth telling apart, because it's the one a reader might fix by trying again.
export type SetLoad =
  | { status: 'loading' }
  | { status: 'ready'; set: DocumentSet }
  | { status: 'notFound' }
  | { status: 'failed'; error: unknown }

// A set id is a uuid, so nothing else can name one. Checked before asking, so a junk link is
// answered without a round trip and without resting on what Reef's router makes of one.
const SetIdSchema = z.uuid()

// One set by id, as the model for the /set page: the id comes from the URL, so it's read through a
// getter and the load follows it changing — a link from one set to another is a route change, not a
// remount.
//
// Not through ~/stores/reef, and deliberately so: this is a public read of somebody's set by id,
// not one of this reader's own answers, and it's the whole set including its membership rather
// than the label-only version the dialog lists.
export const useSet = (setId: MaybeRefOrGetter<string>): Ref<SetLoad> => {
  const state = ref<SetLoad>({ status: 'loading' })

  // One read at a time: following a link from one set to another must not leave the first read to
  // land afterwards and replace the second.
  let controller: AbortController | undefined

  const load = async (id: string) => {
    if (!SetIdSchema.safeParse(id).success) {
      state.value = { status: 'notFound' }
      return
    }

    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    try {
      const set = await getSet(id, signal)
      if (!signal.aborted) {
        state.value = { status: 'ready', set }
      }
    } catch (error) {
      if (signal.aborted) {
        return
      }
      if (error instanceof ReefError && error.status === 404) {
        state.value = { status: 'notFound' }
        return
      }
      console.error('Unable to load this set.', error)
      state.value = { status: 'failed', error }
    }
  }

  // Nothing to wait for and nobody to be: a set is public, so this read needs no token and no
  // session state changes what it answers. The id is watched because /set?id=a → /set?id=b changes
  // it without remounting the page.
  watch(
    () => toValue(setId),
    (id) => {
      // Reef is reached from the browser, as the note at the top of ~/utilities/reef explains, so
      // there is nothing to do until this is running in one: the server renders the loading state
      // and the client takes it from there.
      if (!import.meta.client) {
        return
      }
      state.value = { status: 'loading' }
      void load(id)
    },
    { immediate: true }
  )

  return state
}

// One member document as the page lists it: the identifier Reef holds, and the /info/ path for it
// when this build can name one. Reef canonicalizes identifiers to the compact `rfc9110` form, but a
// set is free to hold something this site has no page for, and one such entry shouldn't take the
// rest of the list with it — infoSeriesPathBuilder throws on an identifier it can't parse.
export type SetDocument = {
  doc: string
  infoPath: string | undefined
}

// In `rank` order, which is the arrangement the set's owner chose (see the sets_order_update
// endpoint), rather than whatever order the response happened to list them in.
export const setDocuments = ({ documents }: DocumentSet): SetDocument[] =>
  documents
    .toSorted((a, b) => a.rank - b.rank)
    .map(({ doc }) => {
      try {
        return { doc, infoPath: infoSeriesPathBuilder(doc) }
      } catch {
        return { doc, infoPath: undefined }
      }
    })
