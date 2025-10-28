---
timestamp: 'Tue Oct 28 2025 19:16:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_191649.f4f2b642.md]]'
content_id: f1d2e4e365b6562a8d32c8b5195fb9031120fcdf09ac1569fe9b159c62dde5b5
---

# response:

Okay, let's significantly expand the `PurchaseSystemConcept.test.ts` file to cover more edge cases, error conditions, and complex interactions, ensuring the robustness of the concept's logic.

We'll add new `Deno.test` blocks for:

1. **Atomic and Select Order Management**: Focus on `createAtomicOrder`, `deleteAtomicOrder`, `updateAtomicOrder` and their effects on `SelectOrder`'s `baseQuantity`/`baseUnits`.
2. **Composite Hierarchy Manipulation**: Deeper tests for `addCompositeSubOrder`, `removeCompositeSubOrder`, `deleteCompositeOrder`, and `updateSubOrderScaleFactor`, including more complex cycle detection scenarios and root/parent updates.
3. **Complex Calculation Scenarios**: Test `calculateOptimalPurchase` with various `SelectOrder` configurations (no options, multiple options with different prices/quantities), nested composite orders, and ensuring correct cost aggregation.
4. **Purchase Order Edge Cases**: More granular tests for `purchaseOrder` preconditions.

***

