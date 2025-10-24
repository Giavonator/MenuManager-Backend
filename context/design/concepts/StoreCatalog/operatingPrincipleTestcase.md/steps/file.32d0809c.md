---
timestamp: 'Thu Oct 23 2025 18:21:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_182115.1a73e288.md]]'
content_id: 32d0809cec2528838c69d202b6bda1d0ee6e4655f8c7cd04afda6ba9e845b2fb
---

# file: src/concepts/StoreCatalog/StoreCatalogConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import StoreCatalogConcept from "./StoreCatalogConcept.ts";

// Helper function to print a Deno test header
function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

// Helper function to print a test step header
function printStepHeader(stepMessage: string) {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
}

// --- Specialized Assertion Helpers for Concept Results ---

/**
 * Asserts that an action result is a success (does not contain an 'error' property).
 * Returns the success payload for further checks.
 */
function assertActionSuccess<T>(
  result: T | { error: string },
  message: string,
  stepMessage: string,
  checkIndex: number,
): T {
  if ("error" in result) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    throw new Error(
      `Error in "${stepMessage}": Expected action success, but got error: ${result.error}`,
    );
  }
  console.log(`    ✅ Check ${checkIndex}: ${message}`);
  return result;
}

/**
 * Asserts that an action result is an error and its message matches the expected.
 */
function assertActionError<T>(
  result: T | { error: string },
  expectedErrorMessage: string,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  if (!("error" in result)) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    throw new Error(
      `Error in "${stepMessage}": Expected action error, but got success: ${
        JSON.stringify(result)
      }`,
    );
  }
  assertEquals(
    result.error,
    expectedErrorMessage,
    `Error in "${stepMessage}": Expected error message "${expectedErrorMessage}", but got "${result.error}"`,
  );
  console.log(`    ✅ Check ${checkIndex}: ${message}`);
}

/**
 * Asserts that a query result is a success (does not contain an error object in its array).
 * Returns the success array payload for further checks.
 */
function assertQuerySuccess<T extends Record<PropertyKey, any>[]>(
  result: T | { error: string }[],
  message: string,
  stepMessage: string,
  checkIndex: number,
): T {
  if (Array.isArray(result) && result.length > 0 && "error" in result[0]) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    throw new Error(
      `Error in "${stepMessage}": Expected query success, but got error: ${result[0].error}`,
    );
  }
  console.log(`    ✅ Check ${checkIndex}: ${message}`);
  return result as T;
}

/**
 * Asserts that a query result is an error and its message matches the expected.
 */
function assertQueryError<T extends Record<PropertyKey, any>[]>(
  result: T | { error: string }[],
  expectedErrorMessage: string,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  if (
    !Array.isArray(result) || result.length === 0 || !("error" in result[0])
  ) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    throw new Error(
      `Error in "${stepMessage}": Expected query error, but got success or empty array: ${
        JSON.stringify(result)
      }`,
    );
  }
  assertEquals(
    result[0].error,
    expectedErrorMessage,
    `Error in "${stepMessage}": Expected error message "${expectedErrorMessage}", but got "${result[0].error}"`,
  );
  console.log(`    ✅ Check ${checkIndex}: ${message}`);
}

/**
 * Simplified helper for direct value comparison after type narrowing has occurred.
 */
function assertEqualsAndLog<T>(
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
    console.error(`      Error in "${stepMessage}": ${e.message}`);
    throw e;
  }
}

