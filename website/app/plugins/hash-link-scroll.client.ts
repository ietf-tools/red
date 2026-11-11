import { rememberScrollBeforeHashJump } from '~/utilities/hash-link-scroll'

export default defineNuxtPlugin(() => {
  document.addEventListener('click', rememberScrollBeforeHashJump, true)
})
