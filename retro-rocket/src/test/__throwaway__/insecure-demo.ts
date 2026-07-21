// Throwaway file to verify the CodeQL High-severity gate blocks merge (T019).
// Deliberately vulnerable: command injection via unsanitized input into exec().
import { exec } from 'child_process';

export function runUserCommand(userInput: string): void {
  exec(`echo ${userInput}`, (error, stdout) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log(stdout);
  });
}