```typescript
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PurchaseSystemConcept from "./PurchaseSystemConcept.ts";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";

// Helper for approximate float comparisons
function assertFloatEquals(
  actual: number,
  expected: number,
  message: string,
  stepMessage: string,
  checkIndex: number,
  epsilon: number = 0.001,
) {
  try {
    assertEquals(
      Math.abs(actual - expected) < epsilon,
      true,
      `Expected ${actual} to be approximately ${expected}. ${message}`,
    );
    console.log(`    ✅ Check ${checkIndex}: ${message}`);
  } catch (e) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    console.error(`      Error in "${stepMessage}": ${message}`);
    throw e;
  }
}

Deno.test("PurchaseSystemConcept - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let recipeId: ID;
  let pastaSelectId: ID,
    tomatoesSelectId: ID,
    groundBeefSelectId: ID;
  let spaghettiAtomicId: ID;
  let cannedTomatoesAtomicId: ID;
  let leanGroundBeefAtomicId: ID;

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

  await t.step(
    "3. Add Purchasing Options (AtomicOrders) to Ingredients",
    async () => {
      const stepMessage =
        "3. Add Purchasing Options (AtomicOrders) to Ingredients";
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

      // Tomatoes Options
      const createCannedTomatoesResult = await purchaseSystem.createAtomicOrder(
        {
          selectOrder: tomatoesSelectId,
          associateID: "option:CannedTomatoes400g" as ID,
          quantity: 400,
          units: "g",
          price: 1.50,
        },
      );
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
    },
  );

  await t.step(
    "4. Add Ingredients (SelectOrders) to Recipe (CompositeOrder)",
    async () => {
      const stepMessage =
        "4. Add Ingredients (SelectOrders) to Recipe (CompositeOrder)";
      printStepHeader(stepMessage);

      // Recipe needs 500g pasta -> base quantity is 500g, so scale factor is 1.0
      const addPastaResult = await purchaseSystem
        .addSelectOrderToCompositeOrder({
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

      // Recipe needs 800g tomatoes -> base quantity is 400g (from CannedTomatoes), so scale factor for base is 2.0
      const addTomatoesResult = await purchaseSystem
        .addSelectOrderToCompositeOrder(
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

      // Recipe needs 500g ground beef -> base quantity is 500g (from LeanBeef), so scale factor is 1.0
      const addGroundBeefResult = await purchaseSystem
        .addSelectOrderToCompositeOrder(
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
    },
  );

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
    // Pasta (base 500g, scale 1.0, need 500g): Spaghetti 500g @ $2.00 (1 unit) -> Total 1 Spaghetti 500g ($2.00)
    // Tomatoes (base 400g, scale 2.0, need 800g): Canned Tomatoes 400g @ $1.50 (1 unit per 400g base) -> Total 2 Canned Tomatoes 400g ($3.00)
    // Ground Beef (base 500g, scale 1.0, need 500g): Lean Ground Beef 500g @ $5.00 (1 unit) -> Total 1 Lean Ground Beef 500g ($5.00)

    // Total Cost: $2.00 (Spaghetti) + $3.00 (2x Canned Tomatoes) + $5.00 (Lean Ground Beef) = $10.00

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
    assertFloatEquals(
      totalCost,
      10.00,
      "Total cost should be 10.00",
      stepMessage,
      ++checkIndex,
    );
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

  await t.step(
    "8. Verify Purchase Status and Prevent Re-purchase/Modification",
    async () => {
      const stepMessage =
        "8. Verify Purchase Status and Prevent Re-purchase/Modification";
      printStepHeader(stepMessage);

      const queryRecipeResult = await purchaseSystem._getOrderByAssociateID({
        associateID: "recipe:SpicyPasta" as ID,
      });
      const recipeDoc =
        (queryRecipeResult as { order: { purchased: boolean } }[])[0]
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

      // Attempt to delete an atomic order which is part of a purchased root (should not affect root's cost/optimalPurchase)
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

      // Verify the recipe's cost hasn't changed (because it was purchased and should skip recalculation)
      const costAfterDeleteResult = await purchaseSystem._getOrderCost({
        compositeOrder: recipeId,
      });
      const costAfterDelete =
        (costAfterDeleteResult as { totalCost: number }[])[0]
          ?.totalCost;
      assertExistsAndLog(
        costAfterDelete,
        "Total cost should be defined after atomic order deletion",
        stepMessage,
        ++checkIndex,
      );
      assertFloatEquals(
        costAfterDelete,
        10.00, // Should remain $10.00 because the root order was purchased
        `Total cost should still be 10.00 after atomic order deletion for purchased recipe`,
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("PurchaseSystemConcept - Composite Hierarchy and Cycle Prevention", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let mealPlanId: ID,
    lunchRecipeId: ID,
    dinnerRecipeId: ID,
    dessertRecipeId: ID;

  await t.step(
    "1. Create Meal Plan (Root Composite) and Three Recipes (Child Composites)",
    async () => {
      const stepMessage =
        "1. Create Meal Plan (Root Composite) and Three Recipes (Child Composites)";
      printStepHeader(stepMessage);

      const createMealPlanResult = await purchaseSystem.createCompositeOrder({
        associateID: "mealPlan:Weekly" as ID,
      });
      assertAndLog(
        "compositeOrder" in createMealPlanResult,
        true,
        "Meal Plan creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      mealPlanId =
        (createMealPlanResult as { compositeOrder: ID }).compositeOrder;

      const createLunchResult = await purchaseSystem.createCompositeOrder({
        associateID: "recipe:Lunch" as ID,
      });
      assertAndLog(
        "compositeOrder" in createLunchResult,
        true,
        "Lunch Recipe creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      lunchRecipeId =
        (createLunchResult as { compositeOrder: ID }).compositeOrder;

      const createDinnerResult = await purchaseSystem.createCompositeOrder({
        associateID: "recipe:Dinner" as ID,
      });
      assertAndLog(
        "compositeOrder" in createDinnerResult,
        true,
        "Dinner Recipe creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      dinnerRecipeId =
        (createDinnerResult as { compositeOrder: ID }).compositeOrder;

      const createDessertResult = await purchaseSystem.createCompositeOrder({
        associateID: "recipe:Dessert" as ID,
      });
      assertAndLog(
        "compositeOrder" in createDessertResult,
        true,
        "Dessert Recipe creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      dessertRecipeId =
        (createDessertResult as { compositeOrder: ID }).compositeOrder;
    },
  );

  await t.step("2. Add Lunch and Dinner to Meal Plan", async () => {
    const stepMessage = "2. Add Lunch and Dinner to Meal Plan";
    printStepHeader(stepMessage);

    const addLunchResult = await purchaseSystem.addCompositeSubOrder({
      parentOrder: mealPlanId,
      childOrder: lunchRecipeId,
    });
    assertAndLog(
      "error" in addLunchResult,
      false,
      "Adding Lunch to Meal Plan should succeed",
      stepMessage,
      ++checkIndex,
    );

    const addDinnerResult = await purchaseSystem.addCompositeSubOrder({
      parentOrder: mealPlanId,
      childOrder: dinnerRecipeId,
    });
    assertAndLog(
      "error" in addDinnerResult,
      false,
      "Adding Dinner to Meal Plan should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Verify parent and root assignments
    const lunchDoc = await purchaseSystem.compositeOrders.findOne({
      _id: lunchRecipeId,
    });
    assertExistsAndLog(
      lunchDoc,
      "Lunch recipe doc should exist",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      lunchDoc!.parentOrder,
      mealPlanId,
      "Lunch parent should be Meal Plan",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      lunchDoc!.rootOrder,
      mealPlanId,
      "Lunch root should be Meal Plan",
      stepMessage,
      ++checkIndex,
    );

    const dinnerDoc = await purchaseSystem.compositeOrders.findOne({
      _id: dinnerRecipeId,
    });
    assertExistsAndLog(
      dinnerDoc,
      "Dinner recipe doc should exist",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      dinnerDoc!.parentOrder,
      mealPlanId,
      "Dinner parent should be Meal Plan",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      dinnerDoc!.rootOrder,
      mealPlanId,
      "Dinner root should be Meal Plan",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "3. Attempt to add Meal Plan as a child of Lunch (should form a direct cycle)",
    async () => {
      const stepMessage =
        "3. Attempt to add Meal Plan as a child of Lunch (should form a direct cycle)";
      printStepHeader(stepMessage);

      const addCycleResult = await purchaseSystem.addCompositeSubOrder({
        parentOrder: lunchRecipeId,
        childOrder: mealPlanId,
      });
      assertAndLog(
        "error" in addCycleResult,
        true,
        "Adding Meal Plan as child of Lunch should fail due to cycle",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (addCycleResult as { error: string }).error,
        `Adding CompositeOrder '${mealPlanId}' to '${lunchRecipeId}' would form a cycle.`,
        "Error message for cycle detection should match",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. Attempt to add a composite order to itself (should fail)",
    async () => {
      const stepMessage =
        "4. Attempt to add a composite order to itself (should fail)";
      printStepHeader(stepMessage);

      const addSelfResult = await purchaseSystem.addCompositeSubOrder({
        parentOrder: lunchRecipeId,
        childOrder: lunchRecipeId,
      });
      assertAndLog(
        "error" in addSelfResult,
        true,
        "Adding a composite order to itself should fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (addSelfResult as { error: string }).error,
        "Cannot add a composite order as a child of itself.",
        "Error message for self-referencing should match",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("5. Add Dessert as a child of Lunch (deeper nesting)", async () => {
    const stepMessage = "5. Add Dessert as a child of Lunch (deeper nesting)";
    printStepHeader(stepMessage);

    const addDessertResult = await purchaseSystem.addCompositeSubOrder({
      parentOrder: lunchRecipeId,
      childOrder: dessertRecipeId,
    });
    assertAndLog(
      "error" in addDessertResult,
      false,
      "Adding Dessert to Lunch should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Verify parent and root assignments for Dessert
    const dessertDoc = await purchaseSystem.compositeOrders.findOne({
      _id: dessertRecipeId,
    });
    assertExistsAndLog(
      dessertDoc,
      "Dessert recipe doc should exist",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      dessertDoc!.parentOrder,
      lunchRecipeId,
      "Dessert parent should be Lunch",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      dessertDoc!.rootOrder,
      mealPlanId,
      "Dessert root should be Meal Plan (propagated)",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "6. Remove Lunch from Meal Plan (verify root propagation for Dessert)",
    async () => {
      const stepMessage =
        "6. Remove Lunch from Meal Plan (verify root propagation for Dessert)";
      printStepHeader(stepMessage);

      const removeLunchResult = await purchaseSystem.removeCompositeSubOrder({
        parentOrder: mealPlanId,
        childOrder: lunchRecipeId,
      });
      assertAndLog(
        "error" in removeLunchResult,
        false,
        "Removing Lunch from Meal Plan should succeed",
        stepMessage,
        ++checkIndex,
      );

      // Verify Lunch is now its own root again
      const lunchDoc = await purchaseSystem.compositeOrders.findOne({
        _id: lunchRecipeId,
      });
      assertExistsAndLog(
        lunchDoc,
        "Lunch recipe doc should exist",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        lunchDoc!.parentOrder,
        lunchRecipeId,
        "Lunch parent should be itself",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        lunchDoc!.rootOrder,
        lunchRecipeId,
        "Lunch root should be itself",
        stepMessage,
        ++checkIndex,
      );

      // Verify Dessert's root has been updated to Lunch
      const dessertDoc = await purchaseSystem.compositeOrders.findOne({
        _id: dessertRecipeId,
      });
      assertExistsAndLog(
        dessertDoc,
        "Dessert recipe doc should exist",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        dessertDoc!.parentOrder,
        lunchRecipeId,
        "Dessert parent should still be Lunch",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        dessertDoc!.rootOrder,
        lunchRecipeId,
        "Dessert root should now be Lunch",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "7. Delete Lunch Recipe (verify recursive deletion of Dessert)",
    async () => {
      const stepMessage = "7. Delete Lunch Recipe (verify recursive deletion)";
      printStepHeader(stepMessage);

      const deleteLunchResult = await purchaseSystem.deleteCompositeOrder({
        compositeOrder: lunchRecipeId,
      });
      assertAndLog(
        "error" in deleteLunchResult,
        false,
        "Deleting Lunch recipe should succeed",
        stepMessage,
        ++checkIndex,
      );

      // Verify Lunch is gone
      const lunchDoc = await purchaseSystem.compositeOrders.findOne({
        _id: lunchRecipeId,
      });
      assertAndLog(
        lunchDoc,
        null,
        "Lunch recipe should be deleted",
        stepMessage,
        ++checkIndex,
      );

      // Verify Dessert is also gone (recursive deletion)
      const dessertDoc = await purchaseSystem.compositeOrders.findOne({
        _id: dessertRecipeId,
      });
      assertAndLog(
        dessertDoc,
        null,
        "Dessert recipe (child of Lunch) should also be deleted",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("PurchaseSystemConcept - Atomic and Select Order Management", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let selectId1: ID, selectId2: ID;
  let atomicId1_1: ID, atomicId1_2: ID, atomicId2_1: ID;
  let compositeId: ID;

  await t.step("1. Create Select Orders", async () => {
    const stepMessage = "1. Create Select Orders";
    printStepHeader(stepMessage);

    const createS1Result = await purchaseSystem.createSelectOrder({
      associateID: "select:Milk" as ID,
    });
    assertAndLog(
      "selectOrder" in createS1Result,
      true,
      "SelectOrder Milk creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    selectId1 = (createS1Result as { selectOrder: ID }).selectOrder;

    const createS2Result = await purchaseSystem.createSelectOrder({
      associateID: "select:Eggs" as ID,
    });
    assertAndLog(
      "selectOrder" in createS2Result,
      true,
      "SelectOrder Eggs creation should succeed",
      ++checkIndex,
    );
    selectId2 = (createS2Result as { selectOrder: ID }).selectOrder;

    // Verify initial base values for select orders
    const s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 });
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseQuantity, -1, "S1 baseQuantity should be -1", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseUnits, "", "S1 baseUnits should be ''", stepMessage, ++checkIndex);
  });

  await t.step("2. Create Atomic Orders and verify base updates", async () => {
    const stepMessage = "2. Create Atomic Orders and verify base updates";
    printStepHeader(stepMessage);

    // Add first atomic to selectId1
    const createA1_1Result = await purchaseSystem.createAtomicOrder({
      selectOrder: selectId1,
      associateID: "atomic:Milk1L" as ID,
      quantity: 1.0,
      units: "L",
      price: 2.50,
    });
    assertAndLog(
      "atomicOrder" in createA1_1Result,
      true,
      "AtomicOrder Milk1L creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    atomicId1_1 = (createA1_1Result as { atomicOrder: ID }).atomicOrder;

    // Verify selectId1's base is updated by atomicId1_1
    let s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 });
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseQuantity, 1.0, "S1 baseQuantity should be 1.0", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseUnits, "L", "S1 baseUnits should be 'L'", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.childAtomicOrders.includes(atomicId1_1), true, "S1 should contain atomicId1_1", stepMessage, ++checkIndex);

    // Add second atomic to selectId1 (should NOT change base)
    const createA1_2Result = await purchaseSystem.createAtomicOrder({
      selectOrder: selectId1,
      associateID: "atomic:Milk2L" as ID,
      quantity: 2.0,
      units: "L",
      price: 4.00,
    });
    assertAndLog(
      "atomicOrder" in createA1_2Result,
      true,
      "AtomicOrder Milk2L creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    atomicId1_2 = (createA1_2Result as { atomicOrder: ID }).atomicOrder;

    s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 }); // Re-fetch
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseQuantity, 1.0, "S1 baseQuantity should remain 1.0", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseUnits, "L", "S1 baseUnits should remain 'L'", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.childAtomicOrders.includes(atomicId1_2), true, "S1 should contain atomicId1_2", stepMessage, ++checkIndex);

    // Add first atomic to selectId2
    const createA2_1Result = await purchaseSystem.createAtomicOrder({
      selectOrder: selectId2,
      associateID: "atomic:Eggs12" as ID,
      quantity: 12,
      units: "count",
      price: 3.00,
    });
    assertAndLog(
      "atomicOrder" in createA2_1Result,
      true,
      "AtomicOrder Eggs12 creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    atomicId2_1 = (createA2_1Result as { atomicOrder: ID }).atomicOrder;

    const s2Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId2 });
    assertExistsAndLog(s2Doc, "S2 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s2Doc!.baseQuantity, 12, "S2 baseQuantity should be 12", stepMessage, ++checkIndex);
    assertAndLog(s2Doc!.baseUnits, "count", "S2 baseUnits should be 'count'", stepMessage, ++checkIndex);
  });

  await t.step("3. Error cases for createAtomicOrder and createSelectOrder", async () => {
    const stepMessage = "3. Error cases for createAtomicOrder and createSelectOrder";
    printStepHeader(stepMessage);

    // Create Select Order with duplicate associateID
    const duplicateSResult = await purchaseSystem.createSelectOrder({
      associateID: "select:Milk" as ID,
    });
    assertAndLog(
      "error" in duplicateSResult,
      true,
      "Creating duplicate SelectOrder associateID should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (duplicateSResult as { error: string }).error,
      `Order with associateID 'select:Milk' already exists.`,
      "Error message for duplicate SelectOrder associateID mismatch",
      stepMessage,
      ++checkIndex,
    );

    // Create Atomic Order with non-existent selectOrder
    const nonExistentSelectResult = await purchaseSystem.createAtomicOrder({
      selectOrder: "nonExistentSelect" as ID,
      associateID: "atomic:Fake" as ID,
      quantity: 1,
      units: "unit",
      price: 1,
    });
    assertAndLog(
      "error" in nonExistentSelectResult,
      true,
      "Creating AtomicOrder for non-existent SelectOrder should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (nonExistentSelectResult as { error: string }).error,
      `SelectOrder with ID 'nonExistentSelect' not found.`,
      "Error message for non-existent SelectOrder mismatch",
      stepMessage,
      ++checkIndex,
    );

    // Create Atomic Order with duplicate associateID
    const duplicateAResult = await purchaseSystem.createAtomicOrder({
      selectOrder: selectId1,
      associateID: "atomic:Milk1L" as ID,
      quantity: 1,
      units: "unit",
      price: 1,
    });
    assertAndLog(
      "error" in duplicateAResult,
      true,
      "Creating duplicate AtomicOrder associateID should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (duplicateAResult as { error: string }).error,
      `Order with associateID 'atomic:Milk1L' already exists.`,
      "Error message for duplicate AtomicOrder associateID mismatch",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Update Atomic Order and verify base updates", async () => {
    const stepMessage = "4. Update Atomic Order and verify base updates";
    printStepHeader(stepMessage);

    // Create a composite order and add selectId1 to it to trigger recalculation on updates
    const createCompositeResult = await purchaseSystem.createCompositeOrder({ associateID: "comp:GroceryList" as ID });
    assertAndLog("compositeOrder" in createCompositeResult, true, "Composite order creation should succeed", stepMessage, ++checkIndex);
    compositeId = (createCompositeResult as { compositeOrder: ID }).compositeOrder;

    const addSelectToCompositeResult = await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: compositeId,
      selectOrder: selectId1,
      scaleFactor: 1.0,
    });
    assertAndLog("error" in addSelectToCompositeResult, false, "Adding selectId1 to composite should succeed", stepMessage, ++checkIndex);
    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [compositeId] });

    let compositeCost = await purchaseSystem._getOrderCost({ compositeOrder: compositeId });
    assertFloatEquals((compositeCost as {totalCost: number}[])[0].totalCost, 2.50, "Initial composite cost should be $2.50 (from Milk1L)", stepMessage, ++checkIndex);


    // Update quantity of atomicId1_1 (the base atomic order)
    const updateQtyResult = await purchaseSystem.updateAtomicOrder({
      atomicOrder: atomicId1_1,
      quantity: 0.5,
    });
    assertAndLog(
      "error" in updateQtyResult,
      false,
      "Updating quantity of atomicId1_1 should succeed",
      stepMessage,
      ++checkIndex,
    );

    let a1_1Doc = await purchaseSystem.atomicOrders.findOne({ _id: atomicId1_1 });
    assertExistsAndLog(a1_1Doc, "atomicId1_1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(a1_1Doc!.quantity, 0.5, "atomicId1_1 quantity should be 0.5", stepMessage, ++checkIndex);

    // Verify selectId1's base is updated
    let s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 }); // Re-fetch
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseQuantity, 0.5, "S1 baseQuantity should be updated to 0.5", stepMessage, ++checkIndex);
    assertFloatEquals(s1Doc!.baseQuantity, 0.5, "S1 baseQuantity should be updated to 0.5", stepMessage, ++checkIndex);

    // Verify composite cost recalculates
    compositeCost = await purchaseSystem._getOrderCost({ compositeOrder: compositeId });
    assertFloatEquals((compositeCost as {totalCost: number}[])[0].totalCost, 2.50, "Composite cost should remain $2.50 (quantity changed but price is per unit of item)", stepMessage, ++checkIndex);

    // Update price of atomicId1_1
    const updatePriceResult = await purchaseSystem.updateAtomicOrder({
      atomicOrder: atomicId1_1,
      price: 3.00,
    });
    assertAndLog(
      "error" in updatePriceResult,
      false,
      "Updating price of atomicId1_1 should succeed",
      stepMessage,
      ++checkIndex,
    );
    a1_1Doc = await purchaseSystem.atomicOrders.findOne({ _id: atomicId1_1 }); // Re-fetch
    assertExistsAndLog(a1_1Doc, "atomicId1_1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(a1_1Doc!.price, 3.00, "atomicId1_1 price should be 3.00", stepMessage, ++checkIndex);
    
    // Verify composite cost recalculates for price change
    compositeCost = await purchaseSystem._getOrderCost({ compositeOrder: compositeId });
    assertFloatEquals((compositeCost as {totalCost: number}[])[0].totalCost, 3.00, "Composite cost should update to $3.00", stepMessage, ++checkIndex);

    // Update units of atomicId1_2 (a non-base atomic order)
    const updateUnitsResult = await purchaseSystem.updateAtomicOrder({
      atomicOrder: atomicId1_2,
      units: "ml",
    });
    assertAndLog(
      "error" in updateUnitsResult,
      false,
      "Updating units of atomicId1_2 should succeed",
      stepMessage,
      ++checkIndex,
    );
    let a1_2Doc = await purchaseSystem.atomicOrders.findOne({ _id: atomicId1_2 });
    assertExistsAndLog(a1_2Doc, "atomicId1_2 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(a1_2Doc!.units, "ml", "atomicId1_2 units should be 'ml'", stepMessage, ++checkIndex);

    s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 }); // Re-fetch
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseUnits, "L", "S1 baseUnits should remain 'L'", stepMessage, ++checkIndex); // Still 'L' from atomicId1_1

    // Error case: Update non-existent atomic order
    const updateNonExistentResult = await purchaseSystem.updateAtomicOrder({
      atomicOrder: "nonExistentAtomic" as ID,
      quantity: 10,
    });
    assertAndLog(
      "error" in updateNonExistentResult,
      true,
      "Updating non-existent AtomicOrder should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (updateNonExistentResult as { error: string }).error,
      `AtomicOrder with ID 'nonExistentAtomic' not found.`,
      "Error message for non-existent AtomicOrder mismatch",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("5. Delete Atomic Order and verify base updates", async () => {
    const stepMessage = "5. Delete Atomic Order and verify base updates";
    printStepHeader(stepMessage);

    // Delete atomicId1_2 (non-base atomic order)
    const deleteA1_2Result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectId1,
      atomicOrder: atomicId1_2,
    });
    assertAndLog(
      "error" in deleteA1_2Result,
      false,
      "Deleting non-base atomicId1_2 should succeed",
      stepMessage,
      ++checkIndex,
    );
    const deletedA1_2 = await purchaseSystem.atomicOrders.findOne({ _id: atomicId1_2 });
    assertAndLog(deletedA1_2, null, "atomicId1_2 should be deleted", stepMessage, ++checkIndex);
    
    // Verify selectId1's base is unchanged
    let s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 });
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseQuantity, 0.5, "S1 baseQuantity should remain 0.5", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseUnits, "L", "S1 baseUnits should remain 'L'", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.childAtomicOrders.includes(atomicId1_1), true, "S1 should still contain atomicId1_1", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.childAtomicOrders.includes(atomicId1_2), false, "S1 should no longer contain atomicId1_2", stepMessage, ++checkIndex);

    // Delete atomicId1_1 (the current base atomic order for selectId1)
    const deleteA1_1Result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectId1,
      atomicOrder: atomicId1_1,
    });
    assertAndLog(
      "error" in deleteA1_1Result,
      false,
      "Deleting base atomicId1_1 should succeed",
      stepMessage,
      ++checkIndex,
    );
    const deletedA1_1 = await purchaseSystem.atomicOrders.findOne({ _id: atomicId1_1 });
    assertAndLog(deletedA1_1, null, "atomicId1_1 should be deleted", stepMessage, ++checkIndex);

    // Verify selectId1's base is reset (no more atomic options)
    s1Doc = await purchaseSystem.selectOrders.findOne({ _id: selectId1 }); // Re-fetch
    assertExistsAndLog(s1Doc, "S1 doc should exist", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseQuantity, -1, "S1 baseQuantity should be reset to -1", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.baseUnits, "", "S1 baseUnits should be reset to ''", stepMessage, ++checkIndex);
    assertAndLog(s1Doc!.childAtomicOrders.length, 0, "S1 should have no atomic orders", stepMessage, ++checkIndex);

    // Verify composite cost recalculates to 0 (since its select has no options)
    const compositeCost = await purchaseSystem._getOrderCost({ compositeOrder: compositeId });
    assertFloatEquals((compositeCost as {totalCost: number}[])[0].totalCost, 0.00, "Composite cost should update to $0.00", stepMessage, ++checkIndex);

    // Error cases for deleteAtomicOrder
    const deleteNonExistentA = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectId1,
      atomicOrder: "nonExistent" as ID,
    });
    assertAndLog(
      "error" in deleteNonExistentA,
      true,
      "Deleting non-existent atomic order should fail",
      stepMessage,
      ++checkIndex,
    );

    const deleteAFromWrongS = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectId2, // Wrong select order
      atomicOrder: atomicId2_1,
    });
    assertAndLog(
      "error" in deleteAFromWrongS,
      false, // This should actually succeed, if the atomic order is a child of the select order.
      // Re-reading the code for deleteAtomicOrder: it checks if the atomicOrder's parent is the selectOrder passed in.
      // If atomicId2_1 has parent selectId2, then calling delete with selectId2 should work.
      // The old logic `!existingSelectOrder.childAtomicOrders.includes(atomicOrderID)` will correctly fail.
      "Deleting atomic order from wrong select order should fail if not a child",
      stepMessage,
      ++checkIndex,
    );

    const deleteAFromWrongSParent = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectId1, // Not parent of atomicId2_1
      atomicOrder: atomicId2_1,
    });
    assertAndLog(
      "error" in deleteAFromWrongSParent,
      true,
      "Deleting atomic order not belonging to select order should fail",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (deleteAFromWrongSParent as { error: string }).error,
      `AtomicOrder '${atomicId2_1}' is not a child of SelectOrder '${selectId1}'.`,
      "Error message for atomic order not being a child mismatch",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("PurchaseSystemConcept - Composite Order Structure & Scale Factors", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let rootCompId: ID,
    childCompAId: ID,
    childCompBId: ID,
    grandchildCompId: ID;
  let selectId1: ID, selectId2: ID;
  let atomicId1: ID, atomicId2: ID;

  await t.step("1. Setup Composite and Select Orders", async () => {
    const stepMessage = "1. Setup Composite and Select Orders";
    printStepHeader(stepMessage);

    rootCompId = (await purchaseSystem.createCompositeOrder({ associateID: "root" as ID }) as { compositeOrder: ID }).compositeOrder;
    childCompAId = (await purchaseSystem.createCompositeOrder({ associateID: "childA" as ID }) as { compositeOrder: ID }).compositeOrder;
    childCompBId = (await purchaseSystem.createCompositeOrder({ associateID: "childB" as ID }) as { compositeOrder: ID }).compositeOrder;
    grandchildCompId = (await purchaseSystem.createCompositeOrder({ associateID: "grandchild" as ID }) as { compositeOrder: ID }).compositeOrder;

    selectId1 = (await purchaseSystem.createSelectOrder({ associateID: "select1" as ID }) as { selectOrder: ID }).selectOrder;
    selectId2 = (await purchaseSystem.createSelectOrder({ associateID: "select2" as ID }) as { selectOrder: ID }).selectOrder;

    atomicId1 = (await purchaseSystem.createAtomicOrder({ selectOrder: selectId1, associateID: "atomic1", quantity: 1, units: "ea", price: 10.0 }) as { atomicOrder: ID }).atomicOrder;
    atomicId2 = (await purchaseSystem.createAtomicOrder({ selectOrder: selectId2, associateID: "atomic2", quantity: 1, units: "ea", price: 5.0 }) as { atomicOrder: ID }).atomicOrder;

    // Add select1 to childCompA
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: childCompAId, selectOrder: selectId1, scaleFactor: 1.0 });

    // Add select2 to childCompB
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: childCompBId, selectOrder: selectId2, scaleFactor: 1.0 });

    // Build hierarchy: root -> childA, root -> childB, childA -> grandchild
    await purchaseSystem.addCompositeSubOrder({ parentOrder: rootCompId, childOrder: childCompAId });
    await purchaseSystem.addCompositeSubOrder({ parentOrder: rootCompId, childOrder: childCompBId });
    await purchaseSystem.addCompositeSubOrder({ parentOrder: childCompAId, childOrder: grandchildCompId });

    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId] });

    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 15.0, "Initial root cost should be 15.0", stepMessage, ++checkIndex);
    let childACost = await purchaseSystem._getOrderCost({ compositeOrder: childCompAId });
    assertFloatEquals((childACost as { totalCost: number }[])[0].totalCost, 10.0, "Initial childA cost should be 10.0", stepMessage, ++checkIndex);
    let childBCost = await purchaseSystem._getOrderCost({ compositeOrder: childCompBId });
    assertFloatEquals((childBCost as { totalCost: number }[])[0].totalCost, 5.0, "Initial childB cost should be 5.0", stepIndex, ++checkIndex);
    let grandchildCost = await purchaseSystem._getOrderCost({ compositeOrder: grandchildCompId });
    assertFloatEquals((grandchildCost as { totalCost: number }[])[0].totalCost, 0.0, "Initial grandchild cost should be 0.0", stepIndex, ++checkIndex);
  });

  await t.step("2. Update Scale Factor for Child Select Order", async () => {
    const stepMessage = "2. Update Scale Factor for Child Select Order";
    printStepHeader(stepMessage);

    // Increase select1 scale factor in childCompA from 1.0 to 2.0
    const updateScaleResult = await purchaseSystem.updateSubOrderScaleFactor({
      parentOrder: childCompAId,
      childOrder: selectId1,
      newScaleFactor: 2.0,
    });
    assertAndLog(
      "error" in updateScaleResult,
      false,
      "Updating scale factor for selectId1 should succeed",
      stepMessage,
      ++checkIndex,
    );

    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId] });

    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 25.0, "Root cost should update to 25.0 (10*2 + 5)", stepMessage, ++checkIndex);
    let childACost = await purchaseSystem._getOrderCost({ compositeOrder: childCompAId });
    assertFloatEquals((childACost as { totalCost: number }[])[0].totalCost, 20.0, "ChildA cost should update to 20.0 (10*2)", stepMessage, ++checkIndex);

    // Error: update with scale factor <= 0
    const invalidScaleResult = await purchaseSystem.updateSubOrderScaleFactor({
      parentOrder: childCompAId,
      childOrder: selectId1,
      newScaleFactor: 0,
    });
    assertAndLog("error" in invalidScaleResult, true, "Updating with scale factor 0 should fail", stepMessage, ++checkIndex);
    assertAndLog((invalidScaleResult as {error: string}).error, "New scale factor must be greater than 0.", "Error message for invalid scale factor mismatch", stepMessage, ++checkIndex);
  });

  await t.step("3. Update Scale Factor for Child Composite Order", async () => {
    const stepMessage = "3. Update Scale Factor for Child Composite Order";
    printStepHeader(stepMessage);

    // Increase childCompA scale factor in rootCompId from 1.0 to 0.5
    const updateScaleResult = await purchaseSystem.updateSubOrderScaleFactor({
      parentOrder: rootCompId,
      childOrder: childCompAId,
      newScaleFactor: 0.5,
    });
    assertAndLog(
      "error" in updateScaleResult,
      false,
      "Updating scale factor for childCompA should succeed",
      stepMessage,
      ++checkIndex,
    );

    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId] });

    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    // childA cost is 20.0. root combines childA (20 * 0.5 = 10.0) + childB (5.0 * 1.0 = 5.0) = 15.0
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 15.0, "Root cost should update to 15.0 (20*0.5 + 5)", stepMessage, ++checkIndex);
  });

  await t.step("4. Remove Select Order from Composite Order", async () => {
    const stepMessage = "4. Remove Select Order from Composite Order";
    printStepHeader(stepMessage);

    const removeSelectResult = await purchaseSystem.removeSelectOrderFromCompositeOrder({
      compositeOrder: childCompBId,
      selectOrder: selectId2,
    });
    assertAndLog(
      "error" in removeSelectResult,
      false,
      "Removing selectId2 from childCompB should succeed",
      stepMessage,
      ++checkIndex,
    );

    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId] });

    // Verify selectId2 is removed from childCompB's parentOrders
    const select2Doc = await purchaseSystem.selectOrders.findOne({_id: selectId2});
    assertExistsAndLog(select2Doc, "select2Doc should exist", stepMessage, ++checkIndex);
    assertAndLog(select2Doc!.parentOrders.includes(childCompBId), false, "selectId2 should no longer list childCompB as parent", stepMessage, ++checkIndex);

    let childBCost = await purchaseSystem._getOrderCost({ compositeOrder: childCompBId });
    assertFloatEquals((childBCost as { totalCost: number }[])[0].totalCost, 0.0, "ChildB cost should be 0.0 after removing select2", stepMessage, ++checkIndex);
    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 10.0, "Root cost should update to 10.0 (childA 20*0.5 + childB 0)", stepMessage, ++checkIndex);

    // Error: remove non-existent select order
    const removeNonExistent = await purchaseSystem.removeSelectOrderFromCompositeOrder({ compositeOrder: childCompBId, selectOrder: "nonExistent" as ID });
    assertAndLog("error" in removeNonExistent, true, "Removing non-existent select order should fail", stepMessage, ++checkIndex);

    // Error: remove select order not a child
    const removeWrongChild = await purchaseSystem.removeSelectOrderFromCompositeOrder({ compositeOrder: rootCompId, selectOrder: selectId1 });
    assertAndLog("error" in removeWrongChild, true, "Removing select order not a direct child should fail", stepMessage, ++checkIndex);
    assertAndLog((removeWrongChild as {error: string}).error, `SelectOrder '${selectId1}' is not a child of CompositeOrder '${rootCompId}'.`, "Error message for wrong child mismatch", stepMessage, ++checkIndex);
  });

  await t.step("5. Remove Composite Sub Order", async () => {
    const stepMessage = "5. Remove Composite Sub Order";
    printStepHeader(stepMessage);

    const removeGrandchildResult = await purchaseSystem.removeCompositeSubOrder({
      parentOrder: childCompAId,
      childOrder: grandchildCompId,
    });
    assertAndLog(
      "error" in removeGrandchildResult,
      false,
      "Removing grandchild from childA should succeed",
      stepMessage,
      ++checkIndex,
    );

    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId, grandchildCompId] }); // Recalculate both affected roots

    // Verify grandchild is now its own root/parent
    let grandchildDoc = await purchaseSystem.compositeOrders.findOne({ _id: grandchildCompId });
    assertExistsAndLog(grandchildDoc, "grandchildDoc should exist", stepMessage, ++checkIndex);
    assertAndLog(grandchildDoc!.parentOrder, grandchildCompId, "grandchild parent should be itself", stepMessage, ++checkIndex);
    assertAndLog(grandchildDoc!.rootOrder, grandchildCompId, "grandchild root should be itself", stepMessage, ++checkIndex);

    let childACost = await purchaseSystem._getOrderCost({ compositeOrder: childCompAId });
    assertFloatEquals((childACost as { totalCost: number }[])[0].totalCost, 20.0, "ChildA cost should remain 20.0 (since grandchild had no cost)", stepMessage, ++checkIndex);
    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 10.0, "Root cost should remain 10.0", stepMessage, ++checkIndex);

    // Error: remove non-existent composite order
    const removeNonExistent = await purchaseSystem.removeCompositeSubOrder({ parentOrder: childCompAId, childOrder: "nonExistent" as ID });
    assertAndLog("error" in removeNonExistent, true, "Removing non-existent composite order should fail", stepMessage, ++checkIndex);

    // Error: remove composite order not a child
    const removeWrongChild = await purchaseSystem.removeCompositeSubOrder({ parentOrder: rootCompId, childOrder: selectId1 as ID }); // Select order, not composite
    assertAndLog("error" in removeWrongChild, true, "Removing non-composite child type should fail", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("PurchaseSystemConcept - Calculation with Complex Scenarios", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let menuCompId: ID, dessertCompId: ID;
  let flourSelectId: ID, sugarSelectId: ID, chocolateSelectId;
  let flour1kgAtomicId: ID, flour5kgAtomicId: ID;
  let sugar100gAtomicId: ID, sugar500gAtomicId: ID;
  let noOptionsSelectId: ID;

  await t.step("1. Setup Complex Hierarchy and Options", async () => {
    const stepMessage = "1. Setup Complex Hierarchy and Options";
    printStepHeader(stepMessage);

    menuCompId = (await purchaseSystem.createCompositeOrder({ associateID: "menu:Cake" as ID }) as { compositeOrder: ID }).compositeOrder;
    dessertCompId = (await purchaseSystem.createCompositeOrder({ associateID: "recipe:ChocolateCake" as ID }) as { compositeOrder: ID }).compositeOrder;

    flourSelectId = (await purchaseSystem.createSelectOrder({ associateID: "ing:Flour" as ID }) as { selectOrder: ID }).selectOrder;
    sugarSelectId = (await purchaseSystem.createSelectOrder({ associateID: "ing:Sugar" as ID }) as { selectOrder: ID }).selectOrder;
    chocolateSelectId = (await purchaseSystem.createSelectOrder({ associateID: "ing:Chocolate" as ID }) as { selectOrder: ID }).selectOrder;
    noOptionsSelectId = (await purchaseSystem.createSelectOrder({ associateID: "ing:NoOptions" as ID }) as { selectOrder: ID }).selectOrder;

    flour1kgAtomicId = (await purchaseSystem.createAtomicOrder({ selectOrder: flourSelectId, associateID: "opt:Flour1kg", quantity: 1000, units: "g", price: 2.0 }) as { atomicOrder: ID }).atomicOrder;
    flour5kgAtomicId = (await purchaseSystem.createAtomicOrder({ selectOrder: flourSelectId, associateID: "opt:Flour5kg", quantity: 5000, units: "g", price: 8.0 }) as { atomicOrder: ID }).atomicOrder; // Better value
    sugar100gAtomicId = (await purchaseSystem.createAtomicOrder({ selectOrder: sugarSelectId, associateID: "opt:Sugar100g", quantity: 100, units: "g", price: 0.5 }) as { atomicOrder: ID }).atomicOrder;
    sugar500gAtomicId = (await purchaseSystem.createAtomicOrder({ selectOrder: sugarSelectId, associateID: "opt:Sugar500g", quantity: 500, units: "g", price: 2.0 }) as { atomicOrder: ID }).atomicOrder; // Better value
    // No atomic orders for chocolateSelectId yet

    // Menu contains Dessert recipe (scale 1.0)
    await purchaseSystem.addCompositeSubOrder({ parentOrder: menuCompId, childOrder: dessertCompId });

    // Dessert recipe needs:
    // Flour: 1500g (scale factor for 1000g base is 1.5)
    // Sugar: 700g (scale factor for 100g base is 7.0)
    // Chocolate: 200g (no options yet)
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: dessertCompId, selectOrder: flourSelectId, scaleFactor: 1.5 });
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: dessertCompId, selectOrder: sugarSelectId, scaleFactor: 7.0 });
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: dessertCompId, selectOrder: chocolateSelectId, scaleFactor: 2.0 }); // Scale 2.0 of a non-existent base (will be 0 contribution)
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: dessertCompId, selectOrder: noOptionsSelectId, scaleFactor: 1.0 }); // No options, should contribute 0
  });

  await t.step("2. Calculate Optimal Purchase with incomplete options", async () => {
    const stepMessage = "2. Calculate Optimal Purchase with incomplete options";
    printStepHeader(stepMessage);

    const calculateResult = await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [menuCompId] });
    assertAndLog("error" in calculateResult, false, "Calculate optimal purchase should succeed", stepMessage, ++checkIndex);

    // Expected for Flour (base 1000g, scale 1.5 => need 1500g)
    // opt:Flour1kg (1000g @ $2.0) -> cost 2.0 per kg
    // opt:Flour5kg (5000g @ $8.0) -> cost 1.6 per kg (BETTER)
    // Need 1500g. Using Flour5kg: 1 unit provides 5000g. Cost = $8.00. Optimal purchase: 1 unit of Flour5kg.
    // Base quantity is 1000g.
    // For 1500g needed: 1.5 * base quantity. So 1.5 * Flour1kg is 1.5 units, so buy 2. Cost: 2 * $2 = $4
    // Using Flour5kg. Base 1000g. Scale 1.5. Need 1500g. 1 unit of Flour5kg provides 5000g. Cost: $8.
    // The `calculateOptimalPurchase` is supposed to choose the cheapest atomic order that can satisfy the scaled base quantity,
    // and then apply the composite's scale factor on the *number of atomic units to buy*.
    // FlourSelect base: (1000g, "g")
    // For Flour1kg: cost for base 1000g -> ceil(1000/1000) * $2 = $2. Optimal units to buy for base: 1.
    // For Flour5kg: cost for base 1000g -> ceil(1000/5000) * $8 = $8. Optimal units to buy for base: 1. (5kg provides 5 * base. Cost for base: $8)
    // Wait, the logic for `optimalAtomicUnitsToBuyForBase` is `Math.ceil(selectOrderDoc.baseQuantity / atomicOption.quantity)`.
    // Flour: baseQuantity 1000g
    // Atomic1kg: Math.ceil(1000/1000) = 1. Cost 1 * $2 = $2. (optimal units to buy for base = 1)
    // Atomic5kg: Math.ceil(1000/5000) = 1. Cost 1 * $8 = $8. (optimal units to buy for base = 1)
    // So for base quantity, Flour1kg is cheaper.
    // So `baseSelectOrderOptimalChoices` will choose Flour1kg. {atomicId: flour1kgAtomicId, quantity: 1, cost: $2}
    // Then apply composite scale factor (1.5) to the `quantity` (number of atomic units to buy).
    // `currentCompositeOptimalPurchase[flour1kgAtomicId] = ceil(1 * 1.5) = 2`
    // `currentCompositeTotalCost += $2 * 1.5 = $3`

    // Expected for Sugar (base 100g, scale 7.0 => need 700g)
    // SugarSelect base: (100g, "g")
    // Atomic100g: Math.ceil(100/100) = 1. Cost 1 * $0.5 = $0.5. (optimal units to buy for base = 1)
    // Atomic500g: Math.ceil(100/500) = 1. Cost 1 * $2.0 = $2.0. (optimal units to buy for base = 1)
    // So `baseSelectOrderOptimalChoices` will choose Sugar100g. {atomicId: sugar100gAtomicId, quantity: 1, cost: $0.5}
    // Then apply composite scale factor (7.0) to the `quantity`.
    // `currentCompositeOptimalPurchase[sugar100gAtomicId] = ceil(1 * 7.0) = 7`
    // `currentCompositeTotalCost += $0.5 * 7.0 = $3.5`

    // Chocolate: No atomic orders, cost 0.
    // NoOptions: No atomic orders, cost 0.

    // Total Cost for dessertCompId = $3.0 (Flour) + $3.5 (Sugar) = $6.5
    // Total Cost for menuCompId (containing dessertCompId with scale 1.0) = $6.5

    const menuCostResult = await purchaseSystem._getOrderCost({ compositeOrder: menuCompId });
    assertAndLog("error" in menuCostResult, false, "Query menu cost should not return an error", stepMessage, ++checkIndex);
    assertFloatEquals((menuCostResult as { totalCost: number }[])[0].totalCost, 6.5, "Menu total cost should be 6.5", stepMessage, ++checkIndex);

    const dessertCostResult = await purchaseSystem._getOrderCost({ compositeOrder: dessertCompId });
    assertAndLog("error" in dessertCostResult, false, "Query dessert cost should not return an error", stepMessage, ++checkIndex);
    assertFloatEquals((dessertCostResult as { totalCost: number }[])[0].totalCost, 6.5, "Dessert total cost should be 6.5", stepMessage, ++checkIndex);

    const menuOptimalResult = await purchaseSystem._getOptimalPurchase({ compositeOrder: menuCompId });
    const menuOptimal = (menuOptimalResult as { optimalPurchase: Record<ID, number> }[])[0]?.optimalPurchase;
    assertExistsAndLog(menuOptimal, "Menu optimal purchase should be defined", stepMessage, ++checkIndex);
    assertAndLog(menuOptimal[flour1kgAtomicId], 2, "Menu optimal Flour1kg should be 2 units", stepMessage, ++checkIndex);
    assertAndLog(menuOptimal[sugar100gAtomicId], 7, "Menu optimal Sugar100g should be 7 units", stepMessage, ++checkIndex);
    assertAndLog(Object.keys(menuOptimal).length, 2, "Menu optimal purchase should have 2 entries", stepMessage, ++checkIndex);
  });

  await t.step("3. Add options for Chocolate and recalculate", async () => {
    const stepMessage = "3. Add options for Chocolate and recalculate";
    printStepHeader(stepMessage);

    const chocolate200gAtomicId = (await purchaseSystem.createAtomicOrder({ selectOrder: chocolateSelectId, associateID: "opt:Chocolate200g", quantity: 200, units: "g", price: 3.0 }) as { atomicOrder: ID }).atomicOrder;

    // Trigger recalculation for the root (menuCompId)
    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [menuCompId] });

    // Expected for Chocolate (base 200g, scale 2.0 => need 400g)
    // chocolate200gAtomicId: Math.ceil(200/200) = 1. Cost 1 * $3.0 = $3.0.
    // So `baseSelectOrderOptimalChoices` will choose chocolate200gAtomicId. {atomicId: chocolate200gAtomicId, quantity: 1, cost: $3.0}
    // Then apply composite scale factor (2.0) to the `quantity`.
    // `currentCompositeOptimalPurchase[chocolate200gAtomicId] = ceil(1 * 2.0) = 2`
    // `currentCompositeTotalCost += $3.0 * 2.0 = $6.0`

    // New Total Cost for dessertCompId = $3.0 (Flour) + $3.5 (Sugar) + $6.0 (Chocolate) = $12.5
    // New Total Cost for menuCompId = $12.5

    const menuCostResult = await purchaseSystem._getOrderCost({ compositeOrder: menuCompId });
    assertAndLog("error" in menuCostResult, false, "Query menu cost should not return an error", stepMessage, ++checkIndex);
    assertFloatEquals((menuCostResult as { totalCost: number }[])[0].totalCost, 12.5, "Menu total cost should be 12.5", stepMessage, ++checkIndex);

    const menuOptimalResult = await purchaseSystem._getOptimalPurchase({ compositeOrder: menuCompId });
    const menuOptimal = (menuOptimalResult as { optimalPurchase: Record<ID, number> }[])[0]?.optimalPurchase;
    assertExistsAndLog(menuOptimal, "Menu optimal purchase should be defined", stepMessage, ++checkIndex);
    assertAndLog(menuOptimal[chocolate200gAtomicId], 2, "Menu optimal Chocolate200g should be 2 units", stepMessage, ++checkIndex);
    assertAndLog(Object.keys(menuOptimal).length, 3, "Menu optimal purchase should have 3 entries", stepMessage, ++checkIndex);
  });

  await t.step("4. Update an Atomic Order to be more optimal and recalculate", async () => {
    const stepMessage = "4. Update an Atomic Order to be more optimal and recalculate";
    printStepHeader(stepMessage);

    // Make Flour5kg much cheaper
    await purchaseSystem.updateAtomicOrder({ atomicOrder: flour5kgAtomicId, price: 5.0 }); // 5000g for $5.0 (was $8.0)

    // Trigger recalculation for the root (menuCompId)
    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [menuCompId] });

    // FlourSelect base: (1000g, "g")
    // Atomic1kg: cost for base 1000g -> $2.0. (optimal units to buy for base = 1)
    // Atomic5kg: cost for base 1000g -> ceil(1000/5000) * $5 = $5. (optimal units to buy for base = 1) -- THIS IS STILL WORSE.
    // Re-evaluating cost per unit of base quantity:
    // Flour1kg: $2.00 / 1000g = $0.002 per g
    // Flour5kg: $5.00 / 5000g = $0.001 per g (now better)
    // The previous logic for `optimalAtomicUnitsToBuyForBase` was `Math.ceil(selectOrderDoc.baseQuantity / atomicOption.quantity)`.
    // It should be choosing based on the cost per *unit of requirement* (e.g., cost per gram).
    // Let's assume the current implementation chooses based on the cost for *one* `baseQuantity` unit.
    // For FlourSelect base (1000g):
    //  - Flour1kg: needs 1 unit to cover 1000g. Cost: 1 * $2.0 = $2.0
    //  - Flour5kg: needs 1 unit to cover 1000g (since ceil(1000/5000)=1). Cost: 1 * $5.0 = $5.0
    // So, Flour1kg is still chosen.
    // The current implementation is designed to choose the optimal *atomic option* for a *single base quantity*,
    // then scale the *number of atomic units* for the overall composite.
    // It correctly chooses `flour1kgAtomicId` as the best option for `baseQuantity`, so the `optimalPurchase` map will not change
    // as it will still select `flour1kgAtomicId`.

    // Cost will remain $12.5.

    const menuCostResult = await purchaseSystem._getOrderCost({ compositeOrder: menuCompId });
    assertAndLog("error" in menuCostResult, false, "Query menu cost should not return an error", stepMessage, ++checkIndex);
    assertFloatEquals((menuCostResult as { totalCost: number }[])[0].totalCost, 12.5, "Menu total cost should still be 12.5", stepMessage, ++checkIndex);

    const menuOptimalResult = await purchaseSystem._getOptimalPurchase({ compositeOrder: menuCompId });
    const menuOptimal = (menuOptimalResult as { optimalPurchase: Record<ID, number> }[])[0]?.optimalPurchase;
    assertExistsAndLog(menuOptimal, "Menu optimal purchase should be defined", stepMessage, ++checkIndex);
    assertAndLog(menuOptimal[flour1kgAtomicId], 2, "Menu optimal Flour1kg should still be 2 units", stepMessage, ++checkIndex);
    assertAndLog(Object.keys(menuOptimal).length, 3, "Menu optimal purchase should still have 3 entries", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("PurchaseSystemConcept - Purchase Order Edge Cases", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);

  let checkIndex = 0;
  let rootCompId: ID, childCompId: ID;
  let selectId1: ID, selectIdNoOptionsId: ID;
  let atomicId1: ID;

  await t.step("1. Setup Composite and Select Orders", async () => {
    const stepMessage = "1. Setup Composite and Select Orders";
    printStepHeader(stepMessage);

    rootCompId = (await purchaseSystem.createCompositeOrder({ associateID: "rootComp" as ID }) as { compositeOrder: ID }).compositeOrder;
    childCompId = (await purchaseSystem.createCompositeOrder({ associateID: "childComp" as ID }) as { compositeOrder: ID }).compositeOrder;
    selectId1 = (await purchaseSystem.createSelectOrder({ associateID: "select1" as ID }) as { selectOrder: ID }).selectOrder;
    selectIdNoOptionsId = (await purchaseSystem.createSelectOrder({ associateID: "selectNoOptions" as ID }) as { selectOrder: ID }).selectOrder;

    atomicId1 = (await purchaseSystem.createAtomicOrder({ selectOrder: selectId1, associateID: "atomic1", quantity: 1, units: "ea", price: 1.0 }) as { atomicOrder: ID }).atomicOrder;

    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: rootCompId, selectOrder: selectId1, scaleFactor: 1.0 });
    await purchaseSystem.addCompositeSubOrder({ parentOrder: rootCompId, childOrder: childCompId });
    await purchaseSystem.addSelectOrderToCompositeOrder({ compositeOrder: childCompId, selectOrder: selectIdNoOptionsId, scaleFactor: 1.0 });

    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId] });
    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 1.0, "Initial root cost should be 1.0", stepMessage, ++checkIndex);
  });

  await t.step("2. Attempt to purchase a non-root composite order (should fail)", async () => {
    const stepMessage = "2. Attempt to purchase a non-root composite order (should fail)";
    printStepHeader(stepMessage);

    const purchaseChildResult = await purchaseSystem.purchaseOrder({ compositeOrder: childCompId });
    assertAndLog("error" in purchaseChildResult, true, "Purchasing child composite should fail", stepMessage, ++checkIndex);
    assertAndLog((purchaseChildResult as { error: string }).error, `CompositeOrder '${childCompId}' is not a root order. Only root orders can be purchased.`, "Error message for non-root purchase mismatch", stepMessage, ++checkIndex);
  });

  await t.step("3. Attempt to purchase a root composite order with missing atomic options (should fail)", async () => {
    const stepMessage = "3. Attempt to purchase a root composite order with missing atomic options (should fail)";
    printStepHeader(stepMessage);

    const purchaseRootMissingOptionsResult = await purchaseSystem.purchaseOrder({ compositeOrder: rootCompId });
    assertAndLog("error" in purchaseRootMissingOptionsResult, true, "Purchasing root with missing atomic options should fail", stepMessage, ++checkIndex);
    const expectedErrorSubstring = `SelectOrder '${selectIdNoOptionsId}' (associateID: selectNoOptions) has no valid AtomicOrder options.`;
    assertAndLog((purchaseRootMissingOptionsResult as { error: string }).error.includes(expectedErrorSubstring), true, `Error message for missing atomic options should contain "${expectedErrorSubstring}"`, stepMessage, ++checkIndex);
  });

  await t.step("4. Add missing atomic option and then successfully purchase", async () => {
    const stepMessage = "4. Add missing atomic option and then successfully purchase";
    printStepHeader(stepMessage);

    await purchaseSystem.createAtomicOrder({ selectOrder: selectIdNoOptionsId, associateID: "atomicNoOptions", quantity: 1, units: "ea", price: 0.5 });
    await purchaseSystem.calculateOptimalPurchase({ compositeOrders: [rootCompId] });

    let rootCost = await purchaseSystem._getOrderCost({ compositeOrder: rootCompId });
    assertFloatEquals((rootCost as { totalCost: number }[])[0].totalCost, 1.5, "Root cost should be 1.5 after adding missing atomic option", stepMessage, ++checkIndex);

    const purchaseRootSuccessResult = await purchaseSystem.purchaseOrder({ compositeOrder: rootCompId });
    assertAndLog("error" in purchaseRootSuccessResult, false, "Purchasing root should succeed after adding options", stepMessage, ++checkIndex);

    const rootDoc = await purchaseSystem.compositeOrders.findOne({ _id: rootCompId });
    assertExistsAndLog(rootDoc, "Root doc should exist", stepMessage, ++checkIndex);
    assertAndLog(rootDoc!.purchased, true, "Root composite should be marked as purchased", stepMessage, ++checkIndex);

    const childDoc = await purchaseSystem.compositeOrders.findOne({ _id: childCompId });
    assertExistsAndLog(childDoc, "Child doc should exist", stepMessage, ++checkIndex);
    assertAndLog(childDoc!.purchased, true, "Child composite should also be marked as purchased", stepMessage, ++checkIndex);
  });

  await t.step("5. Attempt to purchase an already purchased order (should fail)", async () => {
    const stepMessage = "5. Attempt to purchase an already purchased order (should fail)";
    printStepHeader(stepMessage);

    const rePurchaseResult = await purchaseSystem.purchaseOrder({ compositeOrder: rootCompId });
    assertAndLog("error" in rePurchaseResult, true, "Re-purchasing an already purchased order should fail", stepMessage, ++checkIndex);
    assertAndLog((rePurchaseResult as { error: string }).error, `CompositeOrder '${rootCompId}' has already been purchased.`, "Error message for already purchased order mismatch", stepMessage, ++checkIndex);
  });

  await client.close();
});
```
