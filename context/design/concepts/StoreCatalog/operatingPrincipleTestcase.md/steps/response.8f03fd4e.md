---
timestamp: 'Thu Oct 23 2025 19:21:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_192137.1a9a6d7e.md]]'
content_id: 8f03fd4e3ac7827c163240f15e19a1ca224d3164db4802e4184e18c7f708180e
---

# response:

To implement the test file for the `StoreCatalogConcept`, I will create `StoreCatalogConcept.test.ts`. This file will include tests for each action and query, ensuring their `requires` and `effects` are correctly handled. Additionally, a dedicated test will trace the concept's operational `principle` through a sequence of actions, verifying that the intended workflow functions as described.

```typescript
// file: src/concepts/StoreCatalog/StoreCatalogConcept.test.ts

import { assertEquals, assertExists, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty, Result } from "@utils/types.ts";
import StoreCatalogConcept from "./StoreCatalogConcept.ts";

// Helper function to assert and log results
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

// Helper function to assert an error result
function assertIsError<T>(
  result: Result<T>,
  expectedError: string,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  try {
    assertExists((result as { error?: string }).error, message);
    assertEquals(
      (result as { error: string }).error,
      expectedError,
      `Expected error message "${expectedError}"`,
    );
    console.log(`    ✅ Check ${checkIndex}: ${message} (Error: "${expectedError}")`);
  } catch (e) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    console.error(`      Error in "${stepMessage}": ${message}`);
    throw e;
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

Deno.test("StoreCatalog - Operating Principle Trace", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let groundPepperItemId: ID;
  let sproutsPurchaseOptionId: ID;
  let traderJoesPurchaseOptionId: ID;

  try {
    // --- Step 1: Administrator creates a new item "ground pepper" ---
    await t.step("1. Create new item: 'ground pepper'", async () => {
      printStepHeader("1. Create new item: 'ground pepper'");
      let checkIndex = 0;

      const createItemResult = await catalog.createItem({
        primaryName: "ground pepper",
      });
      assertAndLog(
        "item" in createItemResult,
        true,
        "Creating 'ground pepper' item should succeed",
        "1.1 createItem",
        ++checkIndex,
      );
      groundPepperItemId = (createItemResult as { item: ID }).item;
      assertExists(groundPepperItemId, "Item ID should be generated");

      // Verify the item exists and has the correct primary name
      const getItemResult = await catalog._getItemByName({
        name: "ground pepper",
      });
      assertAndLog(
        Array.isArray(getItemResult),
        true,
        "Query for item by name should return an array",
        "1.2 _getItemByName",
        ++checkIndex,
      );
      assertAndLog(
        getItemResult.length,
        1,
        "Should find exactly one item",
        "1.3 _getItemByName",
        ++checkIndex,
      );
      assertAndLog(
        getItemResult[0].item,
        groundPepperItemId,
        "Returned item ID should match created item ID",
        "1.4 _getItemByName",
        ++checkIndex,
      );

      const itemNamesResult = await catalog._getItemNames({
        item: groundPepperItemId,
      });
      assertAndLog(
        itemNamesResult[0].names,
        ["ground pepper"],
        "Item should have 'ground pepper' as its only name initially",
        "1.5 _getItemNames",
        ++checkIndex,
      );
    });

    // --- Step 2: Add multiple purchase options ---
    await t.step("2. Add purchase options for 'ground pepper'", async () => {
      printStepHeader("2. Add purchase options for 'ground pepper'");
      let checkIndex = 0;

      // Add Sprout's option
      const addSproutsPoResult = await catalog.addPurchaseOption({
        item: groundPepperItemId,
        quantity: 3.0,
        units: "lbs",
        price: 5.99,
        store: "Sprout's",
      });
      assertAndLog(
        "purchaseOption" in addSproutsPoResult,
        true,
        "Adding Sprout's purchase option should succeed",
        "2.1 addPurchaseOption (Sprout's)",
        ++checkIndex,
      );
      sproutsPurchaseOptionId = (addSproutsPoResult as {
        purchaseOption: ID;
      }).purchaseOption;
      assertExists(sproutsPurchaseOptionId, "Sprout's PO ID should be generated");

      // Add Trader Joe's option
      const addTraderJoesPoResult = await catalog.addPurchaseOption({
        item: groundPepperItemId,
        quantity: 1.0,
        units: "lb",
        price: 2.50,
        store: "Trader Joe's",
      });
      assertAndLog(
        "purchaseOption" in addTraderJoesPoResult,
        true,
        "Adding Trader Joe's purchase option should succeed",
        "2.2 addPurchaseOption (Trader Joe's)",
        ++checkIndex,
      );
      traderJoesPurchaseOptionId = (addTraderJoesPoResult as {
        purchaseOption: ID;
      }).purchaseOption;
      assertExists(
        traderJoesPurchaseOptionId,
        "Trader Joe's PO ID should be generated",
      );

      // Verify item's purchase options list is updated
      const itemPOsResult = await catalog._getItemPurchaseOptions({
        item: groundPepperItemId,
      });
      assertAndLog(
        itemPOsResult[0].purchaseOptions.length,
        2,
        "Item should now have 2 purchase options",
        "2.3 _getItemPurchaseOptions",
        ++checkIndex,
      );
      assertAndLog(
        itemPOsResult[0].purchaseOptions.includes(sproutsPurchaseOptionId) &&
          itemPOsResult[0].purchaseOptions.includes(traderJoesPurchaseOptionId),
        true,
        "Item should list both new purchase options",
        "2.4 _getItemPurchaseOptions",
        ++checkIndex,
      );
    });

    // --- Step 3: Add an alias name "pepper" ---
    await t.step("3. Add alias 'pepper' to the item", async () => {
      printStepHeader("3. Add alias 'pepper' to the item");
      let checkIndex = 0;

      const addItemNameResult = await catalog.addItemName({
        item: groundPepperItemId,
        name: "pepper",
      });
      assertAndLog(
        "success" in addItemNameResult,
        true,
        "Adding 'pepper' alias should succeed",
        "3.1 addItemName",
        ++checkIndex,
      );

      // Verify the new alias is present
      const itemNamesResult = await catalog._getItemNames({
        item: groundPepperItemId,
      });
      assertAndLog(
        itemNamesResult[0].names.includes("pepper"),
        true,
        "Item names should now include 'pepper'",
        "3.2 _getItemNames",
        ++checkIndex,
      );
      assertAndLog(
        itemNamesResult[0].names.length,
        2,
        "Item should have two names now",
        "3.3 _getItemNames",
        ++checkIndex,
      );

      // Verify item can be found by alias
      const getItemByAliasResult = await catalog._getItemByName({
        name: "pepper",
      });
      assertAndLog(
        Array.isArray(getItemByAliasResult),
        true,
        "Query for item by alias name should return an array",
        "3.4 _getItemByName (alias)",
        ++checkIndex,
      );
      assertAndLog(
        getItemByAliasResult.length,
        1,
        "Should find item by alias",
        "3.5 _getItemByName (alias)",
        ++checkIndex,
      );
      assertAndLog(
        getItemByAliasResult[0].item,
        groundPepperItemId,
        "Returned item ID by alias should match",
        "3.6 _getItemByName (alias)",
        ++checkIndex,
      );
    });

    // --- Step 4: Confirm purchase options ---
    await t.step("4. Confirm the added purchase options", async () => {
      printStepHeader("4. Confirm the added purchase options");
      let checkIndex = 0;

      // Confirm Sprout's option
      const confirmSproutsResult = await catalog.confirmPurchaseOption({
        purchaseOption: sproutsPurchaseOptionId,
      });
      assertAndLog(
        "success" in confirmSproutsResult,
        true,
        "Confirming Sprout's PO should succeed",
        "4.1 confirmPurchaseOption (Sprout's)",
        ++checkIndex,
      );

      // Confirm Trader Joe's option
      const confirmTraderJoesResult = await catalog.confirmPurchaseOption({
        purchaseOption: traderJoesPurchaseOptionId,
      });
      assertAndLog(
        "success" in confirmTraderJoesResult,
        true,
        "Confirming Trader Joe's PO should succeed",
        "4.2 confirmPurchaseOption (Trader Joe's)",
        ++checkIndex,
      );

      // Verify both are confirmed
      const sproutsDetails = await catalog._getPurchaseOptionDetails({
        purchaseOption: sproutsPurchaseOptionId,
      });
      assertAndLog(
        sproutsDetails[0].confirmed,
        true,
        "Sprout's PO should now be confirmed",
        "4.3 _getPurchaseOptionDetails (Sprout's)",
        ++checkIndex,
      );

      const traderJoesDetails = await catalog._getPurchaseOptionDetails({
        purchaseOption: traderJoesPurchaseOptionId,
      });
      assertAndLog(
        traderJoesDetails[0].confirmed,
        true,
        "Trader Joe's PO should now be confirmed",
        "4.4 _getPurchaseOptionDetails (Trader Joe's)",
        ++checkIndex,
      );

      // Attempt to confirm an already confirmed option (should fail)
      const reconfirmSproutsResult = await catalog.confirmPurchaseOption({
        purchaseOption: sproutsPurchaseOptionId,
      });
      assertIsError(
        reconfirmSproutsResult,
        `PurchaseOption with ID "${sproutsPurchaseOptionId}" is already confirmed.`,
        "Re-confirming should return an error",
        "4.5 confirmPurchaseOption (re-confirm)",
        ++checkIndex,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("StoreCatalog - Action Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemAId: ID, itemBId: ID;
  let po1Id: ID, po2Id: ID;

  try {
    // --- Test createItem action ---
    await t.step("createItem: Successful creation and name conflict", async () => {
      printStepHeader("createItem: Successful creation and name conflict");
      let checkIndex = 0;

      // 1. Successful creation
      const createResult1 = await catalog.createItem({ primaryName: "Apple" });
      assertAndLog(
        "item" in createResult1,
        true,
        "Should successfully create 'Apple' item",
        "1.1 createItem",
        ++checkIndex,
      );
      itemAId = (createResult1 as { item: ID }).item;
      assertExists(itemAId, "Item A ID should exist");

      const namesA = await catalog._getItemNames({ item: itemAId });
      assertAndLog(
        namesA[0].names,
        ["Apple"],
        "Item A should have 'Apple' as its name",
        "1.2 _getItemNames",
        ++checkIndex,
      );

      // 2. Attempt to create with existing name (should fail)
      const createResult2 = await catalog.createItem({ primaryName: "Apple" });
      assertIsError(
        createResult2,
        `An item with the name "Apple" already exists.`,
        "Should fail to create item with duplicate name",
        "1.3 createItem (duplicate)",
        ++checkIndex,
      );

      const allItemsBefore = await catalog._getAllItems({});
      assertAndLog(
        allItemsBefore[0].items.length,
        1,
        "Only one item should exist after duplicate creation attempt",
        "1.4 _getAllItems",
        ++checkIndex,
      );

      // Create another unique item for later tests
      const createResult3 = await catalog.createItem({ primaryName: "Banana" });
      assertAndLog(
        "item" in createResult3,
        true,
        "Should successfully create 'Banana' item",
        "1.5 createItem",
        ++checkIndex,
      );
      itemBId = (createResult3 as { item: ID }).item;
      assertExists(itemBId, "Item B ID should exist");
    });

    // --- Test addPurchaseOption action ---
    await t.step("addPurchaseOption: Valid and invalid additions", async () => {
      printStepHeader("addPurchaseOption: Valid and invalid additions");
      let checkIndex = 0;

      // 1. Successful addition
      const addPoResult1 = await catalog.addPurchaseOption({
        item: itemAId,
        quantity: 5,
        units: "count",
        price: 1.99,
        store: "Local Market",
      });
      assertAndLog(
        "purchaseOption" in addPoResult1,
        true,
        "Should add PO successfully to Apple",
        "2.1 addPurchaseOption",
        ++checkIndex,
      );
      po1Id = (addPoResult1 as { purchaseOption: ID }).purchaseOption;
      assertExists(po1Id, "PO1 ID should exist");

      const itemAPs = await catalog._getItemPurchaseOptions({ item: itemAId });
      assertAndLog(
        itemAPs[0].purchaseOptions,
        [po1Id],
        "Apple should list PO1",
        "2.2 _getItemPurchaseOptions",
        ++checkIndex,
      );

      // 2. Add another PO to a different item
      const addPoResult2 = await catalog.addPurchaseOption({
        item: itemBId,
        quantity: 2,
        units: "kg",
        price: 3.50,
        store: "Global Grocer",
      });
      assertAndLog(
        "purchaseOption" in addPoResult2,
        true,
        "Should add PO successfully to Banana",
        "2.3 addPurchaseOption",
        ++checkIndex,
      );
      po2Id = (addPoResult2 as { purchaseOption: ID }).purchaseOption;
      assertExists(po2Id, "PO2 ID should exist");

      // 3. Invalid quantity
      const invalidQuantityResult = await catalog.addPurchaseOption({
        item: itemAId,
        quantity: 0,
        units: "count",
        price: 1.00,
        store: "Test Store",
      });
      assertIsError(
        invalidQuantityResult,
        "Quantity must be greater than 0.",
        "Should fail for quantity <= 0",
        "2.4 addPurchaseOption (invalid quantity)",
        ++checkIndex,
      );

      // 4. Invalid price
      const invalidPriceResult = await catalog.addPurchaseOption({
        item: itemAId,
        quantity: 1,
        units: "count",
        price: -1.00,
        store: "Test Store",
      });
      assertIsError(
        invalidPriceResult,
        "Price cannot be negative.",
        "Should fail for negative price",
        "2.5 addPurchaseOption (invalid price)",
        ++checkIndex,
      );

      // 5. Non-existent item
      const nonExistentItemResult = await catalog.addPurchaseOption({
        item: "nonExistentItem" as ID,
        quantity: 1,
        units: "count",
        price: 1.00,
        store: "Test Store",
      });
      assertIsError(
        nonExistentItemResult,
        `Item with ID "nonExistentItem" not found.`,
        "Should fail for non-existent item",
        "2.6 addPurchaseOption (non-existent item)",
        ++checkIndex,
      );
    });

    // --- Test updatePurchaseOption action ---
    await t.step("updatePurchaseOption: various attribute updates", async () => {
      printStepHeader("updatePurchaseOption: various attribute updates");
      let checkIndex = 0;

      // 1. Update quantity
      const updateQtyResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        quantity: 10,
      });
      assertAndLog(
        "success" in updateQtyResult,
        true,
        "Should update quantity successfully",
        "3.1 updatePurchaseOption (quantity)",
        ++checkIndex,
      );
      const po1DetailsAfterQty = await catalog._getPurchaseOptionDetails({
        purchaseOption: po1Id,
      });
      assertAndLog(
        po1DetailsAfterQty[0].quantity,
        10,
        "Quantity should be updated to 10",
        "3.2 _getPurchaseOptionDetails",
        ++checkIndex,
      );

      // 2. Update units
      const updateUnitsResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        units: "dozen",
      });
      assertAndLog(
        "success" in updateUnitsResult,
        true,
        "Should update units successfully",
        "3.3 updatePurchaseOption (units)",
        ++checkIndex,
      );
      const po1DetailsAfterUnits = await catalog._getPurchaseOptionDetails({
        purchaseOption: po1Id,
      });
      assertAndLog(
        po1DetailsAfterUnits[0].units,
        "dozen",
        "Units should be updated to 'dozen'",
        "3.4 _getPurchaseOptionDetails",
        ++checkIndex,
      );

      // 3. Update price
      const updatePriceResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        price: 2.50,
      });
      assertAndLog(
        "success" in updatePriceResult,
        true,
        "Should update price successfully",
        "3.5 updatePurchaseOption (price)",
        ++checkIndex,
      );
      const po1DetailsAfterPrice = await catalog._getPurchaseOptionDetails({
        purchaseOption: po1Id,
      });
      assertAndLog(
        po1DetailsAfterPrice[0].price,
        2.50,
        "Price should be updated to 2.50",
        "3.6 _getPurchaseOptionDetails",
        ++checkIndex,
      );

      // 4. Update store
      const updateStoreResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        store: "Mega Mart",
      });
      assertAndLog(
        "success" in updateStoreResult,
        true,
        "Should update store successfully",
        "3.7 updatePurchaseOption (store)",
        ++checkIndex,
      );
      const po1DetailsAfterStore = await catalog._getPurchaseOptionDetails({
        purchaseOption: po1Id,
      });
      assertAndLog(
        po1DetailsAfterStore[0].store,
        "Mega Mart",
        "Store should be updated to 'Mega Mart'",
        "3.8 _getPurchaseOptionDetails",
        ++checkIndex,
      );

      // 5. Update atomicOrder
      const atomicOrderId = "test-atomic-order-1" as ID;
      const updateOrderResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        atomicOrder: atomicOrderId,
      });
      assertAndLog(
        "success" in updateOrderResult,
        true,
        "Should update atomicOrder successfully",
        "3.9 updatePurchaseOption (atomicOrder)",
        ++checkIndex,
      );
      // Query for atomic order is not directly exposed, rely on the action's success.
      // We can also check via a low-level direct DB query for full confidence if needed.

      // 6. Invalid quantity update
      const invalidQtyUpdateResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        quantity: 0,
      });
      assertIsError(
        invalidQtyUpdateResult,
        "Quantity must be greater than 0.",
        "Should fail to update quantity <= 0",
        "3.10 updatePurchaseOption (invalid quantity)",
        ++checkIndex,
      );

      // 7. Invalid price update
      const invalidPriceUpdateResult = await catalog.updatePurchaseOption({
        purchaseOption: po1Id,
        price: -5.00,
      });
      assertIsError(
        invalidPriceUpdateResult,
        "Price cannot be negative.",
        "Should fail to update negative price",
        "3.11 updatePurchaseOption (invalid price)",
        ++checkIndex,
      );

      // 8. Update non-existent purchase option
      const nonExistentPoUpdateResult = await catalog.updatePurchaseOption({
        purchaseOption: "nonExistentPO" as ID,
        quantity: 1,
      });
      assertIsError(
        nonExistentPoUpdateResult,
        `PurchaseOption with ID "nonExistentPO" not found.`,
        "Should fail for non-existent PO",
        "3.12 updatePurchaseOption (non-existent PO)",
        ++checkIndex,
      );
    });

    // --- Test addItemName and removeItemName actions ---
    await t.step("addItemName & removeItemName: Add/remove aliases", async () => {
      printStepHeader("addItemName & removeItemName: Add/remove aliases");
      let checkIndex = 0;

      // Ensure itemB has only one name
      let bananaNames = (await catalog._getItemNames({ item: itemBId }))[0].names;
      assertAndLog(
        bananaNames,
        ["Banana"],
        "Banana should initially have only 'Banana'",
        "4.1 _getItemNames",
        ++checkIndex,
      );

      // 1. Add an alias "Fruit" to Banana
      const addAliasResult = await catalog.addItemName({
        item: itemBId,
        name: "Fruit",
      });
      assertAndLog(
        "success" in addAliasResult,
        true,
        "Should add 'Fruit' alias to Banana",
        "4.2 addItemName",
        ++checkIndex,
      );
      bananaNames = (await catalog._getItemNames({ item: itemBId }))[0].names;
      assertAndLog(
        bananaNames.includes("Fruit"),
        true,
        "Banana names should now include 'Fruit'",
        "4.3 _getItemNames",
        ++checkIndex,
      );

      // 2. Try to add an existing alias (should fail)
      const addExistingAliasResult = await catalog.addItemName({
        item: itemBId,
        name: "Banana",
      });
      assertIsError(
        addExistingAliasResult,
        `Name "Banana" is already an alias for Item "${itemBId}".`,
        "Should fail to add existing name as alias",
        "4.4 addItemName (existing)",
        ++checkIndex,
      );

      // 3. Remove alias "Fruit"
      const removeAliasResult = await catalog.removeItemName({
        item: itemBId,
        name: "Fruit",
      });
      assertAndLog(
        "success" in removeAliasResult,
        true,
        "Should remove 'Fruit' alias from Banana",
        "4.5 removeItemName",
        ++checkIndex,
      );
      bananaNames = (await catalog._getItemNames({ item: itemBId }))[0].names;
      assertAndLog(
        !bananaNames.includes("Fruit"),
        true,
        "Banana names should no longer include 'Fruit'",
        "4.6 _getItemNames",
        ++checkIndex,
      );

      // 4. Try to remove the only name (should fail)
      const removeOnlyNameResult = await catalog.removeItemName({
        item: itemBId,
        name: "Banana",
      });
      assertIsError(
        removeOnlyNameResult,
        `Cannot remove the only name for Item "${itemBId}".`,
        "Should fail to remove the only name of an item",
        "4.7 removeItemName (only name)",
        ++checkIndex,
      );

      // 5. Try to remove a non-existent name (should fail)
      const removeNonExistentNameResult = await catalog.removeItemName({
        item: itemBId,
        name: "NotThere",
      });
      assertIsError(
        removeNonExistentNameResult,
        `Name "NotThere" is not an alias for Item "${itemBId}".`,
        "Should fail to remove non-existent name",
        "4.8 removeItemName (non-existent)",
        ++checkIndex,
      );

      // 6. Try with non-existent item
      const addAliasNonExistentItem = await catalog.addItemName({
        item: "nonExistentItem" as ID,
        name: "alias",
      });
      assertIsError(
        addAliasNonExistentItem,
        `Item with ID "nonExistentItem" not found.`,
        "Should fail to add alias to non-existent item",
        "4.9 addItemName (non-existent item)",
        ++checkIndex,
      );
      const removeAliasNonExistentItem = await catalog.removeItemName({
        item: "nonExistentItem" as ID,
        name: "alias",
      });
      assertIsError(
        removeAliasNonExistentItem,
        `Item with ID "nonExistentItem" not found.`,
        "Should fail to remove alias from non-existent item",
        "4.10 removeItemName (non-existent item)",
        ++checkIndex,
      );
    });

    // --- Test addPurchaseOptionOrder and addItemOrder actions ---
    await t.step("addPurchaseOptionOrder & addItemOrder", async () => {
      printStepHeader("addPurchaseOptionOrder & addItemOrder");
      let checkIndex = 0;

      const atomicOrderTestId = "atomic-order-xyz" as ID;
      const selectOrderTestId = "select-order-abc" as ID;

      // 1. Add atomic order to purchase option
      const addPoOrderResult = await catalog.addPurchaseOptionOrder({
        purchaseOption: po1Id,
        atomicOrder: atomicOrderTestId,
      });
      assertAndLog(
        "success" in addPoOrderResult,
        true,
        "Should add atomic order to PO successfully",
        "5.1 addPurchaseOptionOrder",
        ++checkIndex,
      );

      // 2. Add select order to item
      const addItemOrderResult = await catalog.addItemOrder({
        item: itemAId,
        selectOrder: selectOrderTestId,
      });
      assertAndLog(
        "success" in addItemOrderResult,
        true,
        "Should add select order to Item successfully",
        "5.2 addItemOrder",
        ++checkIndex,
      );

      // 3. Attempt with non-existent purchase option
      const addPoOrderNonExistent = await catalog.addPurchaseOptionOrder({
        purchaseOption: "nonExistentPO" as ID,
        atomicOrder: atomicOrderTestId,
      });
      assertIsError(
        addPoOrderNonExistent,
        `PurchaseOption with ID "nonExistentPO" not found.`,
        "Should fail to add order to non-existent PO",
        "5.3 addPurchaseOptionOrder (non-existent)",
        ++checkIndex,
      );

      // 4. Attempt with non-existent item
      const addItemOrderNonExistent = await catalog.addItemOrder({
        item: "nonExistentItem" as ID,
        selectOrder: selectOrderTestId,
      });
      assertIsError(
        addItemOrderNonExistent,
        `Item with ID "nonExistentItem" not found.`,
        "Should fail to add order to non-existent Item",
        "5.4 addItemOrder (non-existent)",
        ++checkIndex,
      );
    });

    // --- Test removePurchaseOption action ---
    await t.step("removePurchaseOption: Remove PO from item", async () => {
      printStepHeader("removePurchaseOption: Remove PO from item");
      let checkIndex = 0;

      // Add a third PO to itemA for testing removal
      const addPoResult3 = await catalog.addPurchaseOption({
        item: itemAId,
        quantity: 1,
        units: "each",
        price: 0.5,
        store: "Corner Shop",
      });
      const po3Id = (addPoResult3 as { purchaseOption: ID }).purchaseOption;

      let itemAPs = (await catalog._getItemPurchaseOptions({ item: itemAId }))[0]
        .purchaseOptions;
      assertAndLog(
        itemAPs.includes(po3Id),
        true,
        "Item A should initially list PO3",
        "6.1 _getItemPurchaseOptions",
        ++checkIndex,
      );

      // 1. Successful removal
      const removePoResult = await catalog.removePurchaseOption({
        item: itemAId,
        purchaseOption: po3Id,
      });
      assertAndLog(
        "success" in removePoResult,
        true,
        "Should successfully remove PO3 from Item A",
        "6.2 removePurchaseOption",
        ++checkIndex,
      );

      // Verify PO3 is no longer in itemA's purchaseOptions
      itemAPs = (await catalog._getItemPurchaseOptions({ item: itemAId }))[0]
        .purchaseOptions;
      assertAndLog(
        !itemAPs.includes(po3Id),
        true,
        "Item A should no longer list PO3",
        "6.3 _getItemPurchaseOptions",
        ++checkIndex,
      );

      // Verify PO3 is deleted from the purchaseOptions collection
      const po3Details = await catalog._getPurchaseOptionDetails({
        purchaseOption: po3Id,
      });
      assertIsError(
        po3Details,
        `PurchaseOption with ID "${po3Id}" not found.`,
        "PO3 should be deleted from its collection",
        "6.4 _getPurchaseOptionDetails",
        ++checkIndex,
      );

      // 2. Attempt to remove a PO not associated with the given item
      const removeWrongItemPoResult = await catalog.removePurchaseOption({
        item: itemAId,
        purchaseOption: po2Id, // po2Id belongs to itemBId
      });
      assertIsError(
        removeWrongItemPoResult,
        `PurchaseOption with ID "${po2Id}" not found or not associated with Item "${itemAId}".`,
        "Should fail to remove PO not associated with item",
        "6.5 removePurchaseOption (wrong item)",
        ++checkIndex,
      );

      // 3. Attempt to remove non-existent PO
      const removeNonExistentPoResult = await catalog.removePurchaseOption({
        item: itemAId,
        purchaseOption: "nonExistentPO" as ID,
      });
      assertIsError(
        removeNonExistentPoResult,
        `PurchaseOption with ID "nonExistentPO" not found or not associated with Item "${itemAId}".`,
        "Should fail to remove non-existent PO",
        "6.6 removePurchaseOption (non-existent PO)",
        ++checkIndex,
      );

      // 4. Attempt to remove PO from non-existent item
      const removePoNonExistentItem = await catalog.removePurchaseOption({
        item: "nonExistentItem" as ID,
        purchaseOption: po1Id,
      });
      assertIsError(
        removePoNonExistentItem,
        `Item with ID "nonExistentItem" not found.`,
        "Should fail to remove PO from non-existent item",
        "6.7 removePurchaseOption (non-existent item)",
        ++checkIndex,
      );
    });

    // --- Test deleteItem action ---
    await t.step("deleteItem: Delete item and its associated POs", async () => {
      printStepHeader("deleteItem: Delete item and its associated POs");
      let checkIndex = 0;

      // Ensure itemB has purchase option po2Id
      const bananaPOs = (await catalog._getItemPurchaseOptions({ item: itemBId }))[0]
        .purchaseOptions;
      assertAndLog(
        bananaPOs.includes(po2Id),
        true,
        "Banana should have PO2 before deletion",
        "7.1 _getItemPurchaseOptions",
        ++checkIndex,
      );

      // 1. Successful deletion of ItemB
      const deleteResult = await catalog.deleteItem({ item: itemBId });
      assertAndLog(
        "success" in deleteResult,
        true,
        "Should successfully delete Item B",
        "7.2 deleteItem",
        ++checkIndex,
      );

      // Verify ItemB is gone
      const getItemB = await catalog._getItemByName({ name: "Banana" });
      assertIsError(
        getItemB,
        `Item with name "Banana" not found.`,
        "Item B should no longer exist",
        "7.3 _getItemByName",
        ++checkIndex,
      );

      // Verify PO2 (associated with ItemB) is also gone
      const getPo2Details = await catalog._getPurchaseOptionDetails({
        purchaseOption: po2Id,
      });
      assertIsError(
        getPo2Details,
        `PurchaseOption with ID "${po2Id}" not found.`,
        "PO2 should be deleted along with Item B",
        "7.4 _getPurchaseOptionDetails",
        ++checkIndex,
      );

      // 2. Attempt to delete non-existent item
      const deleteNonExistentResult = await catalog.deleteItem({
        item: "nonExistentItem" as ID,
      });
      assertIsError(
        deleteNonExistentResult,
        `Item with ID "nonExistentItem" not found.`,
        "Should fail to delete non-existent item",
        "7.5 deleteItem (non-existent)",
        ++checkIndex,
      );
    });
  } finally {
    await client.close();
  }
});

Deno.test("StoreCatalog - Query Tests", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemTomatoId: ID;
  let poRomaId: ID, poCherryId: ID;

  try {
    // Setup initial state
    const createItemResult = await catalog.createItem({ primaryName: "Tomato" });
    itemTomatoId = (createItemResult as { item: ID }).item;
    await catalog.addItemName({ item: itemTomatoId, name: "Tomat" }); // Alias

    const addPoRomaResult = await catalog.addPurchaseOption({
      item: itemTomatoId,
      quantity: 1,
      units: "lb",
      price: 2.99,
      store: "StoreX",
    });
    poRomaId = (addPoRomaResult as { purchaseOption: ID }).purchaseOption;
    await catalog.confirmPurchaseOption({ purchaseOption: poRomaId });

    const addPoCherryResult = await catalog.addPurchaseOption({
      item: itemTomatoId,
      quantity: 12,
      units: "oz",
      price: 3.50,
      store: "StoreY",
    });
    poCherryId = (addPoCherryResult as { purchaseOption: ID }).purchaseOption;

    // --- Test _getItemByName query ---
    await t.step("_getItemByName: Retrieve item by primary name and alias", async () => {
      printStepHeader("_getItemByName: Retrieve item by primary name and alias");
      let checkIndex = 0;

      // 1. By primary name
      const byNameResult = await catalog._getItemByName({ name: "Tomato" });
      assertAndLog(
        byNameResult.length,
        1,
        "Should find 'Tomato' by primary name",
        "1.1 _getItemByName",
        ++checkIndex,
      );
      assertAndLog(
        byNameResult[0].item,
        itemTomatoId,
        "Returned item ID matches",
        "1.2 _getItemByName",
        ++checkIndex,
      );

      // 2. By alias
      const byAliasResult = await catalog._getItemByName({ name: "Tomat" });
      assertAndLog(
        byAliasResult.length,
        1,
        "Should find 'Tomato' by alias 'Tomat'",
        "1.3 _getItemByName",
        ++checkIndex,
      );
      assertAndLog(
        byAliasResult[0].item,
        itemTomatoId,
        "Returned item ID matches for alias",
        "1.4 _getItemByName",
        ++checkIndex,
      );

      // 3. Non-existent name
      const nonExistentNameResult = await catalog._getItemByName({
        name: "Lettuce",
      });
      assertIsError(
        nonExistentNameResult,
        `Item with name "Lettuce" not found.`,
        "Should return error for non-existent item name",
        "1.5 _getItemByName (non-existent)",
        ++checkIndex,
      );
    });

    // --- Test _getItemByPurchaseOption query ---
    await t.step("_getItemByPurchaseOption: Retrieve item by PO", async () => {
      printStepHeader("_getItemByPurchaseOption: Retrieve item by PO");
      let checkIndex = 0;

      // 1. With existing PO
      const byPoResult = await catalog._getItemByPurchaseOption({
        purchaseOption: poRomaId,
      });
      assertAndLog(
        byPoResult.length,
        1,
        "Should find item by existing purchase option",
        "2.1 _getItemByPurchaseOption",
        ++checkIndex,
      );
      assertAndLog(
        byPoResult[0].item,
        itemTomatoId,
        "Returned item ID matches for PO",
        "2.2 _getItemByPurchaseOption",
        ++checkIndex,
      );

      // 2. With non-existent PO
      const nonExistentPoResult = await catalog._getItemByPurchaseOption({
        purchaseOption: "nonExistentPO" as ID,
      });
      assertIsError(
        nonExistentPoResult,
        `PurchaseOption with ID "nonExistentPO" not found.`,
        "Should return error for non-existent PO",
        "2.3 _getItemByPurchaseOption (non-existent)",
        ++checkIndex,
      );
    });

    // --- Test _getItemNames query ---
    await t.step("_getItemNames: Retrieve all names for an item", async () => {
      printStepHeader("_getItemNames: Retrieve all names for an item");
      let checkIndex = 0;

      // 1. With existing item
      const itemNamesResult = await catalog._getItemNames({ item: itemTomatoId });
      assertAndLog(
        itemNamesResult.length,
        1,
        "Should return one result for item names",
        "3.1 _getItemNames",
        ++checkIndex,
      );
      assertAndLog(
        itemNamesResult[0].names.sort(),
        ["Tomat", "Tomato"].sort(),
        "Returned names should include primary and alias",
        "3.2 _getItemNames",
        ++checkIndex,
      );

      // 2. With non-existent item
      const nonExistentItemNames = await catalog._getItemNames({
        item: "nonExistentItem" as ID,
      });
      assertIsError(
        nonExistentItemNames,
        `Item with ID "nonExistentItem" not found.`,
        "Should return error for non-existent item",
        "3.3 _getItemNames (non-existent)",
        ++checkIndex,
      );
    });

    // --- Test _getItemPurchaseOptions query ---
    await t.step("_getItemPurchaseOptions: Retrieve all POs for an item", async () => {
      printStepHeader("_getItemPurchaseOptions: Retrieve all POs for an item");
      let checkIndex = 0;

      // 1. With existing item
      const itemPOsResult = await catalog._getItemPurchaseOptions({
        item: itemTomatoId,
      });
      assertAndLog(
        itemPOsResult.length,
        1,
        "Should return one result for item purchase options",
        "4.1 _getItemPurchaseOptions",
        ++checkIndex,
      );
      assertAndLog(
        itemPOsResult[0].purchaseOptions.sort(),
        [poRomaId, poCherryId].sort(),
        "Returned PO IDs should match created ones",
        "4.2 _getItemPurchaseOptions",
        ++checkIndex,
      );

      // 2. With non-existent item
      const nonExistentItemPOs = await catalog._getItemPurchaseOptions({
        item: "nonExistentItem" as ID,
      });
      assertIsError(
        nonExistentItemPOs,
        `Item with ID "nonExistentItem" not found.`,
        "Should return error for non-existent item",
        "4.3 _getItemPurchaseOptions (non-existent)",
        ++checkIndex,
      );
    });

    // --- Test _getPurchaseOptionDetails query ---
    await t.step("_getPurchaseOptionDetails: Retrieve details for a PO", async () => {
      printStepHeader("_getPurchaseOptionDetails: Retrieve details for a PO");
      let checkIndex = 0;

      // 1. For confirmed PO
      const romaPoDetails = await catalog._getPurchaseOptionDetails({
        purchaseOption: poRomaId,
      });
      assertAndLog(
        romaPoDetails.length,
        1,
        "Should return one result for PO details",
        "5.1 _getPurchaseOptionDetails",
        ++checkIndex,
      );
      assertEquals(romaPoDetails[0].quantity, 1, "Quantity matches");
      assertEquals(romaPoDetails[0].units, "lb", "Units matches");
      assertEquals(romaPoDetails[0].price, 2.99, "Price matches");
      assertEquals(romaPoDetails[0].store, "StoreX", "Store matches");
      assertEquals(romaPoDetails[0].confirmed, true, "Confirmed status matches");
      console.log(`    ✅ Check ${++checkIndex}: PO Roma details match expected.`);

      // 2. For unconfirmed PO
      const cherryPoDetails = await catalog._getPurchaseOptionDetails({
        purchaseOption: poCherryId,
      });
      assertAndLog(
        cherryPoDetails.length,
        1,
        "Should return one result for PO details",
        "5.3 _getPurchaseOptionDetails",
        ++checkIndex,
      );
      assertEquals(cherryPoDetails[0].confirmed, false, "Confirmed status matches (unconfirmed)");
      console.log(`    ✅ Check ${++checkIndex}: PO Cherry details match expected.`);

      // 3. For non-existent PO
      const nonExistentPoDetails = await catalog._getPurchaseOptionDetails({
        purchaseOption: "nonExistentPO" as ID,
      });
      assertIsError(
        nonExistentPoDetails,
        `PurchaseOption with ID "nonExistentPO" not found.`,
        "Should return error for non-existent PO",
        "5.5 _getPurchaseOptionDetails (non-existent)",
        ++checkIndex,
      );
    });

    // --- Test _getAllItems query ---
    await t.step("_getAllItems: Retrieve all item IDs", async () => {
      printStepHeader("_getAllItems: Retrieve all item IDs");
      let checkIndex = 0;

      const allItemsResult = await catalog._getAllItems({});
      assertAndLog(
        allItemsResult.length,
        1,
        "Should return one result containing all items",
        "6.1 _getAllItems",
        ++checkIndex,
      );
      assertAndLog(
        allItemsResult[0].items,
        [itemTomatoId],
        "Should return the ID of the 'Tomato' item",
        "6.2 _getAllItems",
        ++checkIndex,
      );

      // Verify empty catalog scenario
      await catalog.deleteItem({ item: itemTomatoId });
      const emptyCatalogResult = await catalog._getAllItems({});
      assertAndLog(
        emptyCatalogResult[0].items,
        [],
        "Should return an empty array for an empty catalog",
        "6.3 _getAllItems (empty)",
        ++checkIndex,
      );
    });
  } finally {
    await client.close();
  }
});
```
