---
timestamp: 'Fri Oct 24 2025 05:34:42 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_053442.06babaf0.md]]'
content_id: 2c0616f6fb31c673214b12c46887d8129ad71753b7b7796d6fdfddcd5b67a731
---

# file: src/concepts/StoreCatalog/StoreCatalogConcept.test.ts

```typescript
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

// Helper function to assert and log existence
function assertExistsAndLog(
  value: unknown,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  try {
    assertExists(value, message);
    console.log(`    ✅ Check ${checkIndex}: ${message}`);
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

Deno.test("StoreCatalog - Principle Fulfillment", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let groundPepperItem: ID;
  let sproutsOption: ID;
  let traderJoesOption: ID;

  await t.step("1. Administrator creates a new ingredient 'ground pepper'", async () => {
    const stepMessage = "1. Administrator creates a new ingredient 'ground pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const createResult = await catalog.createItem({ primaryName: "ground pepper" });
    assertAndLog("item" in createResult, true, "Item 'ground pepper' should be created", stepMessage, ++checkIndex);
    groundPepperItem = (createResult as { item: ID }).item;
    assertExistsAndLog(groundPepperItem, "Created item ID should exist", stepMessage, ++checkIndex);

    const queryResult = await catalog._getItemByName({ name: "ground pepper" });
    assertAndLog("error" in queryResult, false, "Query for 'ground pepper' should not return an error", stepMessage, ++checkIndex);
    assertAndLog((queryResult as { item: ID }[]).length, 1, "Should find one item by name", stepMessage, ++checkIndex);
    assertAndLog((queryResult as { item: ID }[])[0].item, groundPepperItem, "Queried item should match created item", stepMessage, ++checkIndex);
  });

  await t.step("2. Add multiple PurchaseOptions for 'ground pepper'", async () => {
    const stepMessage = "2. Add multiple PurchaseOptions for 'ground pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // Sprout's option
    const addSproutsResult = await catalog.addPurchaseOption({
      item: groundPepperItem,
      quantity: 3.0,
      units: "lbs",
      price: 5.99,
      store: "Sprout's",
    });
    assertAndLog("purchaseOption" in addSproutsResult, true, "Sprout's option should be added", stepMessage, ++checkIndex);
    sproutsOption = (addSproutsResult as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(sproutsOption, "Sprout's purchase option ID should exist", stepMessage, ++checkIndex);

    // Trader Joe's option
    const addTraderJoesResult = await catalog.addPurchaseOption({
      item: groundPepperItem,
      quantity: 1.0,
      units: "lb",
      price: 2.50,
      store: "Trader Joe's",
    });
    assertAndLog("purchaseOption" in addTraderJoesResult, true, "Trader Joe's option should be added", stepMessage, ++checkIndex);
    traderJoesOption = (addTraderJoesResult as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(traderJoesOption, "Trader Joe's purchase option ID should exist", stepMessage, ++checkIndex);

    // Verify item has purchase options
    const itemOptionsQuery = await catalog._getItemPurchaseOptions({ item: groundPepperItem });
    assertAndLog("error" in itemOptionsQuery, false, "Query for item purchase options should not error", stepMessage, ++checkIndex);
    assertAndLog((itemOptionsQuery as { purchaseOptions: ID[] }[]).length, 1, "Should find purchase options for the item", stepMessage, ++checkIndex);
    const itemOptions = (itemOptionsQuery as { purchaseOptions: ID[] }[])[0].purchaseOptions;
    assertAndLog(itemOptions.includes(sproutsOption), true, "Item should list Sprout's option", stepMessage, ++checkIndex);
    assertAndLog(itemOptions.includes(traderJoesOption), true, "Item should list Trader Joe's option", stepMessage, ++checkIndex);

    // Verify details of one option
    const sproutsDetails = await catalog._getPurchaseOptionDetails({ purchaseOption: sproutsOption });
    assertAndLog("error" in sproutsDetails, false, "Query for Sprout's option details should not error", stepMessage, ++checkIndex);
    assertAndLog((sproutsDetails as any)[0].quantity, 3.0, "Sprout's quantity should be 3.0", stepMessage, ++checkIndex);
    assertAndLog((sproutsDetails as any)[0].store, "Sprout's", "Sprout's store should be correct", stepMessage, ++checkIndex);
    assertAndLog((sproutsDetails as any)[0].confirmed, false, "Sprout's option should initially be unconfirmed", stepMessage, ++checkIndex);
  });

  await t.step("3. Add 'pepper' as an alias for 'ground pepper'", async () => {
    const stepMessage = "3. Add 'pepper' as an alias for 'ground pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const addAliasResult = await catalog.addItemName({ item: groundPepperItem, name: "pepper" });
    assertAndLog("error" in addAliasResult, false, "Adding alias 'pepper' should succeed", stepMessage, ++checkIndex);

    const namesQuery = await catalog._getItemNames({ item: groundPepperItem });
    assertAndLog("error" in namesQuery, false, "Query for item names should not error", stepMessage, ++checkIndex);
    const itemNames = (namesQuery as { names: string[] }[])[0].names;
    assertAndLog(itemNames.includes("ground pepper"), true, "Item names should include 'ground pepper'", stepMessage, ++checkIndex);
    assertAndLog(itemNames.includes("pepper"), true, "Item names should include 'pepper'", stepMessage, ++checkIndex);
    assertAndLog(itemNames.length, 2, "Item should have two names", stepMessage, ++checkIndex);

    // Verify item can be found by new alias
    const queryByAliasResult = await catalog._getItemByName({ name: "pepper" });
    assertAndLog("error" in queryByAliasResult, false, "Query by alias 'pepper' should not return an error", stepMessage, ++checkIndex);
    assertAndLog((queryByAliasResult as { item: ID }[])[0].item, groundPepperItem, "Queried item by alias should match", stepMessage, ++checkIndex);
  });

  await t.step("4. Confirm one of the PurchaseOptions", async () => {
    const stepMessage = "4. Confirm one of the PurchaseOptions";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const confirmResult = await catalog.confirmPurchaseOption({ purchaseOption: sproutsOption });
    assertAndLog("error" in confirmResult, false, "Confirming Sprout's option should succeed", stepMessage, ++checkIndex);

    const sproutsDetailsAfterConfirm = await catalog._getPurchaseOptionDetails({ purchaseOption: sproutsOption });
    assertAndLog("error" in sproutsDetailsAfterConfirm, false, "Query for Sprout's option details after confirm should not error", stepMessage, ++checkIndex);
    assertAndLog((sproutsDetailsAfterConfirm as any)[0].confirmed, true, "Sprout's option should now be confirmed", stepMessage, ++checkIndex);

    // Ensure the other option is still unconfirmed
    const traderJoesDetails = await catalog._getPurchaseOptionDetails({ purchaseOption: traderJoesOption });
    assertAndLog((traderJoesDetails as any)[0].confirmed, false, "Trader Joe's option should still be unconfirmed", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: createItem", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  await t.step("1. Successful creation of an item", async () => {
    const stepMessage = "1. Successful creation of an item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog.createItem({ primaryName: "Flour" });
    assertAndLog("item" in result, true, "Result should contain item ID", stepMessage, ++checkIndex);
    const itemId = (result as { item: ID }).item;
    assertExistsAndLog(itemId, "Item ID should be generated", stepMessage, ++checkIndex);

    const itemNames = await catalog._getItemNames({ item: itemId });
    assertAndLog("names" in (itemNames as any)[0], true, "Item names should be retrievable", stepMessage, ++checkIndex);
    assertAndLog((itemNames as { names: string[] }[])[0].names, ["Flour"], "Item should have 'Flour' as its name", stepMessage, ++checkIndex);

    const itemOptions = await catalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog("purchaseOptions" in (itemOptions as any)[0], true, "Item purchase options should be retrievable", stepMessage, ++checkIndex);
    assertAndLog((itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.length, 0, "New item should have no purchase options", stepMessage, ++checkIndex);
  });

  await t.step("2. Failure to create item with existing primary name", async () => {
    const stepMessage = "2. Failure to create item with existing primary name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    await catalog.createItem({ primaryName: "Sugar" }); // Create once
    const result = await catalog.createItem({ primaryName: "Sugar" }); // Attempt to create again
    assertAndLog("error" in result, true, "Should return an error for duplicate name", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `An item with the name "Sugar" already exists.`, "Correct error message should be returned", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: deleteItem", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemToDelete: ID;
  let purchaseOptionToDelete: ID;

  await t.step("1. Setup: Create item and purchase option", async () => {
    const stepMessage = "1. Setup: Create item and purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const createItemResult = await catalog.createItem({ primaryName: "Milk" });
    itemToDelete = (createItemResult as { item: ID }).item;

    const addPOResult = await catalog.addPurchaseOption({
      item: itemToDelete,
      quantity: 1.0,
      units: "gallon",
      price: 3.50,
      store: "Local Mart",
    });
    purchaseOptionToDelete = (addPOResult as { purchaseOption: ID }).purchaseOption;

    const items = await catalog._getAllItems({});
    assertAndLog((items as { items: ID[] }[])[0].items.length, 1, "Should have 1 item before deletion", stepMessage, ++checkIndex);
    const poDetails = await catalog._getPurchaseOptionDetails({ purchaseOption: purchaseOptionToDelete });
    assertAndLog("error" in poDetails, false, "Purchase option should exist before deletion", stepMessage, ++checkIndex);
  });

  await t.step("2. Successful deletion of an item and its purchase options", async () => {
    const stepMessage = "2. Successful deletion of an item and its purchase options";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const deleteResult = await catalog.deleteItem({ item: itemToDelete });
    assertAndLog("error" in deleteResult, false, "Deletion should not return an error", stepMessage, ++checkIndex);
    assertAndLog(Object.keys(deleteResult).length, 0, "Successful deletion returns empty object", stepMessage, ++checkIndex);

    const itemsAfterDelete = await catalog._getAllItems({});
    assertAndLog((itemsAfterDelete as { items: ID[] }[])[0].items.length, 0, "Should have 0 items after deletion", stepMessage, ++checkIndex);

    const poDetailsAfterDelete = await catalog._getPurchaseOptionDetails({ purchaseOption: purchaseOptionToDelete });
    assertAndLog("error" in poDetailsAfterDelete, true, "Purchase option should not exist after item deletion", stepMessage, ++checkIndex);
    assertAndLog((poDetailsAfterDelete as { error: string }).error, `PurchaseOption with ID "${purchaseOptionToDelete}" not found.`, "Correct error message for deleted PO", stepMessage, ++checkIndex);
  });

  await t.step("3. Failure to delete a non-existent item", async () => {
    const stepMessage = "3. Failure to delete a non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentId = "nonExistentItem" as ID;
    const result = await catalog.deleteItem({ item: nonExistentId });
    assertAndLog("error" in result, true, "Should return an error for non-existent item", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Item with ID "${nonExistentId}" not found.`, "Correct error message should be returned", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: addPurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let newItemId: ID;
  await t.step("1. Setup: Create an item", async () => {
    const stepMessage = "1. Setup: Create an item";
    printStepHeader(stepMessage);
    const createResult = await catalog.createItem({ primaryName: "Pasta" });
    newItemId = (createResult as { item: ID }).item;
    assertExistsAndLog(newItemId, "Item should be created", stepMessage, 0);
  });

  await t.step("2. Successful addition of a purchase option", async () => {
    const stepMessage = "2. Successful addition of a purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog.addPurchaseOption({
      item: newItemId,
      quantity: 1.0,
      units: "box",
      price: 2.00,
      store: "Grocery Store",
    });
    assertAndLog("purchaseOption" in result, true, "Result should contain purchase option ID", stepMessage, ++checkIndex);
    const poId = (result as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(poId, "Purchase option ID should be generated", stepMessage, ++checkIndex);

    const poDetails = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog("error" in poDetails, false, "Purchase option details should be retrievable", stepMessage, ++checkIndex);
    assertAndLog((poDetails as any)[0].quantity, 1.0, "Quantity should be correct", stepMessage, ++checkIndex);
    assertAndLog((poDetails as any)[0].store, "Grocery Store", "Store should be correct", stepMessage, ++checkIndex);
    assertAndLog((poDetails as any)[0].confirmed, false, "Purchase option should be unconfirmed by default", stepMessage, ++checkIndex);

    const itemOptions = await catalog._getItemPurchaseOptions({ item: newItemId });
    assertAndLog((itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.includes(poId), true, "Item should list the new purchase option", stepMessage, ++checkIndex);
  });

  await t.step("3. Failure to add purchase option for non-existent item", async () => {
    const stepMessage = "3. Failure to add purchase option for non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const result = await catalog.addPurchaseOption({
      item: nonExistentItem,
      quantity: 1,
      units: "unit",
      price: 1,
      store: "Any",
    });
    assertAndLog("error" in result, true, "Should return an error for non-existent item", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Item with ID "${nonExistentItem}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("4. Failure to add purchase option with invalid quantity or price", async () => {
    const stepMessage = "4. Failure to add purchase option with invalid quantity or price";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const invalidQtyResult = await catalog.addPurchaseOption({
      item: newItemId,
      quantity: 0,
      units: "unit",
      price: 1,
      store: "Any",
    });
    assertAndLog("error" in invalidQtyResult, true, "Should return error for quantity <= 0", stepMessage, ++checkIndex);
    assertAndLog((invalidQtyResult as { error: string }).error, "Quantity must be greater than 0.", "Correct error message for quantity", stepMessage, ++checkIndex);

    const invalidPriceResult = await catalog.addPurchaseOption({
      item: newItemId,
      quantity: 1,
      units: "unit",
      price: -1,
      store: "Any",
    });
    assertAndLog("error" in invalidPriceResult, true, "Should return error for price < 0", stepMessage, ++checkIndex);
    assertAndLog((invalidPriceResult as { error: string }).error, "Price cannot be negative.", "Correct error message for price", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: updatePurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemId: ID;
  let poId: ID;

  await t.step("1. Setup: Create item and purchase option", async () => {
    const stepMessage = "1. Setup: Create item and purchase option";
    printStepHeader(stepMessage);
    const createItemResult = await catalog.createItem({ primaryName: "Bread" });
    itemId = (createItemResult as { item: ID }).item;
    const addPOResult = await catalog.addPurchaseOption({
      item: itemId,
      quantity: 1,
      units: "loaf",
      price: 2.50,
      store: "Bakery",
    });
    poId = (addPOResult as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(poId, "Purchase option should be created", stepMessage, 0);
  });

  await t.step("2. Update quantity", async () => {
    const stepMessage = "2. Update quantity";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({ purchaseOption: poId, quantity: 2 });
    assertAndLog("error" in updateResult, false, "Quantity update should succeed", stepMessage, ++checkIndex);

    const details = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog((details as any)[0].quantity, 2, "Quantity should be updated", stepMessage, ++checkIndex);
  });

  await t.step("3. Update units", async () => {
    const stepMessage = "3. Update units";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({ purchaseOption: poId, units: "slices" });
    assertAndLog("error" in updateResult, false, "Units update should succeed", stepMessage, ++checkIndex);

    const details = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog((details as any)[0].units, "slices", "Units should be updated", stepMessage, ++checkIndex);
  });

  await t.step("4. Update price", async () => {
    const stepMessage = "4. Update price";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({ purchaseOption: poId, price: 3.00 });
    assertAndLog("error" in updateResult, false, "Price update should succeed", stepMessage, ++checkIndex);

    const details = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog((details as any)[0].price, 3.00, "Price should be updated", stepMessage, ++checkIndex);
  });

  await t.step("5. Update store", async () => {
    const stepMessage = "5. Update store";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({ purchaseOption: poId, store: "Supermarket" });
    assertAndLog("error" in updateResult, false, "Store update should succeed", stepMessage, ++checkIndex);

    const details = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog((details as any)[0].store, "Supermarket", "Store should be updated", stepMessage, ++checkIndex);
  });

  await t.step("6. Update atomicOrder (custom action)", async () => {
    const stepMessage = "6. Update atomicOrder (custom action)";
    printStepHeader(stepMessage);
    let checkIndex = 0;
    const atomicOrderId = "testAtomicOrder123" as ID;

    const updateResult = await catalog.addPurchaseOptionOrder({ purchaseOption: poId, atomicOrder: atomicOrderId });
    assertAndLog("error" in updateResult, false, "AtomicOrder update should succeed", stepMessage, ++checkIndex);

    const poDoc = await catalog.purchaseOptions.findOne({ _id: poId });
    assertAndLog(poDoc?.atomicOrderId, atomicOrderId, "atomicOrderId should be updated", stepMessage, ++checkIndex);
  });

  await t.step("7. Failure to update non-existent purchase option", async () => {
    const stepMessage = "7. Failure to update non-existent purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentPO = "nonExistentPO" as ID;
    const result = await catalog.updatePurchaseOption({ purchaseOption: nonExistentPO, price: 10 });
    assertAndLog("error" in result, true, "Should return an error for non-existent purchase option", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `PurchaseOption with ID "${nonExistentPO}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("8. Failure to update with invalid quantity or price", async () => {
    const stepMessage = "8. Failure to update with invalid quantity or price";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const invalidQtyResult = await catalog.updatePurchaseOption({ purchaseOption: poId, quantity: 0 });
    assertAndLog("error" in invalidQtyResult, true, "Should return error for quantity <= 0", stepMessage, ++checkIndex);
    assertAndLog((invalidQtyResult as { error: string }).error, "Quantity must be greater than 0.", "Correct error message for quantity", stepMessage, ++checkIndex);

    const invalidPriceResult = await catalog.updatePurchaseOption({ purchaseOption: poId, price: -5.0 });
    assertAndLog("error" in invalidPriceResult, true, "Should return error for price < 0", stepMessage, ++checkIndex);
    assertAndLog((invalidPriceResult as { error: string }).error, "Price cannot be negative.", "Correct error message for price", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: removePurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemId: ID;
  let poId1: ID;
  let poId2: ID;

  await t.step("1. Setup: Create item and two purchase options", async () => {
    const stepMessage = "1. Setup: Create item and two purchase options";
    printStepHeader(stepMessage);
    const createItemResult = await catalog.createItem({ primaryName: "Cheese" });
    itemId = (createItemResult as { item: ID }).item;

    const addPOResult1 = await catalog.addPurchaseOption({ item: itemId, quantity: 1, units: "block", price: 5, store: "Dairy" });
    poId1 = (addPOResult1 as { purchaseOption: ID }).purchaseOption;

    const addPOResult2 = await catalog.addPurchaseOption({ item: itemId, quantity: 2, units: "slices", price: 3, store: "Deli" });
    poId2 = (addPOResult2 as { purchaseOption: ID }).purchaseOption;

    const itemOptions = await catalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog((itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.length, 2, "Item should have two purchase options initially", stepMessage, 0);
  });

  await t.step("2. Successful removal of a purchase option", async () => {
    const stepMessage = "2. Successful removal of a purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const removeResult = await catalog.removePurchaseOption({ item: itemId, purchaseOption: poId1 });
    assertAndLog("error" in removeResult, false, "Removal should not return an error", stepMessage, ++checkIndex);

    const itemOptions = await catalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog((itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.length, 1, "Item should have one purchase option after removal", stepMessage, ++checkIndex);
    assertAndLog((itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.includes(poId1), false, "Removed PO should not be in item's options", stepMessage, ++checkIndex);
    assertAndLog((itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.includes(poId2), true, "Other PO should still be present", stepMessage, ++checkIndex);

    const poDetails = await catalog._getPurchaseOptionDetails({ purchaseOption: poId1 });
    assertAndLog("error" in poDetails, true, "Removed purchase option should not exist", stepMessage, ++checkIndex);
    assertAndLog((poDetails as { error: string }).error, `PurchaseOption with ID "${poId1}" not found.`, "Correct error for non-existent PO", stepMessage, ++checkIndex);
  });

  await t.step("3. Failure to remove purchase option from non-existent item", async () => {
    const stepMessage = "3. Failure to remove purchase option from non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const result = await catalog.removePurchaseOption({ item: nonExistentItem, purchaseOption: poId2 });
    assertAndLog("error" in result, true, "Should return an error for non-existent item", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Item with ID "${nonExistentItem}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("4. Failure to remove non-existent purchase option from existing item", async () => {
    const stepMessage = "4. Failure to remove non-existent purchase option from existing item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentPO = "nonExistentPO" as ID;
    const result = await catalog.removePurchaseOption({ item: itemId, purchaseOption: nonExistentPO });
    assertAndLog("error" in result, true, "Should return an error for non-existent PO", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `PurchaseOption with ID "${nonExistentPO}" not found or not associated with Item "${itemId}".`, "Correct error message", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: addItemName and removeItemName", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemId: ID;

  await t.step("1. Setup: Create item with a primary name", async () => {
    const stepMessage = "1. Setup: Create item with a primary name";
    printStepHeader(stepMessage);
    const createResult = await catalog.createItem({ primaryName: "Tomato" });
    itemId = (createResult as { item: ID }).item;
    const names = await catalog._getItemNames({ item: itemId });
    assertAndLog((names as { names: string[] }[])[0].names, ["Tomato"], "Item should start with one name", stepMessage, 0);
  });

  await t.step("2. Successful addition of an alias", async () => {
    const stepMessage = "2. Successful addition of an alias";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const addAliasResult = await catalog.addItemName({ item: itemId, name: "Roma Tomato" });
    assertAndLog("error" in addAliasResult, false, "Adding alias should not return an error", stepMessage, ++checkIndex);

    const names = await catalog._getItemNames({ item: itemId });
    const currentNames = (names as { names: string[] }[])[0].names;
    assertAndLog(currentNames.length, 2, "Item should now have two names", stepMessage, ++checkIndex);
    assertAndLog(currentNames.includes("Tomato"), true, "'Tomato' should still be present", stepMessage, ++checkIndex);
    assertAndLog(currentNames.includes("Roma Tomato"), true, "'Roma Tomato' should be added", stepMessage, ++checkIndex);
  });

  await t.step("3. Failure to add existing alias", async () => {
    const stepMessage = "3. Failure to add existing alias";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog.addItemName({ item: itemId, name: "Tomato" });
    assertAndLog("error" in result, true, "Should return an error for existing alias", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Name "Tomato" is already an alias for Item "${itemId}".`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("4. Failure to add alias for non-existent item", async () => {
    const stepMessage = "4. Failure to add alias for non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const result = await catalog.addItemName({ item: nonExistentItem, name: "Cherry Tomato" });
    assertAndLog("error" in result, true, "Should return an error for non-existent item", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Item with ID "${nonExistentItem}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("5. Successful removal of an alias", async () => {
    const stepMessage = "5. Successful removal of an alias";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const removeAliasResult = await catalog.removeItemName({ item: itemId, name: "Roma Tomato" });
    assertAndLog("error" in removeAliasResult, false, "Removing alias should not return an error", stepMessage, ++checkIndex);

    const names = await catalog._getItemNames({ item: itemId });
    const currentNames = (names as { names: string[] }[])[0].names;
    assertAndLog(currentNames.length, 1, "Item should now have one name", stepMessage, ++checkIndex);
    assertAndLog(currentNames.includes("Tomato"), true, "'Tomato' should still be present", stepMessage, ++checkIndex);
    assertAndLog(currentNames.includes("Roma Tomato"), false, "'Roma Tomato' should be removed", stepMessage, ++checkIndex);
  });

  await t.step("6. Failure to remove non-existent alias", async () => {
    const stepMessage = "6. Failure to remove non-existent alias";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog.removeItemName({ item: itemId, name: "Cherry Tomato" });
    assertAndLog("error" in result, true, "Should return an error for non-existent alias", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Name "Cherry Tomato" is not an alias for Item "${itemId}".`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("7. Failure to remove the only name of an item", async () => {
    const stepMessage = "7. Failure to remove the only name of an item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog.removeItemName({ item: itemId, name: "Tomato" });
    assertAndLog("error" in result, true, "Should return an error for removing the only name", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Cannot remove the only name for Item "${itemId}".`, "Correct error message", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: confirmPurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemId: ID;
  let poId: ID;

  await t.step("1. Setup: Create item and purchase option", async () => {
    const stepMessage = "1. Setup: Create item and purchase option";
    printStepHeader(stepMessage);
    const createItemResult = await catalog.createItem({ primaryName: "Eggs" });
    itemId = (createItemResult as { item: ID }).item;
    const addPOResult = await catalog.addPurchaseOption({
      item: itemId,
      quantity: 12,
      units: "count",
      price: 4.99,
      store: "Farm Stand",
    });
    poId = (addPOResult as { purchaseOption: ID }).purchaseOption;

    const details = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog((details as any)[0].confirmed, false, "Purchase option should start unconfirmed", stepMessage, 0);
  });

  await t.step("2. Successful confirmation of purchase option", async () => {
    const stepMessage = "2. Successful confirmation of purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const confirmResult = await catalog.confirmPurchaseOption({ purchaseOption: poId });
    assertAndLog("error" in confirmResult, false, "Confirmation should not return an error", stepMessage, ++checkIndex);

    const details = await catalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog((details as any)[0].confirmed, true, "Purchase option should now be confirmed", stepMessage, ++checkIndex);
  });

  await t.step("3. Failure to confirm an already confirmed purchase option", async () => {
    const stepMessage = "3. Failure to confirm an already confirmed purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog.confirmPurchaseOption({ purchaseOption: poId });
    assertAndLog("error" in result, true, "Should return an error for already confirmed PO", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `PurchaseOption with ID "${poId}" is already confirmed.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await t.step("4. Failure to confirm non-existent purchase option", async () => {
    const stepMessage = "4. Failure to confirm non-existent purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentPO = "nonExistentPO" as ID;
    const result = await catalog.confirmPurchaseOption({ purchaseOption: nonExistentPO });
    assertAndLog("error" in result, true, "Should return an error for non-existent PO", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `PurchaseOption with ID "${nonExistentPO}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemByName", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let orangeId: ID;

  await t.step("1. Setup: Create items with various names/aliases", async () => {
    const stepMessage = "1. Setup: Create items with various names/aliases";
    printStepHeader(stepMessage);
    const createOrange = await catalog.createItem({ primaryName: "Orange" });
    orangeId = (createOrange as { item: ID }).item;
    await catalog.addItemName({ item: orangeId, name: "Navel Orange" });

    await catalog.createItem({ primaryName: "Apple" });
    console.log("    Created 'Orange' (aliases: 'Navel Orange') and 'Apple'");
  });

  await t.step("2. Query by primary name", async () => {
    const stepMessage = "2. Query by primary name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByName({ name: "Orange" });
    assertAndLog("error" in result, false, "Query for 'Orange' should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as { item: ID }[]).length, 1, "Should find one item", stepMessage, ++checkIndex);
    assertAndLog((result as { item: ID }[])[0].item, orangeId, "Should return the correct item ID", stepMessage, ++checkIndex);
  });

  await t.step("3. Query by alias", async () => {
    const stepMessage = "3. Query by alias";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByName({ name: "Navel Orange" });
    assertAndLog("error" in result, false, "Query for 'Navel Orange' should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as { item: ID }[]).length, 1, "Should find one item by alias", stepMessage, ++checkIndex);
    assertAndLog((result as { item: ID }[])[0].item, orangeId, "Should return the correct item ID for alias", stepMessage, ++checkIndex);
  });

  await t.step("4. Query for non-existent name", async () => {
    const stepMessage = "4. Query for non-existent name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByName({ name: "Banana" });
    assertAndLog("error" in result, true, "Query for non-existent name should return an error", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `Item with name "Banana" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemByPurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let carrotItemId: ID;
  let carrotPOId: ID;

  await t.step("1. Setup: Create item and purchase option", async () => {
    const stepMessage = "1. Setup: Create item and purchase option";
    printStepHeader(stepMessage);
    const createCarrot = await catalog.createItem({ primaryName: "Carrot" });
    carrotItemId = (createCarrot as { item: ID }).item;
    const addPO = await catalog.addPurchaseOption({
      item: carrotItemId,
      quantity: 1,
      units: "bag",
      price: 2.00,
      store: "Farmers Market",
    });
    carrotPOId = (addPO as { purchaseOption: ID }).purchaseOption;
    console.log(`    Created Item: ${carrotItemId}, PurchaseOption: ${carrotPOId}`);
  });

  await t.step("2. Query by existing purchase option", async () => {
    const stepMessage = "2. Query by existing purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByPurchaseOption({ purchaseOption: carrotPOId });
    assertAndLog("error" in result, false, "Query for item by PO should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as { item: ID }[]).length, 1, "Should find one item", stepMessage, ++checkIndex);
    assertAndLog((result as { item: ID }[])[0].item, carrotItemId, "Should return the correct item ID", stepMessage, ++checkIndex);
  });

  await t.step("3. Query by non-existent purchase option", async () => {
    const stepMessage = "3. Query by non-existent purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentPO = "nonExistentPO" as ID;
    const result = await catalog._getItemByPurchaseOption({ purchaseOption: nonExistentPO });
    assertAndLog("error" in result, true, "Query for non-existent PO should return an error", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `PurchaseOption with ID "${nonExistentPO}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemNames and _getItemPurchaseOptions", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let peachId: ID;
  let peachPO1: ID;
  let peachPO2: ID;

  await t.step("1. Setup: Create item with names and purchase options", async () => {
    const stepMessage = "1. Setup: Create item with names and purchase options";
    printStepHeader(stepMessage);
    const createPeach = await catalog.createItem({ primaryName: "Peach" });
    peachId = (createPeach as { item: ID }).item;
    await catalog.addItemName({ item: peachId, name: "Nectarine" });

    const addPO1 = await catalog.addPurchaseOption({ item: peachId, quantity: 1, units: "lb", price: 2.00, store: "Market" });
    peachPO1 = (addPO1 as { purchaseOption: ID }).purchaseOption;
    const addPO2 = await catalog.addPurchaseOption({ item: peachId, quantity: 0.5, units: "kg", price: 3.50, store: "Organic" });
    peachPO2 = (addPO2 as { purchaseOption: ID }).purchaseOption;
    console.log(`    Created Item: ${peachId} with two names and two POs: ${peachPO1}, ${peachPO2}`);
  });

  await t.step("2. Query item names", async () => {
    const stepMessage = "2. Query item names";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemNames({ item: peachId });
    assertAndLog("error" in result, false, "Query for names should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as { names: string[] }[]).length, 1, "Should return one set of names", stepMessage, ++checkIndex);
    assertAndLog(JSON.stringify((result as { names: string[] }[])[0].names.sort()), JSON.stringify(["Nectarine", "Peach"].sort()), "Should return all item names", stepMessage, ++checkIndex);
  });

  await t.step("3. Query item purchase options", async () => {
    const stepMessage = "3. Query item purchase options";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemPurchaseOptions({ item: peachId });
    assertAndLog("error" in result, false, "Query for purchase options should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as { purchaseOptions: ID[] }[]).length, 1, "Should return one set of purchase options", stepMessage, ++checkIndex);
    assertAndLog(JSON.stringify((result as { purchaseOptions: ID[] }[])[0].purchaseOptions.sort()), JSON.stringify([peachPO1, peachPO2].sort()), "Should return all item purchase options", stepMessage, ++checkIndex);
  });

  await t.step("4. Query names/PO for non-existent item", async () => {
    const stepMessage = "4. Query names/PO for non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const namesResult = await catalog._getItemNames({ item: nonExistentItem });
    assertAndLog("error" in namesResult, true, "Names query for non-existent item should error", stepMessage, ++checkIndex);
    assertAndLog((namesResult as { error: string }).error, `Item with ID "${nonExistentItem}" not found.`, "Correct error message for names", stepMessage, ++checkIndex);

    const poResult = await catalog._getItemPurchaseOptions({ item: nonExistentItem });
    assertAndLog("error" in poResult, true, "PO query for non-existent item should error", stepMessage, ++checkIndex);
    assertAndLog((poResult as { error: string }).error, `Item with ID "${nonExistentItem}" not found.`, "Correct error message for POs", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getPurchaseOptionDetails", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let salmonItemId: ID;
  let salmonPOId: ID;

  await t.step("1. Setup: Create item and purchase option", async () => {
    const stepMessage = "1. Setup: Create item and purchase option";
    printStepHeader(stepMessage);
    const createSalmon = await catalog.createItem({ primaryName: "Salmon" });
    salmonItemId = (createSalmon as { item: ID }).item;
    const addPO = await catalog.addPurchaseOption({
      item: salmonItemId,
      quantity: 1.5,
      units: "lb",
      price: 15.99,
      store: "Fish Market",
    });
    salmonPOId = (addPO as { purchaseOption: ID }).purchaseOption;
    console.log(`    Created Item: ${salmonItemId}, PurchaseOption: ${salmonPOId}`);
  });

  await t.step("2. Query purchase option details", async () => {
    const stepMessage = "2. Query purchase option details";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getPurchaseOptionDetails({ purchaseOption: salmonPOId });
    assertAndLog("error" in result, false, "Query for details should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as any[]).length, 1, "Should return one set of details", stepMessage, ++checkIndex);
    const details = (result as any[])[0];
    assertAndLog(details.quantity, 1.5, "Quantity should be correct", stepMessage, ++checkIndex);
    assertAndLog(details.units, "lb", "Units should be correct", stepMessage, ++checkIndex);
    assertAndLog(details.price, 15.99, "Price should be correct", stepMessage, ++checkIndex);
    assertAndLog(details.store, "Fish Market", "Store should be correct", stepMessage, ++checkIndex);
    assertAndLog(details.confirmed, false, "Confirmed status should be false", stepMessage, ++checkIndex);
  });

  await t.step("3. Query details for non-existent purchase option", async () => {
    const stepMessage = "3. Query details for non-existent purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentPO = "nonExistentPO" as ID;
    const result = await catalog._getPurchaseOptionDetails({ purchaseOption: nonExistentPO });
    assertAndLog("error" in result, true, "Query for non-existent PO details should error", stepMessage, ++checkIndex);
    assertAndLog((result as { error: string }).error, `PurchaseOption with ID "${nonExistentPO}" not found.`, "Correct error message", stepMessage, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getAllItems", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let item1: ID, item2: ID;

  await t.step("1. Setup: Create multiple items", async () => {
    const stepMessage = "1. Setup: Create multiple items";
    printStepHeader(stepMessage);
    const createItem1 = await catalog.createItem({ primaryName: "Rice" });
    item1 = (createItem1 as { item: ID }).item;
    const createItem2 = await catalog.createItem({ primaryName: "Beans" });
    item2 = (createItem2 as { item: ID }).item;
    console.log(`    Created Item 1: ${item1}, Item 2: ${item2}`);
  });

  await t.step("2. Query all items", async () => {
    const stepMessage = "2. Query all items";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getAllItems({});
    assertAndLog("error" in result, false, "Query for all items should succeed", stepMessage, ++checkIndex);
    assertAndLog((result as { items: ID[] }[]).length, 1, "Should return one array of items", stepMessage, ++checkIndex);
    const allItems = (result as { items: ID[] }[])[0].items;
    assertAndLog(allItems.length, 2, "Should return two items", stepMessage, ++checkIndex);
    assertAndLog(allItems.includes(item1), true, "Should include Item 1", stepMessage, ++checkIndex);
    assertAndLog(allItems.includes(item2), true, "Should include Item 2", stepMessage, ++checkIndex);
  });

  await t.step("3. Query all items when no items exist", async () => {
    const stepMessage = "3. Query all items when no items exist";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    await catalog.deleteItem({ item: item1 });
    await catalog.deleteItem({ item: item2 });

    const result = await catalog._getAllItems({});
    assertAndLog("error" in result, false, "Query for all items should succeed even if empty", stepMessage, ++checkIndex);
    assertAndLog((result as { items: ID[] }[]).length, 1, "Should return one array of items", stepMessage, ++checkIndex);
    const allItems = (result as { items: ID[] }[])[0].items;
    assertAndLog(allItems.length, 0, "Should return an empty array if no items exist", stepMessage, ++checkIndex);
  });

  await client.close();
});

```
