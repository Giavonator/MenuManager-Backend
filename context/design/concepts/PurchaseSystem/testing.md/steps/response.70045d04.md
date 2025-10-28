---
timestamp: 'Tue Oct 28 2025 19:08:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_190826.5a012fb9.md]]'
content_id: 70045d043e6b0a7756595cb3e4bdd5ce31cb2da8f2484de9714c74e965d989aa
---

# response:

```typescript
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts";
import { testDb } from "@utils/database.ts";
import PurchaseSystemConcept from "./PurchaseSystemConcept.ts";
import { ID } from "@utils/types.ts";
import { assertEquals } from "jsr:@std/assert";

/**
 * PurchaseSystemConcept
 *
 * purpose: Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts),
 * tracking their purchase status and optimizing selections from available purchasing options.
 *
 * principle: If a user defines a recipe (CompositeOrder) that needs a certain quantity of an ingredient (SelectOrder)
 * with specific purchase options (AtomicOrders), then by calculating the optimal purchase, the system will
 * determine the most cost-effective way to acquire the required quantity of that ingredient, factoring in
 * the available AtomicOrder sizes and prices, and will roll up the total cost and optimal purchase plan for the recipe.
 * This plan can then be marked as purchased.
 */
Deno.test("PurchaseSystemConcept - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);
  let checkIndex = 0;

  // IDs for the various orders
  let eggsSelectOrderID: ID;
  let milkSelectOrderID: ID;
  let breakfastCompositeOrderID: ID;

  let eggsAtomic6CountID: ID;
  let eggsAtomic12CountID: ID;
  let milkAtomic1LiterID: ID;
  let milkAtomic2LiterID: ID;

  // --- Step 1: Create SelectOrders for ingredients (Eggs and Milk) ---
  await t.step("1. Create SelectOrders for Eggs and Milk", async () => {
    printStepHeader(t.description);
    const createEggsSOResult = await purchaseSystem.createSelectOrder({
      associateID: "S_Eggs",
    });
    assertAndLog(
      "selectOrder" in createEggsSOResult,
      true,
      "Eggs SelectOrder creation should succeed",
      t.description!,
      ++checkIndex,
    );
    eggsSelectOrderID = (createEggsSOResult as { selectOrder: ID }).selectOrder;

    const createMilkSOResult = await purchaseSystem.createSelectOrder({
      associateID: "S_Milk",
    });
    assertAndLog(
      "selectOrder" in createMilkSOResult,
      true,
      "Milk SelectOrder creation should succeed",
      t.description!,
      ++checkIndex,
    );
    milkSelectOrderID = (createMilkSOResult as { selectOrder: ID }).selectOrder;
  });

  // --- Step 2: Add AtomicOrders (purchase options) to SelectOrders ---
  await t.step(
    "2. Add AtomicOrders (purchase options) to Eggs and Milk SelectOrders",
    async () => {
      printStepHeader(t.description);

      // Add options for Eggs
      const createEggsAtomic6 = await purchaseSystem.createAtomicOrder({
        selectOrder: eggsSelectOrderID,
        associateID: "A_6Eggs_Carton",
        quantity: 6,
        units: "eggs",
        price: 2.50,
      });
      assertAndLog(
        "atomicOrder" in createEggsAtomic6,
        true,
        "6 Eggs AtomicOrder creation should succeed",
        t.description!,
        ++checkIndex,
      );
      eggsAtomic6CountID = (createEggsAtomic6 as { atomicOrder: ID })
        .atomicOrder;

      const createEggsAtomic12 = await purchaseSystem.createAtomicOrder({
        selectOrder: eggsSelectOrderID,
        associateID: "A_12Eggs_Carton",
        quantity: 12,
        units: "eggs",
        price: 4.00,
      });
      assertAndLog(
        "atomicOrder" in createEggsAtomic12,
        true,
        "12 Eggs AtomicOrder creation should succeed",
        t.description!,
        ++checkIndex,
      );
      eggsAtomic12CountID = (createEggsAtomic12 as { atomicOrder: ID })
        .atomicOrder;

      // Verify Eggs SelectOrder base quantity and units
      const eggsSO = await purchaseSystem.selectOrders.findOne({
        _id: eggsSelectOrderID,
      });
      assertExistsAndLog(eggsSO, "Eggs SelectOrder should exist", t.description!, ++checkIndex);
      assertAndLog(eggsSO!.baseQuantity, 6, "Eggs SelectOrder base quantity should be 6", t.description!, ++checkIndex);
      assertAndLog(eggsSO!.baseUnits, "eggs", "Eggs SelectOrder base units should be 'eggs'", t.description!, ++checkIndex);

      // Add options for Milk
      const createMilkAtomic1Liter = await purchaseSystem.createAtomicOrder({
        selectOrder: milkSelectOrderID,
        associateID: "A_1Liter_Milk",
        quantity: 1,
        units: "liter",
        price: 1.50,
      });
      assertAndLog(
        "atomicOrder" in createMilkAtomic1Liter,
        true,
        "1 Liter Milk AtomicOrder creation should succeed",
        t.description!,
        ++checkIndex,
      );
      milkAtomic1LiterID = (createMilkAtomic1Liter as { atomicOrder: ID })
        .atomicOrder;

      const createMilkAtomic2Liter = await purchaseSystem.createAtomicOrder({
        selectOrder: milkSelectOrderID,
        associateID: "A_2Liter_Milk",
        quantity: 2,
        units: "liter",
        price: 2.50,
      });
      assertAndLog(
        "atomicOrder" in createMilkAtomic2Liter,
        true,
        "2 Liter Milk AtomicOrder creation should succeed",
        t.description!,
        ++checkIndex,
      );
      milkAtomic2LiterID = (createMilkAtomic2Liter as { atomicOrder: ID })
        .atomicOrder;

      // Verify Milk SelectOrder base quantity and units
      const milkSO = await purchaseSystem.selectOrders.findOne({
        _id: milkSelectOrderID,
      });
      assertExistsAndLog(milkSO, "Milk SelectOrder should exist", t.description!, ++checkIndex);
      assertAndLog(milkSO!.baseQuantity, 1, "Milk SelectOrder base quantity should be 1", t.description!, ++checkIndex);
      assertAndLog(milkSO!.baseUnits, "liter", "Milk SelectOrder base units should be 'liter'", t.description!, ++checkIndex);
    },
  );

  // --- Step 3: Create a CompositeOrder for "Simple Breakfast" ---
  await t.step(
    "3. Create a CompositeOrder for 'Simple Breakfast'",
    async () => {
      printStepHeader(t.description);
      const createBreakfastCOResult = await purchaseSystem.createCompositeOrder(
        { associateID: "C_SimpleBreakfast" },
      );
      assertAndLog(
        "compositeOrder" in createBreakfastCOResult,
        true,
        "Breakfast CompositeOrder creation should succeed",
        t.description!,
        ++checkIndex,
      );
      breakfastCompositeOrderID = (createBreakfastCOResult as {
        compositeOrder: ID;
      }).compositeOrder;
    },
  );

  // --- Step 4: Add SelectOrders to the CompositeOrder with scale factors ---
  await t.step(
    "4. Add SelectOrders to CompositeOrder with scale factors",
    async () => {
      printStepHeader(t.description);

      // Breakfast needs 8 eggs. Eggs SelectOrder base is 6 eggs. Scale factor = 8/6 = 1.333...
      const eggsRequiredQuantity = 8;
      const eggsSO = await purchaseSystem.selectOrders.findOne({
        _id: eggsSelectOrderID,
      });
      assertExistsAndLog(eggsSO, "Eggs SelectOrder must exist to calculate scale factor", t.description!, ++checkIndex);
      const eggsScaleFactor = eggsRequiredQuantity / eggsSO!.baseQuantity;

      const addEggsResult = await purchaseSystem.addSelectOrderToCompositeOrder({
        compositeOrder: breakfastCompositeOrderID,
        selectOrder: eggsSelectOrderID,
        scaleFactor: eggsScaleFactor,
      });
      assertAndLog(
        "error" in addEggsResult,
        false,
        "Adding Eggs SelectOrder should succeed",
        t.description!,
        ++checkIndex,
      );

      // Breakfast needs 1.5 liters of milk. Milk SelectOrder base is 1 liter. Scale factor = 1.5/1 = 1.5.
      const milkRequiredQuantity = 1.5;
      const milkSO = await purchaseSystem.selectOrders.findOne({
        _id: milkSelectOrderID,
      });
      assertExistsAndLog(milkSO, "Milk SelectOrder must exist to calculate scale factor", t.description!, ++checkIndex);
      const milkScaleFactor = milkRequiredQuantity / milkSO!.baseQuantity;

      const addMilkResult = await purchaseSystem.addSelectOrderToCompositeOrder({
        compositeOrder: breakfastCompositeOrderID,
        selectOrder: milkSelectOrderID,
        scaleFactor: milkScaleFactor,
      });
      assertAndLog(
        "error" in addMilkResult,
        false,
        "Adding Milk SelectOrder should succeed",
        t.description!,
        ++checkIndex,
      );

      // Verify the composite order reflects the changes
      const breakfastCO = await purchaseSystem.compositeOrders.findOne({
        _id: breakfastCompositeOrderID,
      });
      assertExistsAndLog(breakfastCO, "Breakfast CompositeOrder should exist after adding children", t.description!, ++checkIndex);
      assertExistsAndLog(breakfastCO!.childSelectOrders[eggsSelectOrderID], "Eggs SelectOrder should be in children", t.description!, ++checkIndex);
      assertEquals(breakfastCO!.childSelectOrders[eggsSelectOrderID], eggsScaleFactor, "Eggs SelectOrder scale factor should match", t.description!, ++checkIndex);
      assertExistsAndLog(breakfastCO!.childSelectOrders[milkSelectOrderID], "Milk SelectOrder should be in children", t.description!, ++checkIndex);
      assertEquals(breakfastCO!.childSelectOrders[milkSelectOrderID], milkScaleFactor, "Milk SelectOrder scale factor should match", t.description!, ++checkIndex);

      // Verify SelectOrders have the CompositeOrder as a parent
      const updatedEggsSO = await purchaseSystem.selectOrders.findOne({_id: eggsSelectOrderID});
      assertExistsAndLog(updatedEggsSO, "Updated Eggs SelectOrder should exist", t.description!, ++checkIndex);
      assertAndLog(updatedEggsSO!.parentOrders.includes(breakfastCompositeOrderID), true, "Eggs SelectOrder should list Breakfast CO as parent", t.description!, ++checkIndex);
      const updatedMilkSO = await purchaseSystem.selectOrders.findOne({_id: milkSelectOrderID});
      assertExistsAndLog(updatedMilkSO, "Updated Milk SelectOrder should exist", t.description!, ++checkIndex);
      assertAndLog(updatedMilkSO!.parentOrders.includes(breakfastCompositeOrderID), true, "Milk SelectOrder should list Breakfast CO as parent", t.description!, ++checkIndex);
    },
  );

  // --- Step 5: Calculate Optimal Purchase for "Simple Breakfast" ---
  await t.step(
    "5. Calculate Optimal Purchase for 'Simple Breakfast'",
    async () => {
      printStepHeader(t.description);

      const calculateResult = await purchaseSystem.calculateOptimalPurchase({
        compositeOrders: [breakfastCompositeOrderID],
      });
      assertAndLog(
        "error" in calculateResult,
        false,
        "Calculate optimal purchase should succeed",
        t.description!,
        ++checkIndex,
      );

      // Expected Optimal Purchase for 8 eggs:
      // Option 1 (6 eggs for $2.50): Need 2 cartons -> 12 eggs for $5.00
      // Option 2 (12 eggs for $4.00): Need 1 carton -> 12 eggs for $4.00
      // Optimal: 1 carton of 12 eggs for $4.00.

      // Expected Optimal Purchase for 1.5 liters of milk:
      // Option 1 (1 liter for $1.50): Need 2 units -> 2 liters for $3.00
      // Option 2 (2 liters for $2.50): Need 1 unit -> 2 liters for $2.50
      // Optimal: 1 unit of 2 liters for $2.50.

      // Total Cost: $4.00 (eggs) + $2.50 (milk) = $6.50.
      // Total Optimal Purchase: {atomic_id_12_eggs: 1, atomic_id_2_liter_milk: 1}

      const totalCostResult = await purchaseSystem._getOrderCost({
        compositeOrder: breakfastCompositeOrderID,
      });
      assertAndLog(
        "error" in totalCostResult,
        false,
        "Query for total cost should succeed",
        t.description!,
        ++checkIndex,
      );
      assertAndLog(
        (totalCostResult as { totalCost: number }[])[0].totalCost,
        6.50, // Floating point comparison can be tricky, using exact for now
        "Total cost should be $6.50",
        t.description!,
        ++checkIndex,
      );

      const optimalPurchaseResult = await purchaseSystem._getOptimalPurchase({
        compositeOrder: breakfastCompositeOrderID,
      });
      assertAndLog(
        "error" in optimalPurchaseResult,
        false,
        "Query for optimal purchase should succeed",
        t.description!,
        ++checkIndex,
      );
      const expectedOptimalPurchase = {
        [eggsAtomic12CountID]: 1,
        [milkAtomic2LiterID]: 1,
      };
      assertAndLog(
        (optimalPurchaseResult as { optimalPurchase: Record<ID, number> }[])[0]
          .optimalPurchase,
        expectedOptimalPurchase,
        "Optimal purchase should match expected values",
        t.description!,
        ++checkIndex,
      );
    },
  );

  // --- Step 6: Mark the CompositeOrder as purchased ---
  await t.step("6. Mark 'Simple Breakfast' as purchased", async () => {
    printStepHeader(t.description);

    const purchaseResult = await purchaseSystem.purchaseOrder({
      compositeOrder: breakfastCompositeOrderID,
    });
    assertAndLog(
      "error" in purchaseResult,
      false,
      "Purchase order should succeed",
      t.description!,
      ++checkIndex,
    );

    // Verify the composite order's purchased status
    const breakfastCO = await purchaseSystem.compositeOrders.findOne({
      _id: breakfastCompositeOrderID,
    });
    assertExistsAndLog(breakfastCO, "Breakfast CompositeOrder should exist after purchase", t.description!, ++checkIndex);
    assertAndLog(breakfastCO!.purchased, true, "Breakfast CompositeOrder should be marked as purchased", t.description!, ++checkIndex);
  });

  await client.close();
});

// Other test cases (e.g., error conditions, updates, complex hierarchies) will follow.
```
