import type { OidcUser } from '~/utilities/oidc'

// Reactive auth state for the UI layer. Populated client-side after mount (see
// Header.vue) from the OIDC session — defaults to logged-out so SSR and first client
// paint render the anonymous view, then enhance once the session is restored.
export const useAuthStore = defineStore('auth', () => {
  const isAuthenticatedRef = ref(false)
  const userRef = ref<OidcUser>()

  const setUser = (user: OidcUser) => {
    isAuthenticatedRef.value = true
    userRef.value = user
  }

  const clearUser = () => {
    isAuthenticatedRef.value = false
    userRef.value = undefined
  }

  return {
    isAuthenticated: isAuthenticatedRef,
    user: userRef,
    setUser,
    clearUser
  }
})
