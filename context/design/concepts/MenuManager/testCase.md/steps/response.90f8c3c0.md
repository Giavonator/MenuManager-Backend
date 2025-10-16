---
timestamp: 'Thu Oct 16 2025 16:43:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_164355.6925526f.md]]'
content_id: 90f8c3c0fa87fff74b08fd4d89ebd6b64f61da355fe8cd621639b002ca42d908
---

# response:

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

import MenuManagerConcept from "./MenuManagerConcept.ts";

// --- Helper Functions for Deno Tests (re-used from original) ---

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

// Helper function to print a Deno test header
function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

// Helper function to print a test step header
function printStepHeader(stepMessage: string): string {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
  globalStepMessage = stepMessage;
  globalCheckIndex = 0;
  return stepMessage; // Return the message for use as t.step's name
}

// Store expected state of items for cost calculation
interface ItemExpectedPrice {
  price: number;
  quantity: number; // Base quantity for which 'price' is set (e.g., 5 for 5 lbs)
  units: string;
  // Conversion factors to convert common recipe units (cups, tbsp, tsp) to ItemDoc.units
  conversions: Record<string, number>; // e.g., {'cup': 0.277, 'lb': 1} for flour where ItemDoc.units is 'lbs'
}

interface RecipeIngredientTemp {
  itemId: ID;
  amount: number; // This amount is in the ItemDoc.units
}

// Regular expression to validate Deno-generated UUIDs
const idRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// --- Reusable Helper Functions for Variants ---

// These `itemDetails` and associated functions will be passed around or initialized per test
// to avoid state leakage between tests.
let currentItemDetails: Record<ID, ItemExpectedPrice> = {};

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
    currentItemDetails[itemId] = { price, quantity, units, conversions };
    return itemId;
  }
  return itemResult; // Return the error object
};

const convertAmountToItemUnits = (
  itemId: ID,
  amount: number,
  recipeUnit: string,
): number => {
  const item = currentItemDetails[itemId];
  if (!item) {
    console.warn(
      `Item ${itemId} not found in currentItemDetails for conversion. Assuming 1:1 conversion for ${recipeUnit}.`,
    );
    return amount;
  }
  if (recipeUnit === item.units) {
    return amount; // Already in target units
  }
  const conversionFactor = item.conversions[recipeUnit];
  if (typeof conversionFactor === "number") {
    return amount * conversionFactor; // Convert recipe unit to ItemDoc.units
  }
  console.warn(
    `No conversion factor for ${recipeUnit} to ${item.units} for item ${itemId}. Returning raw amount.`,
  );
  return amount; // Fallback if conversion not defined
};

const calculateExpectedRecipeCost = async (
  db: any, // Pass the database client
  recipeIngredients: RecipeIngredientTemp[],
  scalingFactor: number,
): Promise<number> => {
  let price = 0;
  for (const ing of recipeIngredients) {
    const itemInfo = currentItemDetails[ing.itemId];
    if (itemInfo && itemInfo.quantity > 0) {
      price += (itemInfo.price / itemInfo.quantity) * ing.amount; // ing.amount is already in item's base units
    } else {
      // If item not found in `currentItemDetails` (e.g., from LLM, or not pre-registered),
      // try to get from DB and use its price/quantity if available.
      // This is a fallback and assumes `currentItemDetails` should be up-to-date for test accuracy.
      const itemDoc = await db.collection("MenuManager.items").findOne({
        _id: ing.itemId,
      });
      if (itemDoc && itemDoc.quantity > 0) {
        price += (itemDoc.price / itemDoc.quantity) * ing.amount;
      } else {
        console.warn(
          `Item ${ing.itemId} not found for cost calculation. Assuming 0 cost.`,
        );
      }
    }
  }
  return parseFloat((price * scalingFactor).toFixed(2));
};

const getItemName = async (db: any, itemId: ID): Promise<string> => {
  const item = await db.collection("MenuManager.items").findOne({
    _id: itemId,
  });
  return item?.names[0] || itemId;
};

// --- Variant Test Cases ---

