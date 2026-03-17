<template>
  <div v-if="props.errataList && props.errataList.length > 0">
    <form class="pl-1">
      <label class="text-sm">
        <span class="inline-block font-bold mb-2">Show only</span><br />
        <SelectNeue
          :model-value="selectedStatusType"
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
import { uniqBy, countBy } from 'es-toolkit'
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

const allStatusTypes = computed(() =>
  ErrataStatusSchema._def.options.map((val) => val.value)
)

const statusTypes = computed(() =>
  props.errataList ?
    uniqBy(props.errataList, (errataItem) => errataItem.errata_status_code).map(
      (errataItem) => errataItem.errata_status_code
    )
  : []
)

const statusCounts = computed<Record<ErrataStatus, number>>(() => {
  return countBy(
    props.errataList || [],
    (errataItem) => errataItem.errata_status_code
  )
})

const selectedStatusType = ref<ErrataStatus | undefined>(
  statusTypes.value?.length > 0 ? statusTypes.value[0] : undefined
)

const filteredErrataList = computed<ErrataItem[]>(() => {
  console.log('recoputed', selectedStatusType.value)
  return (
    props.errataList?.filter(
      (errataItem) => errataItem.errata_status_code === selectedStatusType.value
    ) ?? []
  )
})
</script>
