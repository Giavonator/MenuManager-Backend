---
timestamp: 'Thu Oct 16 2025 17:02:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_170229.b17a9b74.md]]'
content_id: 14ca77498044b5bfc4887bb5ef8c19dfbef78d6fea3134f0c66532d2582fee0d
---

# response:

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

import MenuManagerConcept from "./MenuManagerConcept.ts";

// --- Helper Functions for Deno Tests (Copied from original file) ---
// These are included here for context and self-containment of the test file.

let globalStepMessage: string;
let globalCheckIndex: number;

function assertAndLog<T>(
  actual: T,
  expected: T,
  message: string,
) {
  globalCheckIndex++;
  try {
    assertEquals(actual, expected, message);
    console.log(`    ✅ Check ${globalCheckIndex}: ${message}`);
  } catch (e) {
    console.log(`    ❌ Check ${globalCheckIndex}: ${message}`);
    console.error(
      `      Error in "${globalStepMessage}" (Check ${globalCheckIndex}): ${message}`,
    );
    throw e; // Re-throw the error so Deno.test still registers it as a failure
  }
}

function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

function printStepHeader(stepMessage: string): string {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
  globalStepMessage = stepMessage;
  globalCheckIndex = 0;
  return stepMessage;
}

interface ItemExpectedPrice {
  price: number;
  quantity: number;
  units: string;
  conversions: Record<string, number>;
}
// This is declared globally to be accessible by all tests using the helper functions
const itemDetails: Record<ID, ItemExpectedPrice> = {};

const registerItemAndStorePrice = async (
  menuManager: MenuManagerConcept,
  name: string,
  price: number,
  quantity: number,
  units: string,
  store: string,
  conversions: Record<string, number>,
): Promise<ID | { error: string }> => {
  const itemResult = await menuManager.enterItem({
    name,
    price,
    quantity,
    units,
    store,
  });
  if ("item" in itemResult) {
    const itemId = itemResult.item;
    itemDetails[itemId] = { price, quantity, units, conversions };
    return itemId;
  }
  return itemResult;
};

const convertAmountToItemUnits = (
  itemId: ID,
  amount: number,
  recipeUnit: string,
): number => {
  const item = itemDetails[itemId];
  if (!item) {
    console.warn(
      `Item ${itemId} not found in itemDetails for conversion. Assuming 1:1 conversion for ${recipeUnit}.`,
    );
    return amount;
  }
  if (recipeUnit === item.units) {
    return amount;
  }
  const conversionFactor = item.conversions[recipeUnit];
  if (typeof conversionFactor === "number") {
    return amount * conversionFactor;
  }
  console.warn(
    `No conversion factor for ${recipeUnit} to ${item.units} for item ${itemId}. Returning raw amount.`,
  );
  return amount;
};

interface RecipeIngredientTemp {
  itemId: ID;
  amount: number;
}

const calculateExpectedRecipeCost = async (
  db: Db,
  recipeIngredients: RecipeIngredientTemp[],
  scalingFactor: number,
): Promise<number> => {
  let price = 0;
  for (const ing of recipeIngredients) {
    let itemInfo = itemDetails[ing.itemId];
    let itemDoc;

    if (!itemInfo) {
      itemDoc = await db.collection("MenuManager.items").findOne({
        _id: ing.itemId,
      });
      if (itemDoc) {
        itemInfo = {
          price: itemDoc.price,
          quantity: itemDoc.quantity,
          units: itemDoc.units,
          conversions: {},
        };
      }
    } else {
      itemDoc = await db.collection("MenuManager.items").findOne({
        _id: ing.itemId,
      });
      if (itemDoc) {
        itemInfo = {
          ...itemInfo,
          price: itemDoc.price,
          quantity: itemDoc.quantity,
        };
      }
    }

    if (itemInfo && itemInfo.quantity > 0) {
      price += (itemInfo.price / itemInfo.quantity) * ing.amount;
    } else {
      console.warn(
        `Item ${ing.itemId} not found or has zero quantity for cost calculation. Assuming 0 cost.`,
      );
    }
  }
  return parseFloat((price * scalingFactor).toFixed(2));
};

const getItemName = async (
  db: Db,
  itemId: ID,
): Promise<string> => {
  const item = await db.collection("MenuManager.items").findOne({
    _id: itemId,
  });
  return item?.names[0] || itemId;
};

const idRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// --- Variant Test Case 1: Advanced Item Name Management & Recipe Edge Cases ---
Deno.test("MenuManagerConcept - Variant Test 1: Item Naming & Recipe Lifecycle", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "dummy" }); // Dummy API key for tests not using LLM

  // Clear global itemDetails for this test's scope to ensure isolation
  for (const key in itemDetails) {
    delete itemDetails[key];
  }

  const testUser: ID = "user:chefBeta" as ID;
  let createdMenuId: ID;
  let recipeId: ID;
  let flourId: ID, saltId: ID, waterId: ID;

  // --- Step 1: Create a menu ---
  await t.step(printStepHeader("Create an empty menu"), async () => {
    const createMenuResult = await menuManager.createMenu({
      name: "Item Naming Test Menu",
      date: "2024-08-04",
      owner: testUser,
    });
    assertAndLog("menu" in createMenuResult, true, "Menu creation should succeed");
    createdMenuId = (createMenuResult as { menu: ID }).menu;
  });

  // --- Step 2: Item Naming Edge Cases ---
  await t.step(printStepHeader("Item Naming Edge Cases"), async () => {
    // Register base items
    flourId = (await registerItemAndStorePrice(
      menuManager,
      "flour-test1",
      2.50,
      5,
      "lbs",
      "StoreA",
      { "cup": 0.277 },
    )) as ID;
    assertExists(flourId, "Flour item should be created");

    saltId = (await registerItemAndStorePrice(
      menuManager,
      "salt-test1",
      1.00,
      16,
      "oz",
      "StoreA",
      { "tsp": 0.166 },
    )) as ID;
    assertExists(saltId, "Salt item should be created");

    waterId = (await registerItemAndStorePrice(
      menuManager,
      "water-test1",
      0.50,
      1,
      "gallon",
      "StoreC",
      { "cup": 0.0625 },
    )) as ID;
    assertExists(waterId, "Water item should be created");

    // Add an alias to flour
    const addAliasResult = await menuManager.addItemName({ item: flourId, name: "all-purpose flour-test1" });
    assertAndLog("success" in addAliasResult, true, "Adding 'all-purpose flour' alias should succeed");
    let flourItem = await db.collection("MenuManager.items").findOne({ _id: flourId });
    assertAndLog(flourItem?.names.includes("all-purpose flour-test1"), true, "Flour should have 'all-purpose flour' alias");

    // Try to add an existing name as a new item (case-insensitive)
    const duplicateItemResult = await menuManager.enterItem({ name: "Flour-Test1", price: 1, quantity: 1, units: "kg", store: "StoreB" });
    assertAndLog("error" in duplicateItemResult, true, "Entering 'Flour-Test1' as a new item should fail due to existing 'flour-test1'");

    // Try to add an alias that already exists for *another* item (e.g., trying to add "salt-test1" as an alias for flour)
    const aliasConflictResult = await menuManager.addItemName({ item: flourId, name: "Salt-test1" });
    assertAndLog("error" in aliasConflictResult, true, "Adding 'Salt-test1' as an alias for flour should fail as it's an item name already");

    // Remove an alias
    const removeAliasResult = await menuManager.removeItemName({ item: flourId, name: "all-purpose flour-test1" });
    assertAndLog("success" in removeAliasResult, true, "Removing 'all-purpose flour-test1' alias should succeed");
    flourItem = await db.collection("MenuManager.items").findOne({ _id: flourId });
    assertAndLog(flourItem?.names.includes("all-purpose flour-test1"), false, "Flour should no longer have 'all-purpose flour' alias");

    // Try to remove the last name of an item
    const removeLastNameResult = await menuManager.removeItemName({ item: flourId, name: "flour-test1" });
    assertAndLog("error" in removeLastNameResult, true, "Removing 'flour-test1' (last name) should fail");
  });

  // --- Step 3: Recipe Ingredient Lifecycle ---
  await t.step(printStepHeader("Recipe Ingredient Lifecycle"), async () => {
    // Create an empty recipe
    const createRecipeResult = await menuManager.createRecipe({
      menu: createdMenuId,
      name: "Simple Dish-test1",
      instructions: "Do things.",
      servingQuantity: 1,
      dishType: "Dinner",
      scalingFactor: 1.0,
      owner: testUser,
    });
    assertAndLog("recipe" in createRecipeResult, true, "Recipe creation should succeed");
    recipeId = (createRecipeResult as { recipe: ID }).recipe;

    let recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    assertAndLog(recipeDoc?.dishPrice, 0, "Initial recipe dishPrice should be 0");
    let menuDoc = await db.collection("MenuManager.menus").findOne({ _id: createdMenuId });
    assertAndLog(menuDoc?.menuCost, 0, "Initial menuCost should be 0 after empty recipe");

    // Add flour ingredient
    const flourAmount = convertAmountToItemUnits(flourId, 0.5, "cup"); // 0.5 cup flour
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: flourId, amount: flourAmount });
    recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    const expectedFlourCost = await calculateExpectedRecipeCost(db, [{ itemId: flourId, amount: flourAmount }], 1.0);
    assertAndLog(recipeDoc?.dishPrice, expectedFlourCost, "Dish price should reflect flour cost");
    menuDoc = await db.collection("MenuManager.menus").findOne({ _id: createdMenuId });
    assertAndLog(menuDoc?.menuCost, expectedFlourCost, "Menu cost should reflect flour cost");

    // Remove flour ingredient (set amount to 0)
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: flourId, amount: 0 });
    recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    assertAndLog(recipeDoc?.dishPrice, 0, "Dish price should be 0 after removing flour");
    assertAndLog(recipeDoc?.ingredients.length, 0, "Recipe should have no ingredients after removal");
    menuDoc = await db.collection("MenuManager.menus").findOne({ _id: createdMenuId });
    assertAndLog(menuDoc?.menuCost, 0, "Menu cost should be 0 after removing flour from recipe");

    // Re-add flour ingredient with a different amount
    const newFlourAmount = convertAmountToItemUnits(flourId, 1, "cup"); // 1 cup flour
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: flourId, amount: newFlourAmount });
    recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    const expectedNewFlourCost = await calculateExpectedRecipeCost(db, [{ itemId: flourId, amount: newFlourAmount }], 1.0);
    assertAndLog(recipeDoc?.dishPrice, expectedNewFlourCost, "Dish price should reflect re-added flour cost");
    assertAndLog(recipeDoc?.ingredients.length, 1, "Recipe should have 1 ingredient after re-adding");
    menuDoc = await db.collection("MenuManager.menus").findOne({ _id: createdMenuId });
    assertAndLog(menuDoc?.menuCost, expectedNewFlourCost, "Menu cost should reflect re-added flour cost");
  });

  await client.close();
});

