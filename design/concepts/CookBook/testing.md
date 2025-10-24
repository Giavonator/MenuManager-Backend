[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@testing-concepts](../../background/testing-concepts.md)

[@example-test-formatting](../../learning/example-test-formatting.md)

[@CookBookConcept.ts](../../../src/concepts/CookBook/CookBookConcept.ts)

[@CookBookConcept.test.ts](../../../src/concepts/CookBook/CookBookConcept.test.ts)

Example of issue in CookBookConcept.test.ts 1194-1201:
```typescript
    assertAndLog(
      nonExistentUserRecipes.length,
      0,
      "Should return an empty array for a user with no recipes",
      stepMessage,
      ++checkIndex,
    );
```

Error:
```
Property 'length' does not exist on type 'GetRecipesOwnedByUsersOutput'.
  Property 'length' does not exist on type 'ErrorType'.deno-ts(2339)
```

Proper Formatting of Code:
```typescript
 assertAndLog(
        (queryResult as { item: ID }[]).length,
        1,
        "Should find one item by name",
        stepMessage,
        ++checkIndex,
      );
```

# Please output TWO new files. 1. Update example-test-formatting so that it outlines what must be done to access outputs during testing. 2. Update CookBookConcept.test.ts to have the new changes.

# response:

Here are the two updated files as requested.

---

# 1. Updated `example-test-formatting.md`

This document has been updated to provide clearer guidance on accessing outputs during testing, specifically addressing the use of `Result<T>` and array-based query results.

## Example Test Formatting and Best Practices

This document condenses key learnings from the provided test example, emphasizing best practices for writing legible, robust, and maintainable concept tests.

## 1. Overall Testing Goals

Concept tests aim to verify:

*   **Action Requirements (`requires`)**: Ensure actions correctly prevent execution or return an error when preconditions are not met.
*   **Action Effects (`effects`)**: Confirm that the state changes and results produced by an action align with its postconditions.
*   **Principle Fulfillment**: Demonstrate that a series of actions, as described in the **principle**, leads to the expected functional outcome.

## 2. Test File Structure and Organization

Tests should be organized logically to enhance readability and maintainability.

*   **Top-Level Tests (`Deno.test`)**: Each `Deno.test` block should focus on a major aspect, such as verifying the concept's operational principle or a specific functional case. Use descriptive names.
*   **Steps (`t.step`)**: Break down each top-level test into sequential steps using `t.step`. These steps should correspond to logical phases or individual actions within the test scenario.
*   **Logging for Clarity**: Use helper functions like `printTestHeader` and `printStepHeader` to clearly delineate the current test and step in the console output, making it easy to follow the test's flow.

```typescript
// Example of test structure and logging
Deno.test("StoreCatalog - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  await t.step("1. Administrator creates a new item (ground pepper)", async () => {
    printStepHeader("1. Administrator creates a new item (ground pepper)");
    // ... test logic for createItem
  });

  await t.step("2. Adds purchase options for the item", async () => {
    printStepHeader("2. Adds purchase options for the item");
    // ... test logic for addPurchaseOption
  });

  // ... further steps for addItemName, confirmPurchaseOption, etc.

  await client.close();
});
```

## 3. Detailed Assertion and Logging

For granular verification, a custom assertion helper (`assertAndLog`) is recommended.

*   **Purpose of `assertAndLog`**: This helper wraps standard assertions (e.g., `assertEquals`) to provide immediate feedback in the console, indicating whether each check passed (`✅`) or failed (`❌`), along with a descriptive message. This is crucial for debugging complex multi-step tests.
*   **Arguments**: It takes the actual value, expected value, a specific message for the assertion, the current step message, and a check index for unique identification.
*   **Error Handling within `assertAndLog`**: It catches and logs the assertion error locally before re-throwing it, ensuring Deno's test runner correctly marks the test as failed while providing rich debugging context.

```typescript
// Helper function for assertions with logging (as provided in the prompt)
function assertAndLog<T>(
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
    throw e;
  }
}

// Example of usage within a test step
await t.step("1. Administrator creates a new item (ground pepper)", async () => {
  const stepMessage = "1. Administrator creates a new item (ground pepper)";
  printStepHeader(stepMessage);
  let checkIndex = 0;

  const createResult = await storeCatalog.createItem({ primaryName: "ground pepper" });
  assertAndLog(
    "item" in createResult,
    true,
    "Item creation should succeed",
    stepMessage,
    ++checkIndex,
  );
  const groundPepperItem = (createResult as { item: ID }).item; // Type assertion to access 'item'

  const queriedItem = await storeCatalog._getItemByName({ name: "ground pepper" });
  assertAndLog(
    "error" in queriedItem, // First, check if it's an error
    false,
    "Query by name should not return an error",
    stepMessage,
    ++checkIndex,
  );
  assertAndLog(
    (queriedItem as { item: ID }[]).length, // Then, assert its length after casting
    1,
    "Query by name should find the created item",
    stepMessage,
    ++checkIndex,
  );
  assertAndLog(
    (queriedItem as { item: ID }[])[0].item, // Access the first element after casting
    groundPepperItem,
    "Queried item ID should match the created item ID",
    stepMessage,
    ++checkIndex,
  );
});
```

