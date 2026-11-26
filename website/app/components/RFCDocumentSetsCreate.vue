<template>
  <DialogRoot v-model:open="isOpen">
    <div class="text-center -mb-7">
      <DialogTrigger
        :class="[
          'font-bold px-2 py-1 rounded cursor-pointer',
          {
            'bg-blue-600 text-white': props.hasSolidButton,
            'bg-white dark:bg-blue-950 text-blue-600 dark:text-white border-1 border-blue-600': !props.hasSolidButton
          }
        ]">
        Create a new Set
      </DialogTrigger>
    </div>
    <DialogPortal>
      <!-- Above the "Add to Set" dialog's own overlay and content, so the two read as a stack
         rather than as one dialog with something drawn over it. -->
      <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
      <DialogContent
        :class="[
          'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] z-115',
          'focus:outline-none rounded-md shadow-3xl',
          'bg-white dark:bg-gray-800',
          'px-4 pt-3 pb-1'
        ]">
        <DialogTitle class="text-lg font-semibold text-center pb-3">Create Set</DialogTitle>

        <!-- That a set is public is said here rather than left to be discovered: the API carries no
           visibility, so it isn't something the reader chooses. -->
        <DialogDescription class="text-sm">
          RFC {{ props.rfcNumber }} will be added to the new Set. This content is public, do not include any private
          information. Inappropriate data may be removed.
        </DialogDescription>

        <!-- A real form, so Enter submits and the browser's own required/maxlength handling
           applies before anything is sent. -->
        <form class="flex flex-col gap-3 pt-3 pb-2" @submit.prevent="onSubmit">
          <div class="flex flex-col gap-1">
            <label :for="titleDomId" class="font-bold">Title</label>
            <input
              :id="titleDomId"
              ref="titleInput"
              v-model="newSetTitle"
              type="text"
              required
              :maxlength="SET_TITLE_MAX_LENGTH"
              :disabled="isCreating"
              :aria-invalid="titleHasSpam ? 'true' : undefined"
              :aria-describedby="describedBy(titleHasSpam, titleSpamDomId)"
              class="border-1 border-gray-400 dark:border-gray-500 rounded px-2 py-1 bg-white dark:bg-gray-900" />
            <p v-if="titleHasSpam" :id="titleSpamDomId" role="alert" class="text-red-700 dark:text-red-400">
              {{ SPAM_MESSAGE }}
            </p>
          </div>

          <div class="flex flex-col gap-1">
            <label :for="descriptionDomId" class="font-bold">
              Description <span class="font-normal text-gray-700 dark:text-gray-300">(optional)</span>
            </label>
            <textarea
              :id="descriptionDomId"
              ref="descriptionInput"
              v-model="newSetDescription"
              rows="2"
              :disabled="isCreating"
              :aria-invalid="descriptionHasSpam ? 'true' : undefined"
              :aria-describedby="describedBy(descriptionHasSpam, descriptionSpamDomId)"
              class="border-1 border-gray-400 dark:border-gray-500 rounded px-2 py-1 bg-white dark:bg-gray-900" />
            <p v-if="descriptionHasSpam" :id="descriptionSpamDomId" role="alert" class="text-red-700 dark:text-red-400">
              {{ SPAM_MESSAGE }}
            </p>
          </div>

          <!-- role="alert" so the failure is announced: the dialog stays put and the only thing
             that changed is this line appearing. -->
          <p v-if="createError !== undefined" :id="errorDomId" role="alert" class="text-red-700 dark:text-red-400">
            {{ createError }}
          </p>

          <div class="flex justify-end gap-2 pb-2">
            <DialogClose
              :class="[
                'px-3 py-1 rounded-md',
                'text-blue-800 font-bold border-1 border-blue-600 dark:border-blue-900',
                'cursor-pointer'
              ]">
              Cancel
            </DialogClose>
            <button
              type="submit"
              :disabled="isCreating"
              class="font-bold bg-blue-600 text-white px-3 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-default">
              {{ isCreating ? 'Creating…' : 'Create Set' }}
            </button>
          </div>
        </form>

        <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
          <GraphicsClose />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
