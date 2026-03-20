<template>
  <div class="pl-1 pb-6">
    <form v-if="props.errataList && props.errataList.length > 0">
      <label class="text-sm">
        <span class="inline-block font-bold mb-2">Show only</span><br />
        <SelectNeue
          v-model="selectedStatusType"
          @change="
            (event: Event) => {
              const select = event.target
              if (!isSelectElement(select)) {
                return
              }
              selectedStatusType = select.value as ErrataStatus
            }
          "
        >
          <option
            v-for="option in allStatusTypes"
            :key="option"
            :value="option"
          >
            {{ option }}
            {{
              typeof statusCounts[option] === 'number' ?
                `(${statusCounts[option]})`
              : '(0)'
            }}
          </option>
        </SelectNeue>
      </label>
      <ul
        v-if="filteredErrataList && filteredErrataList.length > 0"
        class="mt-3 mr-2 flex flex-col gap-2"
      >
        <li
          v-for="errataItemForTab in filteredErrataList"
          :key="errataItemForTab.errata_id"
        >
          <ErrataListItem :errata-item-for-tab="errataItemForTab" />
        </li>
      </ul>
      <p v-else class="text-sm italic mt-3">
        No errata match the filter {{ JSON.stringify(selectedStatusType) }}
      </p>
    </form>
    <p v-else class="text-sm italic mt-3">No errata</p>
  </div>
</template>

<script setup lang="ts">
import { countBy } from 'es-toolkit'
import { isSelectElement } from '~/utilities/dom'
import {
  errataItemToErrataItemForTab,
  sortErrataItemForTab,
  type ErrataItemForTab
} from '~/utilities/errata'
import {
  ErrataStatusSchema,
  type ErrataStatus,
  type ErrataList
} from '~/utilities/rfc-validators'

type Props = {
  errataList?: ErrataList
}
const props = defineProps<Props>()

const allStatusTypes = computed(() => {
  const statusTypes = ErrataStatusSchema._def.options.map((val) => val.value)

  // because we're accessing Zod apis that could change we'll add some safety checks to the value
  if (!Array.isArray(statusTypes) || statusTypes.length < 3) {
    console.warn(
      `Unable to extract all errata status types from Zod schema. Was: `,
      statusTypes,
      ErrataStatusSchema
    )
  }
  return statusTypes
})

const statusCounts = computed<Record<ErrataStatus, number>>(() => {
  return countBy(
    props.errataList || [],
    (errataItem) => errataItem.errata_status_code
  )
})

const firstStatusWithACount = Object.entries(statusCounts.value).find(
  ([_key, count]) => count > 0
)

const selectedStatusType = ref(
  firstStatusWithACount ?
    (firstStatusWithACount[0] as ErrataStatus)
  : (allStatusTypes.value[0] as ErrataStatus)
)

const errataItemsForTab = ref<ErrataItemForTab[] | undefined>(
  props.errataList?.map(errataItemToErrataItemForTab)
)

const orderedErrataItemsForTab = ref(errataItemsForTab.value)

const filteredErrataList = computed(() => {
  return orderedErrataItemsForTab.value?.filter(
    (errataItem) => errataItem.errata_status_code === selectedStatusType.value
  )
})

onMounted(() => {
  if (!errataItemsForTab.value) {
    return
  }

  orderedErrataItemsForTab.value = errataItemsForTab.value
    .map((errataItemForTab) => {
      if (!errataItemForTab.domId) {
        return errataItemForTab
      }

      try {
        // because we derive domId from `section` it's quite possible that domId
        // has invalid syntax for a DOM id (it might have whitespace), and
        // getElementById() might throw
        const target = document.getElementById(errataItemForTab.domId)
        if (target) {
          // then it's a valid domId with a target so keep the domId
          // and add the element
          return {
            ...errataItemForTab,
            domTarget: target
          }
        } else {
          console.warn(
            "Couldn't find errata domId of ",
            errataItemForTab.domId,
            '. This is expected for some `section` values and this error can be ignored. Original `section` was ',
            errataItemForTab.section
          )
        }
      } catch (e) {
        console.warn(
          `Unable to getElementById(${errataItemForTab.domId}). This is probably an invalid DOM id.`,
          'This is expected for some `section` values and can be ignored. Original `section` was ',
          errataItemForTab.section,
          e
        )
      }

      // then it's not valid DOM Id syntax or the target wasn't found,
      // so remove the domId
      return {
        ...errataItemForTab,
        domId: undefined
      }
    })
    .sort(sortErrataItemForTab)
})
</script>
