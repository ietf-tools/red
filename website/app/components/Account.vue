<template>
  <div class="container mx-auto px-4 pt-5 grid grid-cols-1 md:grid-cols-2 gap-8">
    <section aria-labelledby="account-subscriptions-heading">
      <Heading id="account-subscriptions-heading" level="2">Your subscriptions</Heading>

      <p
        v-if="subscriptionsLoadingStatus.type === 'loading'"
        class="flex items-center gap-2 py-3"
        aria-live="polite"
        aria-atomic="true">
        <GraphicsLoading class="inline-block w-5 h-5" />
        Loading...
      </p>

      <AlertBox v-else-if="subscriptionsLoadingStatus.type === 'error'" variant="warning" role="alert">
        <p>
          {{ subscriptionsLoadingStatus.message }}
          <button type="button" class="underline cursor-pointer" @click="loadSubscriptions">Try again</button>
        </p>
      </AlertBox>

      <template v-else-if="subscriptionsLoadingStatus.type === 'success'">
        <ul v-if="subscriptions.length > 0" class="flex flex-col gap-2 py-3">
          <li
            v-for="{ subscription, browsePath } in subscriptionRows"
            :key="subscription.id"
            class="border rounded px-3 py-2">
            <div class="flex items-start justify-between gap-2">
              <span>
                <AMaybeRFCLink v-if="browsePath" :href="browsePath" class="block px-2 py-1">
                  <span class="block font-bold">{{ subscriptionLabel(subscription) }}</span>
                  <span v-if="subscriptionParamsSummary(subscription)" class="block text-sm">
                    {{ subscriptionParamsSummary(subscription) }}
                  </span>
                </AMaybeRFCLink>
                <span v-else class="block px-2 py-1">
                  <span class="block font-bold">{{ subscriptionLabel(subscription) }}</span>
                  <span v-if="subscriptionParamsSummary(subscription)" class="block text-sm">
                    {{ subscriptionParamsSummary(subscription) }}
                  </span>
                </span>
                <span
                  v-if="subscriptionDeleteErrors[subscription.id]"
                  class="block px-2 text-sm text-red-700"
                  role="alert">
                  {{ subscriptionDeleteErrors[subscription.id] }}
                </span>
              </span>

              <span class="flex items-center gap-1 shrink-0">
                <DialogRoot
                  :open="confirmDeleteId === subscription.id"
                  @update:open="(open) => (confirmDeleteId = open ? subscription.id : undefined)">
                  <DialogTrigger
                    :aria-label="`Delete subscription: ${subscriptionLabel(subscription)}`"
                    class="flex flex-row items-center cursor-pointer px-2 py-1 rounded-md border-1 border-gray-400 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800">
                    <GraphicsDismiss class="align-middle" />
                    Unsubscribe
                  </DialogTrigger>
                  <DialogPortal>
                    <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
                    <DialogContent
                      :class="[
                        'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] z-115',
                        'focus:outline-none rounded-md shadow-3xl',
                        'bg-white dark:bg-gray-800',
                        'px-4 pt-3 pb-1'
                      ]">
                      <DialogTitle class="text-lg font-semibold text-center pb-3"
                        >Delete this subscription?</DialogTitle
                      >

                      <DialogDescription class="text-sm">
                        <p>
                          {{ subscriptionLabel(subscription) }}
                          <template v-if="subscriptionParamsSummary(subscription)">
                            — {{ subscriptionParamsSummary(subscription) }}
                          </template>
                        </p>
                        <p class="pt-2">You'll stop receiving these notifications. This can't be undone.</p>

                        <!-- role="alert" so a failed delete is announced: the dialog stays put and the only
                           thing that changed is this line appearing. -->
                        <p
                          v-if="subscriptionDeleteErrors[subscription.id]"
                          role="alert"
                          class="pt-2 text-red-700 dark:text-red-400">
                          {{ subscriptionDeleteErrors[subscription.id] }}
                        </p>

                        <div class="flex justify-end gap-2 pt-4 pb-2">
                          <DialogClose
                            :class="[
                              'px-3 py-1 rounded-md',
                              'text-blue-800 dark:text-white font-bold border-1 border-blue-600 dark:border-blue-200',
                              'cursor-pointer'
                            ]">
                            Cancel
                          </DialogClose>
                          <button
                            type="button"
                            :disabled="subscriptionsDeleting[subscription.id]"
                            class="font-bold bg-red-700 text-white px-3 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-default"
                            @click="deleteSubscriptionRow(subscription)">
                            {{ subscriptionsDeleting[subscription.id] ? 'Deleting…' : 'Delete' }}
                          </button>
                        </div>
                      </DialogDescription>

                      <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
                        <GraphicsClose />
                      </DialogClose>
                    </DialogContent>
                  </DialogPortal>
                </DialogRoot>
              </span>
            </div>
          </li>
        </ul>
        <p v-else class="italic py-3">You have no subscriptions yet.</p>
      </template>
    </section>

    <section aria-labelledby="account-sets-heading">
      <Heading id="account-sets-heading" level="2">Your sets</Heading>

      <p
        v-if="setsLoadingStatus.type === 'loading'"
        class="flex items-center gap-2 py-3"
        aria-live="polite"
        aria-atomic="true">
        <GraphicsLoading class="inline-block w-5 h-5" />
        Loading...
      </p>

      <AlertBox v-else-if="setsLoadingStatus.type === 'error'" variant="warning" role="alert">
        <p>
          {{ setsLoadingStatus.message }}
          <button type="button" class="underline cursor-pointer" @click="loadSets">Try again</button>
        </p>
      </AlertBox>

      <template v-else-if="setsLoadingStatus.type === 'success'">
        <ul v-if="sets.length > 0" class="flex flex-col gap-2 py-3">
          <li v-for="set in sets" :key="set.id" class="border rounded px-3 py-2">
            <div class="flex items-start justify-between gap-2">
              <span>
                <Anchor :href="setPathBuilder(set.id)" class="underline font-bold">
                  {{ set.title || 'Untitled set' }}
                </Anchor>
                <template v-if="set.description">: {{ set.description }}</template>
                <span v-if="setDeleteErrors[set.id]" class="block text-sm text-red-700" role="alert">
                  {{ setDeleteErrors[set.id] }}
                </span>
              </span>

              <span class="flex items-center gap-1 shrink-0">
                <DialogRoot
                  :open="editSetId === set.id"
                  @update:open="(open) => (open ? openEditSet(set) : (editSetId = undefined))">
                  <DialogTrigger
                    :aria-label="`Edit set: ${set.title || 'Untitled set'}`"
                    class="cursor-pointer px-2 py-1 rounded-md border-1 border-gray-400 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800">
                    Edit
                  </DialogTrigger>
                  <DialogPortal>
                    <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
                    <DialogContent
                      :class="[
                        'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] z-115',
                        'focus:outline-none rounded-md shadow-3xl',
                        'bg-white dark:bg-gray-800',
                        'px-4 pt-3 pb-1'
                      ]">
                      <DialogTitle class="text-lg font-semibold text-center pb-3">Edit set</DialogTitle>

                      <DialogDescription class="text-sm">
                        Sets are public: anyone with the link can see the title and description.
                      </DialogDescription>

                      <!-- A real form, so Enter submits and the browser's own required/maxlength
                         handling applies before anything is sent. -->
                      <form class="flex flex-col gap-3 pt-3 pb-2" @submit.prevent="saveEditSet">
                        <div class="flex flex-col gap-1">
                          <label :for="editTitleDomId" class="font-bold">Title</label>
                          <input
                            :id="editTitleDomId"
                            v-model="editTitle"
                            type="text"
                            required
                            :maxlength="SET_TITLE_MAX_LENGTH"
                            :disabled="editSaving"
                            class="border-1 border-gray-400 dark:border-gray-500 rounded px-2 py-1 bg-white dark:bg-gray-900" />
                        </div>

                        <div class="flex flex-col gap-1">
                          <label :for="editDescriptionDomId" class="font-bold">
                            Description <span class="font-normal text-gray-700 dark:text-gray-300">(optional)</span>
                          </label>
                          <textarea
                            :id="editDescriptionDomId"
                            v-model="editDescription"
                            rows="2"
                            :disabled="editSaving"
                            class="border-1 border-gray-400 dark:border-gray-500 rounded px-2 py-1 bg-white dark:bg-gray-900" />
                        </div>

                        <!-- role="alert" so a failed save is announced: the dialog stays put and the
                           only thing that changed is this line appearing. -->
                        <p v-if="editError" role="alert" class="text-red-700 dark:text-red-400">
                          {{ editError }}
                        </p>

                        <div class="flex justify-end gap-2 pb-2">
                          <DialogClose
                            :class="[
                              'px-3 py-1 rounded-md',
                              'text-blue-800 dark:text-white font-bold border-1 border-blue-600 dark:border-blue-200',
                              'cursor-pointer'
                            ]">
                            Cancel
                          </DialogClose>
                          <button
                            type="submit"
                            :disabled="editSaving"
                            class="font-bold bg-blue-600 text-white px-3 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-default">
                            {{ editSaving ? 'Saving…' : 'Save' }}
                          </button>
                        </div>
                      </form>

                      <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
                        <GraphicsClose />
                      </DialogClose>
                    </DialogContent>
                  </DialogPortal>
                </DialogRoot>

                <DialogRoot
                  :open="confirmDeleteSetId === set.id"
                  @update:open="(open) => (confirmDeleteSetId = open ? set.id : undefined)">
                  <DialogTrigger
                    :aria-label="`Delete set: ${set.title || 'Untitled set'}`"
                    class="cursor-pointer px-2 py-1 rounded-md border-1 border-gray-400 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800">
                    Delete
                  </DialogTrigger>
                  <DialogPortal>
                    <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
                    <DialogContent
                      :class="[
                        'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] z-115',
                        'focus:outline-none rounded-md shadow-3xl',
                        'bg-white dark:bg-gray-800',
                        'px-4 pt-3 pb-1'
                      ]">
                      <DialogTitle class="text-lg font-semibold text-center pb-3">Delete this set?</DialogTitle>

                      <DialogDescription class="text-sm">
                        <p>{{ set.title || 'Untitled set' }}</p>
                        <p class="pt-2">This can't be undone, and anyone else with the link will lose it too.</p>

                        <!-- role="alert" so a failed delete is announced: the dialog stays put and
                           the only thing that changed is this line appearing. -->
                        <p v-if="setDeleteErrors[set.id]" role="alert" class="pt-2 text-red-700 dark:text-red-400">
                          {{ setDeleteErrors[set.id] }}
                        </p>

                        <div class="flex justify-end gap-2 pt-4 pb-2">
                          <DialogClose
                            :class="[
                              'px-3 py-1 rounded-md',
                              'text-blue-800 dark:text-white font-bold border-1 border-blue-600 dark:border-blue-200',
                              'cursor-pointer'
                            ]">
                            Cancel
                          </DialogClose>
                          <button
                            type="button"
                            :disabled="setsDeleting[set.id]"
                            class="font-bold bg-red-700 text-white px-3 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-default"
                            @click="deleteSetRow(set)">
                            {{ setsDeleting[set.id] ? 'Deleting…' : 'Delete' }}
                          </button>
                        </div>
                      </DialogDescription>

                      <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
                        <GraphicsClose />
                      </DialogClose>
                    </DialogContent>
                  </DialogPortal>
                </DialogRoot>
              </span>
            </div>
          </li>
        </ul>
        <p v-else class="italic py-3">You have no sets yet.</p>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * The account page's lists of notification subscriptions and document sets.
 *
 * Only rendered for a signed-in user — the caller is responsible for that check — and the
 * Reef API client is browser-only, so both loads happen on mount rather than during SSR.
 */
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import { z } from 'zod'
import type { LoadingStatus } from '~/utilities/loading-status'
import {
  deleteSet,
  deleteSubscription,
  getSets,
  getSubscriptions,
  patchSet,
  ReefError,
  type DocumentSet,
  type Subscription,
  type SubscriptionKind
} from '~/utilities/reef'
import { SET_TITLE_MAX_LENGTH, sortSets } from '~/utilities/reef-sets'
import { parseSeriesId } from '~/utilities/rfc'
import { infoSeriesPathBuilder, setPathBuilder, subjectsPathBuilder } from '~/utilities/url'