/**
 * The "create set" dialog, opened from inside the "Add to Set" dialog (RFCDocumentSets).
 *
 * A dialog of its own rather than a second page of that one. Creating a set is a detour from
 * picking one, and it's the reader's own list underneath that tells them the detour worked — a new
 * row, already ticked. Swapping the outer dialog's contents hid exactly that. Reka stacks the two:
 * Escape closes this one first, and focus returns to the trigger.
 *
 * The half-filled form is the one piece of state around this feature that isn't the parent's: it
 * means nothing to anyone until it's submitted, and nothing outside this dialog can act on it. The
 * creating itself isn't done here — `createSet` comes in from RFCDocumentReef's useUserSets, which
 * is where the rest of the Reef work for sets lives.
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
import { SET_TITLE_MAX_LENGTH, type CreateSetOutcome, type NewSet } from '~/utilities/reef-sets'
import { filterSpamText } from '~/utilities/spam'

type Props = {
  // Named in the description, because a set created from here starts out holding this RFC and the
  // reader should be told that before they fill anything in.
  rfcNumber: number
  hasSolidButton?: boolean
  // A function rather than an emit because the form needs the outcome back: a failure is reported
  // in the form, beside the field that caused it, rather than announced from somewhere else.
  createSet: (newSet: NewSet) => Promise<CreateSetOutcome>
}

const props = defineProps<Props>()

// Controlled, because a successful creation has to close this dialog from script — every other way
// out of it is a DialogClose the reader presses.
const isOpen = ref(false)

const titleDomId = useId()
const descriptionDomId = useId()
const errorDomId = useId()
const titleSpamDomId = useId()
const descriptionSpamDomId = useId()

const newSetTitle = ref('')
const newSetDescription = ref('')
const isCreating = ref(false)
const createError = ref<string>()

const titleInput = ref<HTMLInputElement>()
const descriptionInput = ref<HTMLTextAreaElement>()

const SPAM_MESSAGE = 'Links and cryptocurrency addresses are not allowed here. Remove them to continue.'

// filterSpamText also collapses and trims whitespace, which isn't spam, so whitespace is left out of
// the comparison or a trailing space would flag an honest title.
const containsSpam = (text: string): boolean => {
  const withoutWhitespace = (value: string) => value.replace(/\s/g, '')
  return withoutWhitespace(filterSpamText(text)).length !== withoutWhitespace(text).length
}

// Checked as the reader types rather than on submit, so the field is marked before they reach for
// the button.
const titleHasSpam = computed(() => containsSpam(newSetTitle.value))
const descriptionHasSpam = computed(() => containsSpam(newSetDescription.value))

// The server's createError describes the form as a whole, so it stays attached to the title as it
// was; the spam message is attached to the field it is about.
const describedBy = (hasSpam: boolean, spamDomId: string): string | undefined => {
  const ids = [hasSpam ? spamDomId : undefined, createError.value === undefined ? undefined : errorDomId]
  const present = ids.filter((id) => id !== undefined)
  return present.length === 0 ? undefined : present.join(' ')
}

// Every opening starts a fresh form. The only ways out of this dialog without creating anything —
// Cancel, the close button, Escape — are all the reader discarding what they typed, so bringing it
// back next time, along with a message about an attempt they walked away from, would be keeping
// something they'd already dropped. Reka unmounts the content on close, so this is the one place
// the fields need clearing.
watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) {
    return
  }
  newSetTitle.value = ''
  newSetDescription.value = ''
  createError.value = undefined
})

const onSubmit = async () => {
  // The submit button is disabled while a creation is open, but Enter in a text field would still
  // submit the form.
  if (isCreating.value) {
    return
  }

  // The fields are already marked and explained as the reader types; this is what stops the
  // request, and it moves focus to the first field at fault so a keyboard or screen reader user
  // isn't left on a button that appears to do nothing.
  if (titleHasSpam.value || descriptionHasSpam.value) {
    ;(titleHasSpam.value ? titleInput : descriptionInput).value?.focus()
    return
  }

  // `required` on the input already stops an empty title, but not one that's only spaces.
  if (newSetTitle.value.trim() === '') {
    createError.value = 'A Set needs a title.'
    return
  }

  isCreating.value = true
  createError.value = undefined
  const outcome = await props.createSet({
    title: newSetTitle.value,
    description: newSetDescription.value
  })
  isCreating.value = false

  if (!outcome.ok) {
    createError.value = outcome.message
    return
  }

  // Closing reveals the list underneath, where the new set is already a row and already ticked —
  // which is the confirmation, so there's nothing further to report. The fields are left as they
  // are; the watcher above clears them the next time this opens.
  isOpen.value = false
}
</script>