Deno.test("MenuManagerConcept - Variant 1: Item Management and Cost Recalculation", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "test-key" }); // LLM not used here

  const testUser: ID = "user:chefMaria" as ID;
  currentItemDetails = {}; // Reset for this test

  let menuId: ID;
  let recipeId: ID;
  let cartId: ID;

  let flourItemId: ID, sugarItemId: ID, saltItemId: ID;

  let expectedRecipeCost: number;
  let expectedMenuCost: number;
  let expectedCartCost: number;

  await t.step(printStepHeader("Setup: Create initial menu, recipe, and cart"), async () => {
    // 1. Register base items
    const flourResult = await registerItemAndStorePrice(
      menuManager,
      "flour",
      2.50,
      5,
      "lbs",
      "Whole Foods",
      { "cup": 0.277, "lbs": 1 },
    );
    flourItemId = flourResult as ID;

    const sugarResult = await registerItemAndStorePrice(
      menuManager,
      "sugar",
      2.00,
      4,
      "lbs",
      "Safeway",
      { "cup": 0.45, "lbs": 1 },
    );
    sugarItemId = sugarResult as ID;

    // 2. Create a menu
    const createMenuResult = await menuManager.createMenu({
      name: "Baking Basics",
      date: "2024-08-04", // Sunday
      owner: testUser,
    });
    menuId = (createMenuResult as { menu: ID }).menu;

    // 3. Create a recipe
    const createRecipeResult = await menuManager.createRecipe({
      menu: menuId,
      name: "Simple Bread",
      instructions: "Mix, knead, bake.",
      servingQuantity: 1,
      dishType: "Baked Good",
      scalingFactor: 1.0,
      owner: testUser,
    });
    recipeId = (createRecipeResult as { recipe: ID }).recipe;

    // 4. Add ingredients to recipe
    const initialIngredients: RecipeIngredientTemp[] = [
      {
        itemId: flourItemId,
        amount: convertAmountToItemUnits(flourItemId, 2, "cup"),
      }, // 2 cups flour
      {
        itemId: sugarItemId,
        amount: convertAmountToItemUnits(sugarItemId, 0.25, "cup"),
      }, // 0.25 cups sugar
    ];
    for (const ing of initialIngredients) {
      await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: ing.itemId,
        amount: ing.amount,
      });
    }

    // 5. Calculate and verify initial costs
    expectedRecipeCost = await calculateExpectedRecipeCost(
      db,
      initialIngredients,
      1.0,
    );
    const recipe = await db.collection("MenuManager.recipes").findOne({
      _id: recipeId,
    });
    assertAndLog(
      recipe?.dishPrice,
      expectedRecipeCost,
      "Initial recipe dishPrice is correct",
    );

    expectedMenuCost = expectedRecipeCost;
    const menu = await db.collection("MenuManager.menus").findOne({
      _id: menuId,
    });
    assertAndLog(
      menu?.menuCost,
      expectedMenuCost,
      "Initial menu cost is correct",
    );

    // 6. Create cart and add menu
    const createCartResult = await menuManager.createCart({
      startDate: "2024-08-04",
    });
    cartId = (createCartResult as { cart: ID }).cart;
    await menuManager.addMenuToCart({ cart: cartId, menu: menuId });

    expectedCartCost = expectedMenuCost;
    const cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertAndLog(
      cart?.weeklyCost,
      expectedCartCost,
      "Initial cart weekly cost is correct",
    );
  });

  await t.step(printStepHeader("Part 1: `enterItem` and `confirmItem`"), async () => {
    // Try entering item with negative price (should fail)
    const invalidPriceResult = await menuManager.enterItem({
      name: "negative test item",
      price: -1.0,
      quantity: 1,
      units: "each",
      store: "test",
    });
    assertAndLog(
      "error" in invalidPriceResult,
      true,
      "Entering item with negative price should fail",
    );

    // Try entering item with zero quantity (should fail)
    const invalidQuantityResult = await menuManager.enterItem({
      name: "zero quantity test item",
      price: 1.0,
      quantity: 0,
      units: "each",
      store: "test",
    });
    assertAndLog(
      "error" in invalidQuantityResult,
      true,
      "Entering item with zero quantity should fail",
    );

    // Enter a new item "salt"
    const saltResult = await registerItemAndStorePrice(
      menuManager,
      "salt",
      1.00,
      16,
      "oz",
      "Pantry",
      { "tsp": 0.166, "oz": 1 },
    );
    assertAndLog(
      typeof saltResult === "string" && idRegex.test(saltResult),
      true,
      `Should successfully enter item "salt"`,
    );
    saltItemId = saltResult as ID;

    let saltItem = await db.collection("MenuManager.items").findOne({
      _id: saltItemId,
    });
    assertAndLog(saltItem?.confirmed, false, "New item should be unconfirmed");

    // Try to enter another item with the same name (should fail)
    const duplicateSaltResult = await menuManager.enterItem({
      name: "salt",
      price: 1.20,
      quantity: 10,
      units: "oz",
      store: "Pantry",
    });
    assertAndLog(
      "error" in duplicateSaltResult,
      true,
      "Entering item with duplicate name should fail",
    );

    // Confirm the "salt" item
    const confirmResult = await menuManager.confirmItem({ item: saltItemId });
    assertAndLog(
      "item" in confirmResult,
      true,
      "Confirming salt item should succeed",
    );
    saltItem = await db.collection("MenuManager.items").findOne({
      _id: saltItemId,
    });
    assertAndLog(saltItem?.confirmed, true, "Salt item should now be confirmed");

    // Try to confirm an already confirmed item (should fail)
    const reconfirmResult = await menuManager.confirmItem({ item: saltItemId });
    assertAndLog(
      "error" in reconfirmResult,
      true,
      "Re-confirming an item should fail",
    );

    // Try to confirm a non-existent item (should fail)
    const nonExistentId = "item:nonexistent" as ID;
    const nonExistentConfirm = await menuManager.confirmItem({
      item: nonExistentId,
    });
    assertAndLog(
      "error" in nonExistentConfirm,
      true,
      "Confirming a non-existent item should fail",
    );
  });

  await t.step(printStepHeader("Part 2: `addItemName` and `removeItemName`"), async () => {
    // Add an alias to "salt"
    const addAliasResult = await menuManager.addItemName({
      item: saltItemId,
      name: "fine grain salt",
    });
    assertAndLog("success" in addAliasResult, true, "Adding alias should succeed");

    let saltItem = await db.collection("MenuManager.items").findOne({
      _id: saltItemId,
    });
    assertAndLog(
      saltItem?.names.includes("fine grain salt"),
      true,
      "Item should now have the new alias",
    );

    // Verify item can be found by alias
    const foundByAlias = await menuManager["findItemByName"]("fine grain salt");
    assertExists(foundByAlias, "Item should be found by its alias");
    assertAndLog(
      foundByAlias?._id,
      saltItemId,
      "Found item by alias matches original item ID",
    );

    // Try to add an alias that already exists for the same item (should fail)
    const duplicateAliasResult = await menuManager.addItemName({
      item: saltItemId,
      name: "fine grain salt",
    });
    assertAndLog(
      "error" in duplicateAliasResult,
      true,
      "Adding duplicate alias should fail",
    );

    // Try to add an alias that is the primary name of another item (should fail)
    const createNewItemResult = await menuManager.enterItem({
      name: "pepper",
      price: 3.0,
      quantity: 10,
      units: "oz",
      store: "Pantry",
    });
    const pepperItemId = (createNewItemResult as { item: ID }).item;

    const aliasConflictResult = await menuManager.addItemName({
      item: saltItemId,
      name: "pepper",
    });
    assertAndLog(
      "error" in aliasConflictResult,
      true,
      "Adding an alias that's another item's primary name should fail",
    );

    // Remove the alias
    const removeAliasResult = await menuManager.removeItemName({
      item: saltItemId,
      name: "fine grain salt",
    });
    assertAndLog(
      "success" in removeAliasResult,
      true,
      "Removing alias should succeed",
    );

    saltItem = await db.collection("MenuManager.items").findOne({
      _id: saltItemId,
    });
    assertAndLog(
      saltItem?.names.includes("fine grain salt"),
      false,
      "Item should no longer have the alias",
    );
    assertAndLog(
      saltItem?.names.length,
      1,
      "Item should have only one name left",
    );

    // Try to remove the last name (should fail)
    const removeLastNameResult = await menuManager.removeItemName({
      item: saltItemId,
      name: "salt",
    });
    assertAndLog(
      "error" in removeLastNameResult,
      true,
      "Removing last name should fail",
    );
  });

  await t.step(
    printStepHeader("Part 3: `updateItemPrice` and `updateItemQuantity` (with cost recalculation)"),
    async () => {
      const oldFlourPrice = currentItemDetails[flourItemId].price;
      const oldFlourQuantity = currentItemDetails[flourItemId].quantity;
      const newFlourPrice = oldFlourPrice * 1.5; // Increase price by 50%

      // Try updating item price with negative value (should fail)
      const invalidPriceUpdateResult = await menuManager.updateItemPrice({
        item: flourItemId,
        price: -10.0,
      });
      assertAndLog(
        "error" in invalidPriceUpdateResult,
        true,
        "Updating item price with negative value should fail",
      );

      // Update flour price
      const updatePriceResult = await menuManager.updateItemPrice({
        item: flourItemId,
        price: newFlourPrice,
      });
      assertAndLog(
        "success" in updatePriceResult,
        true,
        "Updating flour price should succeed",
      );
      currentItemDetails[flourItemId].price = newFlourPrice; // Update expected value

      // Recalculate expected costs
      const recipeDocAfterPriceUpdate = await db.collection(
        "MenuManager.recipes",
      ).findOne({ _id: recipeId });
      expectedRecipeCost = await calculateExpectedRecipeCost(
        db,
        recipeDocAfterPriceUpdate!.ingredients,
        recipeDocAfterPriceUpdate!.scalingFactor,
      );

      const menuDocAfterPriceUpdate = await db.collection("MenuManager.menus")
        .findOne({ _id: menuId });
      expectedMenuCost = expectedRecipeCost; // Only one recipe
      const cartDocAfterPriceUpdate = await db.collection("MenuManager.carts")
        .findOne({ _id: cartId });
      expectedCartCost = expectedMenuCost;

      assertAndLog(
        recipeDocAfterPriceUpdate?.dishPrice,
        expectedRecipeCost,
        "Recipe dishPrice should be updated after flour price change",
      );
      assertAndLog(
        menuDocAfterPriceUpdate?.menuCost,
        expectedMenuCost,
        "Menu cost should be updated after flour price change",
      );
      assertAndLog(
        cartDocAfterPriceUpdate?.weeklyCost,
        expectedCartCost,
        "Cart weekly cost should be updated after flour price change",
      );

      const newSugarQuantity = oldFlourQuantity * 0.5; // Reduce sugar base quantity by 50%

      // Try updating item quantity with zero value (should fail)
      const invalidQuantityUpdateResult = await menuManager.updateItemQuantity(
        { item: sugarItemId, quantity: 0 },
      );
      assertAndLog(
        "error" in invalidQuantityUpdateResult,
        true,
        "Updating item quantity with zero value should fail",
      );

      // Update sugar quantity
      const updateQuantityResult = await menuManager.updateItemQuantity({
        item: sugarItemId,
        quantity: newSugarQuantity,
      });
      assertAndLog(
        "success" in updateQuantityResult,
        true,
        "Updating sugar quantity should succeed",
      );
      currentItemDetails[sugarItemId].quantity = newSugarQuantity; // Update expected value

      // Recalculate expected costs again
      const recipeDocAfterQuantityUpdate = await db.collection(
        "MenuManager.recipes",
      ).findOne({ _id: recipeId });
      expectedRecipeCost = await calculateExpectedRecipeCost(
        db,
        recipeDocAfterQuantityUpdate!.ingredients,
        recipeDocAfterQuantityUpdate!.scalingFactor,
      );

      const menuDocAfterQuantityUpdate = await db.collection("MenuManager.menus")
        .findOne({ _id: menuId });
      expectedMenuCost = expectedRecipeCost;
      const cartDocAfterQuantityUpdate = await db.collection("MenuManager.carts")
        .findOne({ _id: cartId });
      expectedCartCost = expectedMenuCost;

      assertAndLog(
        recipeDocAfterQuantityUpdate?.dishPrice,
        expectedRecipeCost,
        "Recipe dishPrice should be updated after sugar quantity change",
      );
      assertAndLog(
        menuDocAfterQuantityUpdate?.menuCost,
        expectedMenuCost,
        "Menu cost should be updated after sugar quantity change",
      );
      assertAndLog(
        cartDocAfterQuantityUpdate?.weeklyCost,
        expectedCartCost,
        "Cart weekly cost should be updated after sugar quantity change",
      );
    },
  );

  await t.step(printStepHeader("Part 4: `updateItemUnits` and `updateItemStore`"), async () => {
    // Update units of salt (does not affect cost)
    const updateUnitsResult = await menuManager.updateItemUnits({
      item: saltItemId,
      units: "gram",
    });
    assertAndLog(
      "success" in updateUnitsResult,
      true,
      "Updating item units should succeed",
    );
    const saltItem = await db.collection("MenuManager.items").findOne({
      _id: saltItemId,
    });
    assertAndLog(
      saltItem?.units,
      "gram",
      "Salt item units should be updated",
    );

    // Update store of salt (does not affect cost)
    const updateStoreResult = await menuManager.updateItemStore({
      item: saltItemId,
      store: "Bulk Barn",
    });
    assertAndLog(
      "success" in updateStoreResult,
      true,
      "Updating item store should succeed",
    );
    const updatedSaltItem = await db.collection("MenuManager.items").findOne({
      _id: saltItemId,
    });
    assertAndLog(
      updatedSaltItem?.store,
      "Bulk Barn",
      "Salt item store should be updated",
    );
  });

  await client.close();
});

