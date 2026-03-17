<template>
  <div v-if="props.errataList && props.errataList.length > 0">
    <form class="pl-1">
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
        v-if="filteredErrataList.length > 0"
        class="mt-3 mr-2 flex flex-col gap-2"
      >
        <li
          v-for="errataItem in filteredErrataList"
          :key="errataItem.errata_id"
        >
          <ErrataListItem :errata-item="errataItem" />
        </li>
      </ul>
      <p v-else class="text-sm italic mt-3">
        No errata match the filter {{ JSON.stringify(selectedStatusType) }}
      </p>
    </form>
  </div>
  <div v-else class="text-sm italic mt-3">No errata</div>
</template>

<script setup lang="ts">
import { countBy } from 'es-toolkit'
import { isSelectElement } from '~/utilities/dom'
import {
  ErrataStatusSchema,
  type ErrataStatus,
  type ErrataList,
  type ErrataItem
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

const filteredErrataList = computed<ErrataItem[]>(() => {
  return (
    props.errataList?.filter(
      (errataItem) => errataItem.errata_status_code === selectedStatusType.value
    ) ?? []
  )
})
</script>
