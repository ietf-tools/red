// The one thing the per-reader Reef caches share: where they live, and how they're emptied.
//
// Each feature caches its own answers in its own module — a rating per RFC in
// ~/utilities/reef-ratings, the whole subscription list in ~/utilities/reef-subscriptions, the
// whole set list in ~/utilities/reef-sets — because what's worth remembering, and what makes a
// cached copy stale, is particular to each. What isn't particular to any of them is that all of it
// belongs to whoever is signed in, and none of it should outlive their session.
//
// Its own module rather than part of ~/utilities/reef so that the client's sign-out path can clear
// the caches without the API client and the OIDC module importing each other.

// Every per-reader cache is a sessionStorage entry under this prefix, keyed within it by the OIDC
// subject so two readers using the same tab in turn can't be shown each other's answers.
export const REEF_CACHE_PREFIX = 'red.reef.'

// Forget everything this tab has cached about any reader. Called when a session ends, however it
// ends — the reader signing out, or a refresh the identity provider won't honour.
//
// Not what makes the caches private: keying by subject already means a signed-out tab can't read
// what the previous reader cached, since no key can be derived without a user and the next
// reader's keys are different ones. This is so a shared machine isn't left holding what someone
// read, rated or subscribed to until the tab happens to close.
//
// Swept by prefix rather than by asking each feature to clear its own, which has two advantages: a
// feature added later is covered without this changing, and it works just as well after the reader
// has already gone from the auth store — a sign-out clears that too, and the order of the two is
// then not something this has to depend on.
export const clearReefCaches = (): void => {
  if (!import.meta.client) {
    return
  }
  try {
    const { sessionStorage } = window
    // Collected before anything is removed, because removing shifts the indices key() reads by, so
    // a sweep that removed as it went would skip an entry for every one it had already taken out.
    const cachedKeys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter(
      (key): key is string => key !== null && key.startsWith(REEF_CACHE_PREFIX)
    )

    cachedKeys.forEach((key) => {
      sessionStorage.removeItem(key)
    })
  } catch (error) {
    // sessionStorage throws outright when browser storage is disabled, in which case there was
    // nothing cached to clear in the first place. Never rethrown: a tab that can't empty its cache
    // must still be able to sign out.
    console.warn('[reef] unable to clear the cached answers for this reader', error)
  }
}
