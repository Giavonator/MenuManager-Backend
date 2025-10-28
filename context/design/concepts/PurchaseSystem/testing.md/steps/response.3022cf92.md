---
timestamp: 'Tue Oct 28 2025 19:09:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_190955.b888b92f.md]]'
content_id: 3022cf920498bd46c4f186d43caeb3f04dac44ceb79f6430d85fd24d5e78fc9d
---

# response:

```typescript
import { Deno } from "https://deno.land/std@0.224.0/testing/mod.ts";
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PurchaseSystemConcept from "./PurchaseSystemConcept.ts";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";

Deno.test("PurchaseSystemConcept - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let recipeId: ID;
  let pastaSelectId: ID,
    tomatoesSelectId: ID,
    groundBeefSelectId: ID;
  let spaghettiAtomicId: ID,
    penneAtomicId: ID,
    linguineAtomicId: ID;
  let cannedTomatoesAtomicId: ID,
    freshRomaTomatoesAtomicId: ID;
  let leanGroundBeefAtomicId: ID,
    regularGroundBeefAtomicId: ID;

  await t.step("1. Create a Recipe (CompositeOrder)", async () => {
    const stepMessage = "1. Create a Recipe (CompositeOrder)";
    printStepHeader(stepMessage);

    const createRecipeResult = await purchaseSystem.createCompositeOrder({
      associateID: "recipe:SpicyPasta" as ID,
    });
    assertAndLog(
      "compositeOrder" in createRecipeResult,
      true,
      "Recipe creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    recipeId = (createRecipeResult as { compositeOrder: ID }).compositeOrder;

    const queryResult = await purchaseSystem._getOrderByAssociateID({
      associateID: "recipe:SpicyPasta" as ID,
    });
    assertAndLog(
      "error" in queryResult,
      false,
      "Query for recipe should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queryResult as { order: { _id: ID } }[]).length,
      1,
      "Should find the created recipe",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queryResult as { order: { _id: ID } }[])[0].order._id,
      recipeId,
      "Queried recipe ID should match",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("2. Create Ingredients (SelectOrders)", async () => {
    const stepMessage = "2. Create Ingredients (SelectOrders)";
    printStepHeader(stepMessage);

    const createPastaResult = await purchaseSystem.createSelectOrder({
      associateID: "ingredient:Pasta" as ID,
    });
    assertAndLog(
      "selectOrder" in createPastaResult,
      true,
      "Pasta select order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    pastaSelectId = (createPastaResult as { selectOrder: ID }).selectOrder;

    const createTomatoesResult = await purchaseSystem.createSelectOrder({
      associateID: "ingredient:Tomatoes" as ID,
    });
    assertAndLog(
      "selectOrder" in createTomatoesResult,
      true,
      "Tomatoes select order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    tomatoesSelectId = (createTomatoesResult as { selectOrder: ID })
      .selectOrder;

    const createGroundBeefResult = await purchaseSystem.createSelectOrder({
      associateID: "ingredient:GroundBeef" as ID,
    });
    assertAndLog(
      "selectOrder" in createGroundBeefResult,
      true,
      "Ground Beef select order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    groundBeefSelectId = (createGroundBeefResult as { selectOrder: ID })
      .selectOrder;
  });

  await t.step("3. Add Purchasing Options (AtomicOrders) to Ingredients", async () => {
    const stepMessage = "3. Add Purchasing Options (AtomicOrders) to Ingredients";
    printStepHeader(stepMessage);

    // Pasta Options
    const createSpaghettiResult = await purchaseSystem.createAtomicOrder({
      selectOrder: pastaSelectId,
      associateID: "option:Spaghetti500g" as ID,
      quantity: 500,
      units: "g",
      price: 2.00,
    });
    assertAndLog(
      "atomicOrder" in createSpaghettiResult,
      true,
      "Spaghetti atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    spaghettiAtomicId = (createSpaghettiResult as { atomicOrder: ID })
      .atomicOrder;

    const createPenneResult = await purchaseSystem.createAtomicOrder({
      selectOrder: pastaSelectId,
      associateID: "option:Penne1kg" as ID,
      quantity: 1000,
      units: "g",
      price: 3.50,
    });
    assertAndLog(
      "atomicOrder" in createPenneResult,
      true,
      "Penne atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    penneAtomicId = (createPenneResult as { atomicOrder: ID }).atomicOrder;

    const createLinguineResult = await purchaseSystem.createAtomicOrder({
      selectOrder: pastaSelectId,
      associateID: "option:Linguine250g" as ID,
      quantity: 250,
      units: "g",
      price: 1.20,
    });
    assertAndLog(
      "atomicOrder" in createLinguineResult,
      true,
      "Linguine atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    linguineAtomicId = (createLinguineResult as { atomicOrder: ID })
      .atomicOrder;

    // Tomatoes Options
    const createCannedTomatoesResult = await purchaseSystem.createAtomicOrder({
      selectOrder: tomatoesSelectId,
      associateID: "option:CannedTomatoes400g" as ID,
      quantity: 400,
      units: "g",
      price: 1.50,
    });
    assertAndLog(
      "atomicOrder" in createCannedTomatoesResult,
      true,
      "Canned Tomatoes atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    cannedTomatoesAtomicId = (createCannedTomatoesResult as {
      atomicOrder: ID;
    }).atomicOrder;

    const createFreshRomaResult = await purchaseSystem.createAtomicOrder({
      selectOrder: tomatoesSelectId,
      associateID: "option:FreshRoma1kg" as ID,
      quantity: 1000,
      units: "g",
      price: 4.00,
    });
    assertAndLog(
      "atomicOrder" in createFreshRomaResult,
      true,
      "Fresh Roma atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    freshRomaTomatoesAtomicId = (createFreshRomaResult as { atomicOrder: ID })
      .atomicOrder;

    // Ground Beef Options
    const createLeanBeefResult = await purchaseSystem.createAtomicOrder({
      selectOrder: groundBeefSelectId,
      associateID: "option:LeanBeef500g" as ID,
      quantity: 500,
      units: "g",
      price: 5.00,
    });
    assertAndLog(
      "atomicOrder" in createLeanBeefResult,
      true,
      "Lean Ground Beef atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    leanGroundBeefAtomicId = (createLeanBeefResult as { atomicOrder: ID })
      .atomicOrder;

    const createRegularBeefResult = await purchaseSystem.createAtomicOrder({
      selectOrder: groundBeefSelectId,
      associateID: "option:RegularBeef1kg" as ID,
      quantity: 1000,
      units: "g",
      price: 8.00,
    });
    assertAndLog(
      "atomicOrder" in createRegularBeefResult,
      true,
      "Regular Ground Beef atomic order creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    regularGroundBeefAtomicId = (createRegularBeefResult as { atomicOrder: ID })
      .atomicOrder;
  });

  await t.step("4. Add Ingredients (SelectOrders) to Recipe (CompositeOrder)", async () => {
    const stepMessage = "4. Add Ingredients (SelectOrders) to Recipe (CompositeOrder)";
    printStepHeader(stepMessage);

    // Recipe needs 500g pasta -> scale factor for 500g base is 1.0
    const addPastaResult = await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: recipeId,
      selectOrder: pastaSelectId,
      scaleFactor: 1.0,
    });
    assertAndLog(
      "error" in addPastaResult,
      false,
      "Adding Pasta to recipe should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Recipe needs 800g tomatoes -> scale factor for 400g base is 2.0
    const addTomatoesResult = await purchaseSystem.addSelectOrderToCompositeOrder(
      {
        compositeOrder: recipeId,
        selectOrder: tomatoesSelectId,
        scaleFactor: 2.0,
      },
    );
    assertAndLog(
      "error" in addTomatoesResult,
      false,
      "Adding Tomatoes to recipe should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Recipe needs 500g ground beef -> scale factor for 500g base is 1.0
    const addGroundBeefResult = await purchaseSystem.addSelectOrderToCompositeOrder(
      {
        compositeOrder: recipeId,
        selectOrder: groundBeefSelectId,
        scaleFactor: 1.0,
      },
    );
    assertAndLog(
      "error" in addGroundBeefResult,
      false,
      "Adding Ground Beef to recipe should succeed",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("5. Calculate Optimal Purchase for the Recipe", async () => {
    const stepMessage = "5. Calculate Optimal Purchase for the Recipe";
    printStepHeader(stepMessage);

    const calculateResult = await purchaseSystem.calculateOptimalPurchase({
      compositeOrders: [recipeId],
    });
    assertAndLog(
      "error" in calculateResult,
      false,
      "Calculate optimal purchase should succeed",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("6. Verify Optimal Purchase and Cost", async () => {
    const stepMessage = "6. Verify Optimal Purchase and Cost";
    printStepHeader(stepMessage);

    // Expected Optimal Purchases:
    // Pasta (base 500g, scale 1.0): Spaghetti 500g @ $2.00 (1 unit) -> Total 1 Spaghetti 500g
    // Tomatoes (base 400g, scale 2.0, need 800g): Canned Diced 400g @ $1.50 (1 unit per 400g base) -> Total 2 Canned Diced 400g
    // Ground Beef (base 500g, scale 1.0): Lean Ground Beef 500g @ $5.00 (1 unit) -> Total 1 Lean Ground Beef 500g

    // Total Cost: $2.00 (Spaghetti) + $3.00 (2x Canned Diced) + $5.00 (Lean Ground Beef) = $10.00

    const optimalPurchaseResult = await purchaseSystem._getOptimalPurchase({
      compositeOrder: recipeId,
    });
    assertAndLog(
      "error" in optimalPurchaseResult,
      false,
      "Query optimal purchase should not return an error",
      stepMessage,
      ++checkIndex,
    );
    const optimalPurchase = (optimalPurchaseResult as {
      optimalPurchase: Record<ID, number>;
    }[])[0]?.optimalPurchase;
    assertExistsAndLog(
      optimalPurchase,
      "Optimal purchase should be defined",
      stepMessage,
      ++checkIndex,
    );

    assertAndLog(
      Object.keys(optimalPurchase).length,
      3,
      "Optimal purchase should contain 3 atomic orders",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      optimalPurchase[spaghettiAtomicId],
      1,
      "Spaghetti quantity should be 1",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      optimalPurchase[cannedTomatoesAtomicId],
      2,
      "Canned Tomatoes quantity should be 2",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      optimalPurchase[leanGroundBeefAtomicId],
      1,
      "Lean Ground Beef quantity should be 1",
      stepMessage,
      ++checkIndex,
    );

    const orderCostResult = await purchaseSystem._getOrderCost({
      compositeOrder: recipeId,
    });
    assertAndLog(
      "error" in orderCostResult,
      false,
      "Query order cost should not return an error",
      stepMessage,
      ++checkIndex,
    );
    const totalCost = (orderCostResult as { totalCost: number }[])[0]
      ?.totalCost;
    assertExistsAndLog(
      totalCost,
      "Total cost should be defined",
      stepMessage,
      ++checkIndex,
    );
    // Use a small epsilon for floating point comparison
    assertEquals(
      totalCost,
      10.00,
      `Total cost should be 10.00, but was ${totalCost}`,
    );
    console.log(`    ✅ Check ${++checkIndex}: Total cost is correct: $${totalCost}`);
  });

  await t.step("7. Purchase the Recipe", async () => {
    const stepMessage = "7. Purchase the Recipe";
    printStepHeader(stepMessage);

    const purchaseResult = await purchaseSystem.purchaseOrder({
      compositeOrder: recipeId,
    });
    assertAndLog(
      "error" in purchaseResult,
      false,
      "Purchasing the recipe should succeed",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("8. Verify Purchase Status and Prevent Re-purchase/Modification", async () => {
    const stepMessage = "8. Verify Purchase Status and Prevent Re-purchase/Modification";
    printStepHeader(stepMessage);

    const queryRecipeResult = await purchaseSystem._getOrderByAssociateID({
      associateID: "recipe:SpicyPasta" as ID,
    });
    const recipeDoc = (queryRecipeResult as { order: { purchased: boolean } }[])[0]
      ?.order;
    assertExistsAndLog(
      recipeDoc,
      "Recipe document should exist after purchase",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      recipeDoc.purchased,
      true,
      "Recipe should be marked as purchased",
      stepMessage,
      ++checkIndex,
    );

    // Attempt to purchase again (should fail)
    const rePurchaseResult = await purchaseSystem.purchaseOrder({
      compositeOrder: recipeId,
    });
    assertAndLog(
      "error" in rePurchaseResult,
      true,
      "Re-purchasing a purchased recipe should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (rePurchaseResult as { error: string }).error,
      `CompositeOrder '${recipeId}' has already been purchased.`,
      "Error message for re-purchase should match",
      stepMessage,
      ++checkIndex,
    );

    // Attempt to delete an atomic order (should not trigger recalculation for purchased root)
    const deleteAtomicResult = await purchaseSystem.deleteAtomicOrder({
      selectOrder: pastaSelectId,
      atomicOrder: spaghettiAtomicId,
    });
    assertAndLog(
      "error" in deleteAtomicResult,
      false, // Deleting the atomic order itself should still work
      "Deleting an atomic order should succeed (even if its parent tree is purchased)",
      stepMessage,
      ++checkIndex,
    );

    // Verify the recipe's cost hasn't changed (because it was purchased)
    const costAfterDeleteResult = await purchaseSystem._getOrderCost({
      compositeOrder: recipeId,
    });
    const costAfterDelete = (costAfterDeleteResult as { totalCost: number }[])[0]
      ?.totalCost;
    assertExistsAndLog(
      costAfterDelete,
      "Total cost should be defined after atomic order deletion",
      stepMessage,
      ++checkIndex,
    );
    assertEquals(
      costAfterDelete,
      10.00, // Should remain $10.00 because the root order was purchased
      `Total cost should still be 10.00 after atomic order deletion for purchased recipe`,
    );
    console.log(`    ✅ Check ${++checkIndex}: Total cost remains $${costAfterDelete} after child modification.`);
  });

  await client.close();
});

// Additional test for a different scenario (e.g., Composite order hierarchy)
Deno.test("PurchaseSystemConcept - Composite Hierarchy and Cycle Prevention", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let mealPlanId: ID;
  let lunchRecipeId: ID;
  let dinnerRecipeId: ID;

  await t.step("1. Create Meal Plan (Root Composite) and Two Recipes (Child Composites)", async () => {
    const stepMessage = "1. Create Meal Plan (Root Composite) and Two Recipes (Child Composites)";
    printStepHeader(stepMessage);

    const createMealPlanResult = await purchaseSystem.createCompositeOrder({ associateID: "mealPlan:Weekly" as ID });
    assertAndLog("compositeOrder" in createMealPlanResult, true, "Meal Plan creation should succeed", stepMessage, ++checkIndex);
    mealPlanId = (createMealPlanResult as { compositeOrder: ID }).compositeOrder;

    const createLunchResult = await purchaseSystem.createCompositeOrder({ associateID: "recipe:Lunch" as ID });
    assertAndLog("compositeOrder" in createLunchResult, true, "Lunch Recipe creation should succeed", stepMessage, ++checkIndex);
    lunchRecipeId = (createLunchResult as { compositeOrder: ID }).compositeOrder;

    const createDinnerResult = await purchaseSystem.createCompositeOrder({ associateID: "recipe:Dinner" as ID });
    assertAndLog("compositeOrder" in createDinnerResult, true, "Dinner Recipe creation should succeed", stepMessage, ++checkIndex);
    dinnerRecipeId = (createDinnerResult as { compositeOrder: ID }).compositeOrder;
  });

  await t.step("2. Add Lunch and Dinner to Meal Plan", async () => {
    const stepMessage = "2. Add Lunch and Dinner to Meal Plan";
    printStepHeader(stepMessage);

    const addLunchResult = await purchaseSystem.addCompositeSubOrder({ parentOrder: mealPlanId, childOrder: lunchRecipeId });
    assertAndLog("error" in addLunchResult, false, "Adding Lunch to Meal Plan should succeed", stepMessage, ++checkIndex);

    const addDinnerResult = await purchaseSystem.addCompositeSubOrder({ parentOrder: mealPlanId, childOrder: dinnerRecipeId });
    assertAndLog("error" in addDinnerResult, false, "Adding Dinner to Meal Plan should succeed", stepMessage, ++checkIndex);

    // Verify parent and root assignments
    const lunchDoc = await purchaseSystem.compositeOrders.findOne({ _id: lunchRecipeId });
    assertExistsAndLog(lunchDoc, "Lunch recipe doc should exist", stepMessage, ++checkIndex);
    assertAndLog(lunchDoc!.parentOrder, mealPlanId, "Lunch parent should be Meal Plan", stepMessage, ++checkIndex);
    assertAndLog(lunchDoc!.rootOrder, mealPlanId, "Lunch root should be Meal Plan", stepMessage, ++checkIndex);

    const dinnerDoc = await purchaseSystem.compositeOrders.findOne({ _id: dinnerRecipeId });
    assertExistsAndLog(dinnerDoc, "Dinner recipe doc should exist", stepMessage, ++checkIndex);
    assertAndLog(dinnerDoc!.parentOrder, mealPlanId, "Dinner parent should be Meal Plan", stepMessage, ++checkIndex);
    assertAndLog(dinnerDoc!.rootOrder, mealPlanId, "Dinner root should be Meal Plan", stepMessage, ++checkIndex);
  });

  await t.step("3. Attempt to add Meal Plan as a child of Lunch (should form a cycle)", async () => {
    const stepMessage = "3. Attempt to add Meal Plan as a child of Lunch (should form a cycle)";
    printStepHeader(stepMessage);

    const addCycleResult = await purchaseSystem.addCompositeSubOrder({ parentOrder: lunchRecipeId, childOrder: mealPlanId });
    assertAndLog("error" in addCycleResult, true, "Adding Meal Plan as child of Lunch should fail due to cycle", stepMessage, ++checkIndex);
    assertAndLog(
      (addCycleResult as { error: string }).error,
      `Adding CompositeOrder '${mealPlanId}' to '${lunchRecipeId}' would form a cycle.`,
      "Error message for cycle detection should match",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Remove Lunch from Meal Plan", async () => {
    const stepMessage = "4. Remove Lunch from Meal Plan";
    printStepHeader(stepMessage);

    const removeLunchResult = await purchaseSystem.removeCompositeSubOrder({ parentOrder: mealPlanId, childOrder: lunchRecipeId });
    assertAndLog("error" in removeLunchResult, false, "Removing Lunch from Meal Plan should succeed", stepMessage, ++checkIndex);

    // Verify Lunch is now its own root again
    const lunchDoc = await purchaseSystem.compositeOrders.findOne({ _id: lunchRecipeId });
    assertExistsAndLog(lunchDoc, "Lunch recipe doc should exist", stepMessage, ++checkIndex);
    assertAndLog(lunchDoc!.parentOrder, lunchRecipeId, "Lunch parent should be itself", stepMessage, ++checkIndex);
    assertAndLog(lunchDoc!.rootOrder, lunchRecipeId, "Lunch root should be itself", stepMessage, ++checkIndex);
  });

  await client.close();
});
```
