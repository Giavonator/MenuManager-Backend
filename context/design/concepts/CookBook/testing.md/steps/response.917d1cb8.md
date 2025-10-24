---
timestamp: 'Fri Oct 24 2025 06:49:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_064936.529c6389.md]]'
content_id: 917d1cb83c52d695122f2d77bd02310a89d622b6de441203b89633847ea111fd
---

# response:

The bug regarding the `e` being of type `unknown` in `catch` blocks has been successfully addressed in your `CookBookConcept.ts` implementation. To ensure this fix is applied consistently in future concept implementations, please add the following section to your "Implementing Concepts" guide.

***

### Robust Error Message Extraction from Catch Blocks

When handling errors in `try-catch` blocks, TypeScript's default type for the caught error `e` is `unknown`. This means you cannot directly access properties like `e.message` without first narrowing its type. Failing to do so will result in a TypeScript error (`'e' is of type 'unknown'.deno-ts(18046)`), as observed.

To ensure robust and consistent error messages are returned in your `Result<T>` objects, always safely extract the error message by checking if `e` is an instance of `Error`, and if not, convert it to a string. This pattern ensures you always get a valid string for your error output, aligning with the requirement to return `{error: "the error message"}` for normal errors.

**Recommended Pattern:**

```typescript
try {
  // ... asynchronous operation that might throw ...
  // Example: await this.recipes.insertOne(newRecipe);
} catch (e: unknown) {
  // Safely extract the error message
  const errorMessage = e instanceof Error ? e.message : String(e);
  
  // Log the detailed error for debugging purposes
  console.error(`An operation failed: ${errorMessage}`);
  
  // Return a standardized error object
  return { error: `Operation failed: ${errorMessage}` };
}
```

By adopting this pattern, you guarantee that your concept actions and queries consistently provide a string value for the `error` field in their `Result` outputs, facilitating better debugging and synchronization throughout your application.