// --- Variant Test Case 2: Cart Logic - Menu Conflicts & Ingredient Scenarios ---
Deno.test("MenuManagerConcept - Variant Test 2: Cart Conflicts & Unused Items", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "dummy" });

  // Clear global itemDetails for this test's scope
  for (const key in itemDetails) {
    delete itemDetails[key];
  }

  const testUser: ID = "user:chefCharlie" as ID;
  let menu1Id: ID, menu2Id: ID, cartId: ID;
  let flourId: ID, sugarId: ID, milkId: ID;
  let recipe1Id: ID;

  // --- Step 1: Register items ---
  await t.step(printStepHeader("Register items"), async () => {
    flourId = (await registerItemAndStorePrice(
      menuManager,
      "flour-C2",
      2.00,
      4,
      "lbs",
      "GroceryX",
      { "cup": 0.277 },
    )) as ID;
    sugarId = (await registerItemAndStorePrice(
      menuManager,
      "sugar-C2",
      1.50,
      2,
      "lbs",
      "GroceryX",
      { "cup": 0.45 },
    )) as ID;
    milkId = (await registerItemAndStorePrice(
      menuManager,
      "milk-C2",
      3.00,
      1,
      "gallon",
      "GroceryY",
      { "cup": 0.0625 },
    )) as ID;
    assertExists(flourId && sugarId && milkId, "All items should be registered");
  });

  // --- Step 2: Create two menus for the same date ---
  await t.step(printStepHeader("Create menus with conflicting dates"), async () => {
    const date = "2024-08-11"; // A Sunday

    const createMenu1Result = await menuManager.createMenu({ name: "Sunday Brunch", date, owner: testUser });
    assertAndLog("menu" in createMenu1Result, true, "Menu 1 creation should succeed");
    menu1Id = (createMenu1Result as { menu: ID }).menu;

    const createMenu2Result = await menuManager.createMenu({ name: "Sunday Dinner", date, owner: testUser });
    assertAndLog("menu" in createMenu2Result, true, "Menu 2 creation should succeed");
    menu2Id = (createMenu2Result as { menu: ID }).menu;

    // Add a recipe to menu1 to give it a cost
    const createRecipeResult = await menuManager.createRecipe({
      menu: menu1Id,
      name: "Pancakes-C2",
      instructions: "Mix",
      servingQuantity: 4,
      dishType: "Breakfast",
      scalingFactor: 1.0,
      owner: testUser,
    });
    recipe1Id = (createRecipeResult as { recipe: ID }).recipe;
    const flourAmount = convertAmountToItemUnits(flourId, 1, "cup");
    await menuManager.updateRecipeIngredient({ menu: menu1Id, recipe: recipe1Id, item: flourId, amount: flourAmount });
  });

  // --- Step 3: Create a cart and test menu conflicts ---
  await t.step(printStepHeader("Cart: Adding menus with date conflicts"), async () => {
    const createCartResult = await menuManager.createCart({ startDate: "2024-08-11" });
    assertAndLog("cart" in createCartResult, true, "Cart creation should succeed");
    cartId = (createCartResult as { cart: ID }).cart;

    // Add menu1 to cart
    const addMenu1Result = await menuManager.addMenuToCart({ cart: cartId, menu: menu1Id });
    assertAndLog("success" in addMenu1Result, true, "Adding menu1 to cart should succeed");
    let cartDoc = await db.collection("MenuManager.carts").findOne({ _id: cartId });
    assertAndLog(cartDoc?.menuIds.length, 1, "Cart should contain 1 menu");
    const menu1Doc = await db.collection("MenuManager.menus").findOne({ _id: menu1Id });
    assertAndLog(cartDoc?.weeklyCost, menu1Doc?.menuCost, "Cart weekly cost should match menu1 cost");

    // Try to add menu2 (same date as menu1) to cart
    const addMenu2Result = await menuManager.addMenuToCart({ cart: cartId, menu: menu2Id });
    assertAndLog("error" in addMenu2Result, true, "Adding menu2 (same date) to cart should fail");
    cartDoc = await db.collection("MenuManager.carts").findOne({ _id: cartId });
    assertAndLog(cartDoc?.menuIds.length, 1, "Cart should still contain only 1 menu");
  });

  // --- Step 4: adjustItemQuantity for unused item and used item ---
  await t.step(printStepHeader("adjustItemQuantity with unused/used items"), async () => {
    // Attempt to adjust quantity for 'sugar-C2' which is NOT in recipe1Id (only flour is)
    const unusedItemAdjResult = await menuManager.adjustItemQuantity({
      cart: cartId,
      menu: menu1Id,
      item: sugarId,
      quantity: 5,
    });
    assertAndLog("error" in unusedItemAdjResult, true, "Adjusting quantity for unused item should fail");
    let sugarItem = await db.collection("MenuManager.items").findOne({ _id: sugarId });
    assertAndLog(sugarItem?.quantity, itemDetails[sugarId].quantity, "Sugar quantity should not have changed");

    // Adjust quantity for 'flour-C2' which IS used in recipe1Id
    const oldFlourQuantity = itemDetails[flourId].quantity;
    const newFlourQuantity = oldFlourQuantity * 2; // Double the quantity
    const usedItemAdjResult = await menuManager.adjustItemQuantity({
      cart: cartId,
      menu: menu1Id,
      item: flourId,
      quantity: newFlourQuantity,
    });
    assertAndLog("success" in usedItemAdjResult, true, "Adjusting quantity for used item should succeed");

    let flourItem = await db.collection("MenuManager.items").findOne({ _id: flourId });
    assertAndLog(flourItem?.quantity, newFlourQuantity, "Flour quantity should be updated");

    // Verify costs recalculated
    const expectedCostAfterAdj = await calculateExpectedRecipeCost(db, [{ itemId: flourId, amount: convertAmountToItemUnits(flourId, 1, "cup") }], 1.0);
    let recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipe1Id });
    assertAndLog(recipeDoc?.dishPrice, expectedCostAfterAdj, "Recipe dishPrice should be recalculated");
    let menuDoc = await db.collection("MenuManager.menus").findOne({ _id: menu1Id });
    assertAndLog(menuDoc?.menuCost, expectedCostAfterAdj, "Menu cost should be recalculated");
    let cartDoc = await db.collection("MenuManager.carts").findOne({ _id: cartId });
    assertAndLog(cartDoc?.weeklyCost, expectedCostAfterAdj, "Cart weekly cost should be recalculated");
  });

  await client.close();
});

