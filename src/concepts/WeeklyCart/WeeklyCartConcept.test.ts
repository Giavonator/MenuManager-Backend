import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts";
import {
  assertAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";
import WeeklyCartConcept from "./WeeklyCartConcept.ts";

// --- Helper Dates for Consistent Testing ---
// Normalizing to UTC start of day for consistency with the concept's internal logic.
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

// Dates for a future week (e.g., next week)
const nextSunday = new Date(today);
nextSunday.setUTCDate(today.getUTCDate() + (7 - today.getUTCDay()) % 7);
nextSunday.setUTCHours(0, 0, 0, 0);

const nextMonday = new Date(nextSunday);
nextMonday.setUTCDate(nextSunday.getUTCDate() + 1);

const nextWednesday = new Date(nextSunday);
nextWednesday.setUTCDate(nextSunday.getUTCDate() + 3);

const nextFriday = new Date(nextSunday);
nextFriday.setUTCDate(nextSunday.getUTCDate() + 5);

const nextSaturday = new Date(nextSunday);
nextSaturday.setUTCDate(nextSunday.getUTCDate() + 6);

// Dates for a past week (e.g., last week)
const lastSunday = new Date(today);
lastSunday.setUTCDate(
  today.getUTCDate() - (today.getUTCDay() === 0 ? 7 : today.getUTCDay()),
);
lastSunday.setUTCHours(0, 0, 0, 0);

const lastMonday = new Date(lastSunday);
lastMonday.setUTCDate(lastSunday.getUTCDate() + 1);

// Dates for two weeks from now
const twoWeeksFromSunday = new Date(nextSunday);
twoWeeksFromSunday.setUTCDate(nextSunday.getUTCDate() + 7);
twoWeeksFromSunday.setUTCHours(0, 0, 0, 0);

const twoWeeksFromMonday = new Date(twoWeeksFromSunday);
twoWeeksFromMonday.setUTCDate(twoWeeksFromSunday.getUTCDate() + 1);

// Unique Menu IDs
const menuSpaghetti = "menu:Spaghetti" as ID;
const menuPizza = "menu:Pizza" as ID;
const menuTacos = "menu:Tacos" as ID;
const menuSalad = "menu:Salad" as ID;

// Expected Cart ID format (YYYY-MM-DD of the Sunday)
const nextWeekCartId = nextSunday.toISOString().split("T")[0] as ID;
const twoWeeksFromNowCartId = twoWeeksFromSunday.toISOString().split(
  "T",
)[0] as ID;

Deno.test("WeeklyCartConcept - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  let createdCartId: ID;

  await t.step(
    "1. User creates a cart for the week starting next Sunday",
    async () => {
      const stepMessage =
        "1. User creates a cart for the week starting next Sunday";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const createResult = await weeklyCart.createCart({
        dateInWeek: nextMonday,
      });
      assertAndLog(
        "cart" in createResult,
        true,
        "Cart creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      createdCartId = (createResult as { cart: ID }).cart;
      assertAndLog(
        createdCartId,
        nextWeekCartId,
        "Cart ID should match the Sunday of the provided date",
        stepMessage,
        ++checkIndex,
      );

      const queriedCart = await weeklyCart._getCartByDate({ date: nextMonday });
      assertAndLog(
        "error" in queriedCart,
        false,
        "Query cart by date should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (queriedCart as { cart: ID }[]).length,
        1,
        "Should find one cart for the week",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (queriedCart as { cart: ID }[])[0].cart,
        createdCartId,
        "Queried cart ID should match the created cart ID",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("2. User adds several menus to the cart", async () => {
    const stepMessage = "2. User adds several menus to the cart";
    printStepHeader(stepMessage);
    checkIndex = 0;

    const addSpaghettiResult = await weeklyCart.addMenuToCart({
      menu: menuSpaghetti,
      menuDate: nextMonday,
    });
    assertAndLog(
      "cart" in addSpaghettiResult,
      true,
      "Adding Spaghetti should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (addSpaghettiResult as { cart: ID }).cart,
      createdCartId,
      "Spaghetti added to correct cart",
      stepMessage,
      ++checkIndex,
    );

    const addPizzaResult = await weeklyCart.addMenuToCart({
      menu: menuPizza,
      menuDate: nextWednesday,
    });
    assertAndLog(
      "cart" in addPizzaResult,
      true,
      "Adding Pizza should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (addPizzaResult as { cart: ID }).cart,
      createdCartId,
      "Pizza added to correct cart",
      stepMessage,
      ++checkIndex,
    );

    const addTacosResult = await weeklyCart.addMenuToCart({
      menu: menuTacos,
      menuDate: nextFriday,
    });
    assertAndLog(
      "cart" in addTacosResult,
      true,
      "Adding Tacos should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (addTacosResult as { cart: ID }).cart,
      createdCartId,
      "Tacos added to correct cart",
      stepMessage,
      ++checkIndex,
    );

    const menusInCart = await weeklyCart._getMenusInCart({
      cart: createdCartId,
    });
    assertAndLog(
      "error" in menusInCart,
      false,
      "Query menus in cart should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.length,
      3,
      "Cart should contain 3 menus",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.includes(menuSpaghetti),
      true,
      "Cart should contain Spaghetti",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.includes(menuPizza),
      true,
      "Cart should contain Pizza",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.includes(menuTacos),
      true,
      "Cart should contain Tacos",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "3. User removes a menu (Wednesday Pizza) from the cart",
    async () => {
      const stepMessage =
        "3. User removes a menu (Wednesday Pizza) from the cart";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const removePizzaResult = await weeklyCart.removeMenuFromCart({
        menu: menuPizza,
      });
      assertAndLog(
        "cart" in removePizzaResult,
        true,
        "Removing Pizza should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (removePizzaResult as { cart: ID }).cart,
        createdCartId,
        "Pizza removed from correct cart",
        stepMessage,
        ++checkIndex,
      );

      const menusInCartAfterRemoval = await weeklyCart._getMenusInCart({
        cart: createdCartId,
      });
      assertAndLog(
        "error" in menusInCartAfterRemoval,
        false,
        "Query menus in cart should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusInCartAfterRemoval as { menus: ID[] }[])[0].menus.length,
        2,
        "Cart should contain 2 menus after removal",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusInCartAfterRemoval as { menus: ID[] }[])[0].menus.includes(
          menuSpaghetti,
        ),
        true,
        "Cart should still contain Spaghetti",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusInCartAfterRemoval as { menus: ID[] }[])[0].menus.includes(
          menuPizza,
        ),
        false,
        "Cart should no longer contain Pizza",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusInCartAfterRemoval as { menus: ID[] }[])[0].menus.includes(
          menuTacos,
        ),
        true,
        "Cart should still contain Tacos",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("WeeklyCartConcept - createCart Action Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;

  await t.step("1. Successfully create a cart for a future week", async () => {
    const stepMessage = "1. Successfully create a cart for a future week";
    printStepHeader(stepMessage);
    checkIndex = 0;

    const createResult = await weeklyCart.createCart({
      dateInWeek: nextWednesday,
    });
    assertAndLog(
      "cart" in createResult,
      true,
      "Cart creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    const cartId = (createResult as { cart: ID }).cart;
    assertAndLog(
      cartId,
      nextWeekCartId,
      "Created cart ID should match expected",
      stepMessage,
      ++checkIndex,
    );

    const queriedCartDates = await weeklyCart._getCartDates({ cart: cartId });
    assertAndLog(
      "error" in queriedCartDates,
      false,
      "Query cart dates should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queriedCartDates as { startDate: Date; endDate: Date }[]).length,
      1,
      "Should find one cart date entry",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queriedCartDates as { startDate: Date; endDate: Date }[])[0].startDate
        .getTime(),
      nextSunday.getTime(),
      "Cart startDate should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queriedCartDates as { startDate: Date; endDate: Date }[])[0].endDate
        .getTime(),
      nextSaturday.getTime(),
      "Cart endDate should be correct",
      stepMessage,
      ++checkIndex,
    );

    const menusInCart = await weeklyCart._getMenusInCart({ cart: cartId });
    assertAndLog(
      "error" in menusInCart,
      false,
      "Query menus in cart should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.length,
      0,
      "New cart should have an empty menu list",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Fail to create a cart for a week that has already started (past/current)",
    async () => {
      const stepMessage =
        "2. Fail to create a cart for a week that has already started";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const createResult = await weeklyCart.createCart({
        dateInWeek: lastMonday,
      });
      assertAndLog(
        "error" in createResult,
        true,
        "Cart creation should fail for past week",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (createResult as { error: string }).error.includes(
          "already started or is in the past",
        ),
        true,
        "Error message should indicate past/current week",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "3. Fail to create a duplicate cart for the same week",
    async () => {
      const stepMessage =
        "3. Fail to create a duplicate cart for the same week";
      printStepHeader(stepMessage);
      checkIndex = 0;

      // First, create a cart successfully
      await weeklyCart.createCart({ dateInWeek: twoWeeksFromMonday });

      // Then, try to create another for the same week
      const duplicateCreateResult = await weeklyCart.createCart({
        dateInWeek: twoWeeksFromMonday,
      });
      assertAndLog(
        "error" in duplicateCreateResult,
        true,
        "Duplicate cart creation should fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (duplicateCreateResult as { error: string }).error.includes(
          "A cart already exists for the week starting on",
        ),
        true,
        "Error message should indicate duplicate cart",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("WeeklyCartConcept - deleteCart Action Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  let cartToDeleteId: ID;

  await t.step("1. Successfully delete an existing cart", async () => {
    const stepMessage = "1. Successfully delete an existing cart";
    printStepHeader(stepMessage);
    checkIndex = 0;

    // Create a cart first
    const createResult = await weeklyCart.createCart({
      dateInWeek: nextWednesday,
    });
    cartToDeleteId = (createResult as { cart: ID }).cart;

    const deleteResult = await weeklyCart.deleteCart({
      dateInWeek: nextWednesday,
    });
    assertAndLog(
      "cart" in deleteResult,
      true,
      "Cart deletion should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (deleteResult as { cart: ID }).cart,
      cartToDeleteId,
      "Deleted cart ID should match the original",
      stepMessage,
      ++checkIndex,
    );

    const queriedCart = await weeklyCart._getCartByDate({
      date: nextWednesday,
    });
    assertAndLog(
      "error" in queriedCart,
      false,
      "Query for deleted cart should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queriedCart as { cart: ID }[]).length,
      0,
      "Deleted cart should no longer be found",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("2. Fail to delete a non-existent cart", async () => {
    const stepMessage = "2. Fail to delete a non-existent cart";
    printStepHeader(stepMessage);
    checkIndex = 0;

    const deleteResult = await weeklyCart.deleteCart({
      dateInWeek: lastMonday,
    });
    assertAndLog(
      "error" in deleteResult,
      true,
      "Deletion of non-existent cart should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (deleteResult as { error: string }).error.includes(
        "No cart found for the week containing",
      ),
      true,
      "Error message should indicate no cart found",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - addMenuToCart Action Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  let existingCartId: ID;

  await t.step("1. Add menu to an existing cart successfully", async () => {
    const stepMessage = "1. Add menu to an existing cart successfully";
    printStepHeader(stepMessage);
    checkIndex = 0;

    // Create a cart first
    const createResult = await weeklyCart.createCart({
      dateInWeek: nextWednesday,
    });
    existingCartId = (createResult as { cart: ID }).cart;

    const addMenuResult = await weeklyCart.addMenuToCart({
      menu: menuSpaghetti,
      menuDate: nextMonday,
    });
    assertAndLog(
      "cart" in addMenuResult,
      true,
      "Adding menu should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (addMenuResult as { cart: ID }).cart,
      existingCartId,
      "Menu added to the correct cart",
      stepMessage,
      ++checkIndex,
    );

    const menusInCart = await weeklyCart._getMenusInCart({
      cart: existingCartId,
    });
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.includes(menuSpaghetti),
      true,
      "Cart should contain the added menu",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Add menu to a week without a cart (should create new cart)",
    async () => {
      const stepMessage =
        "2. Add menu to a week without a cart (should create new cart)";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const addMenuResult = await weeklyCart.addMenuToCart({
        menu: menuPizza,
        menuDate: twoWeeksFromMonday,
      });
      assertAndLog(
        "cart" in addMenuResult,
        true,
        "Adding menu should succeed and create a new cart",
        stepMessage,
        ++checkIndex,
      );
      const newCartId = (addMenuResult as { cart: ID }).cart;
      assertAndLog(
        newCartId,
        twoWeeksFromNowCartId,
        "Newly created cart ID should be correct",
        stepMessage,
        ++checkIndex,
      );

      const menusInCart = await weeklyCart._getMenusInCart({ cart: newCartId });
      assertAndLog(
        (menusInCart as { menus: ID[] }[])[0].menus.includes(menuPizza),
        true,
        "New cart should contain the added menu",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("3. Fail to add a duplicate menu to the same cart", async () => {
    const stepMessage = "3. Fail to add a duplicate menu to the same cart";
    printStepHeader(stepMessage);
    checkIndex = 0;

    // Add menuSpaghetti again to the existing cart (from step 1)
    const duplicateAddResult = await weeklyCart.addMenuToCart({
      menu: menuSpaghetti,
      menuDate: nextWednesday,
    });
    assertAndLog(
      "error" in duplicateAddResult,
      true,
      "Adding duplicate menu should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (duplicateAddResult as { error: string }).error.includes(
        "is already in the cart",
      ),
      true,
      "Error message should indicate duplicate menu",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "4. Fail to add a menu for a past/current week if createCart fails",
    async () => {
      const stepMessage =
        "4. Fail to add a menu for a past/current week if createCart fails";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const addMenuResult = await weeklyCart.addMenuToCart({
        menu: menuSalad,
        menuDate: lastMonday,
      });
      assertAndLog(
        "error" in addMenuResult,
        true,
        "Adding menu to past week should fail if no cart exists and creation fails",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (addMenuResult as { error: string }).error.includes(
          "Failed to create cart for menu addition",
        ),
        true,
        "Error message should indicate failure in cart creation",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("WeeklyCartConcept - removeMenuFromCart Action Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  let cartIdWithMenus: ID;

  await t.step("1. Successfully remove a menu from a cart", async () => {
    const stepMessage = "1. Successfully remove a menu from a cart";
    printStepHeader(stepMessage);
    checkIndex = 0;

    // Create cart and add two menus
    await weeklyCart.createCart({ dateInWeek: nextWednesday });
    const addSpaghettiResult = await weeklyCart.addMenuToCart({
      menu: menuSpaghetti,
      menuDate: nextMonday,
    });
    cartIdWithMenus = (addSpaghettiResult as { cart: ID }).cart;
    await weeklyCart.addMenuToCart({
      menu: menuPizza,
      menuDate: nextWednesday,
    });

    const removeResult = await weeklyCart.removeMenuFromCart({
      menu: menuSpaghetti,
    });
    assertAndLog(
      "cart" in removeResult,
      true,
      "Removing menu should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (removeResult as { cart: ID }).cart,
      cartIdWithMenus,
      "Menu removed from the correct cart",
      stepMessage,
      ++checkIndex,
    );

    const menusInCart = await weeklyCart._getMenusInCart({
      cart: cartIdWithMenus,
    });
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.includes(menuSpaghetti),
      false,
      "Cart should no longer contain the removed menu",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.includes(menuPizza),
      true,
      "Cart should still contain the other menu",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (menusInCart as { menus: ID[] }[])[0].menus.length,
      1,
      "Cart should have one menu after removal",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("2. Fail to remove a menu that is not in any cart", async () => {
    const stepMessage = "2. Fail to remove a menu that is not in any cart";
    printStepHeader(stepMessage);
    checkIndex = 0;

    const removeResult = await weeklyCart.removeMenuFromCart({
      menu: menuTacos,
    });
    assertAndLog(
      "error" in removeResult,
      true,
      "Removing non-existent menu should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (removeResult as { error: string }).error.includes(
        `Menu ${menuTacos} not found in any cart`,
      ),
      true,
      "Error message should indicate menu not found",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("WeeklyCartConcept - Query Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const weeklyCart = new WeeklyCartConcept(db);
  let checkIndex = 0;
  let testCartId: ID;

  await t.step(
    "1. _getCartDates: Successfully retrieve cart dates",
    async () => {
      const stepMessage = "1. _getCartDates: Successfully retrieve cart dates";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const createResult = await weeklyCart.createCart({
        dateInWeek: nextWednesday,
      });
      testCartId = (createResult as { cart: ID }).cart;

      const datesResult = await weeklyCart._getCartDates({ cart: testCartId });
      assertAndLog(
        "error" in datesResult,
        false,
        "Query for cart dates should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (datesResult as { startDate: Date; endDate: Date }[]).length,
        1,
        "Should return one set of dates",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (datesResult as { startDate: Date; endDate: Date }[])[0].startDate
          .getTime(),
        nextSunday.getTime(),
        "Returned startDate should be correct",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (datesResult as { startDate: Date; endDate: Date }[])[0].endDate
          .getTime(),
        nextSaturday.getTime(),
        "Returned endDate should be correct",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "2. _getCartDates: Fail to retrieve dates for a non-existent cart",
    async () => {
      const stepMessage =
        "2. _getCartDates: Fail to retrieve dates for a non-existent cart";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const datesResult = await weeklyCart._getCartDates({
        cart: "nonExistentCart" as ID,
      });
      assertAndLog(
        "error" in datesResult,
        true,
        "Query for non-existent cart dates should fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (datesResult as { error: string }).error.includes(
          "Cart with ID nonExistentCart not found",
        ),
        true,
        "Error message should indicate cart not found",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "3. _getMenusInCart: Successfully retrieve menus in cart",
    async () => {
      const stepMessage =
        "3. _getMenusInCart: Successfully retrieve menus in cart";
      printStepHeader(stepMessage);
      checkIndex = 0;

      await weeklyCart.addMenuToCart({
        menu: menuSpaghetti,
        menuDate: nextWednesday,
      });
      await weeklyCart.addMenuToCart({
        menu: menuTacos,
        menuDate: nextWednesday,
      });

      const menusResult = await weeklyCart._getMenusInCart({
        cart: testCartId,
      });
      assertAndLog(
        "error" in menusResult,
        false,
        "Query for menus in cart should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusResult as { menus: ID[] }[])[0].menus.length,
        2,
        "Should return two menus",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusResult as { menus: ID[] }[])[0].menus.includes(menuSpaghetti),
        true,
        "Should contain Spaghetti",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusResult as { menus: ID[] }[])[0].menus.includes(menuTacos),
        true,
        "Should contain Tacos",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. _getMenusInCart: Fail to retrieve menus for a non-existent cart",
    async () => {
      const stepMessage =
        "4. _getMenusInCart: Fail to retrieve menus for a non-existent cart";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const menusResult = await weeklyCart._getMenusInCart({
        cart: "anotherNonExistentCart" as ID,
      });
      assertAndLog(
        "error" in menusResult,
        true,
        "Query for non-existent cart menus should fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (menusResult as { error: string }).error.includes(
          "Cart with ID anotherNonExistentCart not found",
        ),
        true,
        "Error message should indicate cart not found",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "5. _getCartByDate: Successfully retrieve cart by date",
    async () => {
      const stepMessage =
        "5. _getCartByDate: Successfully retrieve cart by date";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const cartResult = await weeklyCart._getCartByDate({
        date: nextWednesday,
      });
      assertAndLog(
        "error" in cartResult,
        false,
        "Query for cart by date should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (cartResult as { cart: ID }[]).length,
        1,
        "Should return one cart",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (cartResult as { cart: ID }[])[0].cart,
        testCartId,
        "Returned cart ID should be correct",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "6. _getCartByDate: Return empty array for no cart found",
    async () => {
      const stepMessage =
        "6. _getCartByDate: Return empty array for no cart found";
      printStepHeader(stepMessage);
      checkIndex = 0;

      const cartResult = await weeklyCart._getCartByDate({ date: lastMonday });
      assertAndLog(
        "error" in cartResult,
        false,
        "Query for non-existent cart date should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (cartResult as { cart: ID }[]).length,
        0,
        "Should return an empty array if no cart is found for the date",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});
