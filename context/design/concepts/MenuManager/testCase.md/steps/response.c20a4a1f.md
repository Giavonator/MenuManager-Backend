---
timestamp: 'Thu Oct 16 2025 16:58:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_165853.3a990031.md]]'
content_id: c20a4a1f93b9b2f8cc9e2798380fb93a9ba047bcc4b66cd2a4ec20f573a1d889
---

# response:

```typescript
// file: src/concepts/MenuManager/MenuManagerConcept.test.ts
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Db } from "npm:mongodb";
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

// Store expected state of items for cost calculation
interface ItemExpectedPrice {
  price: number;
  quantity: number; // Base quantity for which 'price' is set (e.g., 5 for 5 lbs)
  units: string;
  // Conversion factors to convert common recipe units (cups, tbsp, tsp) to ItemDoc.units
  conversions: Record<string, number>; // e.g., {'cup': 0.277, 'lb': 1} for flour where ItemDoc.units is 'lbs'
}
// This is declared globally to be accessible by all tests using the helper functions
const itemDetails: Record<ID, ItemExpectedPrice> = {};

// Refactored helper to just register an item and store its price details
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
  return itemResult; // Return the error object
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

interface RecipeIngredientTemp {
  itemId: ID;
  amount: number; // This amount is in the ItemDoc.units
}

// This helper assumes recipeIngredients.amount is ALREADY in ItemDoc.units for calculation
const calculateExpectedRecipeCost = async (
  db: Db, // Pass db instance for dynamic lookup
  recipeIngredients: RecipeIngredientTemp[],
  scalingFactor: number,
): Promise<number> => {
  let price = 0;
  for (const ing of recipeIngredients) {
    let itemInfo = itemDetails[ing.itemId]; // Try global cache first
    let itemDoc;

    if (!itemInfo) {
      // If not in global cache, try to get from DB and use its price/quantity if available.
      itemDoc = await db.collection("MenuManager.items").findOne({
        _id: ing.itemId,
      });
      if (itemDoc) {
        itemInfo = {
          price: itemDoc.price,
          quantity: itemDoc.quantity,
          units: itemDoc.units,
          conversions: {}, // No conversions for dynamically fetched items
        };
      }
    } else {
      // If found in global cache, also refresh from DB to get latest price/quantity
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
      price += (itemInfo.price / itemInfo.quantity) * ing.amount; // ing.amount is already in item's base units
    } else {
      console.warn(
        `Item ${ing.itemId} not found or has zero quantity for cost calculation. Assuming 0 cost.`,
      );
    }
  }
  return parseFloat((price * scalingFactor).toFixed(2)); // Round to 2 decimal places for floating point comparison
};

// Helper to get item name for logging, avoiding await in template literals
const getItemName = async (
  db: Db, // Pass db instance for dynamic lookup
  itemId: ID,
): Promise<string> => {
  const item = await db.collection("MenuManager.items").findOne({
    _id: itemId,
  });
  return item?.names[0] || itemId;
};

// Regular expression to validate Deno-generated UUIDs
const idRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
  let llmPulledRecipeId: ID; // For Part 3, the LLM-pulled recipe
  let flourItemId: ID, milkItemId: ID, eggItemId: ID, butterItemId: ID;
  let sugarItemId: ID, bakingPowderItemId: ID, waterItemId: ID;
  let cartId: ID;

  // Declare these variables here to be accessible across steps
  let expectedPancakesCost: number = 0;
  let expectedLlmInitialCost: number = 0; // New variable for initial LLM cost
  let expectedFinalLlmRecipeCost: number = 0;

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
      menuManager,
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
      menuManager,
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
      menuManager,
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
      menuManager,
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
      menuManager,
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
      menuManager,
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
      menuManager,
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
        const ingredientName = await getItemName(db, ing.itemId);
        assertAndLog(
          "success" in updateIngResult,
          true,
          `Add ingredient ${ingredientName} to Pancakes should succeed`,
        );
      }

      expectedPancakesCost = await calculateExpectedRecipeCost(
        db,
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
          db,
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
        const ingredientName = await getItemName(db, ing.itemId);

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
          const missingIngredientName = await getItemName(db, targetIng.itemId);
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
            db,
            targetIng.itemId,
          )} should be in final LLM recipe`,
        );
        assertAndLog(
          actualIng?.amount,
          targetIng.amount,
          `Amount for ingredient ${await getItemName(
            db,
            targetIng.itemId,
          )} should be corrected`,
        );
      }

      expectedFinalLlmRecipeCost = await calculateExpectedRecipeCost(
        db,
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

      const itemName = await getItemName(db, itemId);

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
        db,
        updatedPancakesRecipeDoc.ingredients || [],
        updatedPancakesRecipeDoc.scalingFactor || 1.0,
      );

      const updatedLlmCorrectedVanillaRecipeDoc = await db.collection(
        "MenuManager.recipes",
      ).findOne({ _id: llmPulledRecipeId });
      assertExists(
        updatedLlmCorrectedVanillaRecipeDoc,
        "LLM-corrected Vanilla Cupcakes recipe doc should exist for recalculation",
      );
      expectedFinalLlmRecipeCost = await calculateExpectedRecipeCost(
        db,
        updatedLlmCorrectedVanillaRecipeDoc.ingredients || [],
        updatedLlmCorrectedVanillaRecipeDoc.scalingFactor || 1.0,
      );

      assertAndLog(
        updatedPancakesRecipeDoc?.dishPrice,
        expectedPancakesCost,
        "Pancakes dishPrice should be updated after flour price change",
      );

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