// Wording taken from the KindEnum descriptions in reef_api.yaml. Only Account.vue reads
// subscriptions this way, so the label and summary presentation live here rather than as
// exports another file has to keep in step with.
const KIND_LABELS: Record<SubscriptionKind, string> = {
  rfc: 'A specific RFC',
  new_rfc: 'Any new RFC',
  by_status: 'New RFC by status',
  obsoleted: 'RFC obsoleted or made historic',
  subject: 'Changes to anything carrying a subject',
  set: 'Set of RFCs'
}

// `params` is typed as `unknown` in the spec, so it's parsed rather than trusted. The rfc kind's
// one param is the document it's for — read here once, since the label and the browse link both
// need it.
const SubscriptionParamsSchema = z.record(z.string(), z.unknown())

const rfcSubscriptionDoc = (subscription: Subscription): string | undefined => {
  if (subscription.kind !== 'rfc') {
    return undefined
  }
  const { data } = SubscriptionParamsSchema.safeParse(subscription.params)
  return typeof data?.rfc === 'string' ? data.rfc : undefined
}

// The tag name rather than the generic "Changes to anything carrying a subject" kind label, for
// the same reason as rfc below: `subject_details` is what Reef added to a subscription so a list
// can show and link the subject it names (see MinimalSubject in reef_api.yaml), and the name is
// the part worth showing. Empty when `kind` isn't `subject`, or when a subscription pointing at a
// deleted subject leaves the details blank.
const subjectSubscriptionName = (subscription: Subscription): string | undefined => {
  if (subscription.kind !== 'subject' || subscription.subject_details.name === '') {
    return undefined
  }
  return subscription.subject_details.name
}

