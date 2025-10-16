
[@MenuManagerConcept.test.ts](../../../src/concepts/MenuManager/MenuManagerConcept.test.ts)

[@MenuManager](./MenuManager.md)

[@MenuManagerConcept.ts](../../../src/concepts/MenuManager/MenuManagerConcept.ts)

# In MenuManagerConcept.test.ts we have an extra part 2.3 that doesn't belong, as that exact recipe is supposed to be done by the LLM. Please remove it and its associated code:


# response:

```typescript
// file: src/concepts/MenuManager/MenuManagerConcept.test.ts
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

      console.log(
        `    🤖 LLM-pulled recipe name: "${llmRecipe?.name}", serving: ${llmRecipe?.servingQuantity}, type: ${llmRecipe?.dishType}`,
      );
      console.log(`    🤖 LLM-parsed initial ingredients:`);
      for (const ingredient in llmRecipe?.ingredients) {
        console.log(`        🥪 ${ingredient.toString()}`);
      }

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

        for (const ing of llmRecipeIngredients) {
          const itemName = await getItemName(ing.itemId);
          console.log(
            `   - ${itemName}: ${ing.amount} (raw LLM parse, assumed in item's base units for cost)`,
          );
        }
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
        const confirmResult = await menuManager.confirmItem({ item: itemId });
        assertAndLog(
          "item" in confirmResult,
          true,
          `Confirm item ${itemName} should succeed`,
        );
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

# file: src/concepts/MenuManager/MenuManagerConcept.ts

