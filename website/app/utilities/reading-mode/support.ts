import { onMounted, ref } from 'vue'
import { isReadingModeSupported } from './highlight'

// Both flags stay false until mounted, because support can only be read in the browser and the
// server render has to match the first client render. Neither being true means "not known yet".
export const useReadingModeSupport = () => {
  const isSupported = ref(false)
  const isUnsupported = ref(false)

  onMounted(() => {
    const supported = isReadingModeSupported()
    isSupported.value = supported
    isUnsupported.value = !supported
  })

  return { isSupported, isUnsupported }
}