Deno.test("StoreCatalog - Operating Principle and Extended Functionality", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalogConcept = new StoreCatalogConcept(db);

  let groundPepperItem: ID;
  let poSprouts: ID;
  let poTraderJoes: ID;

  await t.step("1. Setup and Initial State", async () => {
    const stepMessage = "1. Setup and Initial State";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const allItemsResult = await catalogConcept._getAllItems();
    const allItems = assertQuerySuccess(
      allItemsResult,
      "Initial _getAllItems should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      allItems[0].items.length,
      0,
      "Catalog should be empty initially",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("2. Create an Item: 'ground pepper'", async () => {
    const stepMessage = "2. Create an Item: 'ground pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: createItem**
    console.log(`  Calling createItem({ primaryName: "ground pepper" })`);
    const createResult = await catalogConcept.createItem({
      primaryName: "ground pepper",
    });
    const successCreateResult = assertActionSuccess(
      createResult,
      "createItem should return an item ID",
      stepMessage,
      ++checkIndex,
    );
    groundPepperItem = successCreateResult.item;
    assertExists(groundPepperItem, "Item ID should be defined");
    console.log(`  New Item ID: ${groundPepperItem}`);

    // **Verification with Queries**
    // _getItemByName (name: String): (item: Item)
    console.log(`  Calling _getItemByName({ name: "ground pepper" })`);
    const itemByNameResult = await catalogConcept._getItemByName({
      name: "ground pepper",
    });
    const successItemByName = assertQuerySuccess(
      itemByNameResult,
      "Should find 1 item by name 'ground pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemByName.length,
      1,
      "Should find 1 item by name 'ground pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemByName[0].item,
      groundPepperItem,
      "Item ID from query matches created item ID",
      stepMessage,
      ++checkIndex,
    );

    // _getItemNames (item: Item): (names: Set of String)
    console.log(`  Calling _getItemNames({ item: ${groundPepperItem} })`);
    const itemNamesResult = await catalogConcept._getItemNames({
      item: groundPepperItem,
    });
    const successItemNames = assertQuerySuccess(
      itemNamesResult,
      "Should get names for the item",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNames.length,
      1,
      "Should get names for the item",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNames[0].names,
      ["ground pepper"],
      "Item names should be ['ground pepper']",
      stepMessage,
      ++checkIndex,
    );

    // _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
    console.log(
      `  Calling _getItemPurchaseOptions({ item: ${groundPepperItem} })`,
    );
    const itemPurchaseOptionsResult = await catalogConcept
      ._getItemPurchaseOptions({
        item: groundPepperItem,
      });
    const successPurchaseOptions = assertQuerySuccess(
      itemPurchaseOptionsResult,
      "New item should have no purchase options initially",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPurchaseOptions[0].purchaseOptions.length,
      0,
      "New item should have no purchase options initially",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: duplicate item name**
    console.log(`  Attempting to create duplicate item 'ground pepper'`);
    const duplicateCreateResult = await catalogConcept.createItem({
      primaryName: "ground pepper",
    });
    assertActionError(
      duplicateCreateResult,
      `An item with the name "ground pepper" already exists.`,
      "Creating item with existing name should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Add Purchase Options to 'ground pepper'", async () => {
    const stepMessage = "3. Add Purchase Options to 'ground pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: addPurchaseOption (Sprout's)**
    console.log(
      `  Calling addPurchaseOption for item ${groundPepperItem} (Sprout's)`,
    );
    const po1Result = await catalogConcept.addPurchaseOption({
      item: groundPepperItem,
      quantity: 3.0,
      units: "lbs",
      price: 5.99,
      store: "Sprout's",
    });
    const successPo1 = assertActionSuccess(
      po1Result,
      "addPurchaseOption for Sprout's should return a purchaseOption ID",
      stepMessage,
      ++checkIndex,
    );
    poSprouts = successPo1.purchaseOption;
    assertExists(poSprouts, "Sprout's Purchase Option ID should be defined");
    console.log(`  New Purchase Option ID (Sprout's): ${poSprouts}`);

    // **Action: addPurchaseOption (Trader Joe's)**
    console.log(
      `  Calling addPurchaseOption for item ${groundPepperItem} (Trader Joe's)`,
    );
    const po2Result = await catalogConcept.addPurchaseOption({
      item: groundPepperItem,
      quantity: 1.0,
      units: "lb",
      price: 2.50,
      store: "Trader Joe's",
    });
    const successPo2 = assertActionSuccess(
      po2Result,
      "addPurchaseOption for Trader Joe's should return a purchaseOption ID",
      stepMessage,
      ++checkIndex,
    );
    poTraderJoes = successPo2.purchaseOption;
    assertExists(
      poTraderJoes,
      "Trader Joe's Purchase Option ID should be defined",
    );
    console.log(`  New Purchase Option ID (Trader Joe's): ${poTraderJoes}`);

    // **Verification with Queries**
    // _getItemPurchaseOptions
    console.log(
      `  Calling _getItemPurchaseOptions({ item: ${groundPepperItem} })`,
    );
    const itemPurchaseOptionsAfterAddResult = await catalogConcept
      ._getItemPurchaseOptions(
        { item: groundPepperItem },
      );
    const successPurchaseOptionsAfterAdd = assertQuerySuccess(
      itemPurchaseOptionsAfterAddResult,
      "Item should now have 2 purchase options",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPurchaseOptionsAfterAdd[0].purchaseOptions.length,
      2,
      "Item should now have 2 purchase options",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPurchaseOptionsAfterAdd[0].purchaseOptions.includes(poSprouts) &&
        successPurchaseOptionsAfterAdd[0].purchaseOptions.includes(poTraderJoes),
      true,
      "Both purchase options should be linked to the item",
      stepMessage,
      ++checkIndex,
    );

    // _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poSprouts} })`,
    );
    const po1DetailsResult = await catalogConcept._getPurchaseOptionDetails({
      purchaseOption: poSprouts,
    });
    const successPo1Details = assertQuerySuccess(
      po1DetailsResult,
      "Sprout's PO details should be retrievable",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo1Details[0].store,
      "Sprout's",
      "Sprout's PO store is correct",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo1Details[0].confirmed,
      false,
      "New purchase option should not be confirmed",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: invalid quantity/price**
    console.log(
      `  Attempting to add purchase option with invalid quantity (0)`,
    );
    const invalidQuantityResult = await catalogConcept.addPurchaseOption({
      item: groundPepperItem,
      quantity: 0,
      units: "g",
      price: 1.0,
      store: "Bad Store",
    });
    assertActionError(
      invalidQuantityResult,
      "Quantity must be greater than 0.",
      "Adding PO with quantity <= 0 should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Add an Item Alias: 'pepper'", async () => {
    const stepMessage = "4. Add an Item Alias: 'pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: addItemName**
    console.log(
      `  Calling addItemName({ item: ${groundPepperItem}, name: "pepper" })`,
    );
    const addAliasResult = await catalogConcept.addItemName({
      item: groundPepperItem,
      name: "pepper",
    });
    assertActionSuccess(
      addAliasResult,
      "Adding new alias 'pepper' should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getItemNames
    console.log(`  Calling _getItemNames({ item: ${groundPepperItem} })`);
    const itemNamesAfterAliasResult = await catalogConcept._getItemNames({
      item: groundPepperItem,
    });
    const successItemNamesAfterAlias = assertQuerySuccess(
      itemNamesAfterAliasResult,
      "Item names should now include 'pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNamesAfterAlias[0].names.includes("pepper"),
      true,
      "Item names should now include 'pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNamesAfterAlias[0].names.includes("ground pepper"),
      true,
      "Item names should still include 'ground pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNamesAfterAlias[0].names.length,
      2,
      "Item should now have 2 names",
      stepMessage,
      ++checkIndex,
    );

    // _getItemByName (using alias)
    console.log(`  Calling _getItemByName({ name: "pepper" })`);
    const itemByAliasResult = await catalogConcept._getItemByName({
      name: "pepper",
    });
    const successItemByAlias = assertQuerySuccess(
      itemByAliasResult,
      "Item found using alias 'pepper' matches original item ID",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemByAlias[0].item,
      groundPepperItem,
      "Item found using alias 'pepper' matches original item ID",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: adding existing alias**
    console.log(`  Attempting to add existing alias 'pepper'`);
    const duplicateAliasResult = await catalogConcept.addItemName({
      item: groundPepperItem,
      name: "pepper",
    });
    assertActionError(
      duplicateAliasResult,
      `Name "pepper" is already an alias for Item "${groundPepperItem}".`,
      "Adding existing alias should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("5. Confirm a Purchase Option (Sprout's)", async () => {
    const stepMessage = "5. Confirm a Purchase Option (Sprout's)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: confirmPurchaseOption**
    console.log(
      `  Calling confirmPurchaseOption({ purchaseOption: ${poSprouts} })`,
    );
    const confirmResult = await catalogConcept.confirmPurchaseOption({
      purchaseOption: poSprouts,
    });
    assertActionSuccess(
      confirmResult,
      "Confirming purchase option should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getPurchaseOptionDetails
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poSprouts} })`,
    );
    const po1DetailsAfterConfirmResult = await catalogConcept
      ._getPurchaseOptionDetails(
        { purchaseOption: poSprouts },
      );
    const successPo1DetailsAfterConfirm = assertQuerySuccess(
      po1DetailsAfterConfirmResult,
      "Purchase option for Sprout's should now be confirmed",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo1DetailsAfterConfirm[0].confirmed,
      true,
      "Purchase option for Sprout's should now be confirmed",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: confirming an already confirmed PO**
    console.log(`  Attempting to re-confirm purchase option ${poSprouts}`);
    const reconfirmResult = await catalogConcept.confirmPurchaseOption({
      purchaseOption: poSprouts,
    });
    assertActionError(
      reconfirmResult,
      `PurchaseOption with ID "${poSprouts}" is already confirmed.`,
      "Re-confirming an already confirmed PO should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("6. Update a Purchase Option (Trader Joe's)", async () => {
    const stepMessage = "6. Update a Purchase Option (Trader Joe's)";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: updatePurchaseOption (quantity, units)**
    console.log(
      `  Calling updatePurchaseOption for ${poTraderJoes} (quantity: 2.0, units: "oz")`,
    );
    const updateQuantityResult = await catalogConcept.updatePurchaseOption(
      { purchaseOption: poTraderJoes, quantity: 2.0 },
    );
    assertActionSuccess(
      updateQuantityResult,
      "Updating quantity should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updateUnitsResult = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      units: "oz",
    });
    assertActionSuccess(
      updateUnitsResult,
      "Updating units should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Action: updatePurchaseOption (price, store)**
    console.log(
      `  Calling updatePurchaseOption for ${poTraderJoes} (price: 3.00, store: "Whole Foods")`,
    );
    const updatePriceResult = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      price: 3.00,
    });
    assertActionSuccess(
      updatePriceResult,
      "Updating price should succeed",
      stepMessage,
      ++checkIndex,
    );

    const updateStoreResult = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      store: "Whole Foods",
    });
    assertActionSuccess(
      updateStoreResult,
      "Updating store should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poTraderJoes} })`,
    );
    const po2DetailsAfterUpdateResult = await catalogConcept
      ._getPurchaseOptionDetails(
        { purchaseOption: poTraderJoes },
      );
    const successPo2DetailsAfterUpdate = assertQuerySuccess(
      po2DetailsAfterUpdateResult,
      "Purchase option details should reflect updates",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo2DetailsAfterUpdate[0].quantity,
      2.0,
      "Quantity updated to 2.0",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo2DetailsAfterUpdate[0].units,
      "oz",
      "Units updated to 'oz'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo2DetailsAfterUpdate[0].price,
      3.00,
      "Price updated to 3.00",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successPo2DetailsAfterUpdate[0].store,
      "Whole Foods",
      "Store updated to 'Whole Foods'",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: invalid quantity/price updates**
    console.log(`  Attempting to update PO with invalid quantity (0)`);
    const invalidUpdateQuantityResult = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      quantity: 0,
    });
    assertActionError(
      invalidUpdateQuantityResult,
      "Quantity must be greater than 0.",
      "Updating with quantity <= 0 should error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("7. Assign Orders to Item and Purchase Option", async () => {
    const stepMessage = "7. Assign Orders to Item and Purchase Option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const dummyAtomicOrder: ID = "atomicOrder:abc-123" as ID;
    const dummySelectOrder: ID = "selectOrder:xyz-456" as ID;

    // **Action: addPurchaseOptionOrder**
    console.log(
      `  Calling addPurchaseOptionOrder({ purchaseOption: ${poSprouts}, atomicOrder: ${dummyAtomicOrder} })`,
    );
    const addPOOrderResult = await catalogConcept.addPurchaseOptionOrder({
      purchaseOption: poSprouts,
      atomicOrder: dummyAtomicOrder,
    });
    assertActionSuccess(
      addPOOrderResult,
      "addPurchaseOptionOrder should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification** (direct collection access for optional fields not in public queries)
    const poSproutsDoc = await catalogConcept.purchaseOptions.findOne({
      _id: poSprouts,
    });
    assertExists(poSproutsDoc, "PurchaseOption doc should exist");
    assertEqualsAndLog(
      poSproutsDoc?.atomicOrderId,
      dummyAtomicOrder,
      "AtomicOrder ID should be set for Sprout's PO",
      stepMessage,
      ++checkIndex,
    );

    // **Action: addItemOrder**
    console.log(
      `  Calling addItemOrder({ item: ${groundPepperItem}, selectOrder: ${dummySelectOrder} })`,
    );
    const addItemOrderResult = await catalogConcept.addItemOrder({
      item: groundPepperItem,
      selectOrder: dummySelectOrder,
    });
    assertActionSuccess(
      addItemOrderResult,
      "addItemOrder should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification** (direct collection access for optional fields not in public queries)
    const itemDoc = await catalogConcept.items.findOne({
      _id: groundPepperItem,
    });
    assertExists(itemDoc, "Item doc should exist");
    assertEqualsAndLog(
      itemDoc?.selectOrderId,
      dummySelectOrder,
      "SelectOrder ID should be set for the item",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("8. Remove Item Name: 'pepper'", async () => {
    const stepMessage = "8. Remove Item Name: 'pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: removeItemName**
    console.log(
      `  Calling removeItemName({ item: ${groundPepperItem}, name: "pepper" })`,
    );
    const removeAliasResult = await catalogConcept.removeItemName({
      item: groundPepperItem,
      name: "pepper",
    });
    assertActionSuccess(
      removeAliasResult,
      "Removing alias 'pepper' should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getItemNames
    console.log(`  Calling _getItemNames({ item: ${groundPepperItem} })`);
    const itemNamesAfterRemoveResult = await catalogConcept._getItemNames({
      item: groundPepperItem,
    });
    const successItemNamesAfterRemove = assertQuerySuccess(
      itemNamesAfterRemoveResult,
      "Item names should no longer include 'pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNamesAfterRemove[0].names.includes("pepper"),
      false,
      "Item names should no longer include 'pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successItemNamesAfterRemove[0].names,
      ["ground pepper"],
      "Item names should be ['ground pepper']",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: removing the only name**
    console.log(
      `  Attempting to remove the last remaining name 'ground pepper'`,
    );
    const removeLastNameResult = await catalogConcept.removeItemName({
      item: groundPepperItem,
      name: "ground pepper",
    });
    assertActionError(
      removeLastNameResult,
      `Cannot remove the only name for Item "${groundPepperItem}".`,
      "Removing the only name should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "9. Remove a Purchase Option (Trader Joe's/Whole Foods)",
    async () => {
      const stepMessage =
        "9. Remove a Purchase Option (Trader Joe's/Whole Foods)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // **Action: removePurchaseOption**
      console.log(
        `  Calling removePurchaseOption({ item: ${groundPepperItem}, purchaseOption: ${poTraderJoes} })`,
      );
      const removePOResult = await catalogConcept.removePurchaseOption({
        item: groundPepperItem,
        purchaseOption: poTraderJoes,
      });
      assertActionSuccess(
        removePOResult,
        "Removing purchase option should succeed",
        stepMessage,
        ++checkIndex,
      );

      // **Verification with Queries**
      // _getItemPurchaseOptions
      console.log(
        `  Calling _getItemPurchaseOptions({ item: ${groundPepperItem} })`,
      );
      const itemPurchaseOptionsAfterRemoveResult = await catalogConcept
        ._getItemPurchaseOptions(
          { item: groundPepperItem },
        );
      const successItemPurchaseOptionsAfterRemove = assertQuerySuccess(
        itemPurchaseOptionsAfterRemoveResult,
        "Item should now have 1 purchase option remaining",
        stepMessage,
        ++checkIndex,
      );
      assertEqualsAndLog(
        successItemPurchaseOptionsAfterRemove[0].purchaseOptions.length,
        1,
        "Item should now have 1 purchase option remaining",
        stepMessage,
        ++checkIndex,
      );
      assertEqualsAndLog(
        successItemPurchaseOptionsAfterRemove[0].purchaseOptions.includes(
          poTraderJoes,
        ),
        false,
        "Trader Joe's/Whole Foods PO should no longer be linked to the item",
        stepMessage,
        ++checkIndex,
      );
      assertEqualsAndLog(
        successItemPurchaseOptionsAfterRemove[0].purchaseOptions.includes(poSprouts),
        true,
        "Sprout's PO should still be linked to the item",
        stepMessage,
        ++checkIndex,
      );

      // _getPurchaseOptionDetails (for the removed PO)
      console.log(
        `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poTraderJoes} })`,
      );
      const removedPODetailsResult = await catalogConcept
        ._getPurchaseOptionDetails(
          { purchaseOption: poTraderJoes },
        );
      assertQueryError(
        removedPODetailsResult,
        `PurchaseOption with ID "${poTraderJoes}" not found.`,
        "Querying details of a removed PO should return an error",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("10. Delete Item: 'ground pepper'", async () => {
    const stepMessage = "10. Delete Item: 'ground pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // **Action: deleteItem**
    console.log(`  Calling deleteItem({ item: ${groundPepperItem} })`);
    const deleteItemResult = await catalogConcept.deleteItem({
      item: groundPepperItem,
    });
    assertActionSuccess(
      deleteItemResult,
      "Deleting the item should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getAllItems
    console.log(`  Calling _getAllItems()`);
    const allItemsAfterDeleteResult = await catalogConcept._getAllItems();
    const successAllItemsAfterDelete = assertQuerySuccess(
      allItemsAfterDeleteResult,
      "Catalog should be empty after deleting the item",
      stepMessage,
      ++checkIndex,
    );
    assertEqualsAndLog(
      successAllItemsAfterDelete[0].items.length,
      0,
      "Catalog should be empty after deleting the item",
      stepMessage,
      ++checkIndex,
    );

    // _getItemByName (original name)
    console.log(`  Calling _getItemByName({ name: "ground pepper" })`);
    const itemByNameAfterDeleteResult = await catalogConcept._getItemByName({
      name: "ground pepper",
    });
    assertQueryError(
      itemByNameAfterDeleteResult,
      `Item with name "ground pepper" not found.`,
      "Querying deleted item by name should return an error",
      stepMessage,
      ++checkIndex,
    );

    // _getPurchaseOptionDetails (remaining PO)
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poSprouts} })`,
    );
    const remainingPODetailsResult = await catalogConcept._getPurchaseOptionDetails({
      purchaseOption: poSprouts,
    });
    assertQueryError(
      remainingPODetailsResult,
      `PurchaseOption with ID "${poSprouts}" not found.`,
      "Querying details of associated PO (Sprout's) after item deletion should return an error",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: deleting non-existent item**
    console.log(
      `  Attempting to delete non-existent item "nonExistentItem:123"`,
    );
    const nonExistentItem: ID = "nonExistentItem:123" as ID;
    const deleteNonExistentResult = await catalogConcept.deleteItem({
      item: nonExistentItem,
    });
    assertActionError(
      deleteNonExistentResult,
      `Item with ID "${nonExistentItem}" not found.`,
      "Deleting a non-existent item should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});
```