// Names the document rather than the generic "A specific RFC" kind label, since the whole point
// of an rfc-kind subscription is which one. Same for a subject-kind subscription and its tag name.
// Falls back to the kind label — and, failing that, the raw kind — for anything this build can't
// parse a document or subject out of, so a subscription created by a newer Reef, or with params in
// a shape this build doesn't expect, still shows something rather than an empty row.
const subscriptionLabel = (subscription: Subscription): string => {
  const doc = rfcSubscriptionDoc(subscription)
  const rfc = doc !== undefined ? parseSeriesId(doc) : undefined
  if (rfc !== undefined) {
    return `${rfc.type.toUpperCase()} ${rfc.number}`
  }
  return subjectSubscriptionName(subscription) ?? KIND_LABELS[subscription.kind] ?? subscription.kind
}

const formatParamValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(formatParamValue).join(', ')
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value).toUpperCase() ?? ''
}

// Returns undefined when there's nothing worth showing, which is the common case for the new_rfc
// and set kinds — and now also for rfc, whose one param is the document subscriptionLabel already
// names.
const subscriptionParamsSummary = ({ params }: Subscription): string | undefined => {
  const { data } = SubscriptionParamsSchema.safeParse(params)
  if (data === undefined) {
    return undefined
  }

  const summary = Object.entries(data)
    .filter(([key, value]) => key !== 'rfc' && value !== null && value !== undefined && value !== '')
    .map(([, value]) => formatParamValue(value))
    .join(', ')

  return summary === '' ? undefined : summary
}