// --- Variant Test Case 3: Advanced Ingredient Scenarios & Recipe Scaling ---
Deno.test("MenuManagerConcept - Variant Test 3: Complex Ingredient Amounts & Scaling", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "dummy" }); // Dummy API key for tests not using LLM

  // Clear global itemDetails for this test's scope
  for (const key in itemDetails) {
    delete itemDetails[key];
  }

  const testUser: ID = "user:chefDelta" as ID;
  let createdMenuId: ID;
  let recipeId: ID;
  let chickenId: ID, riceId: ID, pepperId: ID;

  // --- Step 1: Create a menu and register items ---
  await t.step(printStepHeader("Setup: Menu & Items"), async () => {
    const createMenuResult = await menuManager.createMenu({
      name: "Scaling Test Menu",
      date: "2024-08-18",
      owner: testUser,
    });
    assertAndLog("menu" in createMenuResult, true, "Menu creation should succeed");
    createdMenuId = (createMenuResult as { menu: ID }).menu;

    chickenId = (await registerItemAndStorePrice(
      menuManager,
      "chicken breast-T3",
      5.00,
      1,
      "lb",
      "Butcher",
      { "lb": 1 },
    )) as ID;
    riceId = (await registerItemAndStorePrice(
      menuManager,
      "white rice-T3",
      3.00,
      2,
      "lbs",
      "Market",
      { "cup": 0.45 },
    )) as ID;
    pepperId = (await registerItemAndStorePrice(
      menuManager,
      "black pepper-T3",
      2.00,
      10,
      "oz",
      "Market",
      { "tsp": 0.05 },
    )) as ID;
    assertExists(chickenId && riceId && pepperId, "All items should be registered");
  });

  // --- Step 2: Create recipe with various ingredient amounts ---
  await t.step(printStepHeader("Recipe with diverse ingredient amounts"), async () => {
    const createRecipeResult = await menuManager.createRecipe({
      menu: createdMenuId,
      name: "Chicken & Rice-T3",
      instructions: "Cook it.",
      servingQuantity: 4,
      dishType: "Main",
      scalingFactor: 1.0,
      owner: testUser,
    });
    assertAndLog("recipe" in createRecipeResult, true, "Recipe creation should succeed");
    recipeId = (createRecipeResult as { recipe: ID }).recipe;

    // Add ingredients with float amounts
    const chickenAmount = convertAmountToItemUnits(chickenId, 1.25, "lb"); // 1.25 lbs
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: chickenId, amount: chickenAmount });
    const riceAmount = convertAmountToItemUnits(riceId, 0.75, "cup"); // 0.75 cup
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: riceId, amount: riceAmount });
    const pepperAmount = convertAmountToItemUnits(pepperId, 0.2, "tsp"); // 0.2 tsp
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: pepperId, amount: pepperAmount });

    const expectedIngredients: RecipeIngredientTemp[] = [
      { itemId: chickenId, amount: chickenAmount },
      { itemId: riceId, amount: riceAmount },
      { itemId: pepperId, amount: pepperAmount },
    ];
    let expectedCost = await calculateExpectedRecipeCost(db, expectedIngredients, 1.0);
    let recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    assertAndLog(recipeDoc?.dishPrice, expectedCost, "Initial dish price should be correct with float amounts");

    // Add an ingredient then immediately remove it (amount 0)
    const temporaryItemId = (await registerItemAndStorePrice(
      menuManager,
      "some spice-T3",
      1.00,
      1,
      "oz",
      "Market",
      { "tsp": 0.1 },
    )) as ID;
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: temporaryItemId, amount: 0.1 });
    recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    assertAndLog(recipeDoc?.ingredients.some((ing) => ing.itemId === temporaryItemId), true, "Temporary ingredient should be added");
    await menuManager.updateRecipeIngredient({ menu: createdMenuId, recipe: recipeId, item: temporaryItemId, amount: 0 });
    recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    assertAndLog(recipeDoc?.ingredients.some((ing) => ing.itemId === temporaryItemId), false, "Temporary ingredient should be removed");
    assertAndLog(recipeDoc?.dishPrice, expectedCost, "Dish price should remain unchanged after adding then removing an ingredient");
  });

  // --- Step 3: Test scaling factor effects and cost cascade ---
  await t.step(printStepHeader("Scaling Factor Effects"), async () => {
    // Current ingredients at scale 1.0
    const currentRecipe = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    const baseIngredients = currentRecipe?.ingredients || [];

    // Create a cart and add the menu
    const createCartResult = await menuManager.createCart({ startDate: "2024-08-18" }); // Same Sunday as menu
    const cartId = (createCartResult as { cart: ID }).cart;
    await menuManager.addMenuToCart({ cart: cartId, menu: createdMenuId });

    // Update scaling factor to 2.0
    await menuManager.updateRecipeScalingFactor({ menu: createdMenuId, recipe: recipeId, scalingFactor: 2.0 });
    let recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    let expectedCostScaled = await calculateExpectedRecipeCost(db, baseIngredients, 2.0);
    assertAndLog(recipeDoc?.dishPrice, expectedCostScaled, "Dish price should double with scaling factor 2.0");

    let menuDoc = await db.collection("MenuManager.menus").findOne({ _id: createdMenuId });
    assertAndLog(menuDoc?.menuCost, expectedCostScaled, "Menu cost should reflect scaled recipe cost");
    let cartDoc = await db.collection("MenuManager.carts").findOne({ _id: cartId });
    assertAndLog(cartDoc?.weeklyCost, expectedCostScaled, "Cart weekly cost should reflect scaled menu cost");

    // Query ingredients to verify scaled amounts
    const ingredientsInRecipe = await menuManager._getIngredientsInRecipe({ recipe: recipeId });
    if ("ingredients" in ingredientsInRecipe) {
      assertAndLog(
        ingredientsInRecipe.ingredients[chickenId].amount,
        parseFloat((itemDetails[chickenId].conversions["lb"] * 1.25 * 2.0).toFixed(2)),
        "Chicken amount scaled correctly",
      );
      assertAndLog(
        ingredientsInRecipe.ingredients[riceId].amount,
        parseFloat((itemDetails[riceId].conversions["cup"] * 0.75 * 2.0).toFixed(2)),
        "Rice amount scaled correctly",
      );
    } else {
      assertAndLog(false, true, "Should successfully get ingredients from recipe");
    }

    // Update scaling factor to 0.5
    await menuManager.updateRecipeScalingFactor({ menu: createdMenuId, recipe: recipeId, scalingFactor: 0.5 });
    recipeDoc = await db.collection("MenuManager.recipes").findOne({ _id: recipeId });
    expectedCostScaled = await calculateExpectedRecipeCost(db, baseIngredients, 0.5);
    assertAndLog(recipeDoc?.dishPrice, expectedCostScaled, "Dish price should halve with scaling factor 0.5");

    menuDoc = await db.collection("MenuManager.menus").findOne({ _id: createdMenuId });
    assertAndLog(menuDoc?.menuCost, expectedCostScaled, "Menu cost should reflect scaled recipe cost after halving");
    cartDoc = await db.collection("MenuManager.carts").findOne({ _id: cartId });
    assertAndLog(cartDoc?.weeklyCost, expectedCostScaled, "Cart weekly cost should reflect scaled menu cost after halving");

    // Query ingredients again
    const ingredientsInRecipe2 = await menuManager._getIngredientsInRecipe({ recipe: recipeId });
    if ("ingredients" in ingredientsInRecipe2) {
      assertAndLog(
        ingredientsInRecipe2.ingredients[chickenId].amount,
        parseFloat((itemDetails[chickenId].conversions["lb"] * 1.25 * 0.5).toFixed(2)),
        "Chicken amount scaled correctly to 0.5",
      );
      assertAndLog(
        ingredientsInRecipe2.ingredients[riceId].amount,
        parseFloat((itemDetails[riceId].conversions["cup"] * 0.75 * 0.5).toFixed(2)),
        "Rice amount scaled correctly to 0.5",
      );
    } else {
      assertAndLog(false, true, "Should successfully get ingredients from recipe (second check)");
    }
  });

  await client.close();
});
```
