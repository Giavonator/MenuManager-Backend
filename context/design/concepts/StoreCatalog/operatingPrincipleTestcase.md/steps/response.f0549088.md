---
timestamp: 'Fri Oct 24 2025 05:40:44 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_054044.98c267d4.md]]'
content_id: f05490889038b9377d06c85dfb4f491fc29b2261a70af650e61d1dcf63c954d9
---

# response:

```typescript
// file: src/utils/testing.ts

import { assertEquals } from "jsr:@std/assert";
import { ID } from "./types.ts"; // Assuming ID type is in @utils/types.ts

/**
 * Asserts that the actual value equals the expected value, logging the result.
 * If the assertion fails, it logs an error and re-throws the assertion error.
 *
 * @param actual The actual value.
 * @param expected The expected value.
 * @param message A message to display describing the assertion.
 * @param stepMessage A message describing the current test step.
 * @param checkIndex The index of the check within the step.
 */
export function assertAndLog<T>(
  actual: T,
  expected: T,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  try {
    assertEquals(actual, expected, message);
    console.log(`    ✅ Check ${checkIndex}: ${message}`);
  } catch (e) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    console.error(`      Error in "${stepMessage}": ${message}`);
    throw e; // Re-throw the error so Deno.test still registers it as a failure
  }
}

/**
 * Helper function to print a Deno test header.
 * @param testName The name of the test.
 */
export function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

/**
 * Helper function to print a test step header.
 * @param stepMessage The message describing the test step.
 */
export function printStepHeader(stepMessage: string) {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
}

```