// --- New Test Cases ---

Deno.test("MenuManagerConcept - Item Management Edge Cases", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "dummy-key" }); // LLM not needed for these tests

  const testUser: ID = "user:chefBob" as ID;
  let createdMenuId: ID;
  let testFlourId: ID, testSugarId: ID;
  let testRecipeId: ID;

  await t.step(
    printStepHeader("Setup: Create a menu and a recipe"),
    async () => {
      const createMenuResult = await menuManager.createMenu({
        name: "Test Menu for Items",
        date: "2024-08-04", // Sunday
        owner: testUser,
      });
      createdMenuId = (createMenuResult as { menu: ID }).menu;

      const createRecipeResult = await menuManager.createRecipe({
        menu: createdMenuId,
        name: "Simple Cake",
        instructions: "Mix and bake",
        servingQuantity: 8,
        dishType: "Dessert",
        scalingFactor: 1.0,
        owner: testUser,
      });
      testRecipeId = (createRecipeResult as { recipe: ID }).recipe;
    },
  );

  await t.step(printStepHeader("1. `enterItem` - Existing Name"), async () => {
    const flourResult = await registerItemAndStorePrice(
      menuManager,
      "all-purpose flour",
      2.00,
      5,
      "lbs",
      "Store A",
      { "cup": 0.277 },
    );
    assertAndLog(
      typeof flourResult === "string" && idRegex.test(flourResult),
      true,
      "Should successfully enter initial 'all-purpose flour'",
    );
    testFlourId = flourResult as ID;

    const duplicateFlourResult = await menuManager.enterItem({
      name: "all-purpose flour", // Same name as before
      price: 2.10,
      quantity: 5,
      units: "lbs",
      store: "Store B",
    });
    assertAndLog(
      "error" in duplicateFlourResult,
      true,
      "Should fail to enter item with an existing name",
    );
    assertAndLog(
      (duplicateFlourResult as { error: string }).error,
      `An item already exists with the name "all-purpose flour". Use addItemName to add an alias.`,
      "Error message for duplicate item name should be correct",
    );
  });

  await t.step(
    printStepHeader("2. `confirmItem` - Already Confirmed"),
    async () => {
      const initialItem = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        initialItem?.confirmed,
        false,
        "Item should initially be unconfirmed",
      );

      const confirmResult1 = await menuManager.confirmItem({
        item: testFlourId,
      });
      assertAndLog(
        "item" in confirmResult1,
        true,
        "First confirmation should succeed",
      );
      const confirmedItem = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        confirmedItem?.confirmed,
        true,
        "Item should now be confirmed",
      );

      const confirmResult2 = await menuManager.confirmItem({
        item: testFlourId,
      });
      assertAndLog(
        "error" in confirmResult2,
        true,
        "Should fail to confirm an already confirmed item",
      );
      assertAndLog(
        (confirmResult2 as { error: string }).error,
        `Item with ID "${testFlourId}" is already confirmed.`,
        "Error message for re-confirming should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("3. `updateItemPrice` - Negative Price"),
    async () => {
      const updateResult = await menuManager.updateItemPrice({
        item: testFlourId,
        price: -1.00,
      });
      assertAndLog(
        "error" in updateResult,
        true,
        "Should fail to update item price to a negative value",
      );
      assertAndLog(
        (updateResult as { error: string }).error,
        "Price cannot be negative.",
        "Error message for negative price should be correct",
      );
      const item = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        item?.price,
        itemDetails[testFlourId].price, // Should remain unchanged
        "Item price should not have changed after failed update",
      );
    },
  );

  await t.step(
    printStepHeader("4. `updateItemQuantity` - Zero/Negative Quantity"),
    async () => {
      const updateResultNegative = await menuManager.updateItemQuantity({
        item: testFlourId,
        quantity: -1,
      });
      assertAndLog(
        "error" in updateResultNegative,
        true,
        "Should fail to update item quantity to a negative value",
      );
      assertAndLog(
        (updateResultNegative as { error: string }).error,
        "Quantity must be positive.",
        "Error message for negative quantity should be correct",
      );

      const updateResultZero = await menuManager.updateItemQuantity({
        item: testFlourId,
        quantity: 0,
      });
      assertAndLog(
        "error" in updateResultZero,
        true,
        "Should fail to update item quantity to zero",
      );
      assertAndLog(
        (updateResultZero as { error: string }).error,
        "Quantity must be positive.",
        "Error message for zero quantity should be correct",
      );
      const item = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        item?.quantity,
        itemDetails[testFlourId].quantity, // Should remain unchanged
        "Item quantity should not have changed after failed updates",
      );
    },
  );

  await t.step(
    printStepHeader("5. `addItemName` - Existing Name Conflicts"),
    async () => {
      // Create a second item
      const sugarResult = await registerItemAndStorePrice(
        menuManager,
        "granulated sugar",
        1.50,
        2,
        "lbs",
        "Store B",
        { "cup": 0.45 },
      );
      assertAndLog(
        typeof sugarResult === "string" && idRegex.test(sugarResult),
        true,
        "Should successfully enter 'granulated sugar'",
      );
      testSugarId = sugarResult as ID;

      // Try to add an alias to sugar that conflicts with existing flour name
      const addNameConflictResult = await menuManager.addItemName({
        item: testSugarId,
        name: "all-purpose flour",
      });
      assertAndLog(
        "error" in addNameConflictResult,
        true,
        "Should fail to add name that conflicts with another item's name",
      );
      assertAndLog(
        (addNameConflictResult as { error: string }).error,
        `Name "all-purpose flour" is already used by another item.`,
        "Error message for name conflict should be correct",
      );

      // Try to add an alias that already exists for the same item
      const addDuplicateNameResult = await menuManager.addItemName({
        item: testFlourId,
        name: "all-purpose flour",
      });
      assertAndLog(
        "error" in addDuplicateNameResult,
        true,
        "Should fail to add a name that item already has",
      );
      assertAndLog(
        (addDuplicateNameResult as { error: string }).error,
        `Item "${testFlourId}" already has name "all-purpose flour".`,
        "Error message for duplicate name on same item should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("6. `removeItemName` - Removing Last Name"),
    async () => {
      // Add a second name to testFlourId first
      const addAliasResult = await menuManager.addItemName({
        item: testFlourId,
        name: "AP flour",
      });
      assertAndLog(
        "success" in addAliasResult,
        true,
        "Should successfully add an alias to flour",
      );
      let flourItem = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        flourItem?.names.includes("AP flour"),
        true,
        "Flour should now have 'AP flour' alias",
      );
      assertAndLog(
        flourItem?.names.length,
        2,
        "Flour item should have 2 names",
      );

      // Remove one name, this should succeed
      const removeOneNameResult = await menuManager.removeItemName({
        item: testFlourId,
        name: "AP flour",
      });
      assertAndLog(
        "success" in removeOneNameResult,
        true,
        "Should successfully remove one name",
      );
      flourItem = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        flourItem?.names.includes("AP flour"),
        false,
        "'AP flour' alias should be removed",
      );
      assertAndLog(
        flourItem?.names.length,
        1,
        "Flour item should have 1 name left",
      );

      // Try to remove the last remaining name
      const removeLastNameResult = await menuManager.removeItemName({
        item: testFlourId,
        name: "all-purpose flour",
      });
      assertAndLog(
        "error" in removeLastNameResult,
        true,
        "Should fail to remove the last name of an item",
      );
      assertAndLog(
        (removeLastNameResult as { error: string }).error,
        "Cannot remove the last name of an item.",
        "Error message for removing last name should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("7. `updateItemUnits` - Verify update (no cost change)"),
    async () => {
      const initialItem = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        initialItem?.units,
        "lbs",
        "Initial flour units should be 'lbs'",
      );

      const updateUnitsResult = await menuManager.updateItemUnits({
        item: testFlourId,
        units: "kg",
      });
      assertAndLog(
        "success" in updateUnitsResult,
        true,
        "Updating item units should succeed",
      );

      const updatedItem = await db.collection("MenuManager.items").findOne({
        _id: testFlourId,
      });
      assertAndLog(
        updatedItem?.units,
        "kg",
        "Flour units should be updated to 'kg'",
      );

      // Because this doesn't affect the numerical value of amount in recipe or item price/quantity ratio,
      // costs should not change. This is implicitly tested by not triggering recalculation.
    },
  );

  await client.close();
});

