---
timestamp: 'Tue Oct 28 2025 19:03:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_190347.80316fa3.md]]'
content_id: 43fe5d0e564f3eab04adec72a06f588b4b325ad5eb8eb44aca6d4182f67792a8
---

# response:

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "@utils/testing.ts"; // Assuming these helpers are in @utils/testing.ts

import PurchaseSystemConcept from "./PurchaseSystemConcept.ts";

// Helper to assert that a result is an error and return the message
function assertIsError(
  actual: object,
  expectedErrorMessage: string,
  stepMessage: string,
  checkIndex: number,
) {
  assertAndLog(
    "error" in actual,
    true,
    `Result should be an error for "${expectedErrorMessage}"`,
    stepMessage,
    ++checkIndex,
  );
  assertAndLog(
    (actual as { error: string }).error,
    expectedErrorMessage,
    `Error message should match for "${expectedErrorMessage}"`,
    stepMessage,
    ++checkIndex,
  );
  return checkIndex;
}

// Helper to assert that a query result is an error and return the message
function assertQueryIsError(
  actual: object,
  expectedErrorMessage: string,
  stepMessage: string,
  checkIndex: number,
) {
  assertAndLog(
    "error" in actual,
    true,
    `Query result should be an error for "${expectedErrorMessage}"`,
    stepMessage,
    ++checkIndex,
  );
  assertAndLog(
    (actual as { error: string }).error,
    expectedErrorMessage,
    `Query error message should match for "${expectedErrorMessage}"`,
    stepMessage,
    ++checkIndex,
  );
  return checkIndex;
}

