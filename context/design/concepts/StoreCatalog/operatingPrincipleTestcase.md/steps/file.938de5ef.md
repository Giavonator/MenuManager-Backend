---
timestamp: 'Thu Oct 23 2025 19:15:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_191504.9327c4fb.md]]'
content_id: 938de5ef5e0ab0fca809f655be81dcbf4a18ab654e76c77e5baa9e2fb401d041
---

# file: src/utils/testing.ts

```typescript
import { assertEquals } from "jsr:@std/assert";
import { ID, Result } from "./types.ts"; // Assuming types.ts is in the same utils folder

/**
 * Asserts that the actual value equals the expected value, logs the result,
 * and re-throws the error if the assertion fails.
 *
 * @param actual The actual value obtained.
 * @param expected The expected value.
 * @param message A message describing the assertion.
 * @param stepMessage A message describing the current test step for better error context.
 * @param checkIndex The index of the check within the current step.
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
 * Asserts that a result object contains a specific key, logs the result,
 * and re-throws the error if the assertion fails. Useful for checking if an action returned a 'user' or 'error' key.
 *
 * @param result The result object from an action or query.
 * @param key The key expected to be in the result.
 * @param expectedExists Whether the key is expected to exist (true) or not (false).
 * @param message A message describing the assertion.
 * @param stepMessage A message describing the current test step for better error context.
 * @param checkIndex The index of the check within the current step.
 */
export function assertResultHasKeyAndLog<T>(
  result: Result<T>,
  key: string,
  expectedExists: boolean,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  const actualExists = typeof result === 'object' && result !== null && key in result;
  try {
    assertEquals(actualExists, expectedExists, message);
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
 * @param stepMessage The message for the test step.
 */
export function printStepHeader(stepMessage: string) {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
}

/**
 * Helper function to extract a specific key from a Result object, or return an error string.
 * This is useful for dealing with `Result` types where `T` might be an array or a single object.
 *
 * @param result The Result object.
 * @param key The key to extract.
 * @param defaultValue A default value to return if the key is not found or if there's an error.
 * @returns The value associated with the key, or the error string, or the default value.
 */
export function extractResult<T, K extends keyof T>(
  result: Result<T>,
  key: K,
  defaultValue: T[K] | string = "Error: Key not found or result is error",
): T[K] | string {
  if ("error" in result && typeof result.error === 'string') {
    return result.error;
  }
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && result[0] !== null && key in result[0]) {
    return result[0][key];
  }
  if (typeof result === 'object' && result !== null && key in result) {
    return result[key];
  }
  return defaultValue;
}
```
