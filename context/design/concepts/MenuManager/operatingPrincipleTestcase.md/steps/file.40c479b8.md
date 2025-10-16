---
timestamp: 'Wed Oct 15 2025 20:26:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_202610.20d50a8e.md]]'
content_id: 40c479b8f5befdc64bc8546484ce06f6dc28c26b90ce67460906ec7e0134787a
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
    console.error(`      Error in "${stepMessage}": ${message}`);
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

Deno.test("MenuManagerConcept - Full Lifecycle Test", async (t) => {
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
  const adminUser: ID = "user:adminBob" as ID; // For item confirmation
  let createdMenuId: ID;
  let pancakesRecipeId: ID;
  let manualVanillaCupcakesRecipeId: ID; // For Part 2, a manually entered vanilla cupcake recipe
  let llmPulledRecipeId: ID; // For Part 3, the LLM-pulled recipe
  let flourItemId: ID, milkItemId: ID, eggItemId: ID, butterItemId: ID;
  let sugarItemId: ID, bakingPowderItemId: ID, waterItemId: ID;
  let cartId: ID;

  // Store expected state of items for cost calculation
  interface ItemExpectedPrice {
    price: number;
    quantity: number; // Base quantity for which 'price' is set (e.g., 5 for 5 lbs)
    units: string;
    // Conversion factors to convert common recipe units (cups, tbsp, tsp) to ItemDoc.units
    conversions: Record<string, number>; // e.g., {'cup': 0.277, 'lb': 1} for flour where ItemDoc.units is 'lbs'
  }
  const itemDetails: Record<ID, ItemExpectedPrice> = {};

  const registerItemAndStorePrice = async (
    name: string,
    price: number,
    quantity: number,
    units: string,
    store: string,
    conversions: Record<string, number>,
    stepMessage: string,
    checkIndex: number[],
  ): Promise<ID> => {
    const itemResult = await menuManager.enterItem({
      name,
      price,
      quantity,
      units,
      store,
    });
    assertAndLog(
      "item" in itemResult,
      true,
      `Should successfully enter item "${name}"`,
      stepMessage,
      checkIndex[0]++,
    );
    const itemId = (itemResult as { item: ID }).item;
    assertExists(itemId, `Item ID for "${name}" should exist`);
    itemDetails[itemId] = { price, quantity, units, conversions };
    return itemId;
  };

  const convertAmountToItemUnits = (
    itemId: ID,
    amount: number,
    recipeUnit: string,
  ): number => {
    const item = itemDetails[itemId];
    if (!item) {
      throw new Error(`Item ${itemId} not found in itemDetails for conversion.`);
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
    recipeIngredients: { itemId: ID; amount: number }[],
    scalingFactor: number,
  ): Promise<number> => {
    let price = 0;
    for (const ing of recipeIngredients) {
      const itemInfo = itemDetails[ing.itemId];
      if (itemInfo && itemInfo.quantity > 0) {
        price += (itemInfo.price / itemInfo.quantity) * ing.amount; // ing.amount is already in item's base units
      }
    }
    return price * scalingFactor;
  };

  // --- Part One: User creates empty menu ---
  await t.step("Part One: User creates an empty menu", async () => {
    const stepMessage = "Part One: User creates an empty menu";
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
  await t.step("Part Two: Create and add manual recipes", async () => {
    printStepHeader("Part Two: Create and add manual recipes");

    // --- Sub-step 2.1: Register items with conversion factors ---
    await t.step("2.1 Register global items", async () => {
      const stepMessage = "2.1 Register global items";
      printStepHeader(stepMessage);
      let checkIndex = [0];

      // Conversions: Recipe Unit to ItemDoc.units (e.g., cup to lbs)
      flourItemId = await registerItemAndStorePrice(
        "flour",
        2.50,
        5,
        "lbs",
        "Whole Foods",
        { "cup": 0.277, "lbs": 1 }, // 1 cup = 0.277 lbs
        stepMessage,
        checkIndex,
      );
      milkItemId = await registerItemAndStorePrice(
        "milk",
        3.00,
        1,
        "gallon",
        "Safeway",
        { "cup": 0.0625, "gallon": 1 }, // 1 cup = 0.0625 gallons (16 cups/gallon)
        stepMessage,
        checkIndex,
      );
      eggItemId = await registerItemAndStorePrice(
        "egg",
        4.00,
        12,
        "each",
        "Safeway",
        { "each": 1 }, // 1 egg = 1 'each'
        stepMessage,
        checkIndex,
      );
      butterItemId = await registerItemAndStorePrice(
        "butter",
        5.00,
        1,
        "lb",
        "Trader Joe's",
        { "cup": 0.5, "tbsp": 0.03125, "lb": 1 }, // 1 cup = 0.5 lbs, 1 tbsp = 0.03125 lbs (1lb=32tbsp)
        stepMessage,
        checkIndex,
      );
      sugarItemId = await registerItemAndStorePrice(
        "sugar",
        2.00,
        4,
        "lbs",
        "Safeway",
        { "cup": 0.45, "tbsp": 0.028, "lbs": 1 }, // 1 cup = 0.45 lbs, 1 tbsp = 0.028 lbs (1lb=48tbsp)
        stepMessage,
        checkIndex,
      );
      bakingPowderItemId = await registerItemAndStorePrice(
        "baking powder",
        3.50,
        1,
        "oz",
        "Whole Foods",
        { "tsp": 0.166, "oz": 1 }, // 1 tsp = 0.166 oz (1oz=6tsp)
        stepMessage,
        checkIndex,
      );
      waterItemId = await registerItemAndStorePrice(
        "water",
        0.50,
        1,
        "gallon",
        "Costco",
        { "cup": 0.0625, "gallon": 1 }, // 1 cup = 0.0625 gallons
        stepMessage,
        checkIndex,
      );
    });

    // --- Sub-step 2.2: Create Classic Pancakes recipe ---
    await t.step("2.2 Create Classic Pancakes recipe", async () => {
      const stepMessage = "2.2 Create Classic Pancakes recipe";
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
      // Amounts converted from recipe units to item's stored units
      const pancakesIngredients = [
        { itemId: flourItemId, amount: convertAmountToItemUnits(flourItemId, 1, "cup") }, // 1 cup flour
        { itemId: milkItemId, amount: convertAmountToItemUnits(milkItemId, 0.75, "cup") }, // ¾ cup milk
        { itemId: eggItemId, amount: convertAmountToItemUnits(eggItemId, 1, "each") }, // 1 large egg
        { itemId: butterItemId, amount: convertAmountToItemUnits(butterItemId, 2, "tbsp") }, // 2 tbsp butter
        { itemId: sugarItemId, amount: convertAmountToItemUnits(sugarItemId, 1, "tbsp") }, // 1 tbsp sugar
        { itemId: bakingPowderItemId, amount: convertAmountToItemUnits(bakingPowderItemId, 2, "tsp") }, // 2 tsp baking powder
      ];

      for (const ing of pancakesIngredients) {
        const updateIngResult = await menuManager.updateRecipeIngredient({
          menu: createdMenuId,
          recipe: pancakesRecipeId,
          item: ing.itemId,
          amount: ing.amount,
        });
        assertAndLog(
          "success" in updateIngResult,
          true,
          `Add ingredient ${ing.itemId} to Pancakes should succeed`,
          stepMessage,
          ++checkIndex,
        );
      }

      const expectedPancakesCost = await calculateExpectedRecipeCost(
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
        expectedPancakesCost,
        "Menu cost should reflect Pancakes recipe",
        stepMessage,
        ++checkIndex,
      );
    });

    // --- Sub-step 2.3: Create Vanilla Cupcakes recipe (manual) ---
    await t.step("2.3 Create Vanilla Cupcakes recipe (manual)", async () => {
      const stepMessage = "2.3 Create Vanilla Cupcakes recipe (manual)";
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
      // Amounts converted from recipe units to item's stored units
      const vanillaCupcakesIngredients = [
        { itemId: flourItemId, amount: convertAmountToItemUnits(flourItemId, 1.75, "cup") }, // 1 3/4 cup flour
        { itemId: milkItemId, amount: convertAmountToItemUnits(milkItemId, 1, "cup") }, // 1 cup milk
        { itemId: butterItemId, amount: convertAmountToItemUnits(butterItemId, 0.25, "cup") }, // ¼ cup butter
        { itemId: waterItemId, amount: convertAmountToItemUnits(waterItemId, 1, "cup") }, // 1 cup water
      ];

      for (const ing of vanillaCupcakesIngredients) {
        const updateIngResult = await menuManager.updateRecipeIngredient({
          menu: createdMenuId,
          recipe: manualVanillaCupcakesRecipeId,
          item: ing.itemId,
          amount: ing.amount,
        });
        assertAndLog(
          "success" in updateIngResult,
          true,
          `Add ingredient ${ing.itemId} to Vanilla Cupcakes (Manual) should succeed`,
          stepMessage,
          ++checkIndex,
        );
      }

      const expectedVanillaCost = await calculateExpectedRecipeCost(
        vanillaCupcakesIngredients,
        1.0,
      );
      const updatedVanillaRecipe = await db.collection("MenuManager.recipes")
        .findOne({ _id: manualVanillaCupcakesRecipeId });
      assertAndLog(
        updatedVanillaRecipe?.dishPrice,
        expectedVanillaCost,
        "Vanilla Cupcakes (Manual) dishPrice should be correct",
        stepMessage,
        ++checkIndex,
      );

      const updatedMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      assertAndLog(
        updatedMenu?.menuCost,
        expectedPancakesCost + expectedVanillaCost,
        "Menu cost should reflect both recipes",
        stepMessage,
        ++checkIndex,
      );
    });
  });

  // --- Part Three: LLM Recipe Pull and Update ---
  await t.step("Part Three: LLM Recipe Pull and Update", async () => {
    printStepHeader("Part Three: LLM Recipe Pull and Update");

    const birthdayCupcakesURL =
      "https://kirbiecravings.com/4-ingredient-birthday-cupcakes/";

    // --- Sub-step 3.1: Use LLM to pull in recipe from website ---
    await t.step("3.1 Use LLM to pull in recipe from website", async () => {
      const stepMessage = "3.1 Use LLM to pull in recipe from website";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const pullRecipeResult = await menuManager.pullRecipeFromWebsite({
        menu: createdMenuId,
        recipeURL: birthdayCupcakesURL,
        owner: testUser,
      });

      if ("error" in pullRecipeResult) {
        console.warn(
          `⚠️ LLM recipe pull returned an error: ${pullRecipeResult.error}. This step will proceed, but subsequent checks might reflect this. Ensure GEMINI_API_KEY is set and valid.`,
        );
        // If LLM fails, we cannot proceed with dynamic correction as there's no recipe to correct.
        // For testing robustness, we might want to throw here, but for "work around LLM output" we log.
        // For now, let's make it a critical check for the test to continue.
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
        const item = await db.collection("MenuManager.items").findOne({
          _id: ing.itemId,
        });
        console.log(`   - ${item?.names[0] || ing.itemId}: ${ing.amount}`);
      }

      // Check menu cost updated after LLM pull (value will vary based on LLM output)
      const currentMenu = await db.collection("MenuManager.menus").findOne({
        _id: createdMenuId,
      });
      assertExists(
        currentMenu?.menuCost,
        "Menu cost should be updated after LLM pull",
        stepMessage,
        ++checkIndex,
      );
    });

    // --- Sub-step 3.2: Update LLM-pulled recipe to match Recipe #2 (Vanilla Cupcakes) ---
    await t.step(
      "3.2 Update LLM-pulled recipe to match Recipe #2",
      async () => {
        const stepMessage = "3.2 Update LLM-pulled recipe to match Recipe #2";
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
        const targetVanillaCupcakesIngredients: {
          itemId: ID;
          amount: number;
        }[] = [
          { itemId: flourItemId, amount: convertAmountToItemUnits(flourItemId, 1.75, "cup") },
          { itemId: milkItemId, amount: convertAmountToItemUnits(milkItemId, 1, "cup") },
          { itemId: butterItemId, amount: convertAmountToItemUnits(butterItemId, 0.25, "cup") },
          { itemId: waterItemId, amount: convertAmountToItemUnits(waterItemId, 1, "cup") },
        ];

        // Fetch current ingredients parsed by LLM
        const currentLlmRecipeDoc = await db.collection("MenuManager.recipes")
          .findOne({ _id: llmPulledRecipeId });
        assertExists(currentLlmRecipeDoc, "LLM recipe should still exist");
        const llmParsedIngredients = currentLlmRecipeDoc?.ingredients || [];

        const processedItemIds = new Set<ID>();

        // 1. Correct amounts for ingredients LLM *did* parse and remove extraneous ones
        for (const ing of llmParsedIngredients) {
          const targetIngredient = targetVanillaCupcakesIngredients.find(
            (tIng) => tIng.itemId === ing.itemId,
          );

          let updatedAmount: number;
          if (targetIngredient) {
            // This ingredient *should* be in Recipe #2, update its amount
            updatedAmount = targetIngredient.amount;
            processedItemIds.add(ing.itemId);
          } else {
            // This ingredient was parsed by LLM but is *not* in Recipe #2, remove it
            updatedAmount = 0;
            const item = await db.collection("MenuManager.items").findOne({
              _id: ing.itemId,
            });
            console.log(
              `   Removing extraneous LLM-parsed ingredient: ${
                item?.names[0] || ing.itemId
              }`,
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
            `Update/remove ingredient ${ing.itemId} should succeed`,
            stepMessage,
            ++checkIndex,
          );
        }

        // 2. Add any ingredients that LLM *missed* but are in Recipe #2
        for (const targetIng of targetVanillaCupcakesIngredients) {
          if (!processedItemIds.has(targetIng.itemId)) {
            // This ingredient was not in LLM's parse, add it
            console.log(
              `   Adding missing ingredient: ${
                (await db.collection("MenuManager.items").findOne({
                  _id: targetIng.itemId,
                }))?.names[0] || targetIng.itemId
              }`,
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
              `Add missing ingredient ${targetIng.itemId} should succeed`,
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
            (ing) => ing.itemId === targetIng.itemId,
          );
          assertExists(
            actualIng,
            `Target ingredient ${targetIng.itemId} should be in final LLM recipe`,
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            actualIng?.amount,
            targetIng.amount,
            `Amount for ingredient ${targetIng.itemId} should be corrected`,
            stepMessage,
            ++checkIndex,
          );
        }

        const expectedFinalLlmRecipeCost = await calculateExpectedRecipeCost(
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
        const expectedTotalMenuCost = (await calculateExpectedRecipeCost(
          (
            await db.collection("MenuManager.recipes").findOne({
              _id: pancakesRecipeId,
            })
          )?.ingredients || [],
          1.0,
        )) +
          (await calculateExpectedRecipeCost(
            (
              await db.collection("MenuManager.recipes").findOne({
                _id: manualVanillaCupcakesRecipeId,
              })
            )?.ingredients || [],
            1.0,
          )) +
          expectedFinalLlmRecipeCost;

        assertAndLog(
          updatedMenu?.menuCost,
          expectedTotalMenuCost,
          "Menu cost should reflect all three recipes after LLM correction",
          stepMessage,
          ++checkIndex,
        );
      },
    );
  });

  // --- Part Four: Item Confirmation and Cart Management ---
  await t.step("Part Four: Item Confirmation and Cart Management", async () => {
    printStepHeader("Part Four: Item Confirmation and Cart Management");

    // --- Sub-step 4.1: Confirmation of each of the new ingredients ---
    await t.step("4.1 Confirm items", async () => {
      const stepMessage = "4.1 Confirm items";
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
          console.warn(`Item ${itemId} not found in DB, skipping confirmation.`);
          continue;
        }

        if (!initialItem?.confirmed) {
          const confirmResult = await menuManager.confirmItem({ item: itemId });
          assertAndLog(
            "item" in confirmResult,
            true,
            `Confirm item ${itemId} should succeed`,
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
            `Item ${itemId} should now be confirmed`,
            stepMessage,
            ++checkIndex,
          );
        } else {
          console.log(`    ℹ️ Item ${itemId} was already confirmed, skipping.`);
        }
      }
    });

    // --- Sub-step 4.2: Create a cart ---
    await t.step("4.2 Create a cart", async () => {
      const stepMessage = "4.2 Create a cart";
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
    await t.step("4.3 Add menu to the cart", async () => {
      const stepMessage = "4.3 Add menu to the cart";
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
      "4.4 Administrator updates item price, verify cost recalculation",
      async () => {
        const stepMessage =
          "4.4 Administrator updates item price, verify cost recalculation";
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
        const updatedPancakesRecipeDoc = await db.collection("MenuManager.recipes")
          .findOne({ _id: pancakesRecipeId });
        const expectedPancakesCost = await calculateExpectedRecipeCost(
          updatedPancakesRecipeDoc?.ingredients || [],
          updatedPancakesRecipeDoc?.scalingFactor || 1.0,
        );

        const updatedManualVanillaRecipeDoc = await db.collection(
          "MenuManager.recipes",
        ).findOne({ _id: manualVanillaCupcakesRecipeId });
        const expectedManualVanillaCost = await calculateExpectedRecipeCost(
          updatedManualVanillaRecipeDoc?.ingredients || [],
          updatedManualVanillaRecipeDoc?.scalingFactor || 1.0,
        );

        const updatedLlmCorrectedVanillaRecipeDoc = await db.collection(
          "MenuManager.recipes",
        ).findOne({ _id: llmPulledRecipeId });
        const expectedLlmCorrectedVanillaCost =
          await calculateExpectedRecipeCost(
            updatedLlmCorrectedVanillaRecipeDoc?.ingredients || [],
            updatedLlmCorrectedVanillaRecipeDoc?.scalingFactor || 1.0,
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
          expectedManualVanillaCost,
          "Manual Vanilla Cupcakes dishPrice should be updated after flour price change",
          stepMessage,
          ++checkIndex,
        );

        assertAndLog(
          updatedLlmCorrectedVanillaRecipeDoc?.dishPrice,
          expectedLlmCorrectedVanillaCost,
          "LLM-corrected Vanilla Cupcakes dishPrice should be updated after flour price change",
          stepMessage,
          ++checkIndex,
        );

        const updatedMenu = await db.collection("MenuManager.menus").findOne({
          _id: createdMenuId,
        });
        const expectedTotalMenuCost = expectedPancakesCost +
          expectedManualVanillaCost + expectedLlmCorrectedVanillaCost;
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
  });

  await client.close();
});
```