Deno.test("MenuManagerConcept - Variant 2: Recipe Management and Ingredient Handling", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "test-key" }); // LLM not used here

  const testUser: ID = "user:chefDavid" as ID;
  currentItemDetails = {}; // Reset for this test

  let menuId: ID;
  let recipeId: ID;
  let cartId: ID;

  let flourItemId: ID, sugarItemId: ID, eggItemId: ID, waterItemId: ID;

  await t.step(printStepHeader("Setup: Register items and create menu"), async () => {
    // 1. Register items
    const flourResult = await registerItemAndStorePrice(
      menuManager,
      "flour",
      2.50,
      5,
      "lbs",
      "Whole Foods",
      { "cup": 0.277, "lbs": 1 },
    );
    flourItemId = flourResult as ID;

    const sugarResult = await registerItemAndStorePrice(
      menuManager,
      "sugar",
      2.00,
      4,
      "lbs",
      "Safeway",
      { "cup": 0.45, "lbs": 1 },
    );
    sugarItemId = sugarResult as ID;

    const eggResult = await registerItemAndStorePrice(
      menuManager,
      "egg",
      4.00,
      12,
      "each",
      "Safeway",
      { "each": 1 },
    );
    eggItemId = eggResult as ID;

    const waterResult = await registerItemAndStorePrice(
      menuManager,
      "water",
      0.50,
      1,
      "gallon",
      "Costco",
      { "cup": 0.0625, "gallon": 1 },
    );
    waterItemId = waterResult as ID;

    // 2. Create a menu
    const createMenuResult = await menuManager.createMenu({
      name: "Dessert Delights",
      date: "2024-08-11", // Sunday
      owner: testUser,
    });
    menuId = (createMenuResult as { menu: ID }).menu;

    const menu = await db.collection("MenuManager.menus").findOne({
      _id: menuId,
    });
    assertAndLog(menu?.menuCost, 0, "Initial menu cost should be 0");
  });

  await t.step(printStepHeader("Part 1: `createRecipe` and basic updates"), async () => {
    // Create a "Chocolate Cake" recipe
    const createRecipeResult = await menuManager.createRecipe({
      menu: menuId,
      name: "Chocolate Cake",
      instructions: "Bake a delicious chocolate cake.",
      servingQuantity: 8,
      dishType: "Dessert",
      scalingFactor: 1.0,
      owner: testUser,
    });
    assertAndLog(
      "recipe" in createRecipeResult,
      true,
      "Chocolate Cake recipe creation should succeed",
    );
    recipeId = (createRecipeResult as { recipe: ID }).recipe;

    const recipe = await db.collection("MenuManager.recipes").findOne({
      _id: recipeId,
    });
    assertAndLog(recipe?.dishPrice, 0, "New recipe dishPrice should be 0");
    assertAndLog(
      recipe?.ingredients.length,
      0,
      "New recipe should have no ingredients",
    );

    // Verify menu cost remains 0 as recipe has no ingredients
    const menu = await db.collection("MenuManager.menus").findOne({
      _id: menuId,
    });
    assertAndLog(menu?.menuCost, 0, "Menu cost should still be 0 after empty recipe creation");

    // Try creating with negative serving quantity
    const invalidServingResult = await menuManager.createRecipe({
      menu: menuId,
      name: "Invalid Serving",
      instructions: "test",
      servingQuantity: -1,
      dishType: "Dessert",
      scalingFactor: 1.0,
      owner: testUser,
    });
    assertAndLog(
      "error" in invalidServingResult,
      true,
      "Creating recipe with negative servingQuantity should fail",
    );

    // Try creating with negative scaling factor
    const invalidScalingResult = await menuManager.createRecipe({
      menu: menuId,
      name: "Invalid Scaling",
      instructions: "test",
      servingQuantity: 1,
      dishType: "Dessert",
      scalingFactor: -0.5,
      owner: testUser,
    });
    assertAndLog(
      "error" in invalidScalingResult,
      true,
      "Creating recipe with negative scalingFactor should fail",
    );

    // Update recipe name and instructions
    await menuManager.updateRecipeName({
      menu: menuId,
      recipe: recipeId,
      name: "Rich Chocolate Cake",
    });
    await menuManager.updateRecipeInstructions({
      menu: menuId,
      recipe: recipeId,
      instructions: "A very rich and moist chocolate cake, perfect for special occasions.",
    });
    const updatedRecipe = await db.collection("MenuManager.recipes").findOne({
      _id: recipeId,
    });
    assertAndLog(
      updatedRecipe?.name,
      "Rich Chocolate Cake",
      "Recipe name should be updated",
    );
    assertAndLog(
      updatedRecipe?.instructions,
      "A very rich and moist chocolate cake, perfect for special occasions.",
      "Recipe instructions should be updated",
    );
  });

  await t.step(
    printStepHeader("Part 2: `updateRecipeIngredient` (Add, Update, Remove)"),
    async () => {
      // Add flour (2 cups)
      const flourAmount = convertAmountToItemUnits(flourItemId, 2, "cup");
      await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: flourItemId,
        amount: flourAmount,
      });

      // Add sugar (1 cup)
      const sugarAmount = convertAmountToItemUnits(sugarItemId, 1, "cup");
      await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: sugarItemId,
        amount: sugarAmount,
      });

      const expectedInitialIngredients: RecipeIngredientTemp[] = [
        { itemId: flourItemId, amount: flourAmount },
        { itemId: sugarItemId, amount: sugarAmount },
      ];
      let expectedDishPrice = await calculateExpectedRecipeCost(
        db,
        expectedInitialIngredients,
        1.0,
      );

      let recipe = await db.collection("MenuManager.recipes").findOne({
        _id: recipeId,
      });
      assertAndLog(
        recipe?.dishPrice,
        expectedDishPrice,
        "Dish price correct after adding two ingredients",
      );
      assertAndLog(
        recipe?.ingredients.length,
        2,
        "Recipe should have two ingredients",
      );

      // Verify menu cost
      let menu = await db.collection("MenuManager.menus").findOne({
        _id: menuId,
      });
      assertAndLog(
        menu?.menuCost,
        expectedDishPrice,
        "Menu cost correct after adding ingredients to recipe",
      );

      // Try adding ingredient with non-existent item ID (should fail)
      const nonExistentItemId = "item:fake" as ID;
      const addNonExistentResult = await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: nonExistentItemId,
        amount: 1,
      });
      assertAndLog(
        "error" in addNonExistentResult,
        true,
        "Adding non-existent item to recipe should fail",
      );

      // Try adding ingredient with negative amount (should fail)
      const negativeAmountResult = await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: flourItemId,
        amount: -0.5,
      });
      assertAndLog(
        "error" in negativeAmountResult,
        true,
        "Adding ingredient with negative amount should fail",
      );

      // Update flour amount from 2 cups to 1.5 cups
      const newFlourAmount = convertAmountToItemUnits(flourItemId, 1.5, "cup");
      await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: flourItemId,
        amount: newFlourAmount,
      });

      const expectedUpdatedIngredients: RecipeIngredientTemp[] = [
        { itemId: flourItemId, amount: newFlourAmount },
        { itemId: sugarItemId, amount: sugarAmount },
      ];
      expectedDishPrice = await calculateExpectedRecipeCost(
        db,
        expectedUpdatedIngredients,
        1.0,
      );

      recipe = await db.collection("MenuManager.recipes").findOne({
        _id: recipeId,
      });
      assertAndLog(
        recipe?.dishPrice,
        expectedDishPrice,
        "Dish price correct after updating flour amount",
      );
      assertAndLog(
        recipe?.ingredients.find((i) => i.itemId === flourItemId)?.amount,
        newFlourAmount,
        "Flour amount updated correctly",
      );

      // Verify menu cost
      menu = await db.collection("MenuManager.menus").findOne({
        _id: menuId,
      });
      assertAndLog(
        menu?.menuCost,
        expectedDishPrice,
        "Menu cost correct after updating ingredient amount",
      );

      // Remove sugar by setting amount to 0
      await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: sugarItemId,
        amount: 0,
      });

      const expectedIngredientsAfterRemoval: RecipeIngredientTemp[] = [
        { itemId: flourItemId, amount: newFlourAmount },
      ];
      expectedDishPrice = await calculateExpectedRecipeCost(
        db,
        expectedIngredientsAfterRemoval,
        1.0,
      );

      recipe = await db.collection("MenuManager.recipes").findOne({
        _id: recipeId,
      });
      assertAndLog(
        recipe?.ingredients.length,
        1,
        "Recipe should have one ingredient after sugar removal",
      );
      assertAndLog(
        recipe?.ingredients.find((i) => i.itemId === sugarItemId),
        undefined,
        "Sugar should be removed from ingredients",
      );
      assertAndLog(
        recipe?.dishPrice,
        expectedDishPrice,
        "Dish price correct after sugar removal",
      );

      // Verify menu cost
      menu = await db.collection("MenuManager.menus").findOne({
        _id: menuId,
      });
      assertAndLog(
        menu?.menuCost,
        expectedDishPrice,
        "Menu cost correct after ingredient removal",
      );

      // Add sugar back for scaling test
      await menuManager.updateRecipeIngredient({
        menu: menuId,
        recipe: recipeId,
        item: sugarItemId,
        amount: sugarAmount,
      });
      expectedDishPrice = await calculateExpectedRecipeCost(
        db,
        [...expectedIngredientsAfterRemoval, { itemId: sugarItemId, amount: sugarAmount }],
        1.0,
      ); // Recalculate with both
      await db.collection("MenuManager.recipes").updateOne({ _id: recipeId }, { $set: { dishPrice: expectedDishPrice } });
      await db.collection("MenuManager.menus").updateOne({ _id: menuId }, { $set: { menuCost: expectedDishPrice } });
    },
  );

  await t.step(printStepHeader("Part 3: `updateRecipeScalingFactor`"), async () => {
    // Create a cart and add the menu to verify cart cost updates
    const createCartResult = await menuManager.createCart({
      startDate: "2024-08-11", // Same Sunday as menu
    });
    cartId = (createCartResult as { cart: ID }).cart;
    await menuManager.addMenuToCart({ cart: cartId, menu: menuId });

    let currentRecipe = await db.collection("MenuManager.recipes").findOne({
      _id: recipeId,
    });
    let currentMenu = await db.collection("MenuManager.menus").findOne({
      _id: menuId,
    });
    let currentCart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });

    assertAndLog(
      currentCart?.weeklyCost,
      currentMenu?.menuCost,
      "Cart weekly cost matches menu cost before scaling",
    );

    // Update scaling factor to 2.0
    await menuManager.updateRecipeScalingFactor({
      menu: menuId,
      recipe: recipeId,
      scalingFactor: 2.0,
    });

    let recipeAfterScaling = await db.collection("MenuManager.recipes")
      .findOne({ _id: recipeId });
    let expectedDishPrice = await calculateExpectedRecipeCost(
      db,
      recipeAfterScaling!.ingredients,
      2.0,
    ); // Calculate with new scaling factor
    assertAndLog(
      recipeAfterScaling?.dishPrice,
      expectedDishPrice,
      "Dish price should be updated after scaling factor change",
    );

    let menuAfterScaling = await db.collection("MenuManager.menus").findOne({
      _id: menuId,
    });
    assertAndLog(
      menuAfterScaling?.menuCost,
      expectedDishPrice,
      "Menu cost should be updated after recipe scaling factor change",
    );

    let cartAfterScaling = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertAndLog(
      cartAfterScaling?.weeklyCost,
      expectedDishPrice,
      "Cart weekly cost should be updated after recipe scaling factor change",
    );

    // Try updating scaling factor with negative value (should fail)
    const negativeScalingResult = await menuManager.updateRecipeScalingFactor({
      menu: menuId,
      recipe: recipeId,
      scalingFactor: -1.0,
    });
    assertAndLog(
      "error" in negativeScalingResult,
      true,
      "Updating scaling factor with negative value should fail",
    );
  });

  await client.close();
});

