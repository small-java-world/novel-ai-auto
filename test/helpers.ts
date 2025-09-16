// Tiny helpers for test reliability
export function guardRejection<T>(promise: Promise<T>): Promise<T> {
  // Attach a no-op catch so the rejection is considered handled
  // while allowing expect(promise).rejects to still assert the original.
  // Do not chain/return the caught promise; return the original for assertions.
  void promise.catch(() => {});
  return promise;
}
