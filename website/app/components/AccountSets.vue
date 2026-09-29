<template>
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
        <li
          v-for="set in sets"
          :key="set.id"
          class="bg-white dark:bg-black border border-gray-300 dark:border-gray-500 rounded px-5 py-2">
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

            <span class="flex items-center gap-3 shrink-0">
              <DialogRoot
                :open="editSetId === set.id"
                @update:open="(open) => (open ? openEditSet(set) : (editSetId = undefined))">
                <DialogTrigger
                  :aria-label="`Edit set: ${set.title || 'Untitled set'}`"
                  class="cursor-pointer px-2 py-1 font-bold text-sm rounded-md border-1 border-gray-400 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800">
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
                          type="button"
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
                  class="cursor-pointer px-2 py-1 font-bold text-sm rounded-md border-1 border-gray-400 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800">
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
</template>

<script setup lang="ts">
/**
 * The account page's list of document sets.
 *
 * Only rendered for a signed-in user — the caller is responsible for that check — and the
 * Reef API client is browser-only, so the load happens on mount rather than during SSR.
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
import type { LoadingStatus } from '~/utilities/loading-status'
import { deleteSet, getSets, patchSet, ReefError, type DocumentSet } from '~/utilities/reef'
import { SET_TITLE_MAX_LENGTH, sortSets } from '~/utilities/reef-sets'
import { setPathBuilder } from '~/utilities/url'

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
// so a single id is enough to control every row's DialogRoot.
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
  void loadSets()
})

onBeforeUnmount(() => {
  setsController?.abort()
})
</script>