## 4. Accessing Action and Query Outputs During Testing

A crucial aspect of testing concepts is correctly accessing the results returned by actions and queries, which follow specific patterns:

*   **Actions**: Typically return a `Result<T>` type, which is either `T` (a dictionary object with specific fields, potentially `Empty` for no explicit return) or `{ error: string }`.
*   **Queries**: Always return a `Result<T[]>` type, meaning an *array* of results or an `{ error: string }` object.

Here's how to properly handle these outputs:

### A. Checking for Success vs. Error

Before accessing any data, always determine if the operation was successful or if an error occurred.

*   **For successful actions returning a specific payload (e.g., `Result<{ recipe: ID }>`):**
    ```typescript
    const createResult = await cookBook.createRecipe({ name: "Spicy Pasta", user: chefAlice });
    assertAndLog("recipe" in createResult, true, "Recipe creation should succeed", stepMessage, ++checkIndex);
    // If the above passes, TypeScript now knows `createResult` is `{ recipe: ID }`
    const spicyPastaRecipeId = (createResult as { recipe: ID }).recipe;
    ```
    Here, `"recipe" in createResult` is used as a type guard to confirm the success case.

*   **For successful actions returning `Empty` (e.g., `Result<Empty>`):**
    ```typescript
    const addPastaResult = await cookBook.addRecipeIngredient({ /* ... */ });
    assertAndLog("error" in addPastaResult, false, "Adding pasta should succeed (no error)", stepMessage, ++checkIndex);
    // No specific data to extract, just verify no error.
    ```

*   **For successful queries returning an array (e.g., `Result<Item[]>`):**
    ```typescript
    const details = await cookBook._getRecipeDetails({ recipe: spicyPastaRecipeId });
    assertAndLog("error" in details, false, "Query recipe details should not return an error", stepMessage, ++checkIndex);
    // If the above passes, TypeScript now knows `details` is the array type.
    assertAndLog((details as { name: string }[]).length, 1, "Should find one recipe detail", stepMessage, ++checkIndex);
    assertAndLog((details as { name: string }[])[0].name, "Spicy Pasta", "Recipe name should match", stepMessage, ++checkIndex);
    ```
    Note the explicit cast `(details as { name: string }[])` after confirming `!("error" in details)`. This helps TypeScript understand the structure and allows access to array methods like `length` or indexing like `[0]`.

*   **For expected errors (both actions and queries):**
    ```typescript
    const emptyNameResult = await cookBook.createRecipe({ name: "", user: testUser });
    assertAndLog("error" in emptyNameResult, true, "Should return error for empty name", stepMessage, ++checkIndex);
    assertAndLog(
      (emptyNameResult as { error: string }).error,
      "Recipe name cannot be empty.",
      "Error message for empty name mismatch",
      stepMessage,
      ++checkIndex,
    );
    ```
    Here, `"error" in emptyNameResult` acts as the type guard, allowing safe access to `emptyNameResult.error`.

### B. Type Assertions for Safe Access

TypeScript needs help to narrow down union types. Use type assertions (`as Type`) after a type guard check to tell TypeScript what type the variable is, allowing you to access its specific properties or methods.

*   `const myId = (createResult as { id: ID }).id;`
*   `const firstItem = (queryResult as Item[])[0];`
*   `const errorMessage = (errorResult as { error: string }).error;`

### C. Handling Optional Chaining and Existence

When dealing with potentially `undefined` or `null` values (e.g., from `Array.prototype.find` or optional chaining `?.`), it's best practice to first assert their existence before accessing their properties. The `assertExistsAndLog` helper is ideal for this.

```typescript
const ingredients = await cookBook._getRecipeIngredients({ recipe: recipeId });
// ... (assert ingredients is not an error and is an array)

const flour = (ingredients as { ingredients: { name: string; quantity: number; units: string }[] }[])[0]
  .ingredients.find((i) => i.name === "Flour");

assertExistsAndLog(flour, "Flour ingredient should exist", stepMessage, ++checkIndex); // Assert existence first
assertAndLog(flour.quantity, 300, "Flour quantity should be updated", stepMessage, ++checkIndex); // Now safely access properties
```

## 5. Database Management

Ensure a clean test environment for each test run.

