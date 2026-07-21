// Throwaway file to verify the CodeQL High-severity gate blocks merge (T019).
// Deliberately insecure: Math.random() used to generate a security token
// (js/insecure-randomness — the same rule CodeQL already flags in this repo).
export function generateSessionToken(): string {
  return Math.random().toString(36).slice(2);
}