// Where "browse to that thing" goes, per kind. rfc carries its document under params.rfc, set
// carries its uuid on the subscription itself rather than in params, and subject carries its slug
// under subject_details — three places Reef puts an identifier depending on kind. The other kinds
// (new_rfc, by_status, obsoleted) name no single thing to browse to, so there's nothing to link.
const subscriptionBrowsePath = (subscription: Subscription): string | undefined => {
  const doc = rfcSubscriptionDoc(subscription)
  if (doc !== undefined) {
    try {
      return infoSeriesPathBuilder(doc)
    } catch {
      return undefined
    }
  }
  if (subscription.kind === 'set' && subscription.set) {
    return setPathBuilder(subscription.set)
  }
  if (subjectSubscriptionName(subscription) !== undefined) {
    return subjectsPathBuilder(subscription.subject_details.slug)
  }
  return undefined
}

// --- Subscriptions ---------------------------------------------------------------------------

const subscriptionsLoadingStatus = ref<LoadingStatus>({ type: 'idle' })
const subscriptions = ref<Subscription[]>([])

// Each row's browse-to link, computed once here rather than in the template: AMaybeRFCLink needs
// a definite string, and vue-tsc can't narrow that from a v-if guard and a binding that each call
// subscriptionBrowsePath separately.
const subscriptionRows = computed(() =>
  subscriptions.value.map((subscription) => ({ subscription, browsePath: subscriptionBrowsePath(subscription) }))
)

// One controller per attempt so that unmounting, or a retry click landing while the previous
// request is still open, abandons the older request instead of letting it set state later.
let subscriptionsController: AbortController | undefined

const loadSubscriptions = async () => {
  subscriptionsController?.abort()
  subscriptionsController = new AbortController()
  const { signal } = subscriptionsController

  subscriptionsLoadingStatus.value = { type: 'loading' }

  try {
    const loaded = await getSubscriptions(signal)
    // Newest first, so a subscription the user just created appears at the top of the list.
    subscriptions.value = loaded.toSorted((a, b) => b.created_at.localeCompare(a.created_at))
    subscriptionsLoadingStatus.value = { type: 'success' }
  } catch (error) {
    if (signal.aborted) {
      // superseded by a newer attempt, or the component has gone away
      return
    }
    console.error('Unable to load notification subscriptions.', error)
    subscriptionsLoadingStatus.value = {
      type: 'error',
      message:
        error instanceof ReefError && error.status === 403
          ? "You don't have permission to view these notifications."
          : 'Unable to load your notifications. See the web console for details.'
    }
  }
}

