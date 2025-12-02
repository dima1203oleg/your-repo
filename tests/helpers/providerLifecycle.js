// Small test helper for temporarily disabling/enabling providers in the Router
// used by E2E tests. This makes the lifecycle explicit in tests instead of
// mutating internals inline.

function disableProvider(router, providerName) {
  if (!router || !router.providers || !router.providers[providerName]) return () => {};
  const prev = router.providers[providerName].enabled;
  router.providers[providerName].enabled = false;
  // return a function that restores the prior enabled state
  return () => { router.providers[providerName].enabled = prev; };
}

module.exports = { disableProvider };