Deno.test("PurchaseSystem - Operating Principle Verification", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);
  let checkIndex = 0;

  let milkSelectOrder: ID;
  let wholeMilkAtomicOrder: ID;
  let skimMilkAtomicOrder: ID;
  let weeklyGroceriesCompositeOrder: ID;

  await t.step("1. Create SelectOrder for 'Milk'", async () => {
    const stepMessage = "1. Create SelectOrder for 'Milk'";
    printStepHeader(stepMessage);
    const createSelectResult = await purchaseSystem.createSelectOrder({
      associateID: "Milk" as ID,
    });
    checkIndex = assertIsError(
      createSelectResult,
      "", // No error expected here, but useful to have the helper
      stepMessage,
      checkIndex,
    );
    assertAndLog(
      "selectOrder" in createSelectResult,
      true,
      "SelectOrder creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    milkSelectOrder = (createSelectResult as { selectOrder: ID }).selectOrder;
    assertExistsAndLog(milkSelectOrder, "Milk SelectOrder ID exists", stepMessage, ++checkIndex);

    const queriedSelectOrder = await purchaseSystem._getOrderByAssociateID({
      associateID: "Milk" as ID,
    });
    assertAndLog(
      "error" in queriedSelectOrder,
      false,
      "Query SelectOrder by associateID should not error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queriedSelectOrder[0].order._id,
      milkSelectOrder,
      "Queried SelectOrder ID matches",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("2. Add AtomicOrder 'Whole Milk 1G' to 'Milk' SelectOrder", async () => {
    const stepMessage = "2. Add AtomicOrder 'Whole Milk 1G' to 'Milk' SelectOrder";
    printStepHeader(stepMessage);
    const createAtomicResult = await purchaseSystem.createAtomicOrder({
      selectOrder: milkSelectOrder,
      associateID: "Whole Milk 1G" as ID,
      quantity: 1.0,
      units: "gallon",
      price: 4.00,
    });
    checkIndex = assertIsError(createAtomicResult, "", stepMessage, checkIndex);
    assertAndLog(
      "atomicOrder" in createAtomicResult,
      true,
      "AtomicOrder creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    wholeMilkAtomicOrder = (createAtomicResult as { atomicOrder: ID }).atomicOrder;
    assertExistsAndLog(wholeMilkAtomicOrder, "Whole Milk AtomicOrder ID exists", stepMessage, ++checkIndex);

    const queriedAtomicOrder = await purchaseSystem._getOrderByAssociateID({
      associateID: "Whole Milk 1G" as ID,
    });
    assertAndLog(
      "error" in queriedAtomicOrder,
      false,
      "Query AtomicOrder by associateID should not error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queriedAtomicOrder[0].order._id,
      wholeMilkAtomicOrder,
      "Queried AtomicOrder ID matches",
      stepMessage,
      ++checkIndex,
    );

    const updatedSelectOrder = await db.collection("PurchaseSystem.selectOrders").findOne({ _id: milkSelectOrder });
    assertExistsAndLog(updatedSelectOrder, "SelectOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelectOrder!.baseQuantity,
      1.0,
      "SelectOrder baseQuantity should be 1.0",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelectOrder!.baseUnits,
      "gallon",
      "SelectOrder baseUnits should be 'gallon'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelectOrder!.childAtomicOrders.includes(wholeMilkAtomicOrder),
      true,
      "SelectOrder should contain Whole Milk AtomicOrder",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Add AtomicOrder 'Skim Milk 0.5G' to 'Milk' SelectOrder", async () => {
    const stepMessage = "3. Add AtomicOrder 'Skim Milk 0.5G' to 'Milk' SelectOrder";
    printStepHeader(stepMessage);
    const createAtomicResult = await purchaseSystem.createAtomicOrder({
      selectOrder: milkSelectOrder,
      associateID: "Skim Milk 0.5G" as ID,
      quantity: 0.5,
      units: "gallon",
      price: 2.50,
    });
    checkIndex = assertIsError(createAtomicResult, "", stepMessage, checkIndex);
    assertAndLog(
      "atomicOrder" in createAtomicResult,
      true,
      "AtomicOrder creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    skimMilkAtomicOrder = (createAtomicResult as { atomicOrder: ID }).atomicOrder;
    assertExistsAndLog(skimMilkAtomicOrder, "Skim Milk AtomicOrder ID exists", stepMessage, ++checkIndex);

    const updatedSelectOrder = await db.collection("PurchaseSystem.selectOrders").findOne({ _id: milkSelectOrder });
    assertExistsAndLog(updatedSelectOrder, "SelectOrder should be updated with second atomic order", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelectOrder!.baseQuantity,
      1.0,
      "SelectOrder baseQuantity should still be 1.0 (from first atomic order)",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelectOrder!.baseUnits,
      "gallon",
      "SelectOrder baseUnits should still be 'gallon' (from first atomic order)",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelectOrder!.childAtomicOrders.includes(skimMilkAtomicOrder),
      true,
      "SelectOrder should contain Skim Milk AtomicOrder",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Create CompositeOrder for 'Weekly Groceries'", async () => {
    const stepMessage = "4. Create CompositeOrder for 'Weekly Groceries'";
    printStepHeader(stepMessage);
    const createCompositeResult = await purchaseSystem.createCompositeOrder({
      associateID: "Weekly Groceries" as ID,
    });
    checkIndex = assertIsError(
      createCompositeResult,
      "",
      stepMessage,
      checkIndex,
    );
    assertAndLog(
      "compositeOrder" in createCompositeResult,
      true,
      "CompositeOrder creation should succeed",
      stepMessage,
      ++checkIndex,
    );
    weeklyGroceriesCompositeOrder = (createCompositeResult as { compositeOrder: ID }).compositeOrder;
    assertExistsAndLog(weeklyGroceriesCompositeOrder, "Weekly Groceries CompositeOrder ID exists", stepMessage, ++checkIndex);

    const queriedCompositeOrder = await purchaseSystem._getOrderByAssociateID({
      associateID: "Weekly Groceries" as ID,
    });
    assertAndLog(
      "error" in queriedCompositeOrder,
      false,
      "Query CompositeOrder by associateID should not error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queriedCompositeOrder[0].order._id,
      weeklyGroceriesCompositeOrder,
      "Queried CompositeOrder ID matches",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queriedCompositeOrder[0].order.totalCost,
      0.0,
      "Initial totalCost should be 0.0",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "5. Add 'Milk' SelectOrder to 'Weekly Groceries' CompositeOrder with scale factor 2.0",
    async () => {
      const stepMessage =
        "5. Add 'Milk' SelectOrder to 'Weekly Groceries' CompositeOrder with scale factor 2.0";
      printStepHeader(stepMessage);
      const addResult = await purchaseSystem.addSelectOrderToCompositeOrder({
        compositeOrder: weeklyGroceriesCompositeOrder,
        selectOrder: milkSelectOrder,
        scaleFactor: 2.0,
      });
      checkIndex = assertIsError(addResult, "", stepMessage, checkIndex);
      assertAndLog(
        "error" in addResult,
        false,
        "Adding SelectOrder to CompositeOrder should succeed",
        stepMessage,
        ++checkIndex,
      );

      const updatedCompositeOrder = await db.collection("PurchaseSystem.compositeOrders").findOne({ _id: weeklyGroceriesCompositeOrder });
      assertExistsAndLog(updatedCompositeOrder, "CompositeOrder should be updated", stepMessage, ++checkIndex);
      assertAndLog(
        updatedCompositeOrder!.childSelectOrders[milkSelectOrder],
        2.0,
        "Milk SelectOrder scale factor should be 2.0",
        stepMessage,
        ++checkIndex,
      );

      // Verify that calculateOptimalPurchase was implicitly called by checking the cost
      const costQuery = await purchaseSystem._getOrderCost({
        compositeOrder: weeklyGroceriesCompositeOrder,
      });
      assertAndLog(
        "error" in costQuery,
        false,
        "Query order cost should not error after adding select order",
        stepMessage,
        ++checkIndex,
      );
      // Explanation for expected cost:
      // SelectOrder "Milk" needs 2 gallons (scale factor 2.0 * baseQuantity 1.0).
      // Option 1: Whole Milk 1G (1 gallon, $4.00). To get 2 gallons, need 2 units, total cost $8.00.
      // Option 2: Skim Milk 0.5G (0.5 gallon, $2.50). To get 2 gallons, need 4 units, total cost $10.00.
      // Optimal is Whole Milk, $8.00.
      assertAndLog(
        costQuery[0].totalCost,
        8.00,
        "Total cost should be 8.00 after adding select order (implicit calculation)",
        stepMessage,
        ++checkIndex,
      );

      const optimalPurchaseQuery = await purchaseSystem._getOptimalPurchase({
        compositeOrder: weeklyGroceriesCompositeOrder,
      });
      assertAndLog(
        "error" in optimalPurchaseQuery,
        false,
        "Query optimal purchase should not error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        optimalPurchaseQuery[0].optimalPurchase[wholeMilkAtomicOrder],
        2,
        "Optimal purchase should include 2 Whole Milk AtomicOrders",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        skimMilkAtomicOrder in optimalPurchaseQuery[0].optimalPurchase,
        false,
        "Optimal purchase should NOT include Skim Milk AtomicOrders",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("6. Explicitly Calculate Optimal Purchase for 'Weekly Groceries'", async () => {
    const stepMessage = "6. Explicitly Calculate Optimal Purchase for 'Weekly Groceries'";
    printStepHeader(stepMessage);
    const calculateResult = await purchaseSystem.calculateOptimalPurchase({
      compositeOrders: [weeklyGroceriesCompositeOrder],
    });
    checkIndex = assertIsError(
      calculateResult,
      "",
      stepMessage,
      checkIndex,
    );
    assertAndLog(
      "error" in calculateResult,
      false,
      "Explicit calculation should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Re-verify optimal purchase and cost
    const costQuery = await purchaseSystem._getOrderCost({
      compositeOrder: weeklyGroceriesCompositeOrder,
    });
    assertAndLog(
      "error" in costQuery,
      false,
      "Query order cost should not error after explicit calculation",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      costQuery[0].totalCost,
      8.00,
      "Total cost should still be 8.00 after explicit calculation",
      stepMessage,
      ++checkIndex,
    );

    const optimalPurchaseQuery = await purchaseSystem._getOptimalPurchase({
      compositeOrder: weeklyGroceriesCompositeOrder,
    });
    assertAndLog(
      "error" in optimalPurchaseQuery,
      false,
      "Query optimal purchase should not error after explicit calculation",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      optimalPurchaseQuery[0].optimalPurchase[wholeMilkAtomicOrder],
      2,
      "Optimal purchase should still include 2 Whole Milk AtomicOrders after explicit calculation",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("7. Purchase 'Weekly Groceries' order", async () => {
    const stepMessage = "7. Purchase 'Weekly Groceries' order";
    printStepHeader(stepMessage);
    const purchaseResult = await purchaseSystem.purchaseOrder({
      compositeOrder: weeklyGroceriesCompositeOrder,
    });
    checkIndex = assertIsError(purchaseResult, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in purchaseResult,
      false,
      "Purchasing order should succeed",
      stepMessage,
      ++checkIndex,
    );

    const purchasedCompositeOrder = await db.collection("PurchaseSystem.compositeOrders").findOne({ _id: weeklyGroceriesCompositeOrder });
    assertExistsAndLog(purchasedCompositeOrder, "CompositeOrder should exist after purchase", stepMessage, ++checkIndex);
    assertAndLog(
      purchasedCompositeOrder!.purchased,
      true,
      "CompositeOrder 'purchased' flag should be true",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("PurchaseSystem - SelectOrder Actions", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);
  let checkIndex = 0;

  let selectOrderID_A: ID;
  let selectOrderID_B: ID;
  let atomicOrderID_A1: ID;
  let atomicOrderID_A2: ID;

  await t.step("createSelectOrder: Success", async () => {
    const stepMessage = "createSelectOrder: Success";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createSelectOrder({
      associateID: "Item_A" as ID,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "selectOrder" in result,
      true,
      "Should return selectOrder ID",
      stepMessage,
      ++checkIndex,
    );
    selectOrderID_A = (result as { selectOrder: ID }).selectOrder;

    const queried = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrderID_A,
    });
    assertExistsAndLog(queried, "SelectOrder should exist in DB", stepMessage, ++checkIndex);
    assertAndLog(
      queried!.associateID,
      "Item_A",
      "Associate ID should match",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queried!.baseQuantity,
      -1,
      "Base quantity should be -1 initially",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(queried!.baseUnits, "", "Base units should be empty initially", stepMessage, ++checkIndex);
  });

  await t.step("createSelectOrder: Error - Duplicate associateID", async () => {
    const stepMessage = "createSelectOrder: Error - Duplicate associateID";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createSelectOrder({
      associateID: "Item_A" as ID,
    });
    checkIndex = assertIsError(
      result,
      "Order with associateID 'Item_A' already exists.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("createAtomicOrder: Success - First option sets base", async () => {
    const stepMessage = "createAtomicOrder: Success - First option sets base";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createAtomicOrder({
      selectOrder: selectOrderID_A,
      associateID: "Option_A1" as ID,
      quantity: 10,
      units: "g",
      price: 1.0,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "atomicOrder" in result,
      true,
      "Should return atomicOrder ID",
      stepMessage,
      ++checkIndex,
    );
    atomicOrderID_A1 = (result as { atomicOrder: ID }).atomicOrder;

    const queriedAtomic = await db.collection("PurchaseSystem.atomicOrders").findOne({
      _id: atomicOrderID_A1,
    });
    assertExistsAndLog(queriedAtomic, "AtomicOrder should exist in DB", stepMessage, ++checkIndex);
    assertAndLog(
      queriedAtomic!.quantity,
      10,
      "Quantity should match",
      stepMessage,
      ++checkIndex,
    );

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrderID_A,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.baseQuantity,
      10,
      "Base quantity should be updated to 10",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.baseUnits,
      "g",
      "Base units should be updated to 'g'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.childAtomicOrders.includes(atomicOrderID_A1),
      true,
      "SelectOrder should contain new AtomicOrder",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("createAtomicOrder: Success - Subsequent option doesn't change base", async () => {
    const stepMessage =
      "createAtomicOrder: Success - Subsequent option doesn't change base";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createAtomicOrder({
      selectOrder: selectOrderID_A,
      associateID: "Option_A2" as ID,
      quantity: 5,
      units: "g",
      price: 0.6,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "atomicOrder" in result,
      true,
      "Should return atomicOrder ID",
      stepMessage,
      ++checkIndex,
    );
    atomicOrderID_A2 = (result as { atomicOrder: ID }).atomicOrder;

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrderID_A,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.baseQuantity,
      10,
      "Base quantity should remain 10",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.baseUnits,
      "g",
      "Base units should remain 'g'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.childAtomicOrders.includes(atomicOrderID_A2),
      true,
      "SelectOrder should contain new AtomicOrder",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("createAtomicOrder: Error - SelectOrder not found", async () => {
    const stepMessage = "createAtomicOrder: Error - SelectOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createAtomicOrder({
      selectOrder: "nonExistentSelect" as ID,
      associateID: "Option_Bad" as ID,
      quantity: 1,
      units: "ea",
      price: 1.0,
    });
    checkIndex = assertIsError(
      result,
      "SelectOrder with ID 'nonExistentSelect' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("createAtomicOrder: Error - Duplicate associateID", async () => {
    const stepMessage = "createAtomicOrder: Error - Duplicate associateID";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createAtomicOrder({
      selectOrder: selectOrderID_A,
      associateID: "Option_A1" as ID,
      quantity: 1,
      units: "ea",
      price: 1.0,
    });
    checkIndex = assertIsError(
      result,
      "Order with associateID 'Option_A1' already exists.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("updateAtomicOrder: Success - Update quantity", async () => {
    const stepMessage = "updateAtomicOrder: Success - Update quantity";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.updateAtomicOrder({
      atomicOrder: atomicOrderID_A1,
      quantity: 15,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Updating quantity should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedAtomic = await db.collection("PurchaseSystem.atomicOrders").findOne({
      _id: atomicOrderID_A1,
    });
    assertExistsAndLog(updatedAtomic, "AtomicOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedAtomic!.quantity,
      15,
      "Quantity should be 15",
      stepMessage,
      ++checkIndex,
    );

    // Also verify that SelectOrder's base quantity updated because A1 was the first
    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrderID_A,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should reflect base quantity update", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.baseQuantity,
      15,
      "SelectOrder base quantity should update to 15",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("updateAtomicOrder: Success - Update price", async () => {
    const stepMessage = "updateAtomicOrder: Success - Update price";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.updateAtomicOrder({
      atomicOrder: atomicOrderID_A2,
      price: 0.75,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Updating price should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedAtomic = await db.collection("PurchaseSystem.atomicOrders").findOne({
      _id: atomicOrderID_A2,
    });
    assertExistsAndLog(updatedAtomic, "AtomicOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedAtomic!.price,
      0.75,
      "Price should be 0.75",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("updateAtomicOrder: Error - AtomicOrder not found", async () => {
    const stepMessage = "updateAtomicOrder: Error - AtomicOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.updateAtomicOrder({
      atomicOrder: "nonExistentAtomic" as ID,
      quantity: 99,
    });
    checkIndex = assertIsError(
      result,
      "AtomicOrder with ID 'nonExistentAtomic' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("deleteAtomicOrder: Success - Delete non-base atomic order", async () => {
    const stepMessage = "deleteAtomicOrder: Success - Delete non-base atomic order";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectOrderID_A,
      atomicOrder: atomicOrderID_A2,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Deleting atomic order A2 should succeed",
      stepMessage,
      ++checkIndex,
    );

    const deletedAtomic = await db.collection("PurchaseSystem.atomicOrders").findOne({
      _id: atomicOrderID_A2,
    });
    assertAndLog(deletedAtomic, null, "AtomicOrder A2 should be deleted", stepMessage, ++checkIndex);

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrderID_A,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.childAtomicOrders.includes(atomicOrderID_A2),
      false,
      "SelectOrder should NOT contain deleted AtomicOrder A2",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.childAtomicOrders.length,
      1,
      "SelectOrder should have 1 child remaining",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.baseQuantity,
      15,
      "Base quantity should remain 15 (A1 is still base)",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("deleteAtomicOrder: Success - Delete base atomic order (A1)", async () => {
    const stepMessage = "deleteAtomicOrder: Success - Delete base atomic order (A1)";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectOrderID_A,
      atomicOrder: atomicOrderID_A1,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Deleting atomic order A1 should succeed",
      stepMessage,
      ++checkIndex,
    );

    const deletedAtomic = await db.collection("PurchaseSystem.atomicOrders").findOne({
      _id: atomicOrderID_A1,
    });
    assertAndLog(deletedAtomic, null, "AtomicOrder A1 should be deleted", stepMessage, ++checkIndex);

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrderID_A,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.childAtomicOrders.length,
      0,
      "SelectOrder should have 0 children remaining",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedSelect!.baseQuantity,
      -1,
      "Base quantity should be reset to -1",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(updatedSelect!.baseUnits, "", "Base units should be reset to empty", stepMessage, ++checkIndex);
  });

  await t.step("deleteAtomicOrder: Error - SelectOrder not found", async () => {
    const stepMessage = "deleteAtomicOrder: Error - SelectOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: "nonExistentSelect" as ID,
      atomicOrder: "anyAtomic" as ID,
    });
    checkIndex = assertIsError(
      result,
      "SelectOrder with ID 'nonExistentSelect' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("deleteAtomicOrder: Error - AtomicOrder not found", async () => {
    const stepMessage = "deleteAtomicOrder: Error - AtomicOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectOrderID_A,
      atomicOrder: "nonExistentAtomic" as ID,
    });
    checkIndex = assertIsError(
      result,
      "AtomicOrder with ID 'nonExistentAtomic' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("deleteAtomicOrder: Error - AtomicOrder not child of SelectOrder", async () => {
    const stepMessage = "deleteAtomicOrder: Error - AtomicOrder not child of SelectOrder";
    printStepHeader(stepMessage);
    const createSelectB = await purchaseSystem.createSelectOrder({
      associateID: "Item_B" as ID,
    });
    selectOrderID_B = (createSelectB as { selectOrder: ID }).selectOrder;
    const createAtomicB1 = await purchaseSystem.createAtomicOrder({
      selectOrder: selectOrderID_B,
      associateID: "Option_B1" as ID,
      quantity: 1,
      units: "ea",
      price: 1.0,
    });
    const atomicOrderID_B1 = (createAtomicB1 as { atomicOrder: ID }).atomicOrder;

    const result = await purchaseSystem.deleteAtomicOrder({
      selectOrder: selectOrderID_A, // Try to delete B1 from A
      atomicOrder: atomicOrderID_B1,
    });
    checkIndex = assertIsError(
      result,
      `AtomicOrder '${atomicOrderID_B1}' is not a child of SelectOrder '${selectOrderID_A}'.`,
      stepMessage,
      checkIndex,
    );
  });

  await client.close();
});

Deno.test("PurchaseSystem - CompositeOrder Actions", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);
  let checkIndex = 0;

  let compOrder_Root: ID;
  let compOrder_Child1: ID;
  let compOrder_Child2: ID;
  let compOrder_Grandchild: ID;
  let selectOrder_Alpha: ID;
  let atomicOrder_Alpha1: ID;
  let atomicOrder_Alpha2: ID;

  await t.step("createCompositeOrder: Success", async () => {
    const stepMessage = "createCompositeOrder: Success";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createCompositeOrder({
      associateID: "RootOrder" as ID,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "compositeOrder" in result,
      true,
      "Should return compositeOrder ID",
      stepMessage,
      ++checkIndex,
    );
    compOrder_Root = (result as { compositeOrder: ID }).compositeOrder;

    const queried = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(queried, "CompositeOrder should exist in DB", stepMessage, ++checkIndex);
    assertAndLog(
      queried!.associateID,
      "RootOrder",
      "Associate ID should match",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queried!.parentOrder,
      compOrder_Root,
      "Parent order should be itself (root)",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      queried!.rootOrder,
      compOrder_Root,
      "Root order should be itself",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(queried!.totalCost, 0.0, "Initial cost should be 0", stepMessage, ++checkIndex);
    assertAndLog(
      Object.keys(queried!.optimalPurchase).length,
      0,
      "Optimal purchase should be empty",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("createCompositeOrder: Error - Duplicate associateID", async () => {
    const stepMessage = "createCompositeOrder: Error - Duplicate associateID";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.createCompositeOrder({
      associateID: "RootOrder" as ID,
    });
    checkIndex = assertIsError(
      result,
      "Order with associateID 'RootOrder' already exists.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addSelectOrderToCompositeOrder: Setup SelectOrder", async () => {
    const stepMessage = "addSelectOrderToCompositeOrder: Setup SelectOrder";
    printStepHeader(stepMessage);
    const createSelect = await purchaseSystem.createSelectOrder({
      associateID: "Item_Alpha" as ID,
    });
    selectOrder_Alpha = (createSelect as { selectOrder: ID }).selectOrder;
    const createAtomic1 = await purchaseSystem.createAtomicOrder({
      selectOrder: selectOrder_Alpha,
      associateID: "Option_Alpha1" as ID,
      quantity: 10,
      units: "ml",
      price: 2.0,
    });
    atomicOrder_Alpha1 = (createAtomic1 as { atomicOrder: ID }).atomicOrder;
    const createAtomic2 = await purchaseSystem.createAtomicOrder({
      selectOrder: selectOrder_Alpha,
      associateID: "Option_Alpha2" as ID,
      quantity: 5,
      units: "ml",
      price: 1.2,
    });
    atomicOrder_Alpha2 = (createAtomic2 as { atomicOrder: ID }).atomicOrder;

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrder_Alpha,
    });
    assertAndLog(
      updatedSelect!.baseQuantity,
      10,
      "SelectOrder base quantity is 10ml",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("addSelectOrderToCompositeOrder: Success", async () => {
    const stepMessage = "addSelectOrderToCompositeOrder: Success";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: compOrder_Root,
      selectOrder: selectOrder_Alpha,
      scaleFactor: 1.5, // Need 1.5 * 10ml = 15ml
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Adding SelectOrder should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedComposite = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(updatedComposite, "CompositeOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedComposite!.childSelectOrders[selectOrder_Alpha],
      1.5,
      "SelectOrder scale factor should be 1.5",
      stepMessage,
      ++checkIndex,
    );

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrder_Alpha,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should have parent recorded", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.parentOrders.includes(compOrder_Root),
      true,
      "SelectOrder should list CompositeOrder as parent",
      stepMessage,
      ++checkIndex,
    );

    // Verify cost: need 15ml.
    // Option Alpha1 (10ml, $2.0): 2 units = 20ml, $4.0.
    // Option Alpha2 (5ml, $1.2): 3 units = 15ml, $3.6.
    // Optimal is Option Alpha2, 3 units for $3.6.
    const costQuery = await purchaseSystem._getOrderCost({
      compositeOrder: compOrder_Root,
    });
    assertAndLog(costQuery[0].totalCost, 3.6, "Total cost should be 3.6", stepMessage, ++checkIndex);

    const optimalQuery = await purchaseSystem._getOptimalPurchase({
      compositeOrder: compOrder_Root,
    });
    assertAndLog(optimalQuery[0].optimalPurchase[atomicOrder_Alpha2], 3, "Optimal purchase should be 3 of Alpha2", stepMessage, ++checkIndex);
  });

  await t.step("addSelectOrderToCompositeOrder: Error - CompositeOrder not found", async () => {
    const stepMessage = "addSelectOrderToCompositeOrder: Error - CompositeOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: "nonExistentComp" as ID,
      selectOrder: selectOrder_Alpha,
      scaleFactor: 1.0,
    });
    checkIndex = assertIsError(
      result,
      "CompositeOrder with ID 'nonExistentComp' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addSelectOrderToCompositeOrder: Error - SelectOrder not found", async () => {
    const stepMessage = "addSelectOrderToCompositeOrder: Error - SelectOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: compOrder_Root,
      selectOrder: "nonExistentSelect" as ID,
      scaleFactor: 1.0,
    });
    checkIndex = assertIsError(
      result,
      "SelectOrder with ID 'nonExistentSelect' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addSelectOrderToCompositeOrder: Error - Scale factor <= 0", async () => {
    const stepMessage = "addSelectOrderToCompositeOrder: Error - Scale factor <= 0";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: compOrder_Root,
      selectOrder: selectOrder_Alpha,
      scaleFactor: 0.0,
    });
    checkIndex = assertIsError(
      result,
      "Scale factor must be greater than 0.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("removeSelectOrderFromCompositeOrder: Success", async () => {
    const stepMessage = "removeSelectOrderFromCompositeOrder: Success";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.removeSelectOrderFromCompositeOrder({
      compositeOrder: compOrder_Root,
      selectOrder: selectOrder_Alpha,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Removing SelectOrder should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedComposite = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(updatedComposite, "CompositeOrder should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      selectOrder_Alpha in updatedComposite!.childSelectOrders,
      false,
      "SelectOrder should be removed from CompositeOrder",
      stepMessage,
      ++checkIndex,
    );

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrder_Alpha,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should have parent removed", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.parentOrders.includes(compOrder_Root),
      false,
      "SelectOrder should no longer list CompositeOrder as parent",
      stepMessage,
      ++checkIndex,
    );

    // Verify cost reset to 0
    const costQuery = await purchaseSystem._getOrderCost({
      compositeOrder: compOrder_Root,
    });
    assertAndLog(costQuery[0].totalCost, 0.0, "Total cost should be 0.0 after removal", stepMessage, ++checkIndex);
  });

  await t.step("removeSelectOrderFromCompositeOrder: Error - SelectOrder not child", async () => {
    const stepMessage = "removeSelectOrderFromCompositeOrder: Error - SelectOrder not child";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.removeSelectOrderFromCompositeOrder({
      compositeOrder: compOrder_Root,
      selectOrder: selectOrder_Alpha,
    });
    checkIndex = assertIsError(
      result,
      `SelectOrder '${selectOrder_Alpha}' is not a child of CompositeOrder '${compOrder_Root}'.`,
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addCompositeSubOrder: Success - Child1 to Root", async () => {
    const stepMessage = "addCompositeSubOrder: Success - Child1 to Root";
    printStepHeader(stepMessage);
    const createChild1 = await purchaseSystem.createCompositeOrder({
      associateID: "ChildOrder1" as ID,
    });
    compOrder_Child1 = (createChild1 as { compositeOrder: ID }).compositeOrder;

    const result = await purchaseSystem.addCompositeSubOrder({
      parentOrder: compOrder_Root,
      childOrder: compOrder_Child1,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Adding Child1 to Root should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(updatedRoot, "Root order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedRoot!.childCompositeOrders[compOrder_Child1],
      1.0,
      "Child1 should be in root's children with scale 1.0",
      stepMessage,
      ++checkIndex,
    );

    const updatedChild1 = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Child1,
    });
    assertExistsAndLog(updatedChild1, "Child1 order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedChild1!.parentOrder,
      compOrder_Root,
      "Child1's parent should be Root",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedChild1!.rootOrder,
      compOrder_Root,
      "Child1's root should be Root",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("addCompositeSubOrder: Success - Grandchild to Child1", async () => {
    const stepMessage = "addCompositeSubOrder: Success - Grandchild to Child1";
    printStepHeader(stepMessage);
    const createGrandchild = await purchaseSystem.createCompositeOrder({
      associateID: "GrandchildOrder" as ID,
    });
    compOrder_Grandchild = (createGrandchild as { compositeOrder: ID }).compositeOrder;

    const result = await purchaseSystem.addCompositeSubOrder({
      parentOrder: compOrder_Child1,
      childOrder: compOrder_Grandchild,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Adding Grandchild to Child1 should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedChild1 = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Child1,
    });
    assertExistsAndLog(updatedChild1, "Child1 order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedChild1!.childCompositeOrders[compOrder_Grandchild],
      1.0,
      "Grandchild should be in Child1's children with scale 1.0",
      stepMessage,
      ++checkIndex,
    );

    const updatedGrandchild = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Grandchild,
    });
    assertExistsAndLog(updatedGrandchild, "Grandchild order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedGrandchild!.parentOrder,
      compOrder_Child1,
      "Grandchild's parent should be Child1",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedGrandchild!.rootOrder,
      compOrder_Root,
      "Grandchild's root should be Root",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("addCompositeSubOrder: Error - Parent not found", async () => {
    const stepMessage = "addCompositeSubOrder: Error - Parent not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addCompositeSubOrder({
      parentOrder: "nonExistentParent" as ID,
      childOrder: compOrder_Child1,
    });
    checkIndex = assertIsError(
      result,
      "Parent CompositeOrder 'nonExistentParent' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addCompositeSubOrder: Error - Child not found", async () => {
    const stepMessage = "addCompositeSubOrder: Error - Child not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addCompositeSubOrder({
      parentOrder: compOrder_Root,
      childOrder: "nonExistentChild" as ID,
    });
    checkIndex = assertIsError(
      result,
      "Child CompositeOrder 'nonExistentChild' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addCompositeSubOrder: Error - Cannot add self as child", async () => {
    const stepMessage = "addCompositeSubOrder: Error - Cannot add self as child";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.addCompositeSubOrder({
      parentOrder: compOrder_Root,
      childOrder: compOrder_Root,
    });
    checkIndex = assertIsError(
      result,
      "Cannot add a composite order as a child of itself.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("addCompositeSubOrder: Error - Would form cycle", async () => {
    const stepMessage = "addCompositeSubOrder: Error - Would form cycle";
    printStepHeader(stepMessage);
    // Try to add root back to grandchild (Root -> Child1 -> Grandchild, so Grandchild -> Root forms cycle)
    const result = await purchaseSystem.addCompositeSubOrder({
      parentOrder: compOrder_Grandchild,
      childOrder: compOrder_Root,
    });
    checkIndex = assertIsError(
      result,
      `Adding CompositeOrder '${compOrder_Root}' to '${compOrder_Grandchild}' would form a cycle.`,
      stepMessage,
      checkIndex,
    );
  });

  await t.step("removeCompositeSubOrder: Success - Remove Grandchild from Child1", async () => {
    const stepMessage = "removeCompositeSubOrder: Success - Remove Grandchild from Child1";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.removeCompositeSubOrder({
      parentOrder: compOrder_Child1,
      childOrder: compOrder_Grandchild,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Removing Grandchild should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedChild1 = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Child1,
    });
    assertExistsAndLog(updatedChild1, "Child1 order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      compOrder_Grandchild in updatedChild1!.childCompositeOrders,
      false,
      "Grandchild should be removed from Child1's children",
      stepMessage,
      ++checkIndex,
    );

    const updatedGrandchild = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Grandchild,
    });
    assertExistsAndLog(updatedGrandchild, "Grandchild order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedGrandchild!.parentOrder,
      compOrder_Grandchild,
      "Grandchild's parent should be itself (new root)",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      updatedGrandchild!.rootOrder,
      compOrder_Grandchild,
      "Grandchild's root should be itself",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("removeCompositeSubOrder: Error - Child not in parent", async () => {
    const stepMessage = "removeCompositeSubOrder: Error - Child not in parent";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.removeCompositeSubOrder({
      parentOrder: compOrder_Root,
      childOrder: compOrder_Grandchild, // Grandchild is not a direct child of Root
    });
    checkIndex = assertIsError(
      result,
      `Child CompositeOrder '${compOrder_Grandchild}' is not a child of Parent CompositeOrder '${compOrder_Root}'.`,
      stepMessage,
      checkIndex,
    );
  });

  await t.step("updateSubOrderScaleFactor: Success - SelectOrder", async () => {
    const stepMessage = "updateSubOrderScaleFactor: Success - SelectOrder";
    printStepHeader(stepMessage);
    // Re-add selectOrder_Alpha to compOrder_Root for this test
    await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: compOrder_Root,
      selectOrder: selectOrder_Alpha,
      scaleFactor: 1.5,
    });

    const result = await purchaseSystem.updateSubOrderScaleFactor({
      parentOrder: compOrder_Root,
      childOrder: selectOrder_Alpha,
      newScaleFactor: 2.0,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Updating SelectOrder scale factor should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(updatedRoot, "Root order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedRoot!.childSelectOrders[selectOrder_Alpha],
      2.0,
      "SelectOrder scale factor should be 2.0",
      stepMessage,
      ++checkIndex,
    );

    // Verify new cost: need 2.0 * 10ml = 20ml
    // Option Alpha1 (10ml, $2.0): 2 units = 20ml, $4.0.
    // Option Alpha2 (5ml, $1.2): 4 units = 20ml, $4.8.
    // Optimal is Option Alpha1, 2 units for $4.0.
    const costQuery = await purchaseSystem._getOrderCost({
      compositeOrder: compOrder_Root,
    });
    assertAndLog(costQuery[0].totalCost, 4.0, "Total cost should be 4.0 after scale factor update", stepMessage, ++checkIndex);
  });

  await t.step("updateSubOrderScaleFactor: Success - CompositeOrder", async () => {
    const stepMessage = "updateSubOrderScaleFactor: Success - CompositeOrder";
    printStepHeader(stepMessage);
    // Re-add Child1 to Root for this test
    await purchaseSystem.addCompositeSubOrder({
      parentOrder: compOrder_Root,
      childOrder: compOrder_Child1,
    });

    const result = await purchaseSystem.updateSubOrderScaleFactor({
      parentOrder: compOrder_Root,
      childOrder: compOrder_Child1,
      newScaleFactor: 0.5,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Updating CompositeOrder scale factor should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updatedRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(updatedRoot, "Root order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      updatedRoot!.childCompositeOrders[compOrder_Child1],
      0.5,
      "Child1 scale factor should be 0.5",
      stepMessage,
      ++checkIndex,
    );
    // Cost calculation verification is more complex here as it depends on Child1's own cost
    // For now, just ensure the update happened. Implicit call to calculateOptimalPurchase will update the cost.
  });

  await t.step("updateSubOrderScaleFactor: Error - New scale factor <= 0", async () => {
    const stepMessage = "updateSubOrderScaleFactor: Error - New scale factor <= 0";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.updateSubOrderScaleFactor({
      parentOrder: compOrder_Root,
      childOrder: selectOrder_Alpha,
      newScaleFactor: 0.0,
    });
    checkIndex = assertIsError(
      result,
      "New scale factor must be greater than 0.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("deleteCompositeOrder: Success - Delete Child1 (has no children)", async () => {
    const stepMessage = "deleteCompositeOrder: Success - Delete Child1 (has no children)";
    printStepHeader(stepMessage);
    // Ensure Root still has Child1
    const initialRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(initialRoot, "Root order should exist", stepMessage, ++checkIndex);
    assertAndLog(
      compOrder_Child1 in initialRoot!.childCompositeOrders,
      true,
      "Child1 should be in Root's children",
      stepMessage,
      ++checkIndex,
    );

    const result = await purchaseSystem.deleteCompositeOrder({
      compositeOrder: compOrder_Child1,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Deleting Child1 should succeed",
      stepMessage,
      ++checkIndex,
    );

    const deletedChild1 = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Child1,
    });
    assertAndLog(deletedChild1, null, "Child1 should be deleted", stepMessage, ++checkIndex);

    const updatedRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(updatedRoot, "Root order should be updated", stepMessage, ++checkIndex);
    assertAndLog(
      compOrder_Child1 in updatedRoot!.childCompositeOrders,
      false,
      "Child1 should be removed from Root's children",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("deleteCompositeOrder: Success - Delete Root (has select children)", async () => {
    const stepMessage = "deleteCompositeOrder: Success - Delete Root (has select children)";
    printStepHeader(stepMessage);
    // Root currently has selectOrder_Alpha
    const initialRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertExistsAndLog(initialRoot, "Root order should exist", stepMessage, ++checkIndex);
    assertAndLog(
      selectOrder_Alpha in initialRoot!.childSelectOrders,
      true,
      "SelectOrder should be in Root's children",
      stepMessage,
      ++checkIndex,
    );

    const result = await purchaseSystem.deleteCompositeOrder({
      compositeOrder: compOrder_Root,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Deleting Root should succeed",
      stepMessage,
      ++checkIndex,
    );

    const deletedRoot = await db.collection("PurchaseSystem.compositeOrders").findOne({
      _id: compOrder_Root,
    });
    assertAndLog(deletedRoot, null, "Root order should be deleted", stepMessage, ++checkIndex);

    const updatedSelect = await db.collection("PurchaseSystem.selectOrders").findOne({
      _id: selectOrder_Alpha,
    });
    assertExistsAndLog(updatedSelect, "SelectOrder should exist", stepMessage, ++checkIndex);
    assertAndLog(
      updatedSelect!.parentOrders.includes(compOrder_Root),
      false,
      "SelectOrder should no longer list Root as parent",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("deleteCompositeOrder: Error - CompositeOrder not found", async () => {
    const stepMessage = "deleteCompositeOrder: Error - CompositeOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.deleteCompositeOrder({
      compositeOrder: "nonExistentComp" as ID,
    });
    checkIndex = assertIsError(
      result,
      "CompositeOrder with ID 'nonExistentComp' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await client.close();
});

Deno.test("PurchaseSystem - Complex Calculation and Purchase Scenarios", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);
  let checkIndex = 0;

  let rootA: ID, childA1: ID, childA2: ID;
  let select_Water: ID, select_CoffeeBeans: ID;
  let atomic_WaterBottle: ID, atomic_WaterJug: ID;
  let atomic_CoffeeBeanSmall: ID, atomic_CoffeeBeanLarge: ID;

  await t.step("Setup: Create complex order structure", async () => {
    const stepMessage = "Setup: Create complex order structure";
    printStepHeader(stepMessage);

    const r1 = await purchaseSystem.createCompositeOrder({
      associateID: "RootOrderA" as ID,
    });
    rootA = (r1 as { compositeOrder: ID }).compositeOrder;

    const r2 = await purchaseSystem.createCompositeOrder({
      associateID: "ChildOrderA1" as ID,
    });
    childA1 = (r2 as { compositeOrder: ID }).compositeOrder;

    const r3 = await purchaseSystem.createCompositeOrder({
      associateID: "ChildOrderA2" as ID,
    });
    childA2 = (r3 as { compositeOrder: ID }).compositeOrder;

    await purchaseSystem.addCompositeSubOrder({
      parentOrder: rootA,
      childOrder: childA1,
    });
    await purchaseSystem.addCompositeSubOrder({
      parentOrder: rootA,
      childOrder: childA2,
    });

    const s1 = await purchaseSystem.createSelectOrder({
      associateID: "Water" as ID,
    });
    select_Water = (s1 as { selectOrder: ID }).selectOrder;

    const s2 = await purchaseSystem.createSelectOrder({
      associateID: "Coffee Beans" as ID,
    });
    select_CoffeeBeans = (s2 as { selectOrder: ID }).selectOrder;

    const a1 = await purchaseSystem.createAtomicOrder({
      selectOrder: select_Water,
      associateID: "Water Bottle (1L)" as ID,
      quantity: 1.0,
      units: "L",
      price: 1.0,
    });
    atomic_WaterBottle = (a1 as { atomicOrder: ID }).atomicOrder;

    const a2 = await purchaseSystem.createAtomicOrder({
      selectOrder: select_Water,
      associateID: "Water Jug (5L)" as ID,
      quantity: 5.0,
      units: "L",
      price: 4.0,
    });
    atomic_WaterJug = (a2 as { atomicOrder: ID }).atomicOrder;

    const a3 = await purchaseSystem.createAtomicOrder({
      selectOrder: select_CoffeeBeans,
      associateID: "Coffee Beans (250g)" as ID,
      quantity: 250,
      units: "g",
      price: 5.0,
    });
    atomic_CoffeeBeanSmall = (a3 as { atomicOrder: ID }).atomicOrder;

    const a4 = await purchaseSystem.createAtomicOrder({
      selectOrder: select_CoffeeBeans,
      associateID: "Coffee Beans (1kg)" as ID,
      quantity: 1000,
      units: "g",
      price: 18.0,
    });
    atomic_CoffeeBeanLarge = (a4 as { atomicOrder: ID }).atomicOrder;

    await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: childA1,
      selectOrder: select_Water,
      scaleFactor: 3.0, // Need 3 * 1L = 3L water for childA1
    }); // Optimal: 1x 5L jug = 4.0

    await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: childA2,
      selectOrder: select_Water,
      scaleFactor: 1.0, // Need 1 * 1L = 1L water for childA2
    }); // Optimal: 1x 1L bottle = 1.0

    await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: rootA,
      selectOrder: select_CoffeeBeans,
      scaleFactor: 0.5, // Need 0.5 * 250g = 125g coffee (base from small bag)
    }); // Optimal: 1x 250g bag = 5.0
  });

  await t.step("calculateOptimalPurchase: Verify costs in nested structure", async () => {
    const stepMessage = "calculateOptimalPurchase: Verify costs in nested structure";
    printStepHeader(stepMessage);

    const calculateResult = await purchaseSystem.calculateOptimalPurchase({
      compositeOrders: [rootA],
    });
    checkIndex = assertIsError(
      calculateResult,
      "",
      stepMessage,
      checkIndex,
    );
    assertAndLog(
      "error" in calculateResult,
      false,
      "Calculation should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Verify ChildA1 cost: Needs 3L water. Optimal (1x Water Jug 5L) = $4.0.
    const costA1 = await purchaseSystem._getOrderCost({
      compositeOrder: childA1,
    });
    assertAndLog(costA1[0].totalCost, 4.0, "ChildA1 water cost should be $4.0", stepMessage, ++checkIndex);
    const optA1 = await purchaseSystem._getOptimalPurchase({
      compositeOrder: childA1,
    });
    assertAndLog(optA1[0].optimalPurchase[atomic_WaterJug], 1, "ChildA1 optimal purchase: 1 Water Jug", stepMessage, ++checkIndex);

    // Verify ChildA2 cost: Needs 1L water. Optimal (1x Water Bottle 1L) = $1.0.
    const costA2 = await purchaseSystem._getOrderCost({
      compositeOrder: childA2,
    });
    assertAndLog(costA2[0].totalCost, 1.0, "ChildA2 water cost should be $1.0", stepMessage, ++checkIndex);
    const optA2 = await purchaseSystem._getOptimalPurchase({
      compositeOrder: childA2,
    });
    assertAndLog(optA2[0].optimalPurchase[atomic_WaterBottle], 1, "ChildA2 optimal purchase: 1 Water Bottle", stepMessage, ++checkIndex);

    // Verify RootA cost:
    // From ChildA1 (scaled by 1.0) = $4.0
    // From ChildA2 (scaled by 1.0) = $1.0
    // From Coffee Beans (needs 0.5 * 250g = 125g). Optimal (1x Coffee Beans 250g) = $5.0.
    // Total RootA cost = 4.0 + 1.0 + 5.0 = $10.0
    const costRootA = await purchaseSystem._getOrderCost({
      compositeOrder: rootA,
    });
    assertAndLog(costRootA[0].totalCost, 10.0, "RootA total cost should be $10.0", stepMessage, ++checkIndex);

    const optRootA = await purchaseSystem._getOptimalPurchase({
      compositeOrder: rootA,
    });
    assertAndLog(optRootA[0].optimalPurchase[atomic_WaterJug], 1, "RootA optimal purchase: 1 Water Jug (from A1)", stepMessage, ++checkIndex);
    assertAndLog(optRootA[0].optimalPurchase[atomic_WaterBottle], 1, "RootA optimal purchase: 1 Water Bottle (from A2)", stepMessage, ++checkIndex);
    assertAndLog(optRootA[0].optimalPurchase[atomic_CoffeeBeanSmall], 1, "RootA optimal purchase: 1 Coffee Bean Small", stepMessage, ++checkIndex);
  });

  await t.step("purchaseOrder: Error - Not a root order", async () => {
    const stepMessage = "purchaseOrder: Error - Not a root order";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.purchaseOrder({
      compositeOrder: childA1,
    });
    checkIndex = assertIsError(
      result,
      `CompositeOrder '${childA1}' is not a root order. Only root orders can be purchased.`,
      stepMessage,
      checkIndex,
    );
  });

  await t.step("purchaseOrder: Success - Root A", async () => {
    const stepMessage = "purchaseOrder: Success - Root A";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.purchaseOrder({
      compositeOrder: rootA,
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex);
    assertAndLog(
      "error" in result,
      false,
      "Purchasing RootA should succeed",
      stepMessage,
      ++checkIndex,
    );

    const purchasedRootA = await db.collection("PurchaseSystem.compositeOrders").findOne({ _id: rootA });
    assertAndLog(purchasedRootA!.purchased, true, "RootA should be purchased", stepMessage, ++checkIndex);
    const purchasedChildA1 = await db.collection("PurchaseSystem.compositeOrders").findOne({ _id: childA1 });
    assertAndLog(purchasedChildA1!.purchased, true, "ChildA1 should be purchased", stepMessage, ++checkIndex);
    const purchasedChildA2 = await db.collection("PurchaseSystem.compositeOrders").findOne({ _id: childA2 });
    assertAndLog(purchasedChildA2!.purchased, true, "ChildA2 should be purchased", stepMessage, ++checkIndex);
  });

  await t.step("purchaseOrder: Error - Already purchased", async () => {
    const stepMessage = "purchaseOrder: Error - Already purchased";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.purchaseOrder({
      compositeOrder: rootA,
    });
    checkIndex = assertIsError(
      result,
      `CompositeOrder '${rootA}' has already been purchased.`,
      stepMessage,
      checkIndex,
    );
  });

  await t.step("calculateOptimalPurchase: Skip purchased order", async () => {
    const stepMessage = "calculateOptimalPurchase: Skip purchased order";
    printStepHeader(stepMessage);
    const calculateResult = await purchaseSystem.calculateOptimalPurchase({
      compositeOrders: [rootA],
    });
    checkIndex = assertIsError(result, "", stepMessage, checkIndex); // Should still return {} (no error)
    assertAndLog(
      "error" in calculateResult,
      false,
      "Calculating purchased order should not error",
      stepMessage,
      ++checkIndex,
    );
    // State should not change because it's already purchased.
  });

  await client.close();
});

Deno.test("PurchaseSystem - Edge Cases and Query Functionality", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const purchaseSystem = new PurchaseSystemConcept(db);
  let checkIndex = 0;

  let selectNoAtomic: ID;
  let compositeRoot: ID;

  await t.step("Setup: SelectOrder with no AtomicOptions", async () => {
    const stepMessage = "Setup: SelectOrder with no AtomicOptions";
    printStepHeader(stepMessage);
    const r1 = await purchaseSystem.createSelectOrder({
      associateID: "EmptySelect" as ID,
    });
    selectNoAtomic = (r1 as { selectOrder: ID }).selectOrder;

    const r2 = await purchaseSystem.createCompositeOrder({
      associateID: "CompRootForEmpty" as ID,
    });
    compositeRoot = (r2 as { compositeOrder: ID }).compositeOrder;

    await purchaseSystem.addSelectOrderToCompositeOrder({
      compositeOrder: compositeRoot,
      selectOrder: selectNoAtomic,
      scaleFactor: 1.0,
    });
  });

  await t.step("calculateOptimalPurchase: SelectOrder with no AtomicOptions should have 0 cost contribution", async () => {
    const stepMessage = "calculateOptimalPurchase: SelectOrder with no AtomicOptions should have 0 cost contribution";
    printStepHeader(stepMessage);
    await purchaseSystem.calculateOptimalPurchase({
      compositeOrders: [compositeRoot],
    });

    const costQuery = await purchaseSystem._getOrderCost({
      compositeOrder: compositeRoot,
    });
    assertAndLog(costQuery[0].totalCost, 0.0, "Composite with empty select should have 0 cost", stepMessage, ++checkIndex);
  });

  await t.step("purchaseOrder: Error - SelectOrder with no AtomicOrder options", async () => {
    const stepMessage = "purchaseOrder: Error - SelectOrder with no AtomicOrder options";
    printStepHeader(stepMessage);
    const result = await purchaseSystem.purchaseOrder({
      compositeOrder: compositeRoot,
    });
    checkIndex = assertIsError(
      result,
      `Purchase cannot be completed: SelectOrder '${selectNoAtomic}' (associateID: EmptySelect) has no valid AtomicOrder options.`,
      stepMessage,
      checkIndex,
    );
  });

  await t.step("_getOrderByAssociateID: Error - Not found", async () => {
    const stepMessage = "_getOrderByAssociateID: Error - Not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem._getOrderByAssociateID({
      associateID: "nonExistentAssociate" as ID,
    });
    checkIndex = assertQueryIsError(
      result,
      "No order found with associateID 'nonExistentAssociate'.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("_getOptimalPurchase: Error - CompositeOrder not found", async () => {
    const stepMessage = "_getOptimalPurchase: Error - CompositeOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem._getOptimalPurchase({
      compositeOrder: "nonExistentComp" as ID,
    });
    checkIndex = assertQueryIsError(
      result,
      "CompositeOrder with ID 'nonExistentComp' not found.",
      stepMessage,
      checkIndex,
    );
  });

  await t.step("_getOrderCost: Error - CompositeOrder not found", async () => {
    const stepMessage = "_getOrderCost: Error - CompositeOrder not found";
    printStepHeader(stepMessage);
    const result = await purchaseSystem._getOrderCost({
      compositeOrder: "nonExistentComp" as ID,
    });
    checkIndex = assertQueryIsError(
      result,
      "CompositeOrder with ID 'nonExistentComp' not found.",
      stepIndex,
      checkIndex,
    );
  });

  await client.close();
});
```