*   **`testDb()` Utility**: Use `await testDb()` to get a fresh database instance for each test. This utility handles establishing a connection and implicitly ensures the database is clean (as per the prompt, `Deno.test.beforeAll` handles dropping the database).
*   **Client Closure**: Always remember to `await client.close()` at the end of each `Deno.test` block to release database resources.

```typescript
import { testDb } from "@utils/database.ts";

Deno.test("MyConcept - Some Feature", async (t) => {
  const [db, client] = await testDb();
  const myConcept = new MyConcept(db);

  // ... test steps ...

  await client.close(); // Important: Close the client
});
```

## 6. Testing Library

Within `utils/testing.ts` are all of the necessary predefined functions necessary for testing: `assertAndLog`, `assertExistsAndLog`, `printStepHeader`, and `printTestHeader`.

---

# 2. Updated `src/concepts/CookBook/CookBookConcept.test.ts`

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import CookBookConcept from "./CookBookConcept.ts";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";

Deno.test("CookBookConcept - Operational Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const cookBook = new CookBookConcept(db);

  const chefAlice: ID = "user:Alice" as ID;
  const chefBob: ID = "user:Bob" as ID;

  let spicyPastaRecipeId: ID;
  let mildPastaRecipeId: ID;

  await t.step("1. Chef Alice creates a recipe for 'Spicy Pasta'", async () => {
    const stepMessage = "1. Chef Alice creates a recipe for 'Spicy Pasta'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const createResult = await cookBook.createRecipe({
      name: "Spicy Pasta",
      user: chefAlice,
    });
    assertAndLog(
      "recipe" in createResult,
      true,
      "Recipe creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    spicyPastaRecipeId = (createResult as { recipe: ID }).recipe;
    assertExistsAndLog(
      spicyPastaRecipeId,
      "Recipe ID should be returned",
      stepMessage,
      ++checkIndex,
    );

    const details = await cookBook._getRecipeDetails({
      recipe: spicyPastaRecipeId,
    });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[]).length,
      1,
      "Should find one recipe detail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].name,
      "Spicy Pasta",
      "Recipe name should match",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].owner,
      chefAlice,
      "Recipe owner should be Alice",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("2. Alice adds ingredients to 'Spicy Pasta'", async () => {
    const stepMessage = "2. Alice adds ingredients to 'Spicy Pasta'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const addPastaResult = await cookBook.addRecipeIngredient({
      recipe: spicyPastaRecipeId,
      name: "Pasta",
      quantity: 500,
      units: "g",
    });
    assertAndLog(
      "error" in addPastaResult,
      false,
      "Adding pasta should succeed",
      stepMessage,
      ++checkIndex,
    );

    const addTomatoesResult = await cookBook.addRecipeIngredient({
      recipe: spicyPastaRecipeId,
      name: "Canned Tomatoes",
      quantity: 400,
      units: "g",
    });
    assertAndLog(
      "error" in addTomatoesResult,
      false,
      "Adding tomatoes should succeed",
      stepMessage,
      ++checkIndex,
    );

    const addSpicesResult = await cookBook.addRecipeIngredient({
      recipe: spicyPastaRecipeId,
      name: "Chili Flakes",
      quantity: 1,
      units: "tsp",
    });
    assertAndLog(
      "error" in addSpicesResult,
      false,
      "Adding spices should succeed",
      stepMessage,
      ++checkIndex,
    );

    const ingredients = await cookBook._getRecipeIngredients({
      recipe: spicyPastaRecipeId,
    });
    assertAndLog(
      "error" in ingredients,
      false,
      "Query ingredients should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[]).length,
      1,
      "Should find one ingredient list for the recipe",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients.length,
      3,
      "Spicy Pasta should have 3 ingredients",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients.some((i) => i.name === "Pasta"),
      true,
      "Pasta ingredient should exist",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Alice updates details for 'Spicy Pasta'", async () => {
    const stepMessage = "3. Alice updates details for 'Spicy Pasta'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateInstructionsResult = await cookBook.updateRecipe({
      recipe: spicyPastaRecipeId,
      instructions: "Boil pasta. Add sauce. Serve hot.",
    });
    assertAndLog(
      "error" in updateInstructionsResult,
      false,
      "Updating instructions should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updateServingResult = await cookBook.updateRecipe({
      recipe: spicyPastaRecipeId,
      servingQuantity: 4,
    });
    assertAndLog(
      "error" in updateServingResult,
      false,
      "Updating serving quantity should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updateDishTypeResult = await cookBook.updateRecipe({
      recipe: spicyPastaRecipeId,
      dishType: "Main Course",
    });
    assertAndLog(
      "error" in updateDishTypeResult,
      false,
      "Updating dish type should succeed",
      stepMessage,
      ++checkIndex,
    );

    const details = await cookBook._getRecipeDetails({
      recipe: spicyPastaRecipeId,
    });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details after update should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].instructions,
      "Boil pasta. Add sauce. Serve hot.",
      "Instructions should be updated",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].servingQuantity,
      4,
      "Serving quantity should be updated",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].dishType,
      "Main Course",
      "Dish type should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "4. Chef Bob duplicates 'Spicy Pasta' as 'Mild Pasta' under his ownership",
    async () => {
      const stepMessage =
        "4. Chef Bob duplicates 'Spicy Pasta' as 'Mild Pasta' under his ownership";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const duplicateResult = await cookBook.duplicateRecipe({
        originalRecipe: spicyPastaRecipeId,
        user: chefBob,
        newName: "Mild Pasta",
      });
      assertAndLog(
        "newRecipe" in duplicateResult,
        true,
        "Duplicating recipe should succeed",
        stepMessage,
        ++checkIndex,
      );
      mildPastaRecipeId = (duplicateResult as { newRecipe: ID }).newRecipe;
      assertExistsAndLog(
        mildPastaRecipeId,
        "New recipe ID should be returned",
        stepMessage,
        ++checkIndex,
      );

      const bobRecipes = await cookBook._getRecipesOwnedByUser({
        user: chefBob,
      });
      assertAndLog(
        "error" in bobRecipes,
        false,
        "Query Bob's recipes should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (bobRecipes as { recipe: ID; name: string }[]).length,
        1,
        "Bob should own one recipe",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (bobRecipes as { recipe: ID; name: string }[])[0].name,
        "Mild Pasta",
        "Bob's recipe name should be 'Mild Pasta'",
        stepMessage,
        ++checkIndex,
      );

      const mildPastaDetails = await cookBook._getRecipeDetails({
        recipe: mildPastaRecipeId,
      });
      assertAndLog(
        "error" in mildPastaDetails,
        false,
        "Query Mild Pasta details should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (mildPastaDetails as {
          name: string;
          instructions: string;
          servingQuantity: number;
          dishType: string;
          owner: ID;
        }[])[0].owner,
        chefBob,
        "Mild Pasta owner should be Bob",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (mildPastaDetails as {
          name: string;
          instructions: string;
          servingQuantity: number;
          dishType: string;
          owner: ID;
        }[])[0].name,
        "Mild Pasta",
        "Mild Pasta name should be correct",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (mildPastaDetails as {
          name: string;
          instructions: string;
          servingQuantity: number;
          dishType: string;
          owner: ID;
        }[])[0].instructions,
        "Boil pasta. Add sauce. Serve hot.",
        "Mild Pasta instructions should be copied",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "5. Chef Bob updates 'Mild Pasta' to his liking (e.g., changes ingredients)",
    async () => {
      const stepMessage =
        "5. Chef Bob updates 'Mild Pasta' to his liking (e.g., changes ingredients)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // Bob removes Chili Flakes
      const removeChiliResult = await cookBook.removeRecipeIngredient({
        recipe: mildPastaRecipeId,
        name: "Chili Flakes",
      });
      assertAndLog(
        "error" in removeChiliResult,
        false,
        "Removing Chili Flakes should succeed",
        stepMessage,
        ++checkIndex,
      );

      // Bob adds Cream
      const addCreamResult = await cookBook.addRecipeIngredient({
        recipe: mildPastaRecipeId,
        name: "Cream",
        quantity: 200,
        units: "ml",
      });
      assertAndLog(
        "error" in addCreamResult,
        false,
        "Adding Cream should succeed",
        stepMessage,
        ++checkIndex,
      );

      // Bob updates Pasta quantity
      const updatePastaResult = await cookBook.updateRecipeIngredient({
        recipe: mildPastaRecipeId,
        name: "Pasta",
        quantity: 300,
        units: "g",
      });
      assertAndLog(
        "error" in updatePastaResult,
        false,
        "Updating Pasta quantity should succeed",
        stepMessage,
        ++checkIndex,
      );

      const mildPastaIngredients = await cookBook._getRecipeIngredients({
        recipe: mildPastaRecipeId,
      });
      assertAndLog(
        "error" in mildPastaIngredients,
        false,
        "Query Mild Pasta ingredients should not return an error",
        stepMessage,
        ++checkIndex,
      );
      const ingredientsArray = (mildPastaIngredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients;

      assertAndLog(
        ingredientsArray.length,
        3, // Pasta, Tomatoes, Cream
        "Mild Pasta should now have 3 ingredients",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        ingredientsArray.some((i) =>
          i.name === "Chili Flakes"
        ),
        false,
        "Chili Flakes should be removed from Mild Pasta",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        ingredientsArray.some((i) => i.name === "Cream"),
        true,
        "Cream should be added to Mild Pasta",
        stepMessage,
        ++checkIndex,
      );

      const pastaIngredient = ingredientsArray.find((i) => i.name === "Pasta");
      assertExistsAndLog(
        pastaIngredient,
        "Pasta ingredient should exist in Mild Pasta",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        pastaIngredient.quantity,
        300,
        "Pasta quantity should be updated in Mild Pasta",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "6. Verify Alice's original 'Spicy Pasta' is unchanged",
    async () => {
      const stepMessage =
        "6. Verify Alice's original 'Spicy Pasta' is unchanged";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const aliceRecipes = await cookBook._getRecipesOwnedByUser({
        user: chefAlice,
      });
      assertAndLog(
        "error" in aliceRecipes,
        false,
        "Query Alice's recipes should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (aliceRecipes as { recipe: ID; name: string }[]).length,
        1,
        "Alice should still own only one recipe",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (aliceRecipes as { recipe: ID; name: string }[])[0].name,
        "Spicy Pasta",
        "Alice's recipe name should still be 'Spicy Pasta'",
        stepMessage,
        ++checkIndex,
      );

      const spicyPastaIngredients = await cookBook._getRecipeIngredients({
        recipe: spicyPastaRecipeId,
      });
      assertAndLog(
        "error" in spicyPastaIngredients,
        false,
        "Query Spicy Pasta ingredients should not return an error",
        stepMessage,
        ++checkIndex,
      );
      const ingredientsArray = (spicyPastaIngredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients;

      assertAndLog(
        ingredientsArray.length,
        3, // Pasta, Tomatoes, Chili Flakes
        "Spicy Pasta should still have 3 ingredients",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        ingredientsArray.some((i) =>
          i.name === "Chili Flakes"
        ),
        true,
        "Chili Flakes should still be in Spicy Pasta",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        ingredientsArray.some((i) => i.name === "Cream"),
        false,
        "Cream should NOT be in Spicy Pasta",
        stepMessage,
        ++checkIndex,
      );

      const pastaIngredient = ingredientsArray.find((i) => i.name === "Pasta");
      assertExistsAndLog(
        pastaIngredient,
        "Pasta ingredient should exist in Spicy Pasta",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        pastaIngredient.quantity,
        500,
        "Pasta quantity should be unchanged in Spicy Pasta",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("CookBookConcept - Action Specific Validations and Edge Cases", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const cookBook = new CookBookConcept(db);

  const testUser: ID = "user:TestUser" as ID;
  let recipeId: ID;

  await t.step("createRecipe - Valid Creation", async () => {
    const stepMessage = "createRecipe - Valid Creation";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const createResult = await cookBook.createRecipe({
      name: "Chocolate Cake",
      user: testUser,
    });
    assertAndLog(
      "recipe" in createResult,
      true,
      "Valid recipe creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    recipeId = (createResult as { recipe: ID }).recipe;
    assertExistsAndLog(
      recipeId,
      "Recipe ID should be returned",
      stepMessage,
      ++checkIndex,
    );

    const details = await cookBook._getRecipeDetails({ recipe: recipeId });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].name,
      "Chocolate Cake",
      "Name should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].owner,
      testUser,
      "Owner should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].servingQuantity,
      1,
      "Default serving quantity should be 1",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("createRecipe - Invalid Inputs (requires)", async () => {
    const stepMessage = "createRecipe - Invalid Inputs (requires)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const emptyNameResult = await cookBook.createRecipe({
      name: "",
      user: testUser,
    });
    assertAndLog(
      "error" in emptyNameResult,
      true,
      "Should return error for empty name",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (emptyNameResult as { error: string }).error,
      "Recipe name cannot be empty.",
      "Error message for empty name mismatch",
      stepMessage,
      ++checkIndex,
    );

    const whitespaceNameResult = await cookBook.createRecipe({
      name: "   ",
      user: testUser,
    });
    assertAndLog(
      "error" in whitespaceNameResult,
      true,
      "Should return error for whitespace name",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (whitespaceNameResult as { error: string }).error,
      "Recipe name cannot be empty.",
      "Error message for whitespace name mismatch",
      stepMessage,
      ++checkIndex,
    );

    const emptyUserResult = await cookBook.createRecipe({
      name: "Another Recipe",
      user: "" as ID,
    });
    assertAndLog(
      "error" in emptyUserResult,
      true,
      "Should return error for empty user",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (emptyUserResult as { error: string }).error,
      "User ID cannot be empty.",
      "Error message for empty user mismatch",
      ++checkIndex,
    );
  });

  await t.step("updateRecipe - Valid Updates (effects)", async () => {
    const stepMessage = "updateRecipe - Valid Updates (effects)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateNameResult = await cookBook.updateRecipe({
      recipe: recipeId,
      name: "Delicious Cake",
    });
    assertAndLog(
      "error" in updateNameResult,
      false,
      "Should successfully update name",
      stepMessage,
      ++checkIndex,
    );
    let details = await cookBook._getRecipeDetails({ recipe: recipeId });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details after name update should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].name,
      "Delicious Cake",
      "Name should be updated",
      stepMessage,
      ++checkIndex,
    );

    const updateInstructionsResult = await cookBook.updateRecipe({
      recipe: recipeId,
      instructions: "Mix, bake, enjoy.",
    });
    assertAndLog(
      "error" in updateInstructionsResult,
      false,
      "Should successfully update instructions",
      stepMessage,
      ++checkIndex,
    );
    details = await cookBook._getRecipeDetails({ recipe: recipeId });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details after instructions update should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].instructions,
      "Mix, bake, enjoy.",
      "Instructions should be updated",
      stepMessage,
      ++checkIndex,
    );

    const updateServingResult = await cookBook.updateRecipe({
      recipe: recipeId,
      servingQuantity: 8,
    });
    assertAndLog(
      "error" in updateServingResult,
      false,
      "Should successfully update serving quantity",
      stepMessage,
      ++checkIndex,
    );
    details = await cookBook._getRecipeDetails({ recipe: recipeId });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details after serving update should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].servingQuantity,
      8,
      "Serving quantity should be updated",
      stepMessage,
      ++checkIndex,
    );

    const updateDishTypeResult = await cookBook.updateRecipe({
      recipe: recipeId,
      dishType: "Dessert",
    });
    assertAndLog(
      "error" in updateDishTypeResult,
      false,
      "Should successfully update dish type",
      stepMessage,
      ++checkIndex,
    );
    details = await cookBook._getRecipeDetails({ recipe: recipeId });
    assertAndLog(
      "error" in details,
      false,
      "Query recipe details after dish type update should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (details as {
        name: string;
        instructions: string;
        servingQuantity: number;
        dishType: string;
        owner: ID;
      }[])[0].dishType,
      "Dessert",
      "Dish type should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("updateRecipe - Invalid Updates (requires)", async () => {
    const stepMessage = "updateRecipe - Invalid Updates (requires)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const invalidRecipeIdResult = await cookBook.updateRecipe({
      recipe: "nonExistent" as ID,
      name: "Bad Recipe",
    });
    assertAndLog(
      "error" in invalidRecipeIdResult,
      true,
      "Should return error for non-existent recipe",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (invalidRecipeIdResult as { error: string }).error,
      "Recipe with ID 'nonExistent' not found.",
      "Error message for invalid recipe ID mismatch",
      stepMessage,
      ++checkIndex,
    );

    const invalidServingQuantityResult = await cookBook.updateRecipe({
      recipe: recipeId,
      servingQuantity: 0,
    });
    assertAndLog(
      "error" in invalidServingQuantityResult,
      true,
      "Should return error for non-positive serving quantity",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (invalidServingQuantityResult as { error: string }).error,
      "Serving quantity must be a positive number.",
      "Error message for invalid serving quantity mismatch",
      stepMessage,
      ++checkIndex,
    );

    const emptyNameUpdateResult = await cookBook.updateRecipe({
      recipe: recipeId,
      name: " ",
    });
    assertAndLog(
      "error" in emptyNameUpdateResult,
      true,
      "Should return error for empty name update",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (emptyNameUpdateResult as { error: string }).error,
      "Recipe name cannot be empty.",
      "Error message for empty name update mismatch",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("duplicateRecipe - Invalid Duplication (requires)", async () => {
    const stepMessage = "duplicateRecipe - Invalid Duplication (requires)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentOriginalRecipeResult = await cookBook.duplicateRecipe({
      originalRecipe: "nonExistent" as ID,
      user: testUser,
      newName: "Copy of Bad Recipe",
    });
    assertAndLog(
      "error" in nonExistentOriginalRecipeResult,
      true,
      "Should return error for non-existent original recipe",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (nonExistentOriginalRecipeResult as { error: string }).error,
      "Original recipe with ID 'nonExistent' not found.",
      "Error message for non-existent original recipe mismatch",
      stepMessage,
      ++checkIndex,
    );

    const duplicateNameForUserResult = await cookBook.duplicateRecipe({
      originalRecipe: recipeId,
      user: testUser,
      newName: "Delicious Cake", // Already updated name of original
    });
    assertAndLog(
      "error" in duplicateNameForUserResult,
      true,
      "Should return error for duplicate newName for the same user",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (duplicateNameForUserResult as { error: string }).error,
      `Recipe with name 'Delicious Cake' already exists for user '${testUser}'.`,
      "Error message for duplicate newName mismatch",
      stepMessage,
      ++checkIndex,
    );

    const emptyNewNameResult = await cookBook.duplicateRecipe({
      originalRecipe: recipeId,
      user: testUser,
      newName: " ",
    });
    assertAndLog(
      "error" in emptyNewNameResult,
      true,
      "Should return error for empty newName",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (emptyNewNameResult as { error: string }).error,
      "New recipe name cannot be empty.",
      "Error message for empty newName mismatch",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("addRecipeIngredient - Valid Addition (effects)", async () => {
    const stepMessage = "addRecipeIngredient - Valid Addition (effects)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const addIngredientResult = await cookBook.addRecipeIngredient({
      recipe: recipeId,
      name: "Flour",
      quantity: 250,
      units: "g",
    });
    assertAndLog(
      "error" in addIngredientResult,
      false,
      "Adding ingredient should succeed",
      stepMessage,
      ++checkIndex,
    );

    const ingredients = await cookBook._getRecipeIngredients({
      recipe: recipeId,
    });
    assertAndLog(
      "error" in ingredients,
      false,
      "Query ingredients after addition should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients.length,
      1,
      "Recipe should have one ingredient",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients[0].name,
      "Flour",
      "Ingredient name should match",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "addRecipeIngredient - Invalid Additions (requires)",
    async () => {
      const stepMessage = "addRecipeIngredient - Invalid Additions (requires)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentRecipeResult = await cookBook.addRecipeIngredient({
        recipe: "nonExistent" as ID,
        name: "Sugar",
        quantity: 100,
        units: "g",
      });
      assertAndLog(
        "error" in nonExistentRecipeResult,
        true,
        "Should return error for non-existent recipe",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (nonExistentRecipeResult as { error: string }).error,
        "Recipe with ID 'nonExistent' not found.",
        "Error message for non-existent recipe mismatch",
        stepMessage,
        ++checkIndex,
      );

      const duplicateIngredientResult = await cookBook.addRecipeIngredient({
        recipe: recipeId,
        name: "Flour", // Already added
        quantity: 50,
        units: "g",
      });
      assertAndLog(
        "error" in duplicateIngredientResult,
        true,
        "Should return error for duplicate ingredient name",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (duplicateIngredientResult as { error: string }).error,
        `Ingredient 'Flour' already exists in recipe '${recipeId}'.`,
        "Error message for duplicate ingredient mismatch",
        stepMessage,
        ++checkIndex,
      );

      const invalidQuantityResult = await cookBook.addRecipeIngredient({
        recipe: recipeId,
        name: "Sugar",
        quantity: 0,
        units: "g",
      });
      assertAndLog(
        "error" in invalidQuantityResult,
        true,
        "Should return error for non-positive quantity",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (invalidQuantityResult as { error: string }).error,
        "Quantity must be a positive number.",
        "Error message for invalid quantity mismatch",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("updateRecipeIngredient - Valid Update (effects)", async () => {
    const stepMessage = "updateRecipeIngredient - Valid Update (effects)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    await cookBook.addRecipeIngredient({
      recipe: recipeId,
      name: "Eggs",
      quantity: 3,
      units: "large",
    });

    const updateIngredientResult = await cookBook.updateRecipeIngredient({
      recipe: recipeId,
      name: "Flour",
      quantity: 300,
      units: "ml",
    });
    assertAndLog(
      "error" in updateIngredientResult,
      false,
      "Updating ingredient should succeed",
      stepMessage,
      ++checkIndex,
    );

    const ingredients = await cookBook._getRecipeIngredients({
      recipe: recipeId,
    });
    assertAndLog(
      "error" in ingredients,
      false,
      "Query ingredients after update should not return an error",
      stepMessage,
      ++checkIndex,
    );
    const ingredientsArray = (ingredients as {
      ingredients: { name: string; quantity: number; units: string }[];
    }[])[0].ingredients;

    const flour = ingredientsArray.find((i) => i.name === "Flour");
    assertExistsAndLog(
      flour,
      "Flour ingredient should exist",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      flour.quantity,
      300,
      "Flour quantity should be updated",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      flour.units,
      "ml",
      "Flour units should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "updateRecipeIngredient - Invalid Updates (requires)",
    async () => {
      const stepMessage = "updateRecipeIngredient - Invalid Updates (requires)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentRecipeResult = await cookBook.updateRecipeIngredient({
        recipe: "nonExistent" as ID,
        name: "Flour",
        quantity: 1,
        units: "kg",
      });
      assertAndLog(
        "error" in nonExistentRecipeResult,
        true,
        "Should return error for non-existent recipe",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (nonExistentRecipeResult as { error: string }).error,
        `Recipe 'nonExistent' or ingredient 'Flour' not found.`,
        "Error message for non-existent recipe mismatch",
        stepMessage,
        ++checkIndex,
      );

      const nonExistentIngredientResult = await cookBook.updateRecipeIngredient(
        {
          recipe: recipeId,
          name: "Milk",
          quantity: 1,
          units: "L",
        },
      );
      assertAndLog(
        "error" in nonExistentIngredientResult,
        true,
        "Should return error for non-existent ingredient",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (nonExistentIngredientResult as { error: string }).error,
        `Recipe '${recipeId}' or ingredient 'Milk' not found.`,
        "Error message for non-existent ingredient mismatch",
        stepMessage,
        ++checkIndex,
      );

      const invalidQuantityResult = await cookBook.updateRecipeIngredient({
        recipe: recipeId,
        name: "Flour",
        quantity: -50,
        units: "g",
      });
      assertAndLog(
        "error" in invalidQuantityResult,
        true,
        "Should return error for non-positive quantity",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (invalidQuantityResult as { error: string }).error,
        "Quantity must be a positive number.",
        "Error message for invalid quantity mismatch",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("removeRecipeIngredient - Valid Removal (effects)", async () => {
    const stepMessage = "removeRecipeIngredient - Valid Removal (effects)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    await cookBook.addRecipeIngredient({
      recipe: recipeId,
      name: "Sugar",
      quantity: 150,
      units: "g",
    });
    let ingredients = await cookBook._getRecipeIngredients({
      recipe: recipeId,
    });
    assertAndLog(
      "error" in ingredients,
      false,
      "Query ingredients before removal should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients.length,
      3,
      "Recipe should have 3 ingredients before removal",
      stepMessage,
      ++checkIndex,
    );

    const removeResult = await cookBook.removeRecipeIngredient({
      recipe: recipeId,
      name: "Flour",
    });
    assertAndLog(
      "error" in removeResult,
      false,
      "Removing ingredient should succeed",
      stepMessage,
      ++checkIndex,
    );

    ingredients = await cookBook._getRecipeIngredients({ recipe: recipeId });
    assertAndLog(
      "error" in ingredients,
      false,
      "Query ingredients after removal should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients.length,
      2,
      "Recipe should have 2 ingredients after removal",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredients as {
        ingredients: { name: string; quantity: number; units: string }[];
      }[])[0].ingredients.some((i) => i.name === "Flour"),
      false,
      "Flour should no longer be in ingredients",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "removeRecipeIngredient - Invalid Removals (requires)",
    async () => {
      const stepMessage =
        "removeRecipeIngredient - Invalid Removals (requires)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentRecipeResult = await cookBook.removeRecipeIngredient({
        recipe: "nonExistent" as ID,
        name: "Eggs",
      });
      assertAndLog(
        "error" in nonExistentRecipeResult,
        true,
        "Should return error for non-existent recipe",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (nonExistentRecipeResult as { error: string }).error,
        `Recipe 'nonExistent' or ingredient 'Eggs' not found.`,
        "Error message for non-existent recipe mismatch",
        stepMessage,
        ++checkIndex,
      );

      const nonExistentIngredientResult = await cookBook.removeRecipeIngredient(
        {
          recipe: recipeId,
          name: "Salt",
        },
      );
      assertAndLog(
        "error" in nonExistentIngredientResult,
        true,
        "Should return error for non-existent ingredient",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (nonExistentIngredientResult as { error: string }).error,
        `Recipe '${recipeId}' or ingredient 'Salt' not found.`,
        "Error message for non-existent ingredient mismatch",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("Queries - Error Cases", async () => {
    const stepMessage = "Queries - Error Cases";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const detailsResult = await cookBook._getRecipeDetails({
      recipe: "badID" as ID,
    });
    assertAndLog(
      "error" in detailsResult,
      true,
      "Details query for bad ID should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (detailsResult as { error: string }).error,
      "Recipe with ID 'badID' not found.",
      "Error message for bad recipe details query",
      stepMessage,
      ++checkIndex,
    );

    const ingredientsResult = await cookBook._getRecipeIngredients({
      recipe: "badID" as ID,
    });
    assertAndLog(
      "error" in ingredientsResult,
      true,
      "Ingredients query for bad ID should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (ingredientsResult as { error: string }).error,
      "Recipe with ID 'badID' not found.",
      "Error message for bad recipe ingredients query",
      stepMessage,
      ++checkIndex,
    );

    const recipesByUserResult = await cookBook._getRecipesOwnedByUser({
      user: "" as ID,
    });
    assertAndLog(
      "error" in recipesByUserResult,
      true,
      "Recipes by empty user ID should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (recipesByUserResult as { error: string }).error,
      "User ID cannot be empty.",
      "Error message for empty user ID in recipes by user query",
      stepMessage,
      ++checkIndex,
    );

    const nonExistentUserRecipes = await cookBook._getRecipesOwnedByUser({
      user: "nonExistentUser" as ID,
    });
    assertAndLog(
      "error" in nonExistentUserRecipes,
      false,
      "Query for non-existent user should return no error but empty array",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (nonExistentUserRecipes as { recipe: ID; name: string }[]).length, // Corrected access
      0,
      "Should return an empty array for a user with no recipes",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});
```