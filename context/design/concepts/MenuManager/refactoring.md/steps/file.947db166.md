---
timestamp: 'Thu Oct 16 2025 12:33:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_123340.11d94047.md]]'
content_id: 947db16650b6e7cf7a8156f414c2c1b174bdafcf5ac6b46819c297d213edb939
---

# file: src/concepts/MenuManager/MenuManagerConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

import MenuManagerConcept from "./MenuManagerConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// --- Helper Functions for Deno Tests ---

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
    console.error(
      `      Error in "${stepMessage}" (Check ${checkIndex}): ${message}`,
    );
    throw e; // Re-throw the error so Deno.test still registers it as a failure
  }
}

// Helper function to print a Deno test header
function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

// Helper function to print a test step header
function printStepHeader(stepMessage: string) {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
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
  let manualVanillaCupcakesRecipeId: ID; // For Part 2, a manually entered vanilla cupcake recipe
  let llmPulledRecipeId: ID; // For Part 3, the LLM-pulled recipe
  let flourItemId: ID, milkItemId: ID, eggItemId: ID, butterItemId: ID;
  let sugarItemId: ID, bakingPowderItemId: ID, waterItemId: ID;
  let cartId: ID;

  // Declare these variables here to be accessible across steps
  let expectedPancakesCost: number = 0;
  let expectedVanillaCost: number = 0;
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
    amount: number;
  }

  const convertAmountToItemUnits = (
    itemId: ID,
    amount: number,
    recipeUnit: string,
  ): number => {
    const item = itemDetails[itemId];
    if (!item) {
      // Fallback if item is not in itemDetails (e.g., LLM created placeholder)
      // Attempt to find it in DB, if not, warn and return amount.
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
        // If item not found in `itemDetails` (e.g., a placeholder from LLM),
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

  // --- Part One: User creates empty menu ---
  await t.step("Part 1: User creates an empty menu", async () => {
    const stepMessage = "Part 1: User creates an empty menu";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const createMenuResult = await menuManager.createMenu({
      name: "Chef's Grand Tasting Menu",
      date: "2024-07-28", // Sunday date
      owner: testUser,
    });

    assertAndLog(
      "menu" in createMenuResult,
      true,
      "Menu creation should succeed",
      stepMessage,
      ++checkIndex,
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
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      menu?.owner,
      testUser,
      "Menu owner is correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      menu?.menuCost,
      0,
      "Initial menu cost is 0",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      menu?.date,
      "2024-07-28",
      "Menu date is correct",
      stepMessage,
      ++checkIndex,
    );

    const recipesInMenu = await menuManager._getRecipesInMenu({
      menu: createdMenuId,
    });
    assertAndLog(
      "recipes" in recipesInMenu && recipesInMenu.recipes.length,
      0,
      "Menu should initially have no recipes",
      stepMessage,
      ++checkIndex,
    );
  });

  // --- Part Two: Create and add manual recipes ---

  // --- Sub-step 2.1: Register items with conversion factors ---
  await t.step("Part 2.1: Register global items", async () => {
    const stepMessage = "Part 2.1: Register global items";
    printStepHeader(stepMessage);
    let checkIndex = 0; // Local checkIndex for this sub-step

    // Conversions: Recipe Unit to ItemDoc.units (e.g., cup to lbs)
    const flourResult = await registerItemAndStorePrice(
      "flour",
      2.50,
      5,
      "lbs",
      "Whole Foods",
      { "cup": 0.277, "lbs": 1 }, // 1 cup = 0.277 lbs
    );
    assertAndLog(
      typeof flourResult !== "string" && "item" in (flourResult as any), // Check for 'item' property
      true,
      `Should successfully enter item "flour"`,
      stepMessage,
      ++checkIndex,
    );
    flourItemId = flourResult as ID; // Cast after checking it's an ID

    const milkResult = await registerItemAndStorePrice(
      "milk",
      3.00,
      1,
      "gallon",
      "Safeway",
      { "cup": 0.0625, "gallon": 1 }, // 1 cup = 0.0625 gallons (16 cups/gallon)
    );
    assertAndLog(
      typeof milkResult !== "string" && "item" in (milkResult as any),
      true,
      `Should successfully enter item "milk"`,
      stepMessage,
      ++checkIndex,
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
      typeof eggResult !== "string" && "item" in (eggResult as any),
      true,
      `Should successfully enter item "egg"`,
      stepMessage,
      ++checkIndex,
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
      typeof butterResult !== "string" && "item" in (butterResult as any),
      true,
      `Should successfully enter item "butter"`,
      stepMessage,
      ++checkIndex,
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
      typeof sugarResult !== "string" && "item" in (sugarResult as any),
      true,
      `Should successfully enter item "sugar"`,
      stepMessage,
      ++checkIndex,
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
      typeof bakingPowderResult !== "string" &&
        "item" in (bakingPowderResult as any),
      true,
      `Should successfully enter item "baking powder"`,
      stepMessage,
      ++checkIndex,
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
      typeof waterResult !== "string" && "item" in (waterResult as any),
      true,
      `Should successfully enter item "water"`,
      stepMessage,
      ++checkIndex,
    );
    waterItemId = waterResult as ID;
  });

  // --- Sub-step 2.2: Create Classic Pancakes recipe ---
  await t.step("Part 2.2: Create Classic Pancakes recipe", async () => {
    const stepMessage = "Part 2.2: Create Classic Pancakes recipe";
    printStepHeader(stepMessage);
    let checkIndex = 0;

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
      stepMessage,
      ++checkIndex,
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
      // FIX: Extract await from message string
      const ingredientName = await getItemName(ing.itemId);
      assertAndLog(
        "success" in updateIngResult,
        true,
        `Add ingredient ${ingredientName} to Pancakes should succeed`,
        stepMessage,
        ++checkIndex,
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
      stepMessage,
      ++checkIndex,
    );

    const updatedMenu = await db.collection("MenuManager.menus").findOne({
      _id: createdMenuId,
    });
    assertAndLog(
      updatedMenu?.menuCost,
      expectedPancakesCost, // Should only reflect pancakes cost at this point
      "Menu cost should reflect Pancakes recipe",
      stepMessage,
      ++checkIndex,
    );
  });

  // --- Sub-step 2.3: Create Vanilla Cupcakes recipe (manual) ---
  await t.step(
    "Part 2.3: Create Vanilla Cupcakes recipe (manual)",
    async () => {
      const stepMessage = "Part 2.3: Create Vanilla Cupcakes recipe (manual)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const createVanillaResult = await menuManager.createRecipe({
        menu: createdMenuId,
        name: "Vanilla Cupcakes (Manual)",
        instructions: "Standard cupcake baking instructions.",
        servingQuantity: 6,
        dishType: "Dessert",
        scalingFactor: 1.0,
        owner: testUser,
      });
      assertAndLog(
        "recipe" in createVanillaResult,
        true,
        "Vanilla Cupcakes (Manual) recipe creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      manualVanillaCupcakesRecipeId = (
        createVanillaResult as { recipe: ID }
      ).recipe;
      assertExists(
        manualVanillaCupcakesRecipeId,
        "Manual Vanilla Cupcakes recipe ID should exist",
      );

      // Add ingredients for Vanilla Cupcakes (Recipe #2)
      const vanillaCupcakesIngredients: RecipeIngredientTemp[] = [
        {
          itemId: flourItemId,
          amount: convertAmountToItemUnits(flourItemId, 1.75, "cup"),
        }, // 1 3/4 cup flour
        {
          itemId: milkItemId,
          amount: convertAmountToItemUnits(milkItemId, 1, "cup"),
        }, // 1 cup milk
        {
          itemId: butterItemId,
          amount: convertAmountToItemUnits(butterItemId, 0.25, "cup"),
        }, // ¼ cup butter
        {
          itemId: waterItemId,
          amount: convertAmountToItemUnits(waterItemId, 1, "cup"),
        }, // 1 cup water
      ];

      for (const ing of vanillaCupcakesIngredients) {
        const updateIngResult = await menuManager.updateRecipeIngredient({
          menu: createdMenuId,
          recipe: manualVanillaCupcakesRecipeId,
          item: ing.itemId,
          amount: ing.amount,
        });
        // FIX: Extract await from message string
        const ingredientName = await getItemName(ing.itemId);
        assertAndLog(
          "success" in updateIngResult,
          true,
          `Add ingredient ${ingredientName} to Vanilla Cupcakes (Manual) should succeed`,
          stepMessage,
          ++checkIndex,
        );
      }

      expectedVanillaCost = await calculateExpectedRecipeCost(
        vanillaCupcakesIngredients,
        1.0,
      );
      const updatedVanillaRecipe = await db.collection("MenuManager.recipes")
        .findOne({ _id: manualVanillaCupcakesRecipeId });
      assertAndLog(
        updatedVanillaRecipe?.dishPrice,
        expectedVanillaCost,
        "Vanilla Cupcakes (Manual) dishPrice should be correct after adding ingredients",
        stepMessage,
        ++checkIndex,
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      assertAndLog(
        updatedMenu?.menuCost,
        parseFloat((expectedPancakesCost + expectedVanillaCost).toFixed(2)),
        "Menu cost should reflect both recipes",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  // --- Part Three: LLM Recipe Pull and Update ---

  // --- Sub-step 3.1: Use LLM to pull in recipe from website ---
  await t.step("Part 3.1: Use LLM to pull in recipe from website", async () => {
    const stepMessage = "Part 3.1: Use LLM to pull in recipe from website";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const birthdayCupcakesURL =
      "https://kirbiecravings.com/4-ingredient-birthday-cupcakes/";

    const pullRecipeResult = await menuManager.pullRecipeFromWebsite({
      menu: createdMenuId,
      recipeURL: birthdayCupcakesURL,
      owner: testUser,
    });

    if ("error" in pullRecipeResult) {
      console.warn(
        `⚠️ LLM recipe pull returned an error: ${pullRecipeResult.error}. This step will proceed, but subsequent checks might reflect this. Ensure GEMINI_API_KEY is set and valid.`,
      );
      // For testing robustness, we make this a critical check for the test to continue.
      // If the LLM call itself fails, there's no recipe to correct, so we explicitly fail.
      assertAndLog(
        "recipe" in pullRecipeResult,
        true,
        "LLM recipe pull should succeed to create a recipe (even with potential parsing issues)",
        stepMessage,
        ++checkIndex,
      );
      throw new Error(
        "LLM recipe pull failed, cannot proceed with recipe corrections.",
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
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      llmRecipe?.owner,
      testUser,
      "LLM-pulled recipe owner should be the test user",
      stepMessage,
      ++checkIndex,
    );

    console.log(
      `🤖 LLM-pulled recipe name: "${llmRecipe?.name}", serving: ${llmRecipe?.servingQuantity}, type: ${llmRecipe?.dishType}`,
    );
    console.log(`🤖 LLM-parsed initial ingredients:`);
    for (const ing of llmRecipe?.ingredients || []) {
      // FIX: Extract await from console.log message string
      const itemName = await getItemName(ing.itemId);
      console.log(`   - ${itemName}: ${ing.amount}`);
    }

    // Check menu cost updated after LLM pull (value will vary based on LLM output)
    const currentMenu = await db.collection("MenuManager.menus").findOne({
      _id: createdMenuId,
    });
    assertExists(
      currentMenu?.menuCost,
      "Menu cost should be updated after LLM pull",
    );
  });

  // --- Sub-step 3.2: Update LLM-pulled recipe to match Recipe #2 (Vanilla Cupcakes) ---
  await t.step(
    "Part 3.2: Update LLM-pulled recipe to match Recipe #2",
    async () => {
      const stepMessage =
        "Part 3.2: Update LLM-pulled recipe to match Recipe #2";
      printStepHeader(stepMessage);
      let checkIndex = 0;

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
        stepMessage,
        ++checkIndex,
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
        stepMessage,
        ++checkIndex,
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
        stepMessage,
        ++checkIndex,
      );

      // --- Core ingredient correction logic ---
      // Target ingredients for Recipe #2 (converted to item's base units)
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

      // Fetch current ingredients parsed by LLM
      const currentLlmRecipeDoc = await db.collection("MenuManager.recipes")
        .findOne({ _id: llmPulledRecipeId });
      assertExists(currentLlmRecipeDoc, "LLM recipe should still exist");
      const llmParsedIngredients: RecipeIngredientTemp[] =
        currentLlmRecipeDoc.ingredients || []; // Explicitly ensure type

      const processedItemIds = new Set<ID>();

      // 1. Correct amounts for ingredients LLM *did* parse and remove extraneous ones
      for (const ing of llmParsedIngredients) {
        const targetIngredient = targetVanillaCupcakesIngredients.find(
          (tIng) => tIng.itemId === ing.itemId,
        );

        let updatedAmount: number;
        let logMessagePrefix: string;
        // FIX: Extract await from console.log message string
        const ingredientName = await getItemName(ing.itemId);

        if (targetIngredient) {
          // This ingredient *should* be in Recipe #2, update its amount
          updatedAmount = targetIngredient.amount;
          processedItemIds.add(ing.itemId);
          logMessagePrefix = "Update";
        } else {
          // This ingredient was parsed by LLM but is *not* in Recipe #2, remove it
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
          stepMessage,
          ++checkIndex,
        );
      }

      // 2. Add any ingredients that LLM *missed* but are in Recipe #2
      for (const targetIng of targetVanillaCupcakesIngredients) {
        if (!processedItemIds.has(targetIng.itemId)) {
          // This ingredient was not in LLM's parse, add it
          // FIX: Extract await from console.log message string
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
            stepMessage,
            ++checkIndex,
          );
          processedItemIds.add(targetIng.itemId);
        }
      }

      // Final verification of ingredients and costs for LLM-corrected recipe
      const finalLlmRecipeDoc = await db.collection("MenuManager.recipes")
        .findOne({ _id: llmPulledRecipeId });
      assertExists(finalLlmRecipeDoc, "LLM-corrected recipe should exist");
      assertAndLog(
        finalLlmRecipeDoc?.name,
        "Vanilla Cupcakes (LLM Corrected)",
        "Final LLM recipe name is correct",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        finalLlmRecipeDoc?.servingQuantity,
        6,
        "Final LLM recipe serving quantity is correct",
        stepMessage,
        ++checkIndex,
      );

      const llmRecipeIngredients = finalLlmRecipeDoc?.ingredients || [];
      assertAndLog(
        llmRecipeIngredients.length,
        targetVanillaCupcakesIngredients.length,
        "Correct number of ingredients in final LLM recipe",
        stepMessage,
        ++checkIndex,
      );

      // Verify each ingredient's amount matches the target
      for (const targetIng of targetVanillaCupcakesIngredients) {
        const actualIng = llmRecipeIngredients.find(
          (ing: RecipeIngredientTemp) => ing.itemId === targetIng.itemId,
        );
        assertExists(
          actualIng,
          `Target ingredient ${targetIng.itemId} should be in final LLM recipe`,
        );
        assertAndLog(
          actualIng?.amount,
          targetIng.amount,
          `Amount for ingredient ${targetIng.itemId} should be corrected`,
          stepMessage,
          ++checkIndex,
        );
      }

      expectedFinalLlmRecipeCost = await calculateExpectedRecipeCost(
        finalLlmRecipeDoc?.ingredients || [],
        finalLlmRecipeDoc?.scalingFactor || 1.0,
      );

      assertAndLog(
        finalLlmRecipeDoc?.dishPrice,
        expectedFinalLlmRecipeCost,
        "Final LLM recipe dishPrice should be correct after all corrections",
        stepMessage,
        ++checkIndex,
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      const expectedTotalMenuCost = parseFloat((expectedPancakesCost +
        expectedVanillaCost + expectedFinalLlmRecipeCost).toFixed(2));

      assertAndLog(
        updatedMenu?.menuCost,
        expectedTotalMenuCost,
        "Menu cost should reflect all three recipes after LLM correction",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  // --- Part Four: Item Confirmation and Cart Management ---

  // --- Sub-step 4.1: Confirmation of each of the new ingredients ---
  await t.step("Part 4.1: Confirm items", async () => {
    const stepMessage = "Part 4.1: Confirm items";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // Collect all item IDs that were created/involved
    const allItemIds = new Set<ID>();
    for (const id in itemDetails) {
      allItemIds.add(id as ID);
    }
    // Also include any placeholder items LLM might have created and that were not removed
    const currentItemsInDb = await menuManager._getListOfItems();
    for (const itemDoc of currentItemsInDb.items) {
      allItemIds.add(itemDoc._id);
    }

    for (const itemId of allItemIds) {
      const initialItem = await db.collection("MenuManager.items").findOne({
        _id: itemId,
      });
      if (!initialItem) {
        console.warn(
          `Item ${itemId} not found in DB, skipping confirmation.`,
        );
        continue;
      }

      const itemName = await getItemName(itemId); // FIX: Pre-resolve item name

      if (!initialItem?.confirmed) {
        const confirmResult = await menuManager.confirmItem({ item: itemId });
        assertAndLog(
          "item" in confirmResult,
          true,
          `Confirm item ${itemName} should succeed`,
          stepMessage,
          ++checkIndex,
        );
        const confirmedItem = await db.collection("MenuManager.items")
          .findOne(
            { _id: itemId },
          );
        assertAndLog(
          confirmedItem?.confirmed,
          true,
          `Item ${itemName} should now be confirmed`,
          stepMessage,
          ++checkIndex,
        );
      } else {
        // FIX: Pre-resolve item name for console.log
        console.log(
          `    ℹ️ Item ${itemName} was already confirmed, skipping.`,
        );
      }
    }
  });

  // --- Sub-step 4.2: Create a cart ---
  await t.step("Part 4.2: Create a cart", async () => {
    const stepMessage = "Part 4.2: Create a cart";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const createCartResult = await menuManager.createCart({
      startDate: "2024-07-28", // Must be a Sunday, same date as menu
    });
    assertAndLog(
      "cart" in createCartResult,
      true,
      "Cart creation should succeed",
      stepMessage,
      ++checkIndex,
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
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      cart?.endDate,
      "2024-08-02",
      "Cart end date is correct (Friday)",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      cart?.weeklyCost,
      0,
      "Initial cart weekly cost is 0",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      cart?.menuIds.length,
      0,
      "Cart should initially have no menus",
      stepMessage,
      ++checkIndex,
    );
  });

  // --- Sub-step 4.3: Add menu to the cart ---
  await t.step("Part 4.3: Add menu to the cart", async () => {
    const stepMessage = "Part 4.3: Add menu to the cart";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const addMenuResult = await menuManager.addMenuToCart({
      cart: cartId,
      menu: createdMenuId,
    });
    assertAndLog(
      "success" in addMenuResult,
      true,
      "Adding menu to cart should succeed",
      stepMessage,
      ++checkIndex,
    );

    const cart = await db.collection("MenuManager.carts").findOne({
      _id: cartId,
    });
    assertExists(cart, "Cart should exist after adding menu");
    assertAndLog(
      cart?.menuIds.includes(createdMenuId),
      true,
      "Cart should contain the menu ID",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      cart?.menuIds.length,
      1,
      "Cart should have 1 menu",
      stepMessage,
      ++checkIndex,
    );

    // Verify weekly cost updated
    const menu = await db.collection("MenuManager.menus").findOne({
      _id: createdMenuId,
    });
    assertAndLog(
      cart?.weeklyCost,
      menu?.menuCost,
      "Cart weekly cost should match menu cost",
      stepMessage,
      ++checkIndex,
    );
  });

  // --- Sub-step 4.4: Administrator updates an item's price and verify costs recalculate ---
  await t.step(
    "Part 4.4: Administrator updates item price, verify cost recalculation",
    async () => {
      const stepMessage =
        "Part 4.4: Administrator updates item price, verify cost recalculation";
      printStepHeader(stepMessage);
      let checkIndex = 0;

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
        stepMessage,
        ++checkIndex,
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

      const updatedManualVanillaRecipeDoc = await db.collection(
        "MenuManager.recipes",
      ).findOne({ _id: manualVanillaCupcakesRecipeId });
      assertExists(
        updatedManualVanillaRecipeDoc,
        "Manual Vanilla Cupcakes recipe doc should exist for recalculation",
      );
      expectedVanillaCost = await calculateExpectedRecipeCost(
        updatedManualVanillaRecipeDoc.ingredients || [],
        updatedManualVanillaRecipeDoc.scalingFactor || 1.0,
      );

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
        stepMessage,
        ++checkIndex,
      );

      assertAndLog(
        updatedManualVanillaRecipeDoc?.dishPrice,
        expectedVanillaCost, // Corrected from expectedManualVanillaCost
        "Manual Vanilla Cupcakes dishPrice should be updated after flour price change",
        stepMessage,
        ++checkIndex,
      );

      assertAndLog(
        updatedLlmCorrectedVanillaRecipeDoc?.dishPrice,
        expectedFinalLlmRecipeCost,
        "LLM-corrected Vanilla Cupcakes dishPrice should be updated after flour price change",
        stepMessage,
        ++checkIndex,
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      const expectedTotalMenuCost = parseFloat((expectedPancakesCost +
        expectedVanillaCost + expectedFinalLlmRecipeCost).toFixed(2));
      assertAndLog(
        updatedMenu?.menuCost,
        expectedTotalMenuCost,
        "Menu cost should be updated after flour price change",
        stepMessage,
        ++checkIndex,
      );

      const updatedCart = await db.collection("MenuManager.carts").findOne({
        _id: cartId,
      });
      assertAndLog(
        updatedCart?.weeklyCost,
        expectedTotalMenuCost,
        "Cart weekly cost should be updated after flour price change",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

```