Deno.test("MenuManagerConcept - Variant 3: Menu and Cart Interactions", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "test-key" }); // LLM not used here

  const testUser: ID = "user:chefSarah" as ID;
  currentItemDetails = {}; // Reset for this test

  let breakfastMenuId: ID, dinnerMenuId: ID;
  let omeletteRecipeId: ID, breadRecipeId: ID;
  let cartId: ID;

  let eggItemId: ID, flourItemId: ID;

  let expectedOmeletteCost: number, expectedBreadCost: number;

  await t.step(printStepHeader("Setup: Register items and create recipes"), async () => {
    // 1. Register items
    const eggResult = await registerItemAndStorePrice(
      menuManager,
      "egg",
      4.00,
      12,
      "each",
      "Safeway",
      { "each": 1 },
    );
    eggItemId = eggResult as ID;

    const flourResult = await registerItemAndStorePrice(
      menuManager,
      "flour",
      2.50,
      5,
      "lbs",
      "Whole Foods",
      { "cup": 0.277, "lbs": 1 },
    );
    flourItemId = flourResult as ID;

    // 2. Create "Omelette" recipe
    const createOmeletteResult = await menuManager.createRecipe({
      menu: "temp" as ID, // Temp menu ID, will update
      name: "Fluffy Omelette",
      instructions: "Whisk eggs, cook in pan.",
      servingQuantity: 1,
      dishType: "Breakfast",
      scalingFactor: 1.0,
      owner: testUser,
    });
    omeletteRecipeId = (createOmeletteResult as { recipe: ID }).recipe;
    const omeletteIngredients: RecipeIngredientTemp[] = [{
      itemId: eggItemId,
      amount: convertAmountToItemUnits(eggItemId, 2, "each"),
    }];
    for (const ing of omeletteIngredients) {
      await menuManager.updateRecipeIngredient({
        menu: "temp" as ID,
        recipe: omeletteRecipeId,
        item: ing.itemId,
        amount: ing.amount,
      });
    }
    expectedOmeletteCost = await calculateExpectedRecipeCost(
      db,
      omeletteIngredients,
      1.0,
    );

    // 3. Create "Bread" recipe
    const createBreadResult = await menuManager.createRecipe({
      menu: "temp" as ID, // Temp menu ID, will update
      name: "Homemade Bread",
      instructions: "Mix ingredients, knead, proof, bake.",
      servingQuantity: 10,
      dishType: "Side",
      scalingFactor: 1.0,
      owner: testUser,
    });
    breadRecipeId = (createBreadResult as { recipe: ID }).recipe;
    const breadIngredients: RecipeIngredientTemp[] = [{
      itemId: flourItemId,
      amount: convertAmountToItemUnits(flourItemId, 3, "cup"),
    }];
    for (const ing of breadIngredients) {
      await menuManager.updateRecipeIngredient({
        menu: "temp" as ID,
        recipe: breadRecipeId,
        item: ing.itemId,
        amount: ing.amount,
      });
    }
    expectedBreadCost = await calculateExpectedRecipeCost(
      db,
      breadIngredients,
      1.0,
    );

    // Clean up temporary menu associations
    await db.collection("MenuManager.recipes").updateMany({ _id: { $in: [omeletteRecipeId, breadRecipeId] } }, { $unset: { menuId: "" } });
    await db.collection("MenuManager.recipes").updateMany({ _id: { $in: [omeletteRecipeId, breadRecipeId] } }, { $set: { dishPrice: expectedOmeletteCost } });
    await db.collection("MenuManager.recipes").updateOne({ _id: breadRecipeId }, { $set: { dishPrice: expectedBreadCost } });
  });

  await t.step(printStepHeader("Part 1: `createMenu` and `updateMenu`"), async () => {
    // Create Breakfast Menu for Sunday
    const createBreakfastMenuResult = await menuManager.createMenu({
      name: "Weekend Breakfast",
      date: "2024-08-18", // Sunday
      owner: testUser,
    });
    breakfastMenuId = (createBreakfastMenuResult as { menu: ID }).menu;
    const breakfastMenu = await db.collection("MenuManager.menus").findOne({
      _id: breakfastMenuId,
    });
    assertAndLog(
      breakfastMenu?.menuCost,
      0,
      "New breakfast menu cost should be 0",
    );

    // Create Dinner Menu for Monday
    const createDinnerMenuResult = await menuManager.createMenu({
      name: "Italian Night",
      date: "2024-08-19", // Monday
      owner: testUser,
    });
    dinnerMenuId = (createDinnerMenuResult as { menu: ID }).menu;
    const dinnerMenu = await db.collection("MenuManager.menus").findOne({
      _id: dinnerMenuId,
    });
    assertAndLog(dinnerMenu?.menuCost, 0, "New dinner menu cost should be 0");

    // Try creating menu with invalid date format
    const invalidDateMenuResult = await menuManager.createMenu({
      name: "Invalid Date Menu",
      date: "2024/08/20", // Invalid format
      owner: testUser,
    });
    assertAndLog(
      "error" in invalidDateMenuResult,
      true,
      "Creating menu with invalid date format should fail",
    );

    // Update name of Breakfast Menu
    await menuManager.updateMenuName({
      menu: breakfastMenuId,
      name: "Sunday Brunch",
    });
    const updatedBreakfastMenu = await db.collection("MenuManager.menus")
      .findOne({ _id: breakfastMenuId });
    assertAndLog(
      updatedBreakfastMenu?.name,
      "Sunday Brunch",
      "Breakfast menu name should be updated",
    );

    // Update date of Dinner Menu to another Monday
    await menuManager.updateMenuDate({
      menu: dinnerMenuId,
      date: "2024-08-26", // Next Monday
    });
    const updatedDinnerMenu = await db.collection("MenuManager.menus")
      .findOne({ _id: dinnerMenuId });
    assertAndLog(
      updatedDinnerMenu?.date,
      "2024-08-26",
      "Dinner menu date should be updated",
    );

    // Try updating menu date to invalid format
    const updateInvalidDateResult = await menuManager.updateMenuDate({
      menu: dinnerMenuId,
      date: "not-a-date",
    });
    assertAndLog(
      "error" in updateInvalidDateResult,
      true,
      "Updating menu date to invalid format should fail",
    );
  });

  await t.step(printStepHeader("Part 2: Adding recipes to menus"), async () => {
    // Add Omelette to Breakfast Menu
    await db.collection("MenuManager.recipes").updateOne(
      { _id: omeletteRecipeId },
      { $set: { menuId: breakfastMenuId } },
    ); // Manually set menuId
    await menuManager.createRecipe({
      menu: breakfastMenuId,
      name: "Fluffy Omelette",
      instructions: "Whisk eggs, cook in pan.",
      servingQuantity: 1,
      dishType: "Breakfast",
      scalingFactor: 1.0,
      owner: testUser,
    }); // This will recalculate the menu cost
    await menuManager.updateRecipeIngredient({
      menu: breakfastMenuId,
      recipe: omeletteRecipeId,
      item: eggItemId,
      amount: convertAmountToItemUnits(eggItemId, 2, "each"),
    });

    let breakfastMenu = await db.collection("MenuManager.menus").findOne({
      _id: breakfastMenuId,
    });
    assertAndLog(
      breakfastMenu?.menuCost,
      expectedOmeletteCost,
      "Breakfast menu cost should reflect Omelette recipe",
    );

    // Add Bread to Dinner Menu
    await db.collection("MenuManager.recipes").updateOne(
      { _id: breadRecipeId },
      { $set: { menuId: dinnerMenuId } },
    ); // Manually set menuId
    await menuManager.createRecipe({
      menu: dinnerMenuId,
      name: "Homemade Bread",
      instructions: "Mix ingredients, knead, proof, bake.",
      servingQuantity: 10,
      dishType: "Side",
      scalingFactor: 1.0,
      owner: testUser,
    });
    await menuManager.updateRecipeIngredient({
      menu: dinnerMenuId,
      recipe: breadRecipeId,
      item: flourItemId,
      amount: convertAmountToItemUnits(flourItemId, 3, "cup"),
    });

    let dinnerMenu = await db.collection("MenuManager.menus").findOne({
      _id: dinnerMenuId,
    });
    assertAndLog(
      dinnerMenu?.menuCost,
      expectedBreadCost,
      "Dinner menu cost should reflect Bread recipe",
    );
  });

  await t.step(printStepHeader("Part 3: `createCart` and `addMenuToCart`"), async () => {
    // Create a cart for the same Sunday as Breakfast Menu
    const createCartResult = await menuManager.createCart({
      startDate: "2024-08-18",
    });
    assertAndLog(
      "cart" in createCartResult,
      true,
      "Cart creation for Sunday should succeed",
    );
    cartId = (createCartResult as { cart: ID }).cart;
    const cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertAndLog(cart?.endDate, "2024-08-23", "Cart endDate is correct (Friday)");

    // Try creating a cart for a non-Sunday date
    const nonSundayCartResult = await menuManager.createCart({
      startDate: "2024-08-19", // Monday
    });
    assertAndLog(
      "error" in nonSundayCartResult,
      true,
      "Creating cart for non-Sunday should fail",
    );

    // Try creating a cart for a date where a cart already exists
    const duplicateCartResult = await menuManager.createCart({
      startDate: "2024-08-18",
    });
    assertAndLog(
      "error" in duplicateCartResult,
      true,
      "Creating duplicate cart for same startDate should fail",
    );

    // Add Breakfast Menu to the cart
    await menuManager.addMenuToCart({ cart: cartId, menu: breakfastMenuId });
    let updatedCart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertAndLog(
      updatedCart?.weeklyCost,
      expectedOmeletteCost,
      "Cart weekly cost should match Breakfast Menu cost",
    );

    // Add Dinner Menu (Monday) to the cart
    await menuManager.addMenuToCart({ cart: cartId, menu: dinnerMenuId });
    updatedCart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    const expectedTotalCartCost = parseFloat(
      (expectedOmeletteCost + expectedBreadCost).toFixed(2),
    );
    assertAndLog(
      updatedCart?.weeklyCost,
      expectedTotalCartCost,
      "Cart weekly cost should be sum of both menus",
    );

    // Try adding Breakfast Menu again (should fail as a menu for that date is already in cart)
    const addDuplicateMenuResult = await menuManager.addMenuToCart({
      cart: cartId,
      menu: breakfastMenuId,
    });
    assertAndLog(
      "error" in addDuplicateMenuResult,
      true,
      "Adding menu with existing date to cart should fail",
    );

    // Try adding a non-existent menu (should fail)
    const addNonExistentMenuResult = await menuManager.addMenuToCart({
      cart: cartId,
      menu: "menu:fake" as ID,
    });
    assertAndLog(
      "error" in addNonExistentMenuResult,
      true,
      "Adding non-existent menu to cart should fail",
    );
  });

  await t.step(printStepHeader("Part 4: `adjustRecipeScale` and `adjustItemQuantity` (via Cart)"), async () => {
    // Adjust Omelette scaling factor to 2.0 via cart
    await menuManager.adjustRecipeScale({
      cart: cartId,
      menu: breakfastMenuId,
      recipe: omeletteRecipeId,
      scalingFactor: 2.0,
    });

    let omeletteRecipe = await db.collection("MenuManager.recipes").findOne({
      _id: omeletteRecipeId,
    });
    expectedOmeletteCost = await calculateExpectedRecipeCost(
      db,
      omeletteRecipe!.ingredients,
      2.0,
    );
    assertAndLog(
      omeletteRecipe?.dishPrice,
      expectedOmeletteCost,
      "Omelette dish price should double after scaling",
    );

    let breakfastMenu = await db.collection("MenuManager.menus").findOne({
      _id: breakfastMenuId,
    });
    assertAndLog(
      breakfastMenu?.menuCost,
      expectedOmeletteCost,
      "Breakfast menu cost should update after recipe scaling",
    );

    let cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    const expectedCartCostAfterOmeletteScale = parseFloat(
      (expectedOmeletteCost + expectedBreadCost).toFixed(2),
    );
    assertAndLog(
      cart?.weeklyCost,
      expectedCartCostAfterOmeletteScale,
      "Cart weekly cost should update after recipe scaling",
    );

    // Try adjusting recipe scale with negative value (should fail)
    const negativeScaleAdjustResult = await menuManager.adjustRecipeScale({
      cart: cartId,
      menu: breakfastMenuId,
      recipe: omeletteRecipeId,
      scalingFactor: -0.5,
    });
    assertAndLog(
      "error" in negativeScaleAdjustResult,
      true,
      "Adjusting recipe scale with negative value should fail",
    );

    // Update the base quantity of flour (used in Bread) via adjustItemQuantity
    const oldFlourQuantity = currentItemDetails[flourItemId].quantity;
    const newFlourBaseQuantity = oldFlourQuantity * 2; // Double base quantity (halves unit price)
    await menuManager.adjustItemQuantity({
      cart: cartId,
      menu: dinnerMenuId,
      item: flourItemId,
      quantity: newFlourBaseQuantity,
    });
    currentItemDetails[flourItemId].quantity = newFlourBaseQuantity; // Update expected

    let breadRecipe = await db.collection("MenuManager.recipes").findOne({
      _id: breadRecipeId,
    });
    expectedBreadCost = await calculateExpectedRecipeCost(
      db,
      breadRecipe!.ingredients,
      breadRecipe!.scalingFactor,
    );
    assertAndLog(
      breadRecipe?.dishPrice,
      expectedBreadCost,
      "Bread dish price should update after flour base quantity change",
    );

    let dinnerMenu = await db.collection("MenuManager.menus").findOne({
      _id: dinnerMenuId,
    });
    assertAndLog(
      dinnerMenu?.menuCost,
      expectedBreadCost,
      "Dinner menu cost should update after flour base quantity change",
    );

    cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    const expectedFinalCartCost = parseFloat(
      (expectedOmeletteCost + expectedBreadCost).toFixed(2),
    );
    assertAndLog(
      cart?.weeklyCost,
      expectedFinalCartCost,
      "Cart weekly cost should update after flour base quantity change",
    );

    // Try adjusting item quantity with zero or negative value (should fail)
    const zeroQuantityAdjustResult = await menuManager.adjustItemQuantity({
      cart: cartId,
      menu: dinnerMenuId,
      item: flourItemId,
      quantity: 0,
    });
    assertAndLog(
      "error" in zeroQuantityAdjustResult,
      true,
      "Adjusting item quantity to zero should fail",
    );

    // Try adjusting item quantity for an item not in menu (should fail)
    const notInMenuResult = await menuManager.adjustItemQuantity({
      cart: cartId,
      menu: dinnerMenuId,
      item: eggItemId, // Egg is in breakfast menu, not dinner
      quantity: 1,
    });
    assertAndLog(
      "error" in notInMenuResult,
      true,
      "Adjusting item quantity for item not used in menu should fail",
    );
  });

  await client.close();
});
```