// Which row's delete confirmation dialog is open, if any. Only one can be open at a time — the
// dialog is modal — so a single id is enough to control every row's DialogRoot.
const confirmDeleteId = ref<number>()

// Keyed by subscription id, since more than one row's delete button can be pressed independently.
const subscriptionsDeleting = reactive<Record<number, boolean>>({})
const subscriptionDeleteErrors = reactive<Record<number, string>>({})

const deleteSubscriptionRow = async (subscription: Subscription) => {
  subscriptionsDeleting[subscription.id] = true
  delete subscriptionDeleteErrors[subscription.id]

  try {
    await deleteSubscription(subscription.id)
    subscriptions.value = subscriptions.value.filter(({ id }) => id !== subscription.id)
  } catch (error) {
    console.error('Unable to delete this subscription.', error)
    subscriptionDeleteErrors[subscription.id] = 'Unable to delete this subscription. Please try again.'
  } finally {
    delete subscriptionsDeleting[subscription.id]
  }
}

// --- Sets --------------------------------------------------------------------------------

const setsLoadingStatus = ref<LoadingStatus>({ type: 'idle' })
const sets = ref<DocumentSet[]>([])

let setsController: AbortController | undefined

const loadSets = async () => {
  setsController?.abort()
  setsController = new AbortController()
  const { signal } = setsController

  setsLoadingStatus.value = { type: 'loading' }

  try {
    const loaded = await getSets(signal)
    sets.value = sortSets(loaded)
    setsLoadingStatus.value = { type: 'success' }
  } catch (error) {
    if (signal.aborted) {
      return
    }
    console.error('Unable to load your sets.', error)
    setsLoadingStatus.value = {
      type: 'error',
      message:
        error instanceof ReefError && error.status === 403
          ? "You don't have permission to view these sets."
          : 'Unable to load your sets. See the web console for details.'
    }
  }
}

// Which set's edit dialog is open, if any. Only one can be open at a time — the dialog is modal —
// so a single id is enough to control every row's DialogRoot, the same way confirmDeleteId does
// for subscriptions.
const editSetId = ref<string>()
const editTitle = ref('')
const editDescription = ref('')
const editSaving = ref(false)
const editError = ref<string>()

const editTitleDomId = useId()
const editDescriptionDomId = useId()

// Seeds the form from the set being opened, so editing a second set right after the first doesn't
// keep what was typed for it.
const openEditSet = (set: DocumentSet) => {
  editSetId.value = set.id
  editTitle.value = set.title
  editDescription.value = set.description ?? ''
  editError.value = undefined
}

const saveEditSet = async () => {
  if (editSetId.value === undefined || editSaving.value) {
    return
  }
  // `required` on the input already stops an empty title, but not one that's only spaces.
  if (editTitle.value.trim() === '') {
    editError.value = 'A set needs a title.'
    return
  }

  editSaving.value = true
  editError.value = undefined

  try {
    const updated = await patchSet(editSetId.value, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim()
    })
    sets.value = sortSets(sets.value.map((set) => (set.id === updated.id ? updated : set)))
    editSetId.value = undefined
  } catch (error) {
    console.error('Unable to update this set.', error)
    editError.value = 'Unable to update this set. Please try again.'
  } finally {
    editSaving.value = false
  }
}

// Which set's delete confirmation dialog is open, if any.
const confirmDeleteSetId = ref<string>()

// Keyed by set id, since more than one row's delete button can be pressed independently.
const setsDeleting = reactive<Record<string, boolean>>({})
const setDeleteErrors = reactive<Record<string, string>>({})

const deleteSetRow = async (set: DocumentSet) => {
  setsDeleting[set.id] = true
  delete setDeleteErrors[set.id]

  try {
    await deleteSet(set.id)
    sets.value = sets.value.filter(({ id }) => id !== set.id)
  } catch (error) {
    console.error('Unable to delete this set.', error)
    setDeleteErrors[set.id] = 'Unable to delete this set. Please try again.'
  } finally {
    delete setsDeleting[set.id]
  }
}

onMounted(() => {
  void loadSubscriptions()
  void loadSets()
})

onBeforeUnmount(() => {
  subscriptionsController?.abort()
  setsController?.abort()
})
</script>