```typescript
import { Collection, Db, MongoClient } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "MenuManager" + ".";

// Generic types of this concept
type User = ID;
type Menu = ID;
type Recipe = ID;
type Item = ID;
type Cart = ID;

/**
 * Interface for a Menu entity.
 * purpose: creating recipes for full course meals
 * state: a set of Menu with
 *   a name String
 *   an owner User
 *   a menuCost Float
 *   a date String
 *   a set of Recipe (these will be stored in a separate collection, linked by menuId)
 */
interface MenuDoc {
  _id: Menu;
  name: string;
  owner: User;
  menuCost: number; // Calculated, not fixed.
  date: string; // YYYY-MM-DD
}

/**
 * Interface for an ingredient within a Recipe.
 * state: a set of Item with an amount Int (part of Recipe)
 */
interface RecipeIngredient {
  itemId: Item;
  amount: number; // Amount needed for the recipe in its base serving quantity
}

/**
 * Interface for a Recipe entity.
 * state: a set of Recipe with
 *   a set of Item with an amount Int (RecipeIngredient)
 *   a name String
 *   an instructions String
 *   a dishPrice Float
 *   a servingQuantity Int
 *   a scalingFactor Float
 *   a dishType String
 *   an owner User (owner of the menu it belongs to)
 */
interface RecipeDoc {
  _id: Recipe;
  menuId: Menu; // Foreign key to MenuDoc
  name: string;
  instructions: string;
  dishPrice: number; // Calculated.
  servingQuantity: number;
  scalingFactor: number; // Multiplier for ingredients and price
  dishType: string;
  owner: User; // Inherited from menu owner
  ingredients: RecipeIngredient[];
}

/**
 * Interface for a global Item entity.
 * state: a set of Item with
 *   a Set of String names
 *   a price Float
 *   a quantity Float
 *   a units String
 *   a store String
 *   a confirmed Bool
 */
interface ItemDoc {
  _id: Item;
  names: string[]; // Ex. {'pepper', 'ground pepper', 'course pepper'}
  price: number; // Price for the 'quantity' in 'units' (e.g., $3.00 for 1.5 lbs)
  quantity: number; // Quantity available for 'price' (e.g., 1.5 lbs)
  units: string; // Ex. "lbs", "each", "pack"
  store: string;
  confirmed: boolean;
}

/**
 * Interface for a Cart entity.
 * state: a set of Cart with
 *   a startDate String
 *   an endDate String
 *   a set of Menu (linked by menuIds)
 *   a weeklyCost Float
 */
interface CartDoc {
  _id: Cart;
  startDate: string; // "YYYY-MM-DD", must be a Sunday
  endDate: string; // "YYYY-MM-DD", automatically Friday of the same week
  menuIds: Menu[]; // Array of foreign keys to MenuDoc
  weeklyCost: number; // Calculated
}

/**
 * Structure expected from LLM for a parsed recipe.
 */
interface ParsedRecipe {
  name: string;
  instructions: string;
  servingQuantity: number;
  dishType: string;
  ingredients: Array<{ name: string; amount: number; units: string }>; // Added units
}

// --- Action Input/Output Types ---

// createMenu (name: String, date: String): (menu: Menu)
type CreateMenuInput = { name: string; date: string; owner: User };
type CreateMenuOutput = { menu: Menu } | { error: string };

// updateMenu (menu: Menu, name: String)
type UpdateMenuNameInput = { menu: Menu; name: string };
type UpdateMenuNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateMenu (menu: Menu, date: String)
type UpdateMenuDateInput = { menu: Menu; date: string };
type UpdateMenuDateOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// pullRecipeFromWebsite(menu: Menu, recipeURL: String): (recipe: Recipe)
type PullRecipeFromWebsiteInput = {
  menu: Menu;
  recipeURL: string;
  owner: User;
};
type PullRecipeFromWebsiteOutput = { recipe: Recipe } | { error: string };

// createRecipe (menu: Menu, name: String, instructions: String, servingQuantity: Int, dishType: String, scalingFactor: Float): (recipe: Recipe)
type CreateRecipeInput = {
  menu: Menu;
  name: string;
  instructions: string;
  servingQuantity: number;
  dishType: string;
  scalingFactor: number;
  owner: User;
};
type CreateRecipeOutput = { recipe: Recipe } | { error: string };

// updateRecipeIngredient (menu: Menu, recipe: Recipe, item: Item, amount: Int)
type UpdateRecipeIngredientInput = {
  menu: Menu;
  recipe: Recipe;
  item: Item;
  amount: number;
};
type UpdateRecipeIngredientOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, instructions: String)
type UpdateRecipeInstructionsInput = {
  menu: Menu;
  recipe: Recipe;
  instructions: string;
};
type UpdateRecipeInstructionsOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, servingQuantity: Int)
type UpdateRecipeServingQuantityInput = {
  menu: Menu;
  recipe: Recipe;
  servingQuantity: number;
};
type UpdateRecipeServingQuantityOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)
type UpdateRecipeScalingFactorInput = {
  menu: Menu;
  recipe: Recipe;
  scalingFactor: number;
};
type UpdateRecipeScalingFactorOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, dishType: String)
type UpdateRecipeDishTypeInput = {
  menu: Menu;
  recipe: Recipe;
  dishType: string;
};
type UpdateRecipeDishTypeOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateRecipe (menu: Menu, recipe: Recipe, name: String)
type UpdateRecipeNameInput = { menu: Menu; recipe: Recipe; name: string };
type UpdateRecipeNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// enterItem (name: String, price: Float, quantity: Float, units: String, store: String): (item: Item)
type EnterItemInput = {
  name: string;
  price: number;
  quantity: number;
  units: string;
  store: string;
};
type EnterItemOutput = { item: Item } | { error: string };

// confirmItem (item: Item): (item: Item)
type ConfirmItemInput = { item: Item };
type ConfirmItemOutput = { item: Item } | { error: string };

// updateItem (item: Item, price: Float)
type UpdateItemPriceInput = { item: Item; price: number };
type UpdateItemPriceOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateItem (item: Item, quantity: Float) - corrected typo from spec 'quanitity'
type UpdateItemQuantityInput = { item: Item; quantity: number };
type UpdateItemQuantityOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateItem (item: Item, units: String)
type UpdateItemUnitsInput = { item: Item; units: string };
type UpdateItemUnitsOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// updateItem (item: Item, store: String)
type UpdateItemStoreInput = { item: Item; store: string };
type UpdateItemStoreOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// addItemName (item: Item, name: String)
type AddItemNameInput = { item: Item; name: string };
type AddItemNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// removeItemName (item: Item, name: String)
type RemoveItemNameInput = { item: Item; name: string };
type RemoveItemNameOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// createCart (startDate: String)
type CreateCartInput = { startDate: string };
type CreateCartOutput = { cart: Cart } | { error: string };

// addMenuToCart (cart: Cart, menu: Menu)
type AddMenuToCartInput = { cart: Cart; menu: Menu };
type AddMenuToCartOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// adjustRecipeScale (cart: Cart, menu: Menu, recipe: Recipe, scalingFactor: Float) - corrected typos from spec
type AdjustRecipeScaleInput = {
  cart: Cart;
  menu: Menu;
  recipe: Recipe;
  scalingFactor: number;
};
type AdjustRecipeScaleOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// adjustItemQuantity (cart: Cart, menu: Menu, item: Item, quantity: Int)
type AdjustItemQuantityInput = {
  cart: Cart;
  menu: Menu;
  item: Item;
  quantity: number;
};
type AdjustItemQuantityOutput = { success: true } | { error: string }; // Changed from Empty to { success: true }

// --- Query Input/Output Types ---

// _getMenusInCart (cart: Cart): (menus: Set of Menu)
type GetMenusInCartInput = { cart: Cart };
type GetMenusInCartOutput = { menus: MenuDoc[] } | { error: string };

// _getRecipesInMenu (menu: Menu): (recipes: Set of Recipe)
type GetRecipesInMenuInput = { menu: Menu };
type GetRecipesInMenuOutput = { recipes: RecipeDoc[] } | { error: string };

// _getIngredientsInRecipe (recipe: Recipe): (ingredients: Map of Item to Float)
type GetIngredientsInRecipeInput = { recipe: Recipe };
type GetIngredientsInRecipeOutput =
  | { ingredients: Record<Item, { amount: number; units: string }> }
  | { error: string };

// _getIngredientsInMenu (menu: Menu): (ingredients: Map of Item to Float)
type GetIngredientsInMenuInput = { menu: Menu };
type GetIngredientsInMenuOutput =
  | { ingredients: Record<Item, { amount: number; units: string }> }
  | { error: string };

// _getListOfItems (): (items: Set of Item)
type GetListOfItemsInput = Empty; // No specific input, but actions/queries expect an object
type GetListOfItemsOutput = { items: ItemDoc[] }; // Does not return error per current implementation

// _getIngredientsPerStore (menus: Set of Menu): (storeShoppingList: Map of String to (Map of Item to Float))
type GetIngredientsPerStoreInput = { menus: Menu[] };
type GetIngredientsPerStoreOutput = {
  storeShoppingList: Record<
    string,
    Record<Item, { amount: number; units: string }>
  >;
}; // Does not return error per current implementation, handles missing menus internally

// _getMenuByDate (date: String): (menu: Menu)
type GetMenuByDateInput = { date: string };
type GetMenuByDateOutput = { menu: MenuDoc } | { error: string };

// _getMenusOwnedByUser (user: User): (menus: Set of Menu)
type GetMenusOwnedByUserInput = { user: User };
type GetMenusOwnedByUserOutput = { menus: MenuDoc[] }; // Does not return error per current implementation

/**
 * @concept MenuManager
 * @purpose creating recipes for full course meals
 * @principle A friendly chef embarks on their journey of creating a delicious five course menu with amazing different recipes. They *createMenu* with the specific date of the event and starts by adding their first recipe: *createRecipe*. As they are adding ingredients, they realize that most of them haven't been used before. They then *enterItem* into the system with appropriate price and quantity information for each new ingredient, allowing them to *updateRecipeIngredient* to their recipe with the appropriate amount. They continue finishing up the recipe with additional *updateRecipeIngredient* until it's complete. They might realize they put the wrong recipe name, and change it via *updateRecipe*. Next, a NEW LLM feature has been added that allows the chef to directly *pullRecipeFromWebsite* using a website URL for their second recipe. The LLM is able to parse a good amount of the recipe, but the chef must *updateRecipeIngredient* and *updateRecipe* for a couple things to ensure it's accurate and matches their desired recipe (like Vanilla Cupcakes). If the LLM is also unable to add a couple items, that's okay, the chef will simply *updateRecipeIngredient* to add new ingredients. A couple days later once our chef is done adding recipes to their menu, they then *createCart* and *addMenuToCart*. During this time, the administrator comes in and sees they added an ingredient, and figures out what the cost and where to purchase the item and *updateItem* in the system, which automatically recalculates dish, menu, and cart costs. Finally, the menu is all done and confirmed!
 */
export default class MenuManagerConcept {
  private menus: Collection<MenuDoc>;
  private recipes: Collection<RecipeDoc>;
  private items: Collection<ItemDoc>;
  private carts: Collection<CartDoc>;
  private llm: GeminiLLM; // LLM instance for recipe parsing

  constructor(private readonly db: Db, llmConfig: { apiKey: string }) {
    this.menus = this.db.collection(PREFIX + "menus");
    this.recipes = this.db.collection(PREFIX + "recipes");
    this.items = this.db.collection(PREFIX + "items");
    this.carts = this.db.collection(PREFIX + "carts");
    this.llm = new GeminiLLM(llmConfig);
  }

  // --- Internal Helper Functions ---

  /**
   * Helper to find an item by any of its names.
   * @param name The name to search for.
   * @returns The ItemDoc if found, otherwise null.
   */
  private async findItemByName(name: string): Promise<ItemDoc | null> {
    // Perform a case-insensitive search for the name within the 'names' array
    const item = await this.items.findOne({
      names: { $regex: new RegExp(name, "i") },
    });
    return item;
  }

  /**
   * Helper to calculate the price of a single dish, considering its ingredients and scaling factor.
   * @param recipe The recipe document.
   * @returns The calculated dish price.
   */
  private async calculateDishPrice(recipe: RecipeDoc): Promise<number> {
    let price = 0;
    for (const ingredient of recipe.ingredients) {
      const itemDoc = await this.items.findOne({ _id: ingredient.itemId });
      if (itemDoc && itemDoc.quantity > 0) {
        // Price per unit * amount needed
        price += (itemDoc.price / itemDoc.quantity) * ingredient.amount;
      } else if (!itemDoc) {
        console.warn(
          `Ingredient item ${ingredient.itemId} not found for recipe ${recipe._id}`,
        );
      }
    }
    return parseFloat((price * recipe.scalingFactor).toFixed(2));
  }

  /**
   * Helper to calculate the total cost of all recipes in a menu.
   * @param menu The menu document.
   * @returns The calculated menu cost.
   */
  private async calculateMenuCost(menu: MenuDoc): Promise<number> {
    const recipesInMenu = await this.recipes.find({ menuId: menu._id })
      .toArray();
    let totalCost = 0;
    for (const recipe of recipesInMenu) {
      totalCost += await this.calculateDishPrice(recipe);
    }
    return parseFloat(totalCost.toFixed(2));
  }

  /**
   * Helper to update a menu's stored cost after changes.
   * @param menuId The ID of the menu to update.
   */
  private async updateMenuCost(menuId: Menu): Promise<void> {
    const menu = await this.menus.findOne({ _id: menuId });
    if (menu) {
      const newCost = await this.calculateMenuCost(menu);
      await this.menus.updateOne({ _id: menuId }, {
        $set: { menuCost: newCost },
      });
    }
  }

  /**
   * Helper to calculate the total cost of all menus in a cart.
   * @param cart The cart document.
   * @returns The calculated weekly cost.
   */
  private async calculateCartWeeklyCost(cart: CartDoc): Promise<number> {
    let totalCost = 0;
    for (const menuId of cart.menuIds) {
      const menu = await this.menus.findOne({ _id: menuId });
      if (menu) {
        totalCost += await this.calculateMenuCost(menu);
      }
    }
    return parseFloat(totalCost.toFixed(2));
  }

  /**
   * Helper to update a cart's stored weekly cost after changes.
   * @param cartId The ID of the cart to update.
   */
  private async updateCartWeeklyCost(cartId: Cart): Promise<void> {
    const cart = await this.carts.findOne({ _id: cartId });
    if (cart) {
      const newCost = await this.calculateCartWeeklyCost(cart);
      await this.carts.updateOne({ _id: cartId }, {
        $set: { weeklyCost: newCost },
      });
    }
  }

  /**
   * Helper to recalculate all costs (dish, menu, cart) when an item's base properties change.
   * @param itemId The ID of the item that was updated.
   */
  private async recalculateAllCostsForItem(itemId: Item): Promise<void> {
    const recipesUsingItem = await this.recipes.find({
      "ingredients.itemId": itemId,
    }).toArray();
    for (const recipe of recipesUsingItem) {
      // Update dish price for each affected recipe
      await this.recipes.updateOne(
        { _id: recipe._id },
        { $set: { dishPrice: await this.calculateDishPrice(recipe) } },
      );
      // Update menu cost for the menu this recipe belongs to
      await this.updateMenuCost(recipe.menuId);
      // Update cart costs for any carts containing this menu
      const cartsContainingMenu = await this.carts.find({
        menuIds: recipe.menuId,
      }).toArray();
      for (const cart of cartsContainingMenu) {
        await this.updateCartWeeklyCost(cart._id);
      }
    }
  }

  // --- Actions ---

  /**
   * @action createMenu
   * @effects returns new empty menu that is owned by calling user, and has name/date attributes
   */
  async createMenu(input: CreateMenuInput): Promise<CreateMenuOutput> {
    const { name, date, owner } = input;
    const newMenuId = freshID();
    const newMenu: MenuDoc = {
      _id: newMenuId,
      name,
      owner,
      menuCost: 0,
      date,
    };
    await this.menus.insertOne(newMenu);
    return { menu: newMenuId };
  }

  /**
   * @action updateMenu (name)
   * @requires menu exists, calling user owns menu
   * @effects update the given attribute
   */
  async updateMenuName(
    input: UpdateMenuNameInput,
  ): Promise<UpdateMenuNameOutput> {
    const { menu: menuId, name } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }
    await this.menus.updateOne({ _id: menuId }, { $set: { name } });
    return { success: true };
  }

  /**
   * @action updateMenu (date)
   * @requires menu exists, calling user owns menu
   * @effects update the given attribute
   */
  async updateMenuDate(
    input: UpdateMenuDateInput,
  ): Promise<UpdateMenuDateOutput> {
    const { menu: menuId, date } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }
    // Basic date format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: `Invalid date format "${date}". Expected YYYY-MM-DD.` };
    }
    await this.menus.updateOne({ _id: menuId }, { $set: { date } });
    return { success: true };
  }

  /**
   * @action pullRecipeFromWebsite
   * @requires menu exists, calling user owns menu, recipeURL is a valid URL
   * @effects Using an LLM prompt to parse through the online recipeURL, creates recipe with all the information that it was able to parse and user can *updateIngredient* as necessary
   */
  async pullRecipeFromWebsite(
    input: PullRecipeFromWebsiteInput,
  ): Promise<PullRecipeFromWebsiteOutput> {
    const { menu: menuId, recipeURL, owner } = input;
    const menu = await this.menus.findOne({ _id: menuId, owner });
    if (!menu) {
      return {
        error: `Menu with ID "${menuId}" not found or not owned by user.`,
      };
    }

    // Basic URL validation
    try {
      new URL(recipeURL);
    } catch {
      return { error: "Invalid recipeURL provided." };
    }

    console.log(`🤖 Requesting recipe parse for URL: ${recipeURL}`);
    const prompt = this.createPullRecipePrompt(recipeURL);
    let responseText: string;
    try {
      responseText = await this.llm.executeLLM(prompt);
      console.log("✅ Received response from Gemini AI!");
    } catch (llmError) {
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: "No JSON object found in the LLM response." };
      }

      const parsed: ParsedRecipe = JSON.parse(jsonMatch[0]);
      if (
        !parsed.name || !parsed.instructions || !parsed.servingQuantity ||
        !parsed.dishType || !parsed.ingredients
      ) {
        return { error: "The parsed JSON is missing required fields." };
      }

      // Create the recipe document
      const newRecipeId = freshID();
      const newRecipeDoc: RecipeDoc = {
        _id: newRecipeId,
        menuId: menuId,
        name: parsed.name,
        instructions: parsed.instructions,
        dishPrice: 0, // Will be calculated after ingredients are added and persisted
        servingQuantity: parsed.servingQuantity,
        scalingFactor: 1.0, // Default scaling factor
        dishType: parsed.dishType,
        owner: owner,
        ingredients: [], // Initialize empty, then add
      };
      await this.recipes.insertOne(newRecipeDoc);

      // Add ingredients from the parsed recipe, ONLY if they are pre-existing items
      const recipeIngredients: RecipeIngredient[] = [];
      for (const ing of parsed.ingredients) {
        const itemDoc = await this.findItemByName(ing.name);
        if (!itemDoc) {
          console.warn(
            `\t\t⚠️ Skipping ingredient "${ing.name}" from LLM-pulled recipe as it is not a pre-existing item in the system (Not a failure).`,
          );
          continue; // Skip this ingredient if not found
        }
        // If itemDoc is found, add it to the recipe
        recipeIngredients.push({ itemId: itemDoc._id, amount: ing.amount });
      }

      // Update recipe with all collected ingredients
      await this.recipes.updateOne(
        { _id: newRecipeId },
        { $set: { ingredients: recipeIngredients } },
      );

      // Recalculate dish and menu costs
      const updatedRecipeDoc = {
        ...newRecipeDoc,
        ingredients: recipeIngredients,
      }; // Temporary for calculation
      updatedRecipeDoc.dishPrice = await this.calculateDishPrice(
        updatedRecipeDoc,
      );
      await this.recipes.updateOne({ _id: newRecipeId }, {
        $set: { dishPrice: updatedRecipeDoc.dishPrice },
      });
      await this.updateMenuCost(menuId);

      // Also update cart cost if this menu is in any cart
      const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
        .toArray();
      for (const cart of cartsContainingMenu) {
        await this.updateCartWeeklyCost(cart._id);
      }

      console.log(
        `✅ Successfully parsed and stored recipe: "${updatedRecipeDoc.name}"`,
      );
      return { recipe: newRecipeId };
    } catch (parseError) {
      console.error(
        "❌ Error parsing LLM response or adding recipe:",
        (parseError as Error).message,
      );
      return {
        error: `Failed to process LLM response: ${
          (parseError as Error).message
        }`,
      };
    }
  }

  /**
   * Helper for LLM prompt generation.
   * @param url The URL to parse.
   * @returns The prompt string for the LLM.
   */
  private createPullRecipePrompt(url: string): string {
    return `You are an expert recipe parsing assistant. Your task is to analyze the HTML from the provided URL, find the actual recipe, and extract key details into a clean JSON object.

      URL to parse: ${url}

      **Analysis and Extraction Strategy:**
      1.  **Find the Recipe Card:** Scan the page for a primary, well-structured recipe section. These are often in a container or a specific class. Ignore introductory stories, comments, and sidebars with other recipe links.
      2.  **Extract Core Details:** From within that recipe card, extract the recipe's name, the full text of the instructions, the serving quantity (as a number), and the dish type (e.g., "Main Course", "Dessert", "Side Dish").
      3.  **Extract Ingredients with Precision:**
          *   Locate the definitive ingredients list within the recipe card.
          *   For each ingredient line, parse out the **name** and the **amount**.
          *   The **name** should be the core ingredient (e.g., "chicken broth", "white rice").
          *   Simplify the **name** to the base ingredient (e.g., "black pepper" -> "pepper", "long grain white rice" -> "white rice").
          *   The **amount** should be the numerical quantity required for the recipe (e.g., for "1 1/2 cups chicken broth", the amount is 1.5). If no number is present (e.g., "salt to taste"), set the amount to 1.

      **Sample Parsing**
      DO NOT TAKE ANYTHING FROM EXTRA STORIES COMMENTS OR SIDEBARS.
      Important data will generally be in consice format like this:
      ------
      The Best Chocolate Chip Cookie Recipe Ever
      This is the best chocolate chip cookie recipe ever. No funny ingredients, no chilling time, etc. Just a simple, straightforward, amazingly delicious, doughy yet still fully cooked, chocolate chip cookie that turns out perfectly every single time! 
      Servings: 36

      Ingredients:
      -1 cup salted butter softened
      -1 cup granulated sugar
      -1 cup light brown sugar packed
      -2 teaspoons pure vanilla extract
      -2 large eggs
      -3 cups all-purpose flour
      -1 teaspoon baking soda
      -½ teaspoon baking powder
      -1 teaspoon sea salt
      -2 cups chocolate chips (12 oz)
      Instructions 
      Preheat oven to 375 degrees Fahrenheit (190 degrees Celsius). Line three baking sheets with parchment paper and set aside.
      In a medium bowl mix flour, baking soda, baking powder and salt. Set aside.
      Cream together butter and sugars until combined.
      Beat in eggs and vanilla until light (about 1 minute).
      Mix in the dry ingredients until combined.
      Add chocolate chips and mix well.
      Roll 2-3 Tablespoons (depending on how large you like your cookies) of dough at a time into balls and place them evenly spaced on your prepared cookie sheets.
      Bake in preheated oven for approximately 8-10 minutes. Take them out when they are just barely starting to turn brown.
      Let them sit on the baking pan for 5 minutes before removing to cooling rack.
      ------

      **CRITICAL OUTPUT REQUIREMENTS:**
      *   Return ONLY a single JSON object. Do not include any surrounding text, explanations, or markdown formatting.
      *   The JSON must follow this exact structure. Omit any fields where a value cannot be found.

      {
        "name": "The Exact Recipe Name",
        "instructions": "1. First step from the recipe. 2. Second step from the recipe.",
        "servingQuantity": 8,
        "dishType": "Main Course",
        "ingredients": [
          { "name": "boneless skinless chicken breasts", "amount": 1.5, "units": "lbs" },
          { "name": "olive oil", "amount": 1, "units": "cup" },
          { "name": "salt", "amount": 0.5, "units": "tsp" },
          { "name": "black pepper", "amount": 0.25, "units": "tsp" }
        ]
    }`;
  }

  /**
   * @action createRecipe
   * @requires menu exists, calling user owns menu
   * @effects adds recipe with no ingredients to the menu
   */
  async createRecipe(input: CreateRecipeInput): Promise<CreateRecipeOutput> {
    const {
      menu: menuId,
      name,
      instructions,
      servingQuantity,
      dishType,
      scalingFactor,
      owner,
    } = input;
    const menu = await this.menus.findOne({ _id: menuId, owner });
    if (!menu) {
      return {
        error: `Menu with ID "${menuId}" not found or not owned by user.`,
      };
    }
    if (servingQuantity <= 0) {
      return { error: `Serving quantity must be a positive number.` };
    }
    if (scalingFactor < 0) {
      return { error: `Scaling factor cannot be negative.` };
    }

    const newRecipeId = freshID();
    const newRecipe: RecipeDoc = {
      _id: newRecipeId,
      menuId,
      name,
      instructions,
      servingQuantity,
      dishType,
      scalingFactor,
      owner,
      dishPrice: 0, // Will be calculated after ingredients are added
      ingredients: [],
    };
    await this.recipes.insertOne(newRecipe);

    // Recalculate menu cost and then cart cost
    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }

    return { recipe: newRecipeId };
  }

  /**
   * @action updateRecipeIngredient
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects recipe updated to have appropriate scaling of item; dishPrice and menuCost reflect new change
   */
  async updateRecipeIngredient(
    input: UpdateRecipeIngredientInput,
  ): Promise<UpdateRecipeIngredientOutput> {
    const { menu: menuId, recipe: recipeId, item: itemId, amount } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    if (amount < 0) {
      return { error: `Ingredient amount cannot be negative.` };
    }

    // Check if item exists in global item list
    const itemDoc = await this.items.findOne({ _id: itemId });
    if (!itemDoc) {
      return { error: `Item with ID "${itemId}" not found.` };
    }

    const existingIngredientIndex = recipe.ingredients.findIndex(
      (ing) => ing.itemId === itemId,
    );

    if (amount === 0) {
      // If amount is 0, remove the ingredient
      if (existingIngredientIndex !== -1) {
        recipe.ingredients.splice(existingIngredientIndex, 1);
      }
    } else {
      if (existingIngredientIndex !== -1) {
        recipe.ingredients[existingIngredientIndex].amount = amount;
      } else {
        recipe.ingredients.push({ itemId, amount });
      }
    }

    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { ingredients: recipe.ingredients },
    });

    // Recalculate dish price
    recipe.dishPrice = await this.calculateDishPrice(recipe);
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { dishPrice: recipe.dishPrice },
    });

    // Recalculate menu cost and then cart cost
    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }

    return { success: true };
  }

  /**
   * @action updateRecipe (instructions)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeInstructions(
    input: UpdateRecipeInstructionsInput,
  ): Promise<UpdateRecipeInstructionsOutput> {
    const { menu: menuId, recipe: recipeId, instructions } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    await this.recipes.updateOne({ _id: recipeId }, { $set: { instructions } });
    return { success: true };
  }

  /**
   * @action updateRecipe (servingQuantity)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeServingQuantity(
    input: UpdateRecipeServingQuantityInput,
  ): Promise<UpdateRecipeServingQuantityOutput> {
    const { menu: menuId, recipe: recipeId, servingQuantity } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    if (servingQuantity <= 0) {
      return { error: `Serving quantity must be a positive number.` };
    }
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { servingQuantity },
    });
    // Note: Changing servingQuantity directly does not change ingredient amounts in this model,
    // as 'amount' in RecipeIngredient is for the base serving quantity. Scaling is handled by scalingFactor.
    // Therefore, no cost recalculation is needed here.
    return { success: true };
  }

  /**
   * @action updateRecipe (scalingFactor)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeScalingFactor(
    input: UpdateRecipeScalingFactorInput,
  ): Promise<UpdateRecipeScalingFactorOutput> {
    const { menu: menuId, recipe: recipeId, scalingFactor } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    if (scalingFactor < 0) {
      return { error: `Scaling factor cannot be negative.` };
    }
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { scalingFactor },
    });

    // Recalculate dish, menu, and cart costs
    const updatedRecipe = { ...recipe, scalingFactor }; // Create temporary updated recipe for calculation
    updatedRecipe.dishPrice = await this.calculateDishPrice(updatedRecipe);
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { dishPrice: updatedRecipe.dishPrice },
    });

    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }
    return { success: true };
  }

  /**
   * @action updateRecipe (dishType)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeDishType(
    input: UpdateRecipeDishTypeInput,
  ): Promise<UpdateRecipeDishTypeOutput> {
    const { menu: menuId, recipe: recipeId, dishType } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    await this.recipes.updateOne({ _id: recipeId }, { $set: { dishType } });
    return { success: true };
  }

  /**
   * @action updateRecipe (name)
   * @requires menu exists, recipe exists in menu, calling user owns menu
   * @effects update the given attribute
   */
  async updateRecipeName(
    input: UpdateRecipeNameInput,
  ): Promise<UpdateRecipeNameOutput> {
    const { menu: menuId, recipe: recipeId, name } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId });
    if (!recipe) {
      return {
        error: `Recipe with ID "${recipeId}" not found in menu "${menuId}".`,
      };
    }
    await this.recipes.updateOne({ _id: recipeId }, { $set: { name } });
    return { success: true };
  }

  /**
   * @action enterItem
   * @requires no Item already exists with name
   * @effects returns and stores new item, confirmed flag set to false
   */
  async enterItem(input: EnterItemInput): Promise<EnterItemOutput> {
    const { name, price, quantity, units, store } = input;
    // Check if an item with this specific name already exists (case-insensitive)
    const existingItem = await this.findItemByName(name);
    if (existingItem) {
      return {
        error:
          `An item already exists with the name "${name}". Use addItemName to add an alias.`,
      };
    }
    if (price < 0) {
      return { error: "Price cannot be negative." };
    }
    if (quantity <= 0) {
      return { error: "Quantity must be positive." };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      names: [name], // Start with the primary name
      price,
      quantity,
      units,
      store,
      confirmed: false,
    };
    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * @action confirmItem
   * @requires item exists, item hasn't been confirmed yet, called by Administrator
   * @effects returned item is now confirmed
   */
  async confirmItem(input: ConfirmItemInput): Promise<ConfirmItemOutput> {
    const { item: itemId } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (item.confirmed) {
      return { error: `Item with ID "${itemId}" is already confirmed.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { confirmed: true } });
    return { item: itemId };
  }

  /**
   * @action updateItem (price)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemPrice(
    input: UpdateItemPriceInput,
  ): Promise<UpdateItemPriceOutput> {
    const { item: itemId, price } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (price < 0) {
      return { error: `Price cannot be negative.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { price } });
    await this.recalculateAllCostsForItem(itemId); // Recalculate all affected costs
    return { success: true };
  }

  /**
   * @action updateItem (quantity)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemQuantity(
    input: UpdateItemQuantityInput,
  ): Promise<UpdateItemQuantityOutput> {
    const { item: itemId, quantity } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (quantity <= 0) {
      return { error: `Quantity must be positive.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { quantity } });
    await this.recalculateAllCostsForItem(itemId); // Recalculate all affected costs
    return { success: true };
  }

  /**
   * @action updateItem (units)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemUnits(
    input: UpdateItemUnitsInput,
  ): Promise<UpdateItemUnitsOutput> {
    const { item: itemId, units } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { units } });
    return { success: true };
  }

  /**
   * @action updateItem (store)
   * @requires item exists, called by Administrator
   * @effects update the given attribute
   */
  async updateItemStore(
    input: UpdateItemStoreInput,
  ): Promise<UpdateItemStoreOutput> {
    const { item: itemId, store } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    await this.items.updateOne({ _id: itemId }, { $set: { store } });
    return { success: true };
  }

  /**
   * @action addItemName
   * @requires item exists, called by Administrator
   * @effects item now has new name that it can be referenced by
   */
  async addItemName(input: AddItemNameInput): Promise<AddItemNameOutput> {
    const { item: itemId, name } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (item.names.includes(name)) {
      return { error: `Item "${itemId}" already has name "${name}".` };
    }
    // Check if this new name is already used by another item (case-insensitive)
    const existingItemWithSameName = await this.items.findOne({
      _id: { $ne: itemId },
      names: { $regex: new RegExp(name, "i") },
    });
    if (existingItemWithSameName) {
      return { error: `Name "${name}" is already used by another item.` };
    }
    await this.items.updateOne({ _id: itemId }, { $push: { names: name } });
    return { success: true };
  }

  /**
   * @action removeItemName
   * @requires item exists, item has name, called by Administrator
   * @effects item can no longer be referenced by name
   */
  async removeItemName(
    input: RemoveItemNameInput,
  ): Promise<RemoveItemNameOutput> {
    const { item: itemId, name } = input;
    const item = await this.items.findOne({ _id: itemId });
    if (!item) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (!item.names.includes(name)) {
      return { error: `Item "${itemId}" does not have name "${name}".` };
    }
    if (item.names.length === 1) {
      return { error: `Cannot remove the last name of an item.` };
    }
    await this.items.updateOne({ _id: itemId }, { $pull: { names: name } });
    return { success: true };
  }

  /**
   * @action createCart
   * @requires startDate is a Sunday, no cart already exists with startDate
   * @effects creates empty cart with startDate and endDate that Friday
   */
  async createCart(input: CreateCartInput): Promise<CreateCartOutput> {
    const { startDate } = input;
    // Validate startDate is a Sunday
    const dateObj = new Date(startDate + "T00:00:00Z"); // Ensure UTC to avoid timezone issues for date only string
    if (isNaN(dateObj.getTime())) {
      return { error: "Invalid startDate format. Expected YYYY-MM-DD." };
    }
    if (dateObj.getUTCDay() !== 0) { // Sunday is 0 (0-6 for Sun-Sat)
      return { error: `startDate "${startDate}" is not a Sunday.` };
    }

    // Check if cart already exists for this startDate
    const existingCart = await this.carts.findOne({ startDate });
    if (existingCart) {
      return { error: `A cart already exists for startDate "${startDate}".` };
    }

    // Calculate endDate (Friday of the same week)
    const endDateObj = new Date(dateObj);
    endDateObj.setUTCDate(dateObj.getUTCDate() + 5); // Add 5 days to get to Friday
    const endDate = endDateObj.toISOString().split("T")[0];

    const newCartId = freshID();
    const newCart: CartDoc = {
      _id: newCartId,
      startDate,
      endDate,
      menuIds: [],
      weeklyCost: 0,
    };
    await this.carts.insertOne(newCart);
    return { cart: newCartId };
  }

  /**
   * @action addMenuToCart
   * @requires cart exists, menu exists, cart doesn't already have a menu for that menus date
   * @effects adds menu to the cart and appropriately adjusts cart price
   */
  async addMenuToCart(input: AddMenuToCartInput): Promise<AddMenuToCartOutput> {
    const { cart: cartId, menu: menuId } = input;
    const cart = await this.carts.findOne({ _id: cartId });
    if (!cart) {
      return { error: `Cart with ID "${cartId}" not found.` };
    }
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }

    // Check if a menu for that date already exists in the cart
    const menusInCart = await this.menus.find({ _id: { $in: cart.menuIds } })
      .toArray();
    if (menusInCart.some((m) => m.date === menu.date)) {
      return {
        error:
          `Cart "${cartId}" already contains a menu for date "${menu.date}".`,
      };
    }

    await this.carts.updateOne({ _id: cartId }, { $push: { menuIds: menuId } });
    await this.updateCartWeeklyCost(cartId); // Recalculate weekly cost

    return { success: true };
  }

  /**
   * @action adjustRecipeScale
   * @requires cart, menu, and recipe all exist, recipe in menu, menu in cart
   * @effects within the cart adjusts to have the new scaling factor of specified recipe in menu, adjust cart price appropriately
   */
  async adjustRecipeScale(
    input: AdjustRecipeScaleInput,
  ): Promise<AdjustRecipeScaleOutput> {
    const { cart: cartId, menu: menuId, recipe: recipeId, scalingFactor } =
      input;
    const cart = await this.carts.findOne({ _id: cartId, menuIds: menuId }); // Verify cart contains menu
    if (!cart) {
      return {
        error:
          `Cart "${cartId}" does not exist or does not contain menu "${menuId}".`,
      };
    }
    const recipe = await this.recipes.findOne({ _id: recipeId, menuId }); // Verify recipe is in menu
    if (!recipe) {
      return { error: `Recipe "${recipeId}" not found in menu "${menuId}".` };
    }
    if (scalingFactor < 0) {
      return { error: `Scaling factor cannot be negative.` };
    }

    // Update the recipe's scaling factor directly
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { scalingFactor },
    });

    // Recalculate costs: dish, menu, and then cart
    const updatedRecipe = { ...recipe, scalingFactor }; // Create temporary updated recipe for calculation
    updatedRecipe.dishPrice = await this.calculateDishPrice(updatedRecipe);
    await this.recipes.updateOne({ _id: recipeId }, {
      $set: { dishPrice: updatedRecipe.dishPrice },
    });

    await this.updateMenuCost(menuId);
    const cartsContainingMenu = await this.carts.find({ menuIds: menuId })
      .toArray();
    for (const cart of cartsContainingMenu) {
      await this.updateCartWeeklyCost(cart._id);
    }
    return { success: true };
  }

  /**
   * @action adjustItemQuantity
   * @requires cart, menu, and item all exist, item in some recipe in menu, menu in cart
   * @effects within the cart adjusts number of item purchased to quantity, adjust cart price appropriately
   */
  async adjustItemQuantity(
    input: AdjustItemQuantityInput,
  ): Promise<AdjustItemQuantityOutput> {
    const { cart: cartId, menu: menuId, item: itemId, quantity } = input;
    const cart = await this.carts.findOne({ _id: cartId, menuIds: menuId });
    if (!cart) {
      return {
        error:
          `Cart "${cartId}" does not exist or does not contain menu "${menuId}".`,
      };
    }
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu "${menuId}" not found.` };
    }
    const itemDoc = await this.items.findOne({ _id: itemId });
    if (!itemDoc) {
      return { error: `Item with ID "${itemId}" not found.` };
    }
    if (quantity <= 0) {
      return { error: `Quantity must be positive.` };
    }

    // Verify the item is actually used in a recipe within this menu
    const recipesUsingItemInMenu = await this.recipes.countDocuments({
      menuId: menuId,
      "ingredients.itemId": itemId,
    });
    if (recipesUsingItemInMenu === 0) {
      return {
        error:
          `Item "${itemId}" is not used in any recipe within menu "${menuId}".`,
      };
    }

    // As per interpretation, this action updates the global `ItemDoc.quantity`.
    // The "adjusts number of item purchased to quantity" implies changing the fundamental quantity
    // associated with an item's price, thereby affecting how costs are calculated for all uses.
    const updateResult = await this.items.updateOne({ _id: itemId }, {
      $set: { quantity },
    });
    if (updateResult.modifiedCount === 0) {
      return { error: `Failed to update item "${itemId}" quantity.` };
    }

    await this.recalculateAllCostsForItem(itemId); // Recalculate all affected costs, including cart
    await this.updateCartWeeklyCost(cartId); // Explicitly update this specific cart
    return { success: true };
  }

  // --- Queries ---

  /**
   * @query _getMenusInCart
   * @requires cart exists
   * @effects returns the set of all Menu entities associated with the given cart.
   */
  async _getMenusInCart(
    input: GetMenusInCartInput,
  ): Promise<GetMenusInCartOutput> {
    const { cart: cartId } = input;
    const cart = await this.carts.findOne({ _id: cartId });
    if (!cart) {
      return { error: `Cart with ID "${cartId}" not found.` };
    }
    const menus = await this.menus.find({ _id: { $in: cart.menuIds } })
      .toArray();
    return { menus };
  }

  /**
   * @query _getRecipesInMenu
   * @requires menu exists
   * @effects returns the set of all Recipe entities associated with the given menu.
   */
  async _getRecipesInMenu(
    input: GetRecipesInMenuInput,
  ): Promise<GetRecipesInMenuOutput> {
    const { menu: menuId } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }
    const recipes = await this.recipes.find({ menuId }).toArray();
    return { recipes };
  }

  /**
   * @query _getIngredientsInRecipe
   * @requires recipe exists
   * @effects returns a map where each key is an Item and the value is the total scaled quantity (Float) of that item needed for the given recipe, calculated as `item.amount * recipe.scalingFactor`. The `Item`'s `units` property indicates the unit of the quantity.
   */
  async _getIngredientsInRecipe(
    input: GetIngredientsInRecipeInput,
  ): Promise<GetIngredientsInRecipeOutput> {
    const { recipe: recipeId } = input;
    const recipe = await this.recipes.findOne({ _id: recipeId });
    if (!recipe) {
      return { error: `Recipe with ID "${recipeId}" not found.` };
    }

    const ingredientsMap: Record<Item, { amount: number; units: string }> = {};
    for (const ing of recipe.ingredients) {
      const item = await this.items.findOne({ _id: ing.itemId });
      if (item) {
        ingredientsMap[item._id] = {
          amount: parseFloat((ing.amount * recipe.scalingFactor).toFixed(2)),
          units: item.units,
        };
      } else {
        console.warn(`Item ${ing.itemId} not found for recipe ${recipeId}`);
      }
    }
    return { ingredients: ingredientsMap };
  }

  /**
   * @query _getIngredientsInMenu
   * @requires menu exists
   * @effects returns a map where each key is an Item and the value is the total aggregated quantity (Float) of that item needed across all recipes within the given menu, considering each recipe's `scalingFactor`. The `Item`'s `units` property indicates the unit of the quantity.
   */
  async _getIngredientsInMenu(
    input: GetIngredientsInMenuInput,
  ): Promise<GetIngredientsInMenuOutput> {
    const { menu: menuId } = input;
    const menu = await this.menus.findOne({ _id: menuId });
    if (!menu) {
      return { error: `Menu with ID "${menuId}" not found.` };
    }

    const recipesInMenu = await this.recipes.find({ menuId }).toArray();
    const aggregatedIngredients: Record<
      Item,
      { amount: number; units: string }
    > = {};

    for (const recipe of recipesInMenu) {
      for (const ing of recipe.ingredients) {
        const item = await this.items.findOne({ _id: ing.itemId });
        if (item) {
          const scaledAmount = parseFloat(
            (ing.amount * recipe.scalingFactor).toFixed(2),
          );
          if (aggregatedIngredients[item._id]) {
            aggregatedIngredients[item._id].amount = parseFloat(
              (aggregatedIngredients[item._id].amount + scaledAmount)
                .toFixed(2),
            );
          } else {
            aggregatedIngredients[item._id] = {
              amount: scaledAmount,
              units: item.units,
            };
          }
        } else {
          console.warn(
            `Item ${ing.itemId} not found for recipe ${recipe._id} in menu ${menuId}`,
          );
        }
      }
    }
    return { ingredients: aggregatedIngredients };
  }

  /**
   * @query _getListOfItems
   * @requires nothing
   * @effects returns a set of all items stored within the application.
   */
  async _getListOfItems(
    input: GetListOfItemsInput = {},
  ): Promise<GetListOfItemsOutput> {
    // Input is technically Empty, so it can be an empty object
    const items = await this.items.find({}).toArray();
    return { items };
  }

  /**
   * @query _getIngredientsPerStore
   * @requires all menus in the input set exist
   * @effects returns a map where each key is a `store` name (String) and the value is another map. This inner map has `Item` keys and their total aggregated quantity (Float) values, representing the total amount of each item needed from that store across all specified menus, considering recipe scaling factors. The `Item`'s `units` property indicates the unit of the quantity.
   */
  async _getIngredientsPerStore(
    input: GetIngredientsPerStoreInput,
  ): Promise<GetIngredientsPerStoreOutput> {
    const { menus: menuIds } = input;
    const storeShoppingList: Record<
      string,
      Record<Item, { amount: number; units: string }>
    > = {};

    for (const menuId of menuIds) {
      const menu = await this.menus.findOne({ _id: menuId });
      if (!menu) {
        console.warn(`Menu ${menuId} not found, skipping.`);
        continue;
      }

      const menuIngredientsResult = await this._getIngredientsInMenu({
        menu: menuId,
      });
      if ("error" in menuIngredientsResult) {
        console.warn(
          `Error getting ingredients for menu ${menuId}: ${menuIngredientsResult.error}`,
        );
        continue;
      }
      const menuIngredients = menuIngredientsResult.ingredients;

      for (const key of Object.keys(menuIngredients)) {
        const itemId = key as Item; // Explicitly cast the string key to Item
        const { amount, units }: { amount: number; units: string } =
          menuIngredients[itemId];

        const item = await this.items.findOne({ _id: itemId });
        if (item) {
          if (!storeShoppingList[item.store]) {
            storeShoppingList[item.store] = {};
          }
          if (storeShoppingList[item.store][item._id]) {
            storeShoppingList[item.store][item._id].amount = parseFloat(
              (storeShoppingList[item.store][item._id].amount + amount)
                .toFixed(2),
            );
          } else {
            storeShoppingList[item.store][item._id] = { amount, units };
          }
        } else {
          console.warn(`Item ${itemId} not found when aggregating for stores.`);
        }
      }
    }
    return { storeShoppingList };
  }

  /**
   * @query _getMenuByDate
   * @requires menu exists for date
   * @effects returns the menu associated with that date.
   */
  async _getMenuByDate(
    input: GetMenuByDateInput,
  ): Promise<GetMenuByDateOutput> {
    const { date } = input;
    const menu = await this.menus.findOne({ date });
    if (!menu) {
      return { error: `Menu for date "${date}" not found.` };
    }
    return { menu };
  }

  /**
   * @query _getMenusOwnedByUser
   * @requires user exists
   * @effects returns the set of all Menu entities where the `owner` attribute matches the given user.
   */
  async _getMenusOwnedByUser(
    input: GetMenusOwnedByUserInput,
  ): Promise<GetMenusOwnedByUserOutput> {
    const { user: ownerId } = input;
    const menus = await this.menus.find({ owner: ownerId }).toArray();
    return { menus };
  }
}

```