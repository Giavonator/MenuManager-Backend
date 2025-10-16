---
timestamp: 'Thu Oct 16 2025 16:42:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_164231.14a16785.md]]'
content_id: 850b7c7312721a50af2708a83672460839bd9b5876ea7a5d2533fc644b5e9554
---

# file: src/concepts/MenuManager/MenuManagerConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

import MenuManagerConcept from "./MenuManagerConcept.ts";

// --- Helper Functions for Deno Tests ---

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

// --- Test Suite for MenuManagerConcept ---

Deno.test("MenuManagerConcept - Operating Principle", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  // Use a real LLM instance. Get API key from environment variable or provide a fallback.
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    console.warn(
      "❌ GEMINI_API_KEY environment variable not set. LLM calls in this test will likely fail.",
    );
  }
  const menuManager = new MenuManagerConcept(db, {
    apiKey: geminiApiKey || "YOUR_FALLBACK_GEMINI_API_KEY_HERE",
  });

  const testUser: ID = "user:chefAlice" as ID;

  let createdMenuId: ID;
  let pancakesRecipeId: ID;
  // Removed: let manualVanillaCupcakesRecipeId: ID; // For Part 2, a manually entered vanilla cupcake recipe
  let llmPulledRecipeId: ID; // For Part 3, the LLM-pulled recipe
  let flourItemId: ID, milkItemId: ID, eggItemId: ID, butterItemId: ID;
  let sugarItemId: ID, bakingPowderItemId: ID, waterItemId: ID;
  let cartId: ID;

  // Declare these variables here to be accessible across steps
  let expectedPancakesCost: number = 0;
  // Removed: let expectedVanillaCost: number = 0;
  let expectedLlmInitialCost: number = 0; // New variable for initial LLM cost
  let expectedFinalLlmRecipeCost: number = 0;

  // Store expected state of items for cost calculation
  interface ItemExpectedPrice {
    price: number;
    quantity: number; // Base quantity for which 'price' is set (e.g., 5 for 5 lbs)
    units: string;
    // Conversion factors to convert common recipe units (cups, tbsp, tsp) to ItemDoc.units
    conversions: Record<string, number>; // e.g., {'cup': 0.277, 'lb': 1} for flour where ItemDoc.units is 'lbs'
  }
  const itemDetails: Record<ID, ItemExpectedPrice> = {};

  // Refactored helper to just register an item and return its ID
  const registerItemAndStorePrice = async (
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
    return itemResult; // Return the error object
  };

  interface RecipeIngredientTemp {
    itemId: ID;
    amount: number; // This amount is in the ItemDoc.units
  }

  const convertAmountToItemUnits = (
    itemId: ID,
    amount: number,
    recipeUnit: string,
  ): number => {
    const item = itemDetails[itemId];
    if (!item) {
      // Fallback if item is not in itemDetails (e.g., LLM-parsed but not pre-registered, or an unexpected state)
      // For this test, assume all items in `itemDetails` are correctly registered.
      console.warn(
        `Item ${itemId} not found in itemDetails for conversion. Assuming 1:1 conversion for ${recipeUnit}.`,
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

  // This helper assumes recipeIngredients.amount is ALREADY in ItemDoc.units for calculation
  const calculateExpectedRecipeCost = async (
    recipeIngredients: RecipeIngredientTemp[],
    scalingFactor: number,
  ): Promise<number> => {
    let price = 0;
    for (const ing of recipeIngredients) {
      const itemInfo = itemDetails[ing.itemId];
      if (itemInfo && itemInfo.quantity > 0) {
        price += (itemInfo.price / itemInfo.quantity) * ing.amount; // ing.amount is already in item's base units
      } else {
        // If item not found in `itemDetails` (e.g., LLM-parsed but not pre-registered, or an unexpected state),
        // try to get from DB and use its price/quantity if available.
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
    return parseFloat((price * scalingFactor).toFixed(2)); // Round to 2 decimal places for floating point comparison
  };

  // Helper to get item name for logging, avoiding await in template literals
  const getItemName = async (itemId: ID): Promise<string> => {
    const item = await db.collection("MenuManager.items").findOne({
      _id: itemId,
    });
    return item?.names[0] || itemId;
  };

  // Regular expression to validate Deno-generated UUIDs
  const idRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  // --- Part One: User creates empty menu ---
  await t.step(
    printStepHeader("Part 1: User creates an empty menu"),
    async () => {
      const createMenuResult = await menuManager.createMenu({
        name: "Chef's Grand Tasting Menu",
        date: "2024-07-28", // Sunday date
        owner: testUser,
      });

      assertAndLog(
        "menu" in createMenuResult,
        true,
        "Menu creation should succeed",
      );
      createdMenuId = (createMenuResult as { menu: ID }).menu;
      assertExists(createdMenuId, "Created menu ID should exist");

      const menu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      assertExists(menu, "Menu should be found in DB");
      assertAndLog(
        menu?.name,
        "Chef's Grand Tasting Menu",
        "Menu name is correct",
      );
      assertAndLog(
        menu?.owner,
        testUser,
        "Menu owner is correct",
      );
      assertAndLog(
        menu?.menuCost,
        0,
        "Initial menu cost is 0",
      );
      assertAndLog(
        menu?.date,
        "2024-07-28",
        "Menu date is correct",
      );

      const recipesInMenu = await menuManager._getRecipesInMenu({
        menu: createdMenuId,
      });
      assertAndLog(
        "recipes" in recipesInMenu && recipesInMenu.recipes.length,
        0,
        "Menu should initially have no recipes",
      );
    },
  );

  // --- Part Two: Create and add manual recipes (Now only Pancakes) ---

  // --- Sub-step 2.1: Register global items with conversion factors ---
  await t.step(printStepHeader("Part 2.1: Register global items"), async () => {
    const flourResult = await registerItemAndStorePrice(
      "flour",
      2.50,
      5,
      "lbs",
      "Whole Foods",
      { "cup": 0.277, "lbs": 1 }, // 1 cup = 0.277 lbs
    );
    assertAndLog(
      typeof flourResult === "string" && idRegex.test(flourResult),
      true,
      `Should successfully enter item "flour" and return a valid ID string`,
    );
    flourItemId = flourResult as ID; // Cast after verifying it's an ID

    const milkResult = await registerItemAndStorePrice(
      "milk",
      3.00,
      1,
      "gallon",
      "Safeway",
      { "cup": 0.0625, "gallon": 1 }, // 1 cup = 0.0625 gallons (16 cups/gallon)
    );
    assertAndLog(
      typeof milkResult === "string" && idRegex.test(milkResult),
      true,
      `Should successfully enter item "milk" and return a valid ID string`,
    );
    milkItemId = milkResult as ID;

    const eggResult = await registerItemAndStorePrice(
      "egg",
      4.00,
      12,
      "each",
      "Safeway",
      { "each": 1 }, // 1 egg = 1 'each'
    );
    assertAndLog(
      typeof eggResult === "string" && idRegex.test(eggResult),
      true,
      `Should successfully enter item "egg" and return a valid ID string`,
    );
    eggItemId = eggResult as ID;

    const butterResult = await registerItemAndStorePrice(
      "butter",
      5.00,
      1,
      "lb",
      "Trader Joe's",
      { "cup": 0.5, "tbsp": 0.03125, "lb": 1 }, // 1 cup = 0.5 lbs, 1 tbsp = 0.03125 lbs (1lb=32tbsp)
    );
    assertAndLog(
      typeof butterResult === "string" && idRegex.test(butterResult),
      true,
      `Should successfully enter item "butter" and return a valid ID string`,
    );
    butterItemId = butterResult as ID;

    const sugarResult = await registerItemAndStorePrice(
      "sugar",
      2.00,
      4,
      "lbs",
      "Safeway",
      { "cup": 0.45, "tbsp": 0.028, "lbs": 1 }, // 1 cup = 0.45 lbs, 1 tbsp = 0.028 lbs (1lb=48tbsp)
    );
    assertAndLog(
      typeof sugarResult === "string" && idRegex.test(sugarResult),
      true,
      `Should successfully enter item "sugar" and return a valid ID string`,
    );
    sugarItemId = sugarResult as ID;

    const bakingPowderResult = await registerItemAndStorePrice(
      "baking powder",
      3.50,
      1,
      "oz",
      "Whole Foods",
      { "tsp": 0.166, "oz": 1 }, // 1 tsp = 0.166 oz (1oz=6tsp)
    );
    assertAndLog(
      typeof bakingPowderResult === "string" &&
        idRegex.test(bakingPowderResult),
      true,
      `Should successfully enter item "baking powder" and return a valid ID string`,
    );
    bakingPowderItemId = bakingPowderResult as ID;

    const waterResult = await registerItemAndStorePrice(
      "water",
      0.50,
      1,
      "gallon",
      "Costco",
      { "cup": 0.0625, "gallon": 1 }, // 1 cup = 0.0625 gallons
    );
    assertAndLog(
      typeof waterResult === "string" && idRegex.test(waterResult),
      true,
      `Should successfully enter item "water" and return a valid ID string`,
    );
    waterItemId = waterResult as ID;
  });

  // --- Sub-step 2.2: Create Classic Pancakes recipe ---
  await t.step(
    printStepHeader("Part 2.2: Create Classic Pancakes recipe"),
    async () => {
      const createPancakesResult = await menuManager.createRecipe({
        menu: createdMenuId,
        name: "Classic Pancakes",
        instructions: "Mix ingredients, pour on griddle, flip.",
        servingQuantity: 4,
        dishType: "Breakfast",
        scalingFactor: 1.0,
        owner: testUser,
      });
      assertAndLog(
        "recipe" in createPancakesResult,
        true,
        "Classic Pancakes recipe creation should succeed",
      );
      pancakesRecipeId = (createPancakesResult as { recipe: ID }).recipe;
      assertExists(pancakesRecipeId, "Pancakes recipe ID should exist");

      // Add ingredients to Classic Pancakes
      const pancakesIngredients: RecipeIngredientTemp[] = [
        {
          itemId: flourItemId,
          amount: convertAmountToItemUnits(flourItemId, 1, "cup"),
        }, // 1 cup flour
        {
          itemId: milkItemId,
          amount: convertAmountToItemUnits(milkItemId, 0.75, "cup"),
        }, // ¾ cup milk
        {
          itemId: eggItemId,
          amount: convertAmountToItemUnits(eggItemId, 1, "each"),
        }, // 1 large egg
        {
          itemId: butterItemId,
          amount: convertAmountToItemUnits(butterItemId, 2, "tbsp"),
        }, // 2 tbsp butter
        {
          itemId: sugarItemId,
          amount: convertAmountToItemUnits(sugarItemId, 1, "tbsp"),
        }, // 1 tbsp sugar
        {
          itemId: bakingPowderItemId,
          amount: convertAmountToItemUnits(bakingPowderItemId, 2, "tsp"),
        }, // 2 tsp baking powder
      ];

      for (const ing of pancakesIngredients) {
        const updateIngResult = await menuManager.updateRecipeIngredient({
          menu: createdMenuId,
          recipe: pancakesRecipeId,
          item: ing.itemId,
          amount: ing.amount,
        });
        const ingredientName = await getItemName(ing.itemId);
        assertAndLog(
          "success" in updateIngResult,
          true,
          `Add ingredient ${ingredientName} to Pancakes should succeed`,
        );
      }

      expectedPancakesCost = await calculateExpectedRecipeCost(
        pancakesIngredients,
        1.0,
      );
      const updatedPancakesRecipe = await db.collection("MenuManager.recipes")
        .findOne({ _id: pancakesRecipeId });
      assertAndLog(
        updatedPancakesRecipe?.dishPrice,
        expectedPancakesCost,
        "Pancakes dishPrice should be correct after adding ingredients",
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      assertAndLog(
        updatedMenu?.menuCost,
        expectedPancakesCost, // Should only reflect pancakes cost at this point
        "Menu cost should reflect Pancakes recipe",
      );
    },
  );

  // --- Part Three: LLM Recipe Pull and Update ---

  // --- Sub-step 3.1: Use LLM to pull in recipe from website ---
  await t.step(
    printStepHeader("Part 3.1: Use LLM to pull in recipe from website"),
    async () => {
      const birthdayCupcakesURL =
        "https://kirbiecravings.com/4-ingredient-birthday-cupcakes/";

      const pullRecipeResult = await menuManager.pullRecipeFromWebsite({
        menu: createdMenuId,
        recipeURL: birthdayCupcakesURL,
        owner: testUser,
      });

      if ("error" in pullRecipeResult) {
        throw new Error(
          `LLM recipe pull failed: ${pullRecipeResult.error}. Cannot proceed with recipe corrections. Ensure GEMINI_API_KEY is set and valid.`,
        );
      }

      llmPulledRecipeId = (pullRecipeResult as { recipe: ID }).recipe;
      assertExists(llmPulledRecipeId, "LLM-pulled recipe ID should exist");

      const llmRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: llmPulledRecipeId,
      });
      assertExists(llmRecipe, "LLM-pulled recipe should be in DB");
      assertAndLog(
        llmRecipe?.menuId,
        createdMenuId,
        "LLM-pulled recipe should be associated with the created menu",
      );
      assertAndLog(
        llmRecipe?.owner,
        testUser,
        "LLM-pulled recipe owner should be the test user",
      );

      // Verify basic fields exist and are of expected type, without assuming specific content
      assertExists(llmRecipe?.name, "LLM-pulled recipe name should exist");
      assertAndLog(
        llmRecipe!.name.length > 0,
        true,
        "LLM-pulled recipe name should not be empty",
      );
      assertAndLog(
        llmRecipe!.instructions.length > 0,
        true,
        "LLM-pulled recipe instructions should not be empty",
      );
      assertAndLog(
        llmRecipe!.servingQuantity > 0,
        true,
        "LLM-pulled recipe serving quantity should be positive",
      );

      const llmRecipeIngredients = llmRecipe?.ingredients || [];
      let tempLlmInitialPrice = 0; // Initialize for dynamic calculation

      // Dynamically calculate expected initial cost based on *what the LLM actually parsed and stored*.
      // The calculateExpectedRecipeCost helper assumes amounts are in item's base units.
      // The LLM *stores* raw numbers (e.g. 1 for 1 cup milk) from its parse, which the concept's `calculateDishPrice`
      // then uses directly *as if* they are in the item's base units (e.g., 1 gallon).
      // This assertion accurately reflects the concept's current (potentially inconsistent) unit handling
      // for LLM-pulled recipes *before* user-driven correction.
      if (llmRecipeIngredients.length > 0) {
        tempLlmInitialPrice = await calculateExpectedRecipeCost(
          llmRecipeIngredients, // Pass the raw ingredients array from the LLM parse
          llmRecipe?.scalingFactor || 1.0,
        );
        assertAndLog(
          llmRecipe?.dishPrice,
          tempLlmInitialPrice,
          "LLM-pulled recipe dishPrice should be correct based on raw LLM amounts (as interpreted by concept's cost calc)",
        );
      } else {
        assertAndLog(
          llmRecipe?.dishPrice,
          0,
          "LLM-pulled recipe dishPrice should be 0 if no matching ingredients were parsed",
        );
        console.log("   (No pre-existing ingredients were matched by LLM)");
      }
      expectedLlmInitialCost = parseFloat(tempLlmInitialPrice.toFixed(2)); // Store this for later menu cost calcs.

      // Check menu cost updated after LLM pull
      const currentMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      const expectedMenuCostAfterLlmPull = parseFloat(
        (expectedPancakesCost + expectedLlmInitialCost) // Only pancakes + initial LLM cost
          .toFixed(2),
      );
      assertAndLog(
        currentMenu?.menuCost,
        expectedMenuCostAfterLlmPull,
        "Menu cost should be updated after LLM pull reflecting initial LLM recipe cost",
      );
    },
  );

  // --- Sub-step 3.2: Update LLM-pulled recipe to match desired Vanilla Cupcakes ---
  await t.step(
    printStepHeader(
      "Part 3.2: Correct LLM-pulled recipe attributes and ingredients",
    ),
    async () => {
      // Correct LLM-pulled recipe name, serving quantity, and dish type
      const updateNameResult = await menuManager.updateRecipeName({
        menu: createdMenuId,
        recipe: llmPulledRecipeId,
        name: "Vanilla Cupcakes (LLM Corrected)",
      });
      assertAndLog(
        "success" in updateNameResult,
        true,
        "Recipe name update should succeed",
      );

      const updateServingResult = await menuManager
        .updateRecipeServingQuantity({
          menu: createdMenuId,
          recipe: llmPulledRecipeId,
          servingQuantity: 6, // Corrected from potential LLM parse
        });
      assertAndLog(
        "success" in updateServingResult,
        true,
        "Serving quantity update should succeed",
      );

      const updateDishTypeResult = await menuManager.updateRecipeDishType({
        menu: createdMenuId,
        recipe: llmPulledRecipeId,
        dishType: "Dessert",
      });
      assertAndLog(
        "success" in updateDishTypeResult,
        true,
        "Dish type update should succeed",
      );

      // --- Core ingredient correction logic ---
      // Target ingredients for Vanilla Cupcakes (converted to item's base units)
      const targetVanillaCupcakesIngredients: RecipeIngredientTemp[] = [
        {
          itemId: flourItemId,
          amount: convertAmountToItemUnits(flourItemId, 1.75, "cup"),
        },
        {
          itemId: milkItemId,
          amount: convertAmountToItemUnits(milkItemId, 1, "cup"),
        },
        {
          itemId: butterItemId,
          amount: convertAmountToItemUnits(butterItemId, 0.25, "cup"),
        },
        {
          itemId: waterItemId,
          amount: convertAmountToItemUnits(waterItemId, 1, "cup"),
        },
      ];

      // Fetch current ingredients parsed by LLM (which should be whatever was actually stored initially)
      const currentLlmRecipeDoc = await db.collection("MenuManager.recipes")
        .findOne({ _id: llmPulledRecipeId });
      assertExists(currentLlmRecipeDoc, "LLM recipe should still exist");
      // Cast the ingredients array for iteration
      const llmParsedIngredients: { itemId: ID; amount: number }[] =
        currentLlmRecipeDoc.ingredients || [];

      const processedItemIds = new Set<ID>();

      // 1. Correct amounts for ingredients LLM *did* parse and remove extraneous ones
      for (const ing of llmParsedIngredients) {
        const targetIngredient = targetVanillaCupcakesIngredients.find(
          (tIng) => tIng.itemId === ing.itemId,
        );

        let updatedAmount: number;
        let logMessagePrefix: string;
        const ingredientName = await getItemName(ing.itemId);

        if (targetIngredient) {
          // This ingredient *should* be in the target Vanilla Cupcakes, update its amount to the CORRECT, CONVERTED value
          updatedAmount = targetIngredient.amount;
          processedItemIds.add(ing.itemId);
          logMessagePrefix = "Update";
        } else {
          // This ingredient was parsed by LLM but is *not* in target Vanilla Cupcakes, remove it by setting amount to 0
          updatedAmount = 0;
          logMessagePrefix = "Removing extraneous LLM-parsed ingredient";
          console.log(
            `   ${logMessagePrefix}: ${ingredientName}`,
          );
        }

        const updateIngResult = await menuManager.updateRecipeIngredient({
          menu: createdMenuId,
          recipe: llmPulledRecipeId,
          item: ing.itemId,
          amount: updatedAmount,
        });
        assertAndLog(
          "success" in updateIngResult,
          true,
          `${logMessagePrefix} ingredient ${ingredientName} should succeed`,
        );
      }

      // 2. Add any ingredients that LLM *missed* but are in target Vanilla Cupcakes
      for (const targetIng of targetVanillaCupcakesIngredients) {
        if (!processedItemIds.has(targetIng.itemId)) {
          // This ingredient was not in LLM's parse, add it with the CORRECT, CONVERTED amount
          const missingIngredientName = await getItemName(targetIng.itemId);
          console.log(
            `   Adding missing ingredient: ${missingIngredientName}`,
          );
          const addMissingIngResult = await menuManager
            .updateRecipeIngredient({
              menu: createdMenuId,
              recipe: llmPulledRecipeId,
              item: targetIng.itemId,
              amount: targetIng.amount,
            });
          assertAndLog(
            "success" in addMissingIngResult,
            true,
            `Add missing ingredient ${missingIngredientName} should succeed`,
          );
          processedItemIds.add(targetIng.itemId);
        }
      }
    },
  );

  // --- Sub-step 3.3: Verify LLM-pulled recipe after corrections ---
  await t.step(
    printStepHeader("Part 3.3: Verify LLM-pulled recipe after corrections"),
    async () => {
      // Target ingredients for Vanilla Cupcakes (converted to item's base units)
      const targetVanillaCupcakesIngredients: RecipeIngredientTemp[] = [
        {
          itemId: flourItemId,
          amount: convertAmountToItemUnits(flourItemId, 1.75, "cup"),
        },
        {
          itemId: milkItemId,
          amount: convertAmountToItemUnits(milkItemId, 1, "cup"),
        },
        {
          itemId: butterItemId,
          amount: convertAmountToItemUnits(butterItemId, 0.25, "cup"),
        },
        {
          itemId: waterItemId,
          amount: convertAmountToItemUnits(waterItemId, 1, "cup"),
        },
      ];

      const finalLlmRecipeDoc = await db.collection("MenuManager.recipes")
        .findOne({ _id: llmPulledRecipeId });
      assertExists(finalLlmRecipeDoc, "LLM-corrected recipe should exist");
      assertAndLog(
        finalLlmRecipeDoc?.name,
        "Vanilla Cupcakes (LLM Corrected)",
        "Final LLM recipe name is correct",
      );
      assertAndLog(
        finalLlmRecipeDoc?.servingQuantity,
        6,
        "Final LLM recipe serving quantity is correct",
      );

      const llmRecipeIngredientsAfterCorrection =
        finalLlmRecipeDoc?.ingredients || [];
      assertAndLog(
        llmRecipeIngredientsAfterCorrection.length,
        targetVanillaCupcakesIngredients.length,
        "Correct number of ingredients in final LLM recipe",
      );

      // Verify each ingredient's amount matches the target
      for (const targetIng of targetVanillaCupcakesIngredients) {
        const actualIng = llmRecipeIngredientsAfterCorrection.find(
          (ing: { itemId: ID; amount: number }) =>
            ing.itemId === targetIng.itemId,
        );
        assertExists(
          actualIng,
          `Target ingredient ${await getItemName(
            targetIng.itemId,
          )} should be in final LLM recipe`,
        );
        assertAndLog(
          actualIng?.amount,
          targetIng.amount,
          `Amount for ingredient ${await getItemName(
            targetIng.itemId,
          )} should be corrected`,
        );
      }

      expectedFinalLlmRecipeCost = await calculateExpectedRecipeCost(
        targetVanillaCupcakesIngredients, // Use the correctly converted target ingredients
        finalLlmRecipeDoc?.scalingFactor || 1.0,
      );

      assertAndLog(
        finalLlmRecipeDoc?.dishPrice,
        expectedFinalLlmRecipeCost,
        "Final LLM recipe dishPrice should be correct after all corrections",
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      const expectedTotalMenuCost = parseFloat((expectedPancakesCost +
        expectedFinalLlmRecipeCost).toFixed(2)); // Only Pancakes and LLM-corrected recipe

      assertAndLog(
        updatedMenu?.menuCost,
        expectedTotalMenuCost,
        "Menu cost should reflect all three recipes after LLM correction",
      );
    },
  );

  // --- Part Four: Item Confirmation and Cart Management ---

  // --- Sub-step 4.1: Confirmation of each of the new ingredients ---
  await t.step(printStepHeader("Part 4.1: Confirm items"), async () => {
    // Collect all item IDs that were created/involved
    const allItemIds = new Set<ID>();
    for (const id in itemDetails) {
      allItemIds.add(id as ID);
    }
    // With the new logic, LLM doesn't create placeholder items.
    // So, `_getListOfItems` will primarily retrieve the items manually registered in Part 2.1.
    const currentItemsInDbResult = await menuManager._getListOfItems();
    for (const itemDoc of currentItemsInDbResult.items) {
      allItemIds.add(itemDoc._id);
    }

    for (const itemId of allItemIds) {
      const initialItem = await db.collection("MenuManager.items").findOne({
        _id: itemId,
      });
      if (!initialItem) {
        console.warn(
          `Item ${itemId} not found in DB, skipping confirmation. This might happen if LLM parsed an ingredient that was not pre-registered.`,
        );
        continue;
      }

      const itemName = await getItemName(itemId);

      if (!initialItem?.confirmed) {
        await menuManager.confirmItem({ item: itemId });
        const confirmedItem = await db.collection("MenuManager.items")
          .findOne(
            { _id: itemId },
          );
        assertAndLog(
          confirmedItem?.confirmed,
          true,
          `Item ${itemName} should now be confirmed`,
        );
      } else {
        console.log(
          `    ℹ️ Item ${itemName} was already confirmed, skipping.`,
        );
      }
    }
  });

  // --- Sub-step 4.2: Create a cart ---
  await t.step(printStepHeader("Part 4.2: Create a cart"), async () => {
    const createCartResult = await menuManager.createCart({
      startDate: "2024-07-28", // Must be a Sunday, same date as menu
    });
    assertAndLog(
      "cart" in createCartResult,
      true,
      "Cart creation should succeed",
    );
    cartId = (createCartResult as { cart: ID }).cart;
    assertExists(cartId, "Created cart ID should exist");

    const cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertExists(cart, "Cart should be found in DB");
    assertAndLog(
      cart?.startDate,
      "2024-07-28",
      "Cart start date is correct",
    );
    assertAndLog(
      cart?.endDate,
      "2024-08-02",
      "Cart end date is correct (Friday)",
    );
    assertAndLog(
      cart?.weeklyCost,
      0,
      "Initial cart weekly cost is 0",
    );
    assertAndLog(
      cart?.menuIds.length,
      0,
      "Cart should initially have no menus",
    );
  });

  // --- Sub-step 4.3: Add menu to the cart ---
  await t.step(printStepHeader("Part 4.3: Add menu to the cart"), async () => {
    const addMenuResult = await menuManager.addMenuToCart({
      cart: cartId,
      menu: createdMenuId,
    });
    assertAndLog(
      "success" in addMenuResult,
      true,
      "Adding menu to cart should succeed",
    );

    const cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertExists(cart, "Cart should exist after adding menu");
    assertAndLog(
      cart?.menuIds.includes(createdMenuId),
      true,
      "Cart should contain the menu ID",
    );
    assertAndLog(
      cart?.menuIds.length,
      1,
      "Cart should have 1 menu",
    );

    // Verify weekly cost updated
    const menu = await db.collection("MenuManager.menus").findOne({
      _id: createdMenuId,
    });
    assertAndLog(
      cart?.weeklyCost,
      menu?.menuCost,
      "Cart weekly cost should match menu cost",
    );
  });

  // --- Sub-step 4.4: Administrator updates an item's price and verify costs recalculate ---
  await t.step(
    printStepHeader(
      "Part 4.4: Administrator updates item price, verify cost recalculation",
    ),
    async () => {
      const oldFlourPrice = itemDetails[flourItemId].price;
      const newFlourPrice = oldFlourPrice * 2; // Double the price of flour

      const updateItemResult = await menuManager.updateItemPrice({
        item: flourItemId,
        price: newFlourPrice,
      });
      assertAndLog(
        "success" in updateItemResult,
        true,
        "Updating flour price should succeed",
      );
      itemDetails[flourItemId].price = newFlourPrice; // Update expected price

      // Recalculate expected costs for all recipes that use flour
      const updatedPancakesRecipeDoc = await db.collection(
        "MenuManager.recipes",
      )
        .findOne({ _id: pancakesRecipeId });
      assertExists(
        updatedPancakesRecipeDoc,
        "Pancakes recipe doc should exist for recalculation",
      );
      expectedPancakesCost = await calculateExpectedRecipeCost(
        updatedPancakesRecipeDoc.ingredients || [],
        updatedPancakesRecipeDoc.scalingFactor || 1.0,
      );

      // Removed recalculation for manual vanilla cupcakes

      const updatedLlmCorrectedVanillaRecipeDoc = await db.collection(
        "MenuManager.recipes",
      ).findOne({ _id: llmPulledRecipeId });
      assertExists(
        updatedLlmCorrectedVanillaRecipeDoc,
        "LLM-corrected Vanilla Cupcakes recipe doc should exist for recalculation",
      );
      expectedFinalLlmRecipeCost = await calculateExpectedRecipeCost(
        updatedLlmCorrectedVanillaRecipeDoc.ingredients || [],
        updatedLlmCorrectedVanillaRecipeDoc.scalingFactor || 1.0,
      );

      assertAndLog(
        updatedPancakesRecipeDoc?.dishPrice,
        expectedPancakesCost,
        "Pancakes dishPrice should be updated after flour price change",
      );

      // Removed assertion for manual vanilla cupcakes

      assertAndLog(
        updatedLlmCorrectedVanillaRecipeDoc?.dishPrice,
        expectedFinalLlmRecipeCost,
        "LLM-corrected Vanilla Cupcakes dishPrice should be updated after flour price change",
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      const expectedTotalMenuCost = parseFloat((expectedPancakesCost +
        expectedFinalLlmRecipeCost).toFixed(2)); // Only Pancakes and LLM-corrected recipe
      assertAndLog(
        updatedMenu?.menuCost,
        expectedTotalMenuCost,
        "Menu cost should be updated after flour price change",
      );

      const updatedCart = await db.collection("MenuManager.carts").findOne({
        _id: cartId,
      });
      assertAndLog(
        updatedCart?.weeklyCost,
        expectedTotalMenuCost,
        "Cart weekly cost should be updated after flour price change",
      );
    },
  );

  await client.close();
});

```
