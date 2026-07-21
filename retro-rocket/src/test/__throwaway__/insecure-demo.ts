// Throwaway file to verify the CodeQL High-severity gate blocks merge (T019).
// Deliberately insecure (js/insecure-randomness), mirroring GitHub's own
// documented bad-example pattern for this exact rule.
export function insecurePassword(): string {
  const suffix = Math.random();
  const password = "myPassword" + suffix;
  return password;
}