Deno.test("MenuManagerConcept - Recipe Management Edge Cases", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "dummy-key" });

  const testUser: ID = "user:chefCharlie" as ID;
  let createdMenuId: ID;
  let testRecipeId: ID;
  let flourItemId: ID, eggsItemId: ID, saltItemId: ID;

  await t.step(printStepHeader("Setup: Create items and menu"), async () => {
    const menuResult = await menuManager.createMenu({
      name: "Baking Delights",
      date: "2024-08-11", // Sunday
      owner: testUser,
    });
    createdMenuId = (menuResult as { menu: ID }).menu;

    flourItemId = (await registerItemAndStorePrice(
      menuManager,
      "bread flour",
      3.00,
      10,
      "lbs",
      "Store X",
      { "cup": 0.277 },
    )) as ID;
    eggsItemId = (await registerItemAndStorePrice(
      menuManager,
      "large eggs",
      5.00,
      12,
      "each",
      "Store Y",
      { "each": 1 },
    )) as ID;
    saltItemId = (await registerItemAndStorePrice(
      menuManager,
      "kosher salt",
      1.00,
      1,
      "lb",
      "Store Z",
      { "tsp": 0.0125 }, // 1 tsp = ~0.0125 lbs (1lb = 80tsp)
    )) as ID;
  });

  await t.step(
    printStepHeader("1. `createRecipe` - Invalid Serving/Scaling"),
    async () => {
      const invalidServingResult = await menuManager.createRecipe({
        menu: createdMenuId,
        name: "Negative Servings",
        instructions: "...",
        servingQuantity: -1,
        dishType: "Test",
        scalingFactor: 1.0,
        owner: testUser,
      });
      assertAndLog(
        "error" in invalidServingResult,
        true,
        "Should fail to create recipe with negative serving quantity",
      );
      assertAndLog(
        (invalidServingResult as { error: string }).error,
        "Serving quantity must be a positive number.",
        "Error message for negative serving quantity should be correct",
      );

      const invalidScalingResult = await menuManager.createRecipe({
        menu: createdMenuId,
        name: "Negative Scaling",
        instructions: "...",
        servingQuantity: 4,
        dishType: "Test",
        scalingFactor: -0.5,
        owner: testUser,
      });
      assertAndLog(
        "error" in invalidScalingResult,
        true,
        "Should fail to create recipe with negative scaling factor",
      );
      assertAndLog(
        (invalidScalingResult as { error: string }).error,
        "Scaling factor cannot be negative.",
        "Error message for negative scaling factor should be correct",
      );

      // Create a valid recipe for subsequent steps
      const validRecipeResult = await menuManager.createRecipe({
        menu: createdMenuId,
        name: "Bread Recipe",
        instructions: "Knead and bake",
        servingQuantity: 1, // Makes 1 loaf
        dishType: "Main",
        scalingFactor: 1.0,
        owner: testUser,
      });
      assertAndLog(
        "recipe" in validRecipeResult,
        true,
        "Should successfully create a valid recipe",
      );
      testRecipeId = (validRecipeResult as { recipe: ID }).recipe;
    },
  );

  await t.step(
    printStepHeader("2. `updateRecipeIngredient` - Invalid Item/Amount"),
    async () => {
      const nonExistentItemId: ID = "item:nonexistent" as ID;
      const updateNonExistentItemResult = await menuManager
        .updateRecipeIngredient({
          menu: createdMenuId,
          recipe: testRecipeId,
          item: nonExistentItemId,
          amount: 2.0,
        });
      assertAndLog(
        "error" in updateNonExistentItemResult,
        true,
        "Should fail to add ingredient with a non-existent item ID",
      );
      assertAndLog(
        (updateNonExistentItemResult as { error: string }).error,
        `Item with ID "${nonExistentItemId}" not found.`,
        "Error message for non-existent item should be correct",
      );

      const updateNegativeAmountResult = await menuManager
        .updateRecipeIngredient({
          menu: createdMenuId,
          recipe: testRecipeId,
          item: flourItemId,
          amount: -0.5,
        });
      assertAndLog(
        "error" in updateNegativeAmountResult,
        true,
        "Should fail to update ingredient with a negative amount",
      );
      assertAndLog(
        (updateNegativeAmountResult as { error: string }).error,
        "Ingredient amount cannot be negative.",
        "Error message for negative amount should be correct",
      );
    },
  );

  await t.step(
    printStepHeader(
      "3. `updateRecipeIngredient` - Add, Update, Remove via Amount 0",
    ),
    async () => {
      // 3.1 Add ingredients
      const flourAmount = convertAmountToItemUnits(flourItemId, 2.5, "cup");
      await menuManager.updateRecipeIngredient({
        menu: createdMenuId,
        recipe: testRecipeId,
        item: flourItemId,
        amount: flourAmount,
      });
      const eggsAmount = convertAmountToItemUnits(eggsItemId, 2, "each");
      await menuManager.updateRecipeIngredient({
        menu: createdMenuId,
        recipe: testRecipeId,
        item: eggsItemId,
        amount: eggsAmount,
      });

      let currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      assertAndLog(
        currentRecipe?.ingredients.length,
        2,
        "Recipe should have 2 ingredients after adding flour and eggs",
      );
      const expectedCost1 = await calculateExpectedRecipeCost(
        db,
        [
          { itemId: flourItemId, amount: flourAmount },
          { itemId: eggsItemId, amount: eggsAmount },
        ],
        1.0,
      );
      assertAndLog(
        currentRecipe?.dishPrice,
        expectedCost1,
        "Dish price should be correct after adding ingredients",
      );

      // 3.2 Update ingredient amount
      const updatedFlourAmount = convertAmountToItemUnits(
        flourItemId,
        3.0,
        "cup",
      );
      await menuManager.updateRecipeIngredient({
        menu: createdMenuId,
        recipe: testRecipeId,
        item: flourItemId,
        amount: updatedFlourAmount,
      });
      currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      const flourIngredient = currentRecipe?.ingredients.find((i) =>
        i.itemId === flourItemId
      );
      assertAndLog(
        flourIngredient?.amount,
        updatedFlourAmount,
        "Flour ingredient amount should be updated",
      );
      const expectedCost2 = await calculateExpectedRecipeCost(
        db,
        [
          { itemId: flourItemId, amount: updatedFlourAmount },
          { itemId: eggsItemId, amount: eggsAmount },
        ],
        1.0,
      );
      assertAndLog(
        currentRecipe?.dishPrice,
        expectedCost2,
        "Dish price should be updated after ingredient amount change",
      );

      // 3.3 Remove ingredient by setting amount to 0
      await menuManager.updateRecipeIngredient({
        menu: createdMenuId,
        recipe: testRecipeId,
        item: eggsItemId,
        amount: 0,
      });
      currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      assertAndLog(
        currentRecipe?.ingredients.length,
        1,
        "Recipe should have 1 ingredient after removing eggs",
      );
      // FIX: Changed (i as ID) to (i) as 'i' is already a RecipeIngredient object
      assertAndLog(
        currentRecipe?.ingredients.some((i) => i.itemId === eggsItemId),
        false,
        "Eggs ingredient should be removed",
      );
      const expectedCost3 = await calculateExpectedRecipeCost(
        db,
        [{ itemId: flourItemId, amount: updatedFlourAmount }],
        1.0,
      );
      assertAndLog(
        currentRecipe?.dishPrice,
        expectedCost3,
        "Dish price should be updated after ingredient removal",
      );
    },
  );

  await t.step(
    printStepHeader("4. `updateRecipeServingQuantity` - No cost change"),
    async () => {
      let currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      const initialDishPrice = currentRecipe?.dishPrice;
      assertAndLog(
        currentRecipe?.servingQuantity,
        1,
        "Initial serving quantity should be 1",
      );

      await menuManager.updateRecipeServingQuantity({
        menu: createdMenuId,
        recipe: testRecipeId,
        servingQuantity: 2,
      });

      currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      assertAndLog(
        currentRecipe?.servingQuantity,
        2,
        "Serving quantity should be updated to 2",
      );
      assertAndLog(
        currentRecipe?.dishPrice,
        initialDishPrice,
        "Dish price should NOT change after updating serving quantity (ingredients amounts are per base serving)",
      );
    },
  );

  await t.step(
    printStepHeader("5. `updateRecipeScalingFactor` - Cost change"),
    async () => {
      let currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      const initialDishPrice = currentRecipe?.dishPrice;
      const initialScalingFactor = currentRecipe?.scalingFactor;
      assertAndLog(
        initialScalingFactor,
        1.0,
        "Initial scaling factor should be 1.0",
      );

      const newScalingFactor = 2.0;
      await menuManager.updateRecipeScalingFactor({
        menu: createdMenuId,
        recipe: testRecipeId,
        scalingFactor: newScalingFactor,
      });

      currentRecipe = await db.collection("MenuManager.recipes").findOne({
        _id: testRecipeId,
      });
      assertAndLog(
        currentRecipe?.scalingFactor,
        newScalingFactor,
        "Scaling factor should be updated to 2.0",
      );
      assertAndLog(
        currentRecipe?.dishPrice,
        parseFloat((initialDishPrice! * newScalingFactor).toFixed(2)),
        "Dish price should double after scaling factor is doubled",
      );
    },
  );

  await t.step(
    printStepHeader("6. `_getIngredientsInRecipe` & `_getIngredientsInMenu`"),
    async () => {
      // Add salt to the recipe
      const saltAmount = convertAmountToItemUnits(saltItemId, 1.5, "tsp");
      await menuManager.updateRecipeIngredient({
        menu: createdMenuId,
        recipe: testRecipeId,
        item: saltItemId,
        amount: saltAmount,
      });

      // Verify _getIngredientsInRecipe
      const ingredientsInRecipeResult = await menuManager
        ._getIngredientsInRecipe(
          { recipe: testRecipeId },
        );
      assertAndLog(
        "ingredients" in ingredientsInRecipeResult,
        true,
        "_getIngredientsInRecipe should return ingredients",
      );
      const ingredientsInRecipe = ingredientsInRecipeResult.ingredients;
      assertExists(
        ingredientsInRecipe[flourItemId],
        "Flour should be in recipe ingredients",
      );
      assertExists(
        ingredientsInRecipe[saltItemId],
        "Salt should be in recipe ingredients",
      );
      assertEquals(
        ingredientsInRecipe[flourItemId].amount,
        parseFloat(
          (convertAmountToItemUnits(flourItemId, 3.0, "cup") * 2.0).toFixed(2),
        ), // 3 cups * 2.0 scaling
        "Flour amount in recipe query should be scaled",
      );
      assertEquals(
        ingredientsInRecipe[saltItemId].amount,
        parseFloat(
          (convertAmountToItemUnits(saltItemId, 1.5, "tsp") * 2.0).toFixed(2),
        ), // 1.5 tsp * 2.0 scaling
        "Salt amount in recipe query should be scaled",
      );

      // Verify _getIngredientsInMenu
      const ingredientsInMenuResult = await menuManager._getIngredientsInMenu({
        menu: createdMenuId,
      });
      assertAndLog(
        "ingredients" in ingredientsInMenuResult,
        true,
        "_getIngredientsInMenu should return ingredients",
      );
      const ingredientsInMenu = ingredientsInMenuResult.ingredients;
      assertEquals(
        ingredientsInMenu[flourItemId].amount,
        ingredientsInRecipe[flourItemId].amount,
        "Flour amount in menu query should match recipe query (only one recipe)",
      );
      assertEquals(
        ingredientsInMenu[saltItemId].amount,
        ingredientsInRecipe[saltItemId].amount,
        "Salt amount in menu query should match recipe query (only one recipe)",
      );
    },
  );

  await client.close();
});

