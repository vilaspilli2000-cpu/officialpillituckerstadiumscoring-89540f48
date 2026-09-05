/** Cryptographically secure 50/50 coin flip. Result is determined by one
 *  uniformly random bit drawn from crypto.getRandomValues. No Math.random(). */
export function secureCoinFlip(): "H" | "T" {
  const arr = new Uint32Array(1);
  globalThis.crypto.getRandomValues(arr);
  return (arr[0] & 1) === 0 ? "H" : "T";
}
