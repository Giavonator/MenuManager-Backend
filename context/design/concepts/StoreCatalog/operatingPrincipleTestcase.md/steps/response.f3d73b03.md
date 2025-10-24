---
timestamp: 'Thu Oct 23 2025 19:13:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_191359.eff0a9f6.md]]'
content_id: f3d73b0354ea9f36b52f5fd6a58b8a099b2bfac51efeec623cbee3d013c530ce
---

# response:

Here's the test file `src/concepts/StoreCatalog/StoreCatalogConcept.test.ts` which includes a comprehensive test case for the principle, along with additional tests for various actions and error conditions to ensure robust behavior.

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
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

// Helper function to assert existence and log results
function assertExistsAndLog<T>(
  actual: T,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  try {
    assertExists(actual, message);
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

Deno.test("StoreCatalog - Operating Principle", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let groundPepperItemId: ID;
  let sproutsPurchaseOptionId: ID;
  let traderJoesPurchaseOptionId: ID;

  await t.step(
    "1. Admin creates a new item: 'ground pepper'",
    async () => {
      const stepMessage = "1. Admin creates a new item: 'ground pepper'";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const createItemResult = await storeCatalog.createItem({
        primaryName: "ground pepper",
      });
      assertAndLog(
        "item" in createItemResult,
        true,
        "Item creation should succeed",
        stepMessage,
        ++checkIndex,
      );
      groundPepperItemId = (createItemResult as { item: ID }).item;
      assertExistsAndLog(
        groundPepperItemId,
        "Item ID should be returned",
        stepMessage,
        ++checkIndex,
      );

      const getItemResult = await storeCatalog._getItemByName({
        name: "ground pepper",
      });
      assertAndLog(
        "error" in getItemResult,
        false,
        "Query for item by primary name should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        getItemResult[0].item,
        groundPepperItemId,
        "Retrieved item ID should match created item ID",
        stepMessage,
        ++checkIndex,
      );

      const itemNamesResult = await storeCatalog._getItemNames({
        item: groundPepperItemId,
      });
      assertAndLog(
        "error" in itemNamesResult,
        false,
        "Query for item names should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        itemNamesResult[0].names,
        ["ground pepper"],
        "Item should initially have only the primary name",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "2. Admin adds multiple purchase options for 'ground pepper'",
    async () => {
      const stepMessage =
        "2. Admin adds multiple purchase options for 'ground pepper'";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // Add first purchase option (Sprout's)
      const addSproutsPO = await storeCatalog.addPurchaseOption({
        item: groundPepperItemId,
        quantity: 3.0,
        units: "lbs",
        price: 5.99,
        store: "Sprout's",
      });
      assertAndLog(
        "purchaseOption" in addSproutsPO,
        true,
        "Adding Sprout's purchase option should succeed",
        stepMessage,
        ++checkIndex,
      );
      sproutsPurchaseOptionId = (addSproutsPO as { purchaseOption: ID })
        .purchaseOption;
      assertExistsAndLog(
        sproutsPurchaseOptionId,
        "Sprout's purchase option ID should be returned",
        stepMessage,
        ++checkIndex,
      );

      // Add second purchase option (Trader Joe's)
      const addTraderJoesPO = await storeCatalog.addPurchaseOption({
        item: groundPepperItemId,
        quantity: 1.0,
        units: "lb",
        price: 2.50,
        store: "Trader Joe's",
      });
      assertAndLog(
        "purchaseOption" in addTraderJoesPO,
        true,
        "Adding Trader Joe's purchase option should succeed",
        stepMessage,
        ++checkIndex,
      );
      traderJoesPurchaseOptionId = (addTraderJoesPO as { purchaseOption: ID })
        .purchaseOption;
      assertExistsAndLog(
        traderJoesPurchaseOptionId,
        "Trader Joe's purchase option ID should be returned",
        stepMessage,
        ++checkIndex,
      );

      // Verify item has both purchase options
      const itemPOsResult = await storeCatalog._getItemPurchaseOptions({
        item: groundPepperItemId,
      });
      assertAndLog(
        "error" in itemPOsResult,
        false,
        "Query for item purchase options should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        itemPOsResult[0].purchaseOptions.length,
        2,
        "Item should have 2 purchase options",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        itemPOsResult[0].purchaseOptions.includes(sproutsPurchaseOptionId) &&
          itemPOsResult[0].purchaseOptions.includes(traderJoesPurchaseOptionId),
        true,
        "Item's purchase options should include both created options",
        stepMessage,
        ++checkIndex,
      );

      // Verify details and initial unconfirmed status for Sprout's PO
      const sproutsDetails = await storeCatalog._getPurchaseOptionDetails({
        purchaseOption: sproutsPurchaseOptionId,
      });
      assertAndLog(
        "error" in sproutsDetails,
        false,
        "Query for Sprout's PO details should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        sproutsDetails[0].quantity,
        3.0,
        "Sprout's quantity should be 3.0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        sproutsDetails[0].confirmed,
        false,
        "Sprout's PO should initially be unconfirmed",
        stepMessage,
        ++checkIndex,
      );

      // Verify details and initial unconfirmed status for Trader Joe's PO
      const traderJoesDetails = await storeCatalog._getPurchaseOptionDetails({
        purchaseOption: traderJoesPurchaseOptionId,
      });
      assertAndLog(
        "error" in traderJoesDetails,
        false,
        "Query for Trader Joe's PO details should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        traderJoesDetails[0].quantity,
        1.0,
        "Trader Joe's quantity should be 1.0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        traderJoesDetails[0].confirmed,
        false,
        "Trader Joe's PO should initially be unconfirmed",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "3. Admin adds an alias name 'pepper' to the item",
    async () => {
      const stepMessage = "3. Admin adds an alias name 'pepper' to the item";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const addAliasResult = await storeCatalog.addItemName({
        item: groundPepperItemId,
        name: "pepper",
      });
      assertAndLog(
        "error" in addAliasResult,
        false,
        "Adding alias name should succeed",
        stepMessage,
        ++checkIndex,
      );

      // Verify item names now include the alias
      const itemNamesResult = await storeCatalog._getItemNames({
        item: groundPepperItemId,
      });
      assertAndLog(
        "error" in itemNamesResult,
        false,
        "Query for item names after adding alias should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertEquals(
        itemNamesResult[0].names.sort(),
        ["ground pepper", "pepper"].sort(),
        "Item names should include both primary and alias names",
      );
      console.log(`    ✅ Check ${++checkIndex}: Item names include alias`);

      // Verify item can be retrieved by the new alias
      const getItemByAliasResult = await storeCatalog._getItemByName({
        name: "pepper",
      });
      assertAndLog(
        "error" in getItemByAliasResult,
        false,
        "Query for item by alias name should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        getItemByAliasResult[0].item,
        groundPepperItemId,
        "Retrieved item ID by alias should match created item ID",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. Admin confirms one of the purchase options",
    async () => {
      const stepMessage = "4. Admin confirms one of the purchase options";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const confirmPOResult = await storeCatalog.confirmPurchaseOption({
        purchaseOption: sproutsPurchaseOptionId,
      });
      assertAndLog(
        "error" in confirmPOResult,
        false,
        "Confirming Sprout's purchase option should succeed",
        stepMessage,
        ++checkIndex,
      );

      // Verify Sprout's PO is now confirmed
      const sproutsDetails = await storeCatalog._getPurchaseOptionDetails({
        purchaseOption: sproutsPurchaseOptionId,
      });
      assertAndLog(
        "error" in sproutsDetails,
        false,
        "Query for Sprout's PO details after confirmation should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        sproutsDetails[0].confirmed,
        true,
        "Sprout's PO should now be confirmed",
        stepMessage,
        ++checkIndex,
      );

      // Verify Trader Joe's PO remains unconfirmed
      const traderJoesDetails = await storeCatalog._getPurchaseOptionDetails({
        purchaseOption: traderJoesPurchaseOptionId,
      });
      assertAndLog(
        "error" in traderJoesDetails,
        false,
        "Query for Trader Joe's PO details should succeed",
        stepIndex,
        ++checkIndex,
      );
      assertAndLog(
        traderJoesDetails[0].confirmed,
        false,
        "Trader Joe's PO should remain unconfirmed",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("5. Verify _getAllItems query", async () => {
    const stepMessage = "5. Verify _getAllItems query";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const allItemsResult = await storeCatalog._getAllItems({});
    assertAndLog(
      "error" in allItemsResult,
      false,
      "Query for all items should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      allItemsResult[0].items.length,
      1,
      "Should be 1 item in the catalog",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      allItemsResult[0].items[0],
      groundPepperItemId,
      "The item in the catalog should be 'ground pepper'",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: createItem (Error Cases)", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  const stepMessage = "createItem error cases";

  await t.step("1. Create an item successfully first", async () => {
    printStepHeader("1. Create an item successfully first");
    const createResult = await storeCatalog.createItem({
      primaryName: "Apple",
    });
    assertAndLog(
      "item" in createResult,
      true,
      "Initial item creation should succeed",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Attempt to create an item with a duplicate primary name",
    async () => {
      printStepHeader("2. Attempt to create an item with a duplicate primary name");
      const duplicateCreateResult = await storeCatalog.createItem({
        primaryName: "Apple",
      });
      assertAndLog(
        "error" in duplicateCreateResult,
        true,
        "Duplicate item creation should return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (duplicateCreateResult as { error: string }).error,
        'An item with the name "Apple" already exists.',
        "Error message for duplicate item name should be correct",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("StoreCatalog - Action: deleteItem", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;
  let poId1: ID;
  let poId2: ID;

  await t.step("1. Setup: Create item and purchase options", async () => {
    printStepHeader("1. Setup: Create item and purchase options");
    const createItemResult = await storeCatalog.createItem({
      primaryName: "Banana",
    });
    itemId = (createItemResult as { item: ID }).item;
    assertExistsAndLog(itemId, "Item should be created", t.name, ++checkIndex);

    const addPo1Result = await storeCatalog.addPurchaseOption({
      item: itemId,
      quantity: 1.0,
      units: "count",
      price: 0.79,
      store: "Local Grocer",
    });
    poId1 = (addPo1Result as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(poId1, "PO1 should be created", t.name, ++checkIndex);

    const addPo2Result = await storeCatalog.addPurchaseOption({
      item: itemId,
      quantity: 2.0,
      units: "count",
      price: 1.29,
      store: "Another Store",
    });
    poId2 = (addPo2Result as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(poId2, "PO2 should be created", t.name, ++checkIndex);

    const itemDetails = await storeCatalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog(itemDetails[0].purchaseOptions.length, 2, "Item should have 2 POs", t.name, ++checkIndex);
  });

  await t.step("2. Delete the item and verify cascading deletion", async () => {
    printStepHeader("2. Delete the item and verify cascading deletion");
    const deleteResult = await storeCatalog.deleteItem({ item: itemId });
    assertAndLog(
      "error" in deleteResult,
      false,
      "Item deletion should succeed",
      t.name,
      ++checkIndex,
    );

    // Verify item is no longer retrievable
    const getItemResult = await storeCatalog._getItemByName({ name: "Banana" });
    assertAndLog(
      "error" in getItemResult,
      true,
      "Deleted item should not be found",
      t.name,
      ++checkIndex,
    );

    // Verify associated purchase options are also deleted
    const getPo1Result = await storeCatalog._getPurchaseOptionDetails({
      purchaseOption: poId1,
    });
    assertAndLog(
      "error" in getPo1Result,
      true,
      "Deleted PO1 should not be found",
      t.name,
      ++checkIndex,
    );

    const getPo2Result = await storeCatalog._getPurchaseOptionDetails({
      purchaseOption: poId2,
    });
    assertAndLog(
      "error" in getPo2Result,
      true,
      "Deleted PO2 should not be found",
      t.name,
      ++checkIndex,
    );
  });

  await t.step("3. Attempt to delete a non-existent item", async () => {
    printStepHeader("3. Attempt to delete a non-existent item");
    const nonExistentId = "nonExistentItem" as ID;
    const deleteResult = await storeCatalog.deleteItem({ item: nonExistentId });
    assertAndLog(
      "error" in deleteResult,
      true,
      "Deleting non-existent item should return an error",
      t.name,
      ++checkIndex,
    );
    assertAndLog(
      (deleteResult as { error: string }).error,
      `Item with ID "${nonExistentId}" not found.`,
      "Error message for non-existent item deletion should be correct",
      t.name,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: addPurchaseOption (Error Cases)", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;

  await t.step("1. Setup: Create an item", async () => {
    printStepHeader("1. Setup: Create an item");
    const createItemResult = await storeCatalog.createItem({
      primaryName: "Milk",
    });
    itemId = (createItemResult as { item: ID }).item;
    assertExistsAndLog(itemId, "Item should be created", t.name, ++checkIndex);
  });

  await t.step(
    "2. Attempt to add purchase option for non-existent item",
    async () => {
      printStepHeader("2. Attempt to add purchase option for non-existent item");
      const nonExistentItem = "nonExistentItem" as ID;
      const addPoResult = await storeCatalog.addPurchaseOption({
        item: nonExistentItem,
        quantity: 1.0,
        units: "gallon",
        price: 3.50,
        store: "Dairy Mart",
      });
      assertAndLog(
        "error" in addPoResult,
        true,
        "Adding PO to non-existent item should return error",
        t.name,
        ++checkIndex,
      );
      assertAndLog(
        (addPoResult as { error: string }).error,
        `Item with ID "${nonExistentItem}" not found.`,
        "Error message for non-existent item should be correct",
        t.name,
        ++checkIndex,
      );
    },
  );

  await t.step("3. Attempt to add purchase option with invalid quantity", async () => {
    printStepHeader("3. Attempt to add purchase option with invalid quantity");
    const addPoResult = await storeCatalog.addPurchaseOption({
      item: itemId,
      quantity: 0, // Invalid quantity
      units: "gallon",
      price: 3.50,
      store: "Dairy Mart",
    });
    assertAndLog(
      "error" in addPoResult,
      true,
      "Adding PO with invalid quantity should return error",
      t.name,
      ++checkIndex,
    );
    assertAndLog(
      (addPoResult as { error: string }).error,
      "Quantity must be greater than 0.",
      "Error message for invalid quantity should be correct",
      t.name,
      ++checkIndex,
    );
  });

  await t.step("4. Attempt to add purchase option with negative price", async () => {
    printStepHeader("4. Attempt to add purchase option with negative price");
    const addPoResult = await storeCatalog.addPurchaseOption({
      item: itemId,
      quantity: 1.0,
      units: "gallon",
      price: -1.00, // Invalid price
      store: "Dairy Mart",
    });
    assertAndLog(
      "error" in addPoResult,
      true,
      "Adding PO with negative price should return error",
      t.name,
      ++checkIndex,
    );
    assertAndLog(
      (addPoResult as { error: string }).error,
      "Price cannot be negative.",
      "Error message for negative price should be correct",
      t.name,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: updatePurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;
  let poId: ID;

  await t.step("1. Setup: Create item and purchase option", async () => {
    printStepHeader("1. Setup: Create item and purchase option");
    const createItemResult = await storeCatalog.createItem({
      primaryName: "Bread",
    });
    itemId = (createItemResult as { item: ID }).item;

    const addPoResult = await storeCatalog.addPurchaseOption({
      item: itemId,
      quantity: 1.0,
      units: "loaf",
      price: 2.99,
      store: "Bakery",
    });
    poId = (addPoResult as { purchaseOption: ID }).purchaseOption;

    assertExistsAndLog(itemId, "Item created", t.name, ++checkIndex);
    assertExistsAndLog(poId, "PO created", t.name, ++checkIndex);
  });

  await t.step("2. Update quantity", async () => {
    printStepHeader("2. Update quantity");
    const updateResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: poId,
      quantity: 2.0,
    });
    assertAndLog(
      "error" in updateResult,
      false,
      "Quantity update should succeed",
      t.name,
      ++checkIndex,
    );
    const details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog(details[0].quantity, 2.0, "Quantity should be updated", t.name, ++checkIndex);
  });

  await t.step("3. Update units", async () => {
    printStepHeader("3. Update units");
    const updateResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: poId,
      units: "baguette",
    });
    assertAndLog(
      "error" in updateResult,
      false,
      "Units update should succeed",
      t.name,
      ++checkIndex,
    );
    const details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog(details[0].units, "baguette", "Units should be updated", t.name, ++checkIndex);
  });

  await t.step("4. Update price", async () => {
    printStepHeader("4. Update price");
    const updateResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: poId,
      price: 3.50,
    });
    assertAndLog(
      "error" in updateResult,
      false,
      "Price update should succeed",
      t.name,
      ++checkIndex,
    );
    const details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog(details[0].price, 3.50, "Price should be updated", t.name, ++checkIndex);
  });

  await t.step("5. Update store", async () => {
    printStepHeader("5. Update store");
    const updateResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: poId,
      store: "Supermarket",
    });
    assertAndLog(
      "error" in updateResult,
      false,
      "Store update should succeed",
      t.name,
      ++checkIndex,
    );
    const details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog(details[0].store, "Supermarket", "Store should be updated", t.name, ++checkIndex);
  });

  await t.step("6. Update atomicOrder (custom action)", async () => {
    printStepHeader("6. Update atomicOrder");
    const atomicOrderId = "order123" as ID;
    const updateResult = await storeCatalog.addPurchaseOptionOrder({
      purchaseOption: poId,
      atomicOrder: atomicOrderId,
    });
    assertAndLog(
      "error" in updateResult,
      false,
      "AtomicOrder update should succeed",
      t.name,
      ++checkIndex,
    );
    const poDoc = await storeCatalog.purchaseOptions.findOne({ _id: poId });
    assertExistsAndLog(poDoc, "PO document should exist", t.name, ++checkIndex);
    assertAndLog(poDoc?.atomicOrderId, atomicOrderId, "AtomicOrder ID should be updated", t.name, ++checkIndex);
  });

  await t.step("7. Attempt to update non-existent purchase option", async () => {
    printStepHeader("7. Attempt to update non-existent purchase option");
    const nonExistentPoId = "nonExistentPo" as ID;
    const updateResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: nonExistentPoId,
      quantity: 5.0,
    });
    assertAndLog(
      "error" in updateResult,
      true,
      "Updating non-existent PO should return error",
      t.name,
      ++checkIndex,
    );
    assertAndLog(
      (updateResult as { error: string }).error,
      `PurchaseOption with ID "${nonExistentPoId}" not found.`,
      "Error message for non-existent PO should be correct",
      t.name,
      ++checkIndex,
    );
  });

  await t.step("8. Attempt to update with invalid values", async () => {
    printStepHeader("8. Attempt to update with invalid values");
    const invalidQuantityResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: poId,
      quantity: 0,
    });
    assertAndLog(
      "error" in invalidQuantityResult,
      true,
      "Updating with invalid quantity should return error",
      t.name,
      ++checkIndex,
    );
    assertAndLog(
      (invalidQuantityResult as { error: string }).error,
      "Quantity must be greater than 0.",
      "Error message for invalid quantity update should be correct",
      t.name,
      ++checkIndex,
    );

    const invalidPriceResult = await storeCatalog.updatePurchaseOption({
      purchaseOption: poId,
      price: -10.0,
    });
    assertAndLog(
      "error" in invalidPriceResult,
      true,
      "Updating with invalid price should return error",
      t.name,
      ++checkIndex,
    );
    assertAndLog(
      (invalidPriceResult as { error: string }).error,
      "Price cannot be negative.",
      "Error message for invalid price update should be correct",
      t.name,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: removePurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;
  let poId1: ID;
  let poId2: ID;

  await t.step("1. Setup: Create item and multiple purchase options", async () => {
    printStepHeader("1. Setup: Create item and multiple purchase options");
    const createItemResult = await storeCatalog.createItem({ primaryName: "Cheese" });
    itemId = (createItemResult as { item: ID }).item;
    const addPo1Result = await storeCatalog.addPurchaseOption({ item: itemId, quantity: 1.0, units: "lb", price: 5.00, store: "Market" });
    poId1 = (addPo1Result as { purchaseOption: ID }).purchaseOption;
    const addPo2Result = await storeCatalog.addPurchaseOption({ item: itemId, quantity: 0.5, units: "lb", price: 3.00, store: "Deli" });
    poId2 = (addPo2Result as { purchaseOption: ID }).purchaseOption;

    const itemPOs = await storeCatalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog(itemPOs[0].purchaseOptions.length, 2, "Item should have 2 POs initially", t.name, ++checkIndex);
  });

  await t.step("2. Remove one purchase option", async () => {
    printStepHeader("2. Remove one purchase option");
    const removeResult = await storeCatalog.removePurchaseOption({ item: itemId, purchaseOption: poId1 });
    assertAndLog("error" in removeResult, false, "Removing PO1 should succeed", t.name, ++checkIndex);

    const itemPOs = await storeCatalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog(itemPOs[0].purchaseOptions.length, 1, "Item should have 1 PO remaining", t.name, ++checkIndex);
    assertAndLog(itemPOs[0].purchaseOptions[0], poId2, "Remaining PO should be PO2", t.name, ++checkIndex);

    const po1Details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId1 });
    assertAndLog("error" in po1Details, true, "PO1 should no longer be found", t.name, ++checkIndex);
  });

  await t.step("3. Attempt to remove a non-existent purchase option", async () => {
    printStepHeader("3. Attempt to remove a non-existent purchase option");
    const nonExistentPoId = "nonExistentPO" as ID;
    const removeResult = await storeCatalog.removePurchaseOption({ item: itemId, purchaseOption: nonExistentPoId });
    assertAndLog("error" in removeResult, true, "Removing non-existent PO should fail", t.name, ++checkIndex);
    assertAndLog((removeResult as {error:string}).error, `PurchaseOption with ID "${nonExistentPoId}" not found or not associated with Item "${itemId}".`, "Error message for non-existent PO should be correct", t.name, ++checkIndex);
  });

  await t.step("4. Attempt to remove purchase option from wrong item", async () => {
    printStepHeader("4. Attempt to remove purchase option from wrong item");
    const createOtherItemResult = await storeCatalog.createItem({ primaryName: "Other Item" });
    const otherItemId = (createOtherItemResult as { item: ID }).item;
    const removeResult = await storeCatalog.removePurchaseOption({ item: otherItemId, purchaseOption: poId2 });
    assertAndLog("error" in removeResult, true, "Removing PO from wrong item should fail", t.name, ++checkIndex);
    assertAndLog((removeResult as {error:string}).error, `PurchaseOption with ID "${poId2}" not found or not associated with Item "${otherItemId}".`, "Error message for wrong item PO should be correct", t.name, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: addItemName & removeItemName", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;

  await t.step("1. Setup: Create an item with primary name", async () => {
    printStepHeader("1. Setup: Create an item with primary name");
    const createItemResult = await storeCatalog.createItem({ primaryName: "Carrot" });
    itemId = (createItemResult as { item: ID }).item;
    assertAndLog("error" in createItemResult, false, "Item created", t.name, ++checkIndex);

    const namesResult = await storeCatalog._getItemNames({ item: itemId });
    assertAndLog(namesResult[0].names, ["Carrot"], "Initial name is Carrot", t.name, ++checkIndex);
  });

  await t.step("2. Add a new alias name", async () => {
    printStepHeader("2. Add a new alias name");
    const addNameResult = await storeCatalog.addItemName({ item: itemId, name: "Baby Carrot" });
    assertAndLog("error" in addNameResult, false, "Adding alias should succeed", t.name, ++checkIndex);

    const namesResult = await storeCatalog._getItemNames({ item: itemId });
    assertEquals(namesResult[0].names.sort(), ["Carrot", "Baby Carrot"].sort(), "Names should include alias",);
    console.log(`    ✅ Check ${++checkIndex}: Names include alias`);
  });

  await t.step("3. Attempt to add a duplicate alias name", async () => {
    printStepHeader("3. Attempt to add a duplicate alias name");
    const duplicateAddResult = await storeCatalog.addItemName({ item: itemId, name: "Carrot" });
    assertAndLog("error" in duplicateAddResult, true, "Adding duplicate alias should fail", t.name, ++checkIndex);
    assertAndLog((duplicateAddResult as {error:string}).error, `Name "Carrot" is already an alias for Item "${itemId}".`, "Error message for duplicate alias", t.name, ++checkIndex);
  });

  await t.step("4. Remove an alias name", async () => {
    printStepHeader("4. Remove an alias name");
    const removeAliasResult = await storeCatalog.removeItemName({ item: itemId, name: "Baby Carrot" });
    assertAndLog("error" in removeAliasResult, false, "Removing alias should succeed", t.name, ++checkIndex);

    const namesResult = await storeCatalog._getItemNames({ item: itemId });
    assertAndLog(namesResult[0].names, ["Carrot"], "Alias should be removed", t.name, ++checkIndex);
  });

  await t.step("5. Attempt to remove the only remaining name", async () => {
    printStepHeader("5. Attempt to remove the only remaining name");
    const removeOnlyNameResult = await storeCatalog.removeItemName({ item: itemId, name: "Carrot" });
    assertAndLog("error" in removeOnlyNameResult, true, "Removing only name should fail", t.name, ++checkIndex);
    assertAndLog((removeOnlyNameResult as {error:string}).error, `Cannot remove the only name for Item "${itemId}".`, "Error message for removing only name", t.name, ++checkIndex);
  });

  await t.step("6. Error cases for non-existent item/name", async () => {
    printStepHeader("6. Error cases for non-existent item/name");
    const nonExistentItem = "nonExistentItem" as ID;
    const addNameNonExistentItem = await storeCatalog.addItemName({ item: nonExistentItem, name: "New Name" });
    assertAndLog("error" in addNameNonExistentItem, true, "Adding name to non-existent item should fail", t.name, ++checkIndex);

    const removeNameNonExistentItem = await storeCatalog.removeItemName({ item: nonExistentItem, name: "Some Name" });
    assertAndLog("error" in removeNameNonExistentItem, true, "Removing name from non-existent item should fail", t.name, ++checkIndex);

    const removeNonExistentName = await storeCatalog.removeItemName({ item: itemId, name: "NonExistent" });
    assertAndLog("error" in removeNonExistentName, true, "Removing non-existent name should fail", t.name, ++checkIndex);
    assertAndLog((removeNonExistentName as {error:string}).error, `Name "NonExistent" is not an alias for Item "${itemId}".`, "Error message for removing non-existent name", t.name, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Action: confirmPurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;
  let poId: ID;

  await t.step("1. Setup: Create item and unconfirmed purchase option", async () => {
    printStepHeader("1. Setup: Create item and unconfirmed purchase option");
    const createItemResult = await storeCatalog.createItem({ primaryName: "Fish" });
    itemId = (createItemResult as { item: ID }).item;
    const addPoResult = await storeCatalog.addPurchaseOption({ item: itemId, quantity: 1.0, units: "fillet", price: 10.00, store: "Fishery" });
    poId = (addPoResult as { purchaseOption: ID }).purchaseOption;

    const details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog(details[0].confirmed, false, "PO initially unconfirmed", t.name, ++checkIndex);
  });

  await t.step("2. Confirm the purchase option", async () => {
    printStepHeader("2. Confirm the purchase option");
    const confirmResult = await storeCatalog.confirmPurchaseOption({ purchaseOption: poId });
    assertAndLog("error" in confirmResult, false, "Confirmation should succeed", t.name, ++checkIndex);

    const details = await storeCatalog._getPurchaseOptionDetails({ purchaseOption: poId });
    assertAndLog(details[0].confirmed, true, "PO should now be confirmed", t.name, ++checkIndex);
  });

  await t.step("3. Attempt to confirm an already confirmed purchase option", async () => {
    printStepHeader("3. Attempt to confirm an already confirmed purchase option");
    const reConfirmResult = await storeCatalog.confirmPurchaseOption({ purchaseOption: poId });
    assertAndLog("error" in reConfirmResult, true, "Re-confirming should fail", t.name, ++checkIndex);
    assertAndLog((reConfirmResult as {error:string}).error, `PurchaseOption with ID "${poId}" is already confirmed.`, "Error message for already confirmed PO", t.name, ++checkIndex);
  });

  await t.step("4. Attempt to confirm a non-existent purchase option", async () => {
    printStepHeader("4. Attempt to confirm a non-existent purchase option");
    const nonExistentPoId = "nonExistentPO" as ID;
    const confirmNonExistentResult = await storeCatalog.confirmPurchaseOption({ purchaseOption: nonExistentPoId });
    assertAndLog("error" in confirmNonExistentResult, true, "Confirming non-existent PO should fail", t.name, ++checkIndex);
    assertAndLog((confirmNonExistentResult as {error:string}).error, `PurchaseOption with ID "${nonExistentPoId}" not found.`, "Error message for non-existent PO", t.name, ++checkIndex);
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemByPurchaseOption", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId1: ID;
  let poId1: ID;
  let poId2: ID;

  await t.step("1. Setup: Create two items and purchase options", async () => {
    printStepHeader("1. Setup: Create two items and purchase options");
    const createItem1Result = await storeCatalog.createItem({ primaryName: "Apple" });
    itemId1 = (createItem1Result as { item: ID }).item;
    const addPo1Result = await storeCatalog.addPurchaseOption({ item: itemId1, quantity: 1.0, units: "count", price: 1.00, store: "A" });
    poId1 = (addPo1Result as { purchaseOption: ID }).purchaseOption;
    const addPo2Result = await storeCatalog.addPurchaseOption({ item: itemId1, quantity: 2.0, units: "count", price: 1.50, store: "B" });
    poId2 = (addPo2Result as { purchaseOption: ID }).purchaseOption;

    assertExistsAndLog(itemId1, "Item 1 created", t.name, ++checkIndex);
    assertExistsAndLog(poId1, "PO 1 created", t.name, ++checkIndex);
    assertExistsAndLog(poId2, "PO 2 created", t.name, ++checkIndex);
  });

  await t.step("2. Query item by purchase option", async () => {
    printStepHeader("2. Query item by purchase option");
    const queryResult1 = await storeCatalog._getItemByPurchaseOption({ purchaseOption: poId1 });
    assertAndLog("error" in queryResult1, false, "Query for item by PO1 should succeed", t.name, ++checkIndex);
    assertAndLog(queryResult1[0].item, itemId1, "Item retrieved by PO1 should match itemId1", t.name, ++checkIndex);

    const queryResult2 = await storeCatalog._getItemByPurchaseOption({ purchaseOption: poId2 });
    assertAndLog("error" in queryResult2, false, "Query for item by PO2 should succeed", t.name, ++checkIndex);
    assertAndLog(queryResult2[0].item, itemId1, "Item retrieved by PO2 should match itemId1", t.name, ++checkIndex);
  });

  await t.step("3. Query item by non-existent purchase option", async () => {
    printStepHeader("3. Query item by non-existent purchase option");
    const nonExistentPoId = "nonExistentPO" as ID;
    const queryResult = await storeCatalog._getItemByPurchaseOption({ purchaseOption: nonExistentPoId });
    assertAndLog("error" in queryResult, true, "Query by non-existent PO should fail", t.name, ++checkIndex);
    assertAndLog((queryResult as {error:string}).error, `PurchaseOption with ID "${nonExistentPoId}" not found.`, "Error message for non-existent PO should be correct", t.name, ++checkIndex);
  });

  await client.close();
});

// Added test for addItemOrder (custom action)
Deno.test("StoreCatalog - Action: addItemOrder", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const storeCatalog = new StoreCatalogConcept(db);

  let checkIndex = 0;
  let itemId: ID;
  const selectOrderId = "selectOrderABC" as ID;

  await t.step("1. Setup: Create an item", async () => {
    printStepHeader("1. Setup: Create an item");
    const createItemResult = await storeCatalog.createItem({ primaryName: "Laptop" });
    itemId = (createItemResult as { item: ID }).item;
    assertExistsAndLog(itemId, "Item created", t.name, ++checkIndex);
  });

  await t.step("2. Add a selectOrder to the item", async () => {
    printStepHeader("2. Add a selectOrder to the item");
    const addOrderResult = await storeCatalog.addItemOrder({ item: itemId, selectOrder: selectOrderId });
    assertAndLog("error" in addOrderResult, false, "Adding selectOrder should succeed", t.name, ++checkIndex);

    const itemDoc = await storeCatalog.items.findOne({ _id: itemId });
    assertExistsAndLog(itemDoc, "Item document should exist", t.name, ++checkIndex);
    assertAndLog(itemDoc?.selectOrderId, selectOrderId, "selectOrderId should be set", t.name, ++checkIndex);
  });

  await t.step("3. Attempt to add a selectOrder to a non-existent item", async () => {
    printStepHeader("3. Attempt to add a selectOrder to a non-existent item");
    const nonExistentItemId = "nonExistentItem" as ID;
    const addOrderResult = await storeCatalog.addItemOrder({ item: nonExistentItemId, selectOrder: selectOrderId });
    assertAndLog("error" in addOrderResult, true, "Adding selectOrder to non-existent item should fail", t.name, ++checkIndex);
    assertAndLog((addOrderResult as {error:string}).error, `Item with ID "${nonExistentItemId}" not found.`, "Error message for non-existent item should be correct", t.name, ++checkIndex);
  });

  await client.close();
});
```