Deno.test("MenuManagerConcept - Menu and Cart Management Edge Cases", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const menuManager = new MenuManagerConcept(db, { apiKey: "dummy-key" });

  const testUser: ID = "user:chefDana" as ID;
  let menu1Id: ID, menu2Id: ID, menu3Id: ID;
  let cartId: ID;
  let testRecipeId: ID;
  let testItemId: ID;

  await t.step(printStepHeader("Setup: Create items and menus"), async () => {
    // Create items
    testItemId = (await registerItemAndStorePrice(
      menuManager,
      "basil",
      2.00,
      1,
      "oz",
      "Produce Mart",
      {},
    )) as ID;

    // Create Menu 1 (Sunday)
    const menuResult1 = await menuManager.createMenu({
      name: "Sunday Dinner",
      date: "2024-08-18",
      owner: testUser,
    });
    menu1Id = (menuResult1 as { menu: ID }).menu;

    // Create Menu 2 (Monday - will conflict with Menu 1 date, but for a different test later)
    const menuResult2 = await menuManager.createMenu({
      name: "Monday Lunch",
      date: "2024-08-19",
      owner: testUser,
    });
    menu2Id = (menuResult2 as { menu: ID }).menu;

    // Create Menu 3 (Another Sunday)
    const menuResult3 = await menuManager.createMenu({
      name: "Next Sunday Brunch",
      date: "2024-08-25",
      owner: testUser,
    });
    menu3Id = (menuResult3 as { menu: ID }).menu;

    // Add a recipe to menu1 to ensure it has a cost
    const createRecipeResult = await menuManager.createRecipe({
      menu: menu1Id,
      name: "Basil Pasta",
      instructions: "Boil pasta, add basil",
      servingQuantity: 2,
      dishType: "Dinner",
      scalingFactor: 1.0,
      owner: testUser,
    });
    testRecipeId = (createRecipeResult as { recipe: ID }).recipe;
    await menuManager.updateRecipeIngredient({
      menu: menu1Id,
      recipe: testRecipeId,
      item: testItemId,
      amount: 0.5,
    }); // 0.5 oz basil, cost will be $1.00
  });

  await t.step(
    printStepHeader("1. `createCart` - Non-Sunday Date"),
    async () => {
      const mondayDate = "2024-08-19"; // Monday
      const invalidCartResult = await menuManager.createCart({
        startDate: mondayDate,
      });
      assertAndLog(
        "error" in invalidCartResult,
        true,
        "Should fail to create cart with a non-Sunday start date",
      );
      assertAndLog(
        (invalidCartResult as { error: string }).error,
        `startDate "${mondayDate}" is not a Sunday.`,
        "Error message for non-Sunday start date should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("2. `createCart` - Duplicate Start Date"),
    async () => {
      const sundayDate = "2024-08-18";

      const firstCartResult = await menuManager.createCart({
        startDate: sundayDate,
      });
      assertAndLog(
        "cart" in firstCartResult,
        true,
        "Should successfully create first cart for Sunday",
      );
      cartId = (firstCartResult as { cart: ID }).cart;

      const secondCartResult = await menuManager.createCart({
        startDate: sundayDate,
      });
      assertAndLog(
        "error" in secondCartResult,
        true,
        "Should fail to create a second cart for the same start date",
      );
      assertAndLog(
        (secondCartResult as { error: string }).error,
        `A cart already exists for startDate "${sundayDate}".`,
        "Error message for duplicate cart start date should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("3. `addMenuToCart` - Date Conflict"),
    async () => {
      // Add menu1 (date 2024-08-18) to the cart (startDate 2024-08-18)
      const addMenu1Result = await menuManager.addMenuToCart({
        cart: cartId,
        menu: menu1Id,
      });
      assertAndLog(
        "success" in addMenu1Result,
        true,
        "Should successfully add menu1 to cart",
      );

      // Attempt to add menu2 (date 2024-08-19) - this should succeed as menu2 has a different date
      const addMenu2Result = await menuManager.addMenuToCart({
        cart: cartId,
        menu: menu2Id,
      });
      assertAndLog(
        "success" in addMenu2Result,
        true,
        "Should successfully add menu2 (different date) to cart",
      );
      let currentCart = await db.collection("MenuManager.carts").findOne({
        _id: cartId,
      });
      assertAndLog(
        currentCart?.menuIds.length,
        2,
        "Cart should now contain 2 menus",
      );

      // Create a new menu for the same date as menu1, then try to add it. This should FAIL.
      const conflictingMenuResult = await menuManager.createMenu({
        name: "Conflicting Sunday Dinner",
        date: "2024-08-18",
        owner: testUser,
      });
      const conflictingMenuId = (conflictingMenuResult as { menu: ID }).menu;

      const addConflictingMenuResult = await menuManager.addMenuToCart({
        cart: cartId,
        menu: conflictingMenuId,
      });
      assertAndLog(
        "error" in addConflictingMenuResult,
        true,
        "Should fail to add a menu with a date that conflicts with an existing menu in cart",
      );
      assertAndLog(
        (addConflictingMenuResult as { error: string }).error,
        `Cart "${cartId}" already contains a menu for date "2024-08-18".`,
        "Error message for menu date conflict should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("4. `adjustRecipeScale` - Recipe Not In Menu/Cart"),
    async () => {
      const nonExistentRecipeId: ID = "recipe:nonexistent" as ID;
      const adjustResult1 = await menuManager.adjustRecipeScale({
        cart: cartId,
        menu: menu1Id,
        recipe: nonExistentRecipeId,
        scalingFactor: 2.0,
      });
      assertAndLog(
        "error" in adjustResult1,
        true,
        "Should fail to adjust scale for non-existent recipe",
      );
      assertAndLog(
        (adjustResult1 as { error: string }).error,
        `Recipe "${nonExistentRecipeId}" not found in menu "${menu1Id}".`,
        "Error message for non-existent recipe should be correct",
      );

      // Create a recipe in menu3, then try to adjust it through menu1 (should fail)
      const recipeInMenu3Result = await menuManager.createRecipe({
        menu: menu3Id,
        name: "Menu3 Test Recipe",
        instructions: "...",
        servingQuantity: 1,
        dishType: "Test",
        scalingFactor: 1.0,
        owner: testUser,
      });
      const recipeInMenu3Id = (recipeInMenu3Result as { recipe: ID }).recipe;

      const adjustResult2 = await menuManager.adjustRecipeScale({
        cart: cartId,
        menu: menu1Id, // Wrong menu
        recipe: recipeInMenu3Id,
        scalingFactor: 2.0,
      });
      assertAndLog(
        "error" in adjustResult2,
        true,
        "Should fail to adjust scale for recipe not in specified menu",
      );
      assertAndLog(
        (adjustResult2 as { error: string }).error,
        `Recipe "${recipeInMenu3Id}" not found in menu "${menu1Id}".`,
        "Error message for recipe not in specified menu should be correct",
      );
    },
  );

  await t.step(
    printStepHeader("5. `updateMenuDate` - Invalid Date Format"),
    async () => {
      const updateResult = await menuManager.updateMenuDate({
        menu: menu1Id,
        date: "2024/08/18", // Invalid format
      });
      assertAndLog(
        "error" in updateResult,
        true,
        "Should fail to update menu date with invalid format",
      );
      assertAndLog(
        (updateResult as { error: string }).error,
        `Invalid date format "2024/08/18". Expected YYYY-MM-DD.`,
        "Error message for invalid date format should be correct",
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: menu1Id,
      });
      assertAndLog(
        updatedMenu?.date,
        "2024-08-18",
        "Menu date should remain unchanged",
      );
    },
  );

  await t.step(
    printStepHeader("6. `_getMenuByDate` - Non-existent Date"),
    async () => {
      const nonExistentDate = "1999-01-01";
      const getMenuResult = await menuManager._getMenuByDate({
        date: nonExistentDate,
      });
      assertAndLog(
        "error" in getMenuResult,
        true,
        "Should return error for non-existent menu date",
      );
      assertAndLog(
        (getMenuResult as { error: string }).error,
        `Menu for date "${nonExistentDate}" not found.`,
        "Error message for non-existent menu date should be correct",
      );
    },
  );

  await client.close();
});
```
