---
timestamp: 'Mon Oct 27 2025 14:30:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251027_143015.bb952538.md]]'
content_id: 27db3e0caebbc67ac6e69c15508a8779114d084ebdfa3456ab63d362cc1b6926
---

# response:

```typescript
import { assertEquals } from "jsr:@std/assert";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";
import { testDb } from "@utils/database.ts";
import { ID, freshID } from "@utils/types.ts";
import WeeklyCartConcept from "./WeeklyCartConcept.ts"; // Import the concept

// --- Test-specific Date Helpers ---
// These helpers are similar to those in the concept, but specifically for test setup
// to ensure consistency when creating input dates and verifying outputs.

/**
 * Creates a Date object for a specific year, month, and day, normalized to UTC start of day.
 * @param year
 * @param month (0-indexed)
 * @param day
 * @returns A Date object representing the UTC start of the specified day.
 */
function getTestDate(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month, day));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculates the UTC Sunday (start of day) for the week containing the given date.
 * @param date The reference date.
 * @returns A Date object representing the UTC Sunday of the week.
 */
function getSundayOfWeekTest(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
  const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.
  const diff = d.getUTCDate() - day; // Adjust date to Sunday
  d.setUTCDate(diff);
  return d;
}

/**
 * Calculates the UTC Saturday (start of day) for the week containing the given date.
 * @param date The reference date.
 * @returns A Date object representing the UTC Saturday of the week.
 */
function getSaturdayOfWeekTest(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
  const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, etc.
  const diff = d.getUTCDate() + (6 - day); // Adjust date to Saturday
  d.setUTCDate(diff);
  return d;
}

// Global test date references for creating future/past dates relative to today's execution.
// We fix the "today" for predictable test behavior, assuming tests run on a specific day for consistency.
// In a real scenario, this might be mocked more dynamically.
const currentYear = new Date().getUTCFullYear();
const currentMonth = new Date().getUTCMonth();
const currentDay = new Date().getUTCDate();
const today = getTestDate(currentYear, currentMonth, currentDay);

// Define a future date that is guaranteed to be after 'today' for createCart's 'requires'
const futureWeekDate = getTestDate(currentYear, currentMonth, currentDay + 14); // Two weeks from 'today'
const pastWeekDate = getTestDate(currentYear, currentMonth, currentDay - 7); // One week before 'today'

Deno.test("WeeklyCartConcept - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  const testMessage = t.name;

  // Define some menus for the principle
  const spaghettiMenu: ID = freshID("menu:spaghetti");
  const pizzaMenu: ID = freshID("menu:pizza");
  const tacosMenu: ID = freshID("menu:tacos");

  // A date within a future week for which the cart will be created, ensuring it passes the 'now' check.
  // Let's pick a specific date in the future for deterministic principle execution.
  const principleWeekDay = getTestDate(currentYear + 1, 1, 15); // Sat, Feb 15, (currentYear + 1)
  const expectedPrincipleWeekSunday = getSundayOfWeekTest(principleWeekDay);
  const expectedPrincipleCartId = expectedPrincipleWeekSunday.toISOString().split("T")[0] as ID;

  await t.step("1. User creates a cart for the week of principleWeekDay", async () => {
    const stepMessage = "1. User creates a cart for the week of principleWeekDay";
    printStepHeader(stepMessage);
    const createResult = await weeklyCart.createCart({ dateInWeek: principleWeekDay });
    assertAndLog("cart" in createResult, true, "Cart creation should succeed", testMessage, ++checkIndex);
    assertAndLog((createResult as { cart: ID }).cart, expectedPrincipleCartId, "Created cart ID should match expected Sunday date", testMessage, ++checkIndex);
  });

  await t.step("2. User adds 'spaghettiMenu' for Monday of that week", async () => {
    const stepMessage = "2. User adds 'spaghettiMenu' for Monday of that week";
    printStepHeader(stepMessage);
    const menuDate = getTestDate(currentYear + 1, 1, 10); // Monday, Feb 10, (currentYear + 1)
    const addResult = await weeklyCart.addMenuToCart({ menu: spaghettiMenu, menuDate: menuDate });
    assertAndLog("cart" in addResult, true, "Adding spaghetti menu should succeed", testMessage, ++checkIndex);
    assertAndLog((addResult as { cart: ID }).cart, expectedPrincipleCartId, "Menu added to the correct cart", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedPrincipleCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart should not return an error", testMessage, ++checkIndex);
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus,
      [spaghettiMenu],
      "Cart should contain spaghetti menu",
      testMessage,
      ++checkIndex,
    );
  });

  await t.step("3. User adds 'pizzaMenu' for Wednesday of that week", async () => {
    const stepMessage = "3. User adds 'pizzaMenu' for Wednesday of that week";
    printStepHeader(stepMessage);
    const menuDate = getTestDate(currentYear + 1, 1, 12); // Wednesday, Feb 12, (currentYear + 1)
    const addResult = await weeklyCart.addMenuToCart({ menu: pizzaMenu, menuDate: menuDate });
    assertAndLog("cart" in addResult, true, "Adding pizza menu should succeed", testMessage, ++checkIndex);
    assertAndLog((addResult as { cart: ID }).cart, expectedPrincipleCartId, "Menu added to the correct cart", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedPrincipleCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart should not return an error", testMessage, ++checkIndex);
    assertEquals(
      (menusInCart as { menus: ID[] }[])[0].menus.sort(),
      [pizzaMenu, spaghettiMenu].sort(),
      "Cart should contain spaghetti and pizza menus",
    );
    console.log(
      `    ✅ Check ${++checkIndex}: Cart should contain spaghetti and pizza menus`,
    );
  });

  await t.step("4. User adds 'tacosMenu' for Friday of that week", async () => {
    const stepMessage = "4. User adds 'tacosMenu' for Friday of that week";
    printStepHeader(stepMessage);
    const menuDate = getTestDate(currentYear + 1, 1, 14); // Friday, Feb 14, (currentYear + 1)
    const addResult = await weeklyCart.addMenuToCart({ menu: tacosMenu, menuDate: menuDate });
    assertAndLog("cart" in addResult, true, "Adding tacos menu should succeed", testMessage, ++checkIndex);
    assertAndLog((addResult as { cart: ID }).cart, expectedPrincipleCartId, "Menu added to the correct cart", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedPrincipleCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart should not return an error", testMessage, ++checkIndex);
    assertEquals(
      (menusInCart as { menus: ID[] }[])[0].menus.sort(),
      [pizzaMenu, spaghettiMenu, tacosMenu].sort(),
      "Cart should contain all three menus",
    );
    console.log(`    ✅ Check ${++checkIndex}: Cart should contain all three menus`);
  });

  await t.step("5. User removes 'pizzaMenu'", async () => {
    const stepMessage = "5. User removes 'pizzaMenu'";
    printStepHeader(stepMessage);
    const removeResult = await weeklyCart.removeMenuFromCart({ menu: pizzaMenu });
    assertAndLog("cart" in removeResult, true, "Removing pizza menu should succeed", testMessage, ++checkIndex);
    assertAndLog((removeResult as { cart: ID }).cart, expectedPrincipleCartId, "Menu removed from the correct cart", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedPrincipleCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart after removal should not return an error", testMessage, ++checkIndex);
    assertEquals(
      (menusInCart as { menus: ID[] }[])[0].menus.sort(),
      [spaghettiMenu, tacosMenu].sort(),
      "Cart should only contain spaghetti and tacos menus",
    );
    console.log(
      `    ✅ Check ${++checkIndex}: Cart should only contain spaghetti and tacos menus`,
    );
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - createCart action tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  const testMessage = t.name;

  const futureWeekDateForCreation = getTestDate(currentYear + 2, 0, 10); // Jan 10, (currentYear + 2)
  const futureWeekSunday = getSundayOfWeekTest(futureWeekDateForCreation);
  const expectedFutureCartId = futureWeekSunday.toISOString().split("T")[0] as ID;

  await t.step("1. Successfully create a cart for a future week", async () => {
    const stepMessage = "1. Successfully create a cart for a future week";
    printStepHeader(stepMessage);
    const createResult = await weeklyCart.createCart({ dateInWeek: futureWeekDateForCreation });
    assertAndLog("cart" in createResult, true, "Cart creation for future week should succeed", testMessage, ++checkIndex);
    assertAndLog((createResult as { cart: ID }).cart, expectedFutureCartId, "Created cart ID matches expected", testMessage, ++checkIndex);

    const queriedCart = await weeklyCart._getCartByDate({ date: futureWeekDateForCreation });
    assertAndLog("error" in queriedCart, false, "Query by date should not return an error", testMessage, ++checkIndex);
    assertAndLog((queriedCart as { cart: ID }[]).length, 1, "Should find the created cart", testMessage, ++checkIndex);
    assertAndLog((queriedCart as { cart: ID }[])[0].cart, expectedFutureCartId, "Queried cart ID matches", testMessage, ++checkIndex);
  });

  await t.step("2. Try to create a cart for a week that already has one (negative)", async () => {
    const stepMessage = "2. Try to create a cart for a week that already has one (negative)";
    printStepHeader(stepMessage);
    const duplicateResult = await weeklyCart.createCart({ dateInWeek: futureWeekDateForCreation });
    assertAndLog("error" in duplicateResult, true, "Creating duplicate cart should fail", testMessage, ++checkIndex);
    assertAndLog(
      (duplicateResult as { error: string }).error.includes("A cart already exists"),
      true,
      "Error message should indicate existing cart",
      testMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Try to create a cart for a past/current week (negative)", async () => {
    const stepMessage = "3. Try to create a cart for a past/current week (negative)";
    printStepHeader(stepMessage);
    const pastResult = await weeklyCart.createCart({ dateInWeek: pastWeekDate });
    assertAndLog("error" in pastResult, true, "Creating cart for past date should fail", testMessage, ++checkIndex);
    assertAndLog(
      (pastResult as { error: string }).error.includes(
        "Cannot create a cart for a week that has already started or is in the past",
      ),
      true,
      "Error message should indicate past date",
      testMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - deleteCart action tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  const testMessage = t.name;

  const weekToDeleteDate = getTestDate(currentYear + 3, 2, 20); // Mar 20, (currentYear + 3)
  const weekToDeleteSunday = getSundayOfWeekTest(weekToDeleteDate);
  const expectedCartId = weekToDeleteSunday.toISOString().split("T")[0] as ID;

  await t.step("1. Prepare: Create a cart to be deleted", async () => {
    const stepMessage = "1. Prepare: Create a cart to be deleted";
    printStepHeader(stepMessage);
    const createResult = await weeklyCart.createCart({ dateInWeek: weekToDeleteDate });
    assertAndLog("cart" in createResult, true, "Cart creation should succeed", testMessage, ++checkIndex);
    assertAndLog((createResult as { cart: ID }).cart, expectedCartId, "Created cart ID matches expected", testMessage, ++checkIndex);

    const queriedCart = await weeklyCart._getCartByDate({ date: weekToDeleteDate });
    assertAndLog((queriedCart as { cart: ID }[]).length, 1, "Should find the created cart for deletion", testMessage, ++checkIndex);
  });

  await t.step("2. Successfully delete the cart", async () => {
    const stepMessage = "2. Successfully delete the cart";
    printStepHeader(stepMessage);
    const deleteResult = await weeklyCart.deleteCart({ dateInWeek: weekToDeleteDate });
    assertAndLog("cart" in deleteResult, true, "Cart deletion should succeed", testMessage, ++checkIndex);
    assertAndLog((deleteResult as { cart: ID }).cart, expectedCartId, "Deleted cart ID matches expected", testMessage, ++checkIndex);

    const queriedCart = await weeklyCart._getCartByDate({ date: weekToDeleteDate });
    assertAndLog((queriedCart as { cart: ID }[]).length, 0, "Deleted cart should no longer be found", testMessage, ++checkIndex);
  });

  await t.step("3. Try to delete a non-existent cart (negative)", async () => {
    const stepMessage = "3. Try to delete a non-existent cart (negative)";
    printStepHeader(stepMessage);
    const nonExistentDate = getTestDate(currentYear + 4, 3, 25); // Apr 25, (currentYear + 4)
    const deleteResult = await weeklyCart.deleteCart({ dateInWeek: nonExistentDate });
    assertAndLog("error" in deleteResult, true, "Deleting non-existent cart should fail", testMessage, ++checkIndex);
    assertAndLog(
      (deleteResult as { error: string }).error.includes("No cart found"),
      true,
      "Error message should indicate no cart found",
      testMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - addMenuToCart action tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  const testMessage = t.name;

  const menuA: ID = freshID("menu:A");
  const menuB: ID = freshID("menu:B");

  const testDateForAdding = getTestDate(currentYear + 5, 4, 1); // May 1, (currentYear + 5)
  const expectedCartSunday = getSundayOfWeekTest(testDateForAdding);
  const expectedCartId = expectedCartSunday.toISOString().split("T")[0] as ID;

  await t.step("1. Add a menu to a week with no existing cart (should create one)", async () => {
    const stepMessage = "1. Add a menu to a week with no existing cart (should create one)";
    printStepHeader(stepMessage);
    const addResult = await weeklyCart.addMenuToCart({ menu: menuA, menuDate: testDateForAdding });
    assertAndLog("cart" in addResult, true, "Adding menu should succeed and create a cart", testMessage, ++checkIndex);
    assertAndLog((addResult as { cart: ID }).cart, expectedCartId, "Menu added to the newly created cart", testMessage, ++checkIndex);

    const queriedCart = await weeklyCart._getCartByDate({ date: testDateForAdding });
    assertAndLog((queriedCart as { cart: ID }[]).length, 1, "A cart should now exist for the week", testMessage, ++checkIndex);
    assertAndLog((queriedCart as { cart: ID }[])[0].cart, expectedCartId, "Found cart ID matches", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart should not return an error", testMessage, ++checkIndex);
    assertAndLog((menusInCart as { menus: ID[] }[])[0].menus, [menuA], "Cart should contain menu A", testMessage, ++checkIndex);
  });

  await t.step("2. Add another menu to the same existing cart", async () => {
    const stepMessage = "2. Add another menu to the same existing cart";
    printStepHeader(stepMessage);
    const addResult = await weeklyCart.addMenuToCart({ menu: menuB, menuDate: testDateForAdding });
    assertAndLog("cart" in addResult, true, "Adding menu B should succeed", testMessage, ++checkIndex);
    assertAndLog((addResult as { cart: ID }).cart, expectedCartId, "Menu B added to the correct cart", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart should not return an error", testMessage, ++checkIndex);
    assertEquals(
      (menusInCart as { menus: ID[] }[])[0].menus.sort(),
      [menuA, menuB].sort(),
      "Cart should contain menu A and B",
    );
    console.log(`    ✅ Check ${++checkIndex}: Cart should contain menu A and B`);
  });

  await t.step("3. Try to add an already existing menu to the cart (negative)", async () => {
    const stepMessage = "3. Try to add an already existing menu to the cart (negative)";
    printStepHeader(stepMessage);
    const addResult = await weeklyCart.addMenuToCart({ menu: menuA, menuDate: testDateForAdding });
    assertAndLog("error" in addResult, true, "Adding existing menu should fail", testMessage, ++checkIndex);
    assertAndLog(
      (addResult as { error: string }).error.includes("is already in the cart"),
      true,
      "Error message should indicate existing menu",
      testMessage,
      ++checkIndex,
    );

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedCartId });
    assertEquals(
      (menusInCart as { menus: ID[] }[])[0].menus.sort(),
      [menuA, menuB].sort(),
      "Cart content should remain unchanged",
    );
    console.log(`    ✅ Check ${++checkIndex}: Cart content should remain unchanged`);
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - removeMenuFromCart action tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  const testMessage = t.name;

  const menuX: ID = freshID("menu:X");
  const menuY: ID = freshID("menu:Y");

  const testDateForRemoving = getTestDate(currentYear + 6, 5, 10); // June 10, (currentYear + 6)
  const expectedCartSunday = getSundayOfWeekTest(testDateForRemoving);
  const expectedCartId = expectedCartSunday.toISOString().split("T")[0] as ID;

  await t.step("1. Prepare: Create a cart and add some menus", async () => {
    const stepMessage = "1. Prepare: Create a cart and add some menus";
    printStepHeader(stepMessage);
    await weeklyCart.addMenuToCart({ menu: menuX, menuDate: testDateForRemoving });
    await weeklyCart.addMenuToCart({ menu: menuY, menuDate: testDateForRemoving });

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart should not return an error", testMessage, ++checkIndex);
    assertEquals(
      (menusInCart as { menus: ID[] }[])[0].menus.sort(),
      [menuX, menuY].sort(),
      "Cart should contain menu X and Y",
    );
    console.log(`    ✅ Check ${++checkIndex}: Cart should contain menu X and Y`);
  });

  await t.step("2. Successfully remove menu X from the cart", async () => {
    const stepMessage = "2. Successfully remove menu X from the cart";
    printStepHeader(stepMessage);
    const removeResult = await weeklyCart.removeMenuFromCart({ menu: menuX });
    assertAndLog("cart" in removeResult, true, "Removing menu X should succeed", testMessage, ++checkIndex);
    assertAndLog((removeResult as { cart: ID }).cart, expectedCartId, "Menu X removed from the correct cart", testMessage, ++checkIndex);

    const menusInCart = await weeklyCart._getMenusInCart({ cart: expectedCartId });
    assertAndLog("error" in menusInCart, false, "Query menus in cart after removal should not return an error", testMessage, ++checkIndex);
    assertAndLog((menusInCart as { menus: ID[] }[])[0].menus, [menuY], "Cart should only contain menu Y", testMessage, ++checkIndex);
  });

  await t.step("3. Try to remove a menu not in any cart (negative)", async () => {
    const stepMessage = "3. Try to remove a menu not in any cart (negative)";
    printStepHeader(stepMessage);
    const nonExistentMenu: ID = freshID("menu:NonExistent");
    const removeResult = await weeklyCart.removeMenuFromCart({ menu: nonExistentMenu });
    assertAndLog("error" in removeResult, true, "Removing non-existent menu should fail", testMessage, ++checkIndex);
    assertAndLog(
      (removeResult as { error: string }).error.includes("not found in any cart"),
      true,
      "Error message should indicate menu not found",
      testMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Try to remove a menu that was already removed (negative)", async () => {
    const stepMessage = "4. Try to remove a menu that was already removed (negative)";
    printStepHeader(stepMessage);
    const removeResult = await weeklyCart.removeMenuFromCart({ menu: menuX });
    assertAndLog("error" in removeResult, true, "Removing already removed menu should fail", testMessage, ++checkIndex);
    assertAndLog(
      (removeResult as { error: string }).error.includes("not found in any cart"),
      true,
      "Error message should indicate menu not found",
      testMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - Query tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  const testMessage = t.name;

  const queryTestDate = getTestDate(currentYear + 7, 6, 20); // July 20, (currentYear + 7)
  const queryCartSunday = getSundayOfWeekTest(queryTestDate);
  const queryCartId = queryCartSunday.toISOString().split("T")[0] as ID;
  const queryMenu1: ID = freshID("queryMenu:1");
  const queryMenu2: ID = freshID("queryMenu:2");

  await t.step("1. Prepare: Create a cart and add menus", async () => {
    const stepMessage = "1. Prepare: Create a cart and add menus";
    printStepHeader(stepMessage);
    await weeklyCart.addMenuToCart({ menu: queryMenu1, menuDate: queryTestDate });
    await weeklyCart.addMenuToCart({ menu: queryMenu2, menuDate: queryTestDate });
  });

  await t.step("2. _getCartDates: Successfully retrieve start and end dates for an existing cart", async () => {
    const stepMessage = "2. _getCartDates: Successfully retrieve start and end dates for an existing cart";
    printStepHeader(stepMessage);
    const datesResult = await weeklyCart._getCartDates({ cart: queryCartId });
    assertAndLog("error" in datesResult, false, "Query for cart dates should not return an error", testMessage, ++checkIndex);
    assertAndLog((datesResult as { startDate: Date; endDate: Date }[]).length, 1, "Should return one date pair", testMessage, ++checkIndex);
    assertAndLog(
      (datesResult as { startDate: Date; endDate: Date }[])[0].startDate.toISOString().split("T")[0],
      queryCartSunday.toISOString().split("T")[0],
      "Start date should match",
      testMessage,
      ++checkIndex,
    );
    assertAndLog(
      (datesResult as { startDate: Date; endDate: Date }[])[0].endDate.toISOString().split("T")[0],
      getSaturdayOfWeekTest(queryTestDate).toISOString().split("T")[0],
      "End date should match",
      testMessage,
      ++checkIndex,
    );
  });

  await t.step("3. _getCartDates: Query for a non-existent cart (negative)", async () => {
    const stepMessage = "3. _getCartDates: Query for a non-existent cart (negative)";
    printStepHeader(stepMessage);
    const nonExistentCartId: ID = freshID("cart:nonExistent");
    const datesResult = await weeklyCart._getCartDates({ cart: nonExistentCartId });
    assertAndLog("error" in datesResult, true, "Query for non-existent cart dates should fail", testMessage, ++checkIndex);
    assertAndLog(
      (datesResult as { error: string }).error.includes("Cart with ID"),
      true,
      "Error message should indicate cart not found",
      testMessage,
      ++checkIndex,
    );
  });

  await t.step("4. _getMenusInCart: Successfully retrieve menus for an existing cart", async () => {
    const stepMessage = "4. _getMenusInCart: Successfully retrieve menus for an existing cart";
    printStepHeader(stepMessage);
    const menusResult = await weeklyCart._getMenusInCart({ cart: queryCartId });
    assertAndLog("error" in menusResult, false, "Query for menus in cart should not return an error", testMessage, ++checkIndex);
    assertAndLog((menusResult as { menus: ID[] }[]).length, 1, "Should return one menu list", testMessage, ++checkIndex);
    assertEquals(
      (menusResult as { menus: ID[] }[])[0].menus.sort(),
      [queryMenu1, queryMenu2].sort(),
      "Menus should match",
    );
    console.log(`    ✅ Check ${++checkIndex}: Menus should match`);
  });

  await t.step("5. _getMenusInCart: Query for a non-existent cart (negative)", async () => {
    const stepMessage = "5. _getMenusInCart: Query for a non-existent cart (negative)";
    printStepHeader(stepMessage);
    const nonExistentCartId: ID = freshID("cart:nonExistent2");
    const menusResult = await weeklyCart._getMenusInCart({ cart: nonExistentCartId });
    assertAndLog("error" in menusResult, true, "Query for menus in non-existent cart should fail", testMessage, ++checkIndex);
    assertAndLog(
      (menusResult as { error: string }).error.includes("Cart with ID"),
      true,
      "Error message should indicate cart not found",
      testMessage,
      ++checkIndex,
    );
  });

  await t.step("6. _getCartByDate: Successfully retrieve cart by a date within its week", async () => {
    const stepMessage = "6. _getCartByDate: Successfully retrieve cart by a date within its week";
    printStepHeader(stepMessage);
    const cartByDateResult = await weeklyCart._getCartByDate({ date: queryTestDate });
    assertAndLog("error" in cartByDateResult, false, "Query for cart by date should not return an error", testMessage, ++checkIndex);
    assertAndLog(cartByDateResult.length, 1, "Should return one cart", testMessage, ++checkIndex);
    assertAndLog((cartByDateResult as { cart: ID }[])[0].cart, queryCartId, "Returned cart ID should match", testMessage, ++checkIndex);
  });

  await t.step("7. _getCartByDate: Query for a date without an associated cart", async () => {
    const stepMessage = "7. _getCartByDate: Query for a date without an associated cart";
    printStepHeader(stepMessage);
    const dateWithoutCart = getTestDate(currentYear + 8, 7, 25); // August 25, (currentYear + 8), no cart created
    const cartByDateResult = await weeklyCart._getCartByDate({ date: dateWithoutCart });
    assertAndLog("error" in cartByDateResult, false, "Query for cart by date without associated cart should not return an error", testMessage, ++checkIndex);
    assertAndLog(cartByDateResult.length, 0, "Should return an empty array", testMessage, ++checkIndex);
  });

  await client.close();
});

/*
# trace: WeeklyCartConcept Principle

**Scenario**: A user wants to organize their weekly meals into a coherent cart.

**Steps**:

1.  **User `createCart` for the week containing "Saturday, Feb 15, 2025"**:
    *   **Action**: `weeklyCart.createCart({ dateInWeek: new Date('2025-02-15T00:00:00.000Z') })`.
    *   **Expected `createCart` result**: `{ cart: "2025-02-09" }` (ID for the week's Sunday, Feb 9, 2025).
    *   **Verification (using query)**: `weeklyCart._getCartByDate({ date: new Date('2025-02-10T00:00:00.000Z') })` returns `[{ cart: "2025-02-09" }]`.

2.  **User `addMenuToCart` for "Monday Spaghetti"**:
    *   **Action**: `weeklyCart.addMenuToCart({ menu: "menu:spaghetti", menuDate: new Date('2025-02-10T00:00:00.000Z') })`.
    *   **Expected `addMenuToCart` result**: `{ cart: "2025-02-09" }`.
    *   **Verification (using query)**: `weeklyCart._getMenusInCart({ cart: "2025-02-09" })` returns `[{ menus: ["menu:spaghetti"] }]`.

3.  **User `addMenuToCart` for "Wednesday Pizza"**:
    *   **Action**: `weeklyCart.addMenuToCart({ menu: "menu:pizza", menuDate: new Date('2025-02-12T00:00:00.000Z') })`.
    *   **Expected `addMenuToCart` result**: `{ cart: "2025-02-09" }`.
    *   **Verification (using query)**: `weeklyCart._getMenusInCart({ cart: "2025-02-09" })` returns `[{ menus: ["menu:spaghetti", "menu:pizza"] }]` (order might vary).

4.  **User `addMenuToCart` for "Friday Tacos"**:
    *   **Action**: `weeklyCart.addMenuToCart({ menu: "menu:tacos", menuDate: new Date('2025-02-14T00:00:00.000Z') })`.
    *   **Expected `addMenuToCart` result**: `{ cart: "2025-02-09" }`.
    *   **Verification (using query)**: `weeklyCart._getMenusInCart({ cart: "2025-02-09" })` returns `[{ menus: ["menu:spaghetti", "menu:pizza", "menu:tacos"] }]`.

5.  **User `removeMenuFromCart` "Wednesday Pizza"**:
    *   **Action**: `weeklyCart.removeMenuFromCart({ menu: "menu:pizza" })`.
    *   **Expected `removeMenuFromCart` result**: `{ cart: "2025-02-09" }`.
    *   **Verification (using query)**: `weeklyCart._getMenusInCart({ cart: "2025-02-09" })` returns `[{ menus: ["menu:spaghetti", "menu:tacos"] }]`.
*/
```
