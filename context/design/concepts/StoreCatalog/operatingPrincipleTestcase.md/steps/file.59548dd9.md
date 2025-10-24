---
timestamp: 'Thu Oct 23 2025 18:19:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_181941.7235e35d.md]]'
content_id: 59548dd9def8ab19a8c81ae50e05e8d13a97a5f88580403e1399bf5e30f175cf
---

# file: src/concepts/StoreCatalog/StoreCatalogConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import StoreCatalogConcept from "./StoreCatalogConcept.ts";

// Helper function to print a Deno test header
function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

// Helper function to print a test step header
function printStepHeader(stepMessage: string) {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
}

// Helper for assertions with logging
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
    console.error(`      Error in "${stepMessage}": ${e.message}`);
    throw e; // Re-throw the error so Deno.test still registers it as a failure
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

    const allItems = await catalogConcept._getAllItems();
    assertAndLog(
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
    assertAndLog(
      "item" in createResult,
      true,
      "createItem should return an item ID",
      stepMessage,
      ++checkIndex,
    );
    groundPepperItem = (createResult as { item: ID }).item;
    assertExists(groundPepperItem, "Item ID should be defined");
    console.log(`  New Item ID: ${groundPepperItem}`);

    // **Verification with Queries**
    // _getItemByName (name: String): (item: Item)
    console.log(`  Calling _getItemByName({ name: "ground pepper" })`);
    const itemByNameResult = await catalogConcept._getItemByName({
      name: "ground pepper",
    });
    assertAndLog(
      itemByNameResult.length,
      1,
      "Should find 1 item by name 'ground pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      itemByNameResult[0].item,
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
    assertAndLog(
      itemNamesResult.length,
      1,
      "Should get names for the item",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      itemNamesResult[0].names,
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
    assertAndLog(
      itemPurchaseOptionsResult[0].purchaseOptions.length,
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
    assertAndLog(
      "error" in duplicateCreateResult,
      true,
      "Creating item with existing name should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (duplicateCreateResult as { error: string }).error,
      `An item with the name "ground pepper" already exists.`,
      "Error message for duplicate item name is correct",
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
    assertAndLog(
      "purchaseOption" in po1Result,
      true,
      "addPurchaseOption for Sprout's should return a purchaseOption ID",
      stepMessage,
      ++checkIndex,
    );
    poSprouts = (po1Result as { purchaseOption: ID }).purchaseOption;
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
    assertAndLog(
      "purchaseOption" in po2Result,
      true,
      "addPurchaseOption for Trader Joe's should return a purchaseOption ID",
      stepMessage,
      ++checkIndex,
    );
    poTraderJoes = (po2Result as { purchaseOption: ID }).purchaseOption;
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
    const itemPurchaseOptionsAfterAdd = await catalogConcept
      ._getItemPurchaseOptions(
        { item: groundPepperItem },
      );
    assertAndLog(
      itemPurchaseOptionsAfterAdd[0].purchaseOptions.length,
      2,
      "Item should now have 2 purchase options",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      itemPurchaseOptionsAfterAdd[0].purchaseOptions.includes(poSprouts) &&
        itemPurchaseOptionsAfterAdd[0].purchaseOptions.includes(poTraderJoes),
      true,
      "Both purchase options should be linked to the item",
      stepMessage,
      ++checkIndex,
    );

    // _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poSprouts} })`,
    );
    const po1Details = await catalogConcept._getPurchaseOptionDetails({
      purchaseOption: poSprouts,
    });
    assertAndLog(
      po1Details[0].store,
      "Sprout's",
      "Sprout's PO store is correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      po1Details[0].confirmed,
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
    assertAndLog(
      "error" in invalidQuantityResult,
      true,
      "Adding PO with quantity <= 0 should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (invalidQuantityResult as { error: string }).error,
      "Quantity must be greater than 0.",
      "Error message for invalid quantity is correct",
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
    assertAndLog(
      "error" in addAliasResult,
      false,
      "Adding new alias 'pepper' should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getItemNames
    console.log(`  Calling _getItemNames({ item: ${groundPepperItem} })`);
    const itemNamesAfterAlias = await catalogConcept._getItemNames({
      item: groundPepperItem,
    });
    assertAndLog(
      itemNamesAfterAlias[0].names.includes("pepper"),
      true,
      "Item names should now include 'pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      itemNamesAfterAlias[0].names.includes("ground pepper"),
      true,
      "Item names should still include 'ground pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      itemNamesAfterAlias[0].names.length,
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
    assertAndLog(
      itemByAliasResult[0].item,
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
    assertAndLog(
      "error" in duplicateAliasResult,
      true,
      "Adding existing alias should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (duplicateAliasResult as { error: string }).error,
      `Name "pepper" is already an alias for Item "${groundPepperItem}".`,
      "Error message for duplicate alias is correct",
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
    assertAndLog(
      "error" in confirmResult,
      false,
      "Confirming purchase option should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getPurchaseOptionDetails
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poSprouts} })`,
    );
    const po1DetailsAfterConfirm = await catalogConcept
      ._getPurchaseOptionDetails(
        { purchaseOption: poSprouts },
      );
    assertAndLog(
      po1DetailsAfterConfirm[0].confirmed,
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
    assertAndLog(
      "error" in reconfirmResult,
      true,
      "Re-confirming an already confirmed PO should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (reconfirmResult as { error: string }).error,
      `PurchaseOption with ID "${poSprouts}" is already confirmed.`,
      "Error message for re-confirming PO is correct",
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
    const updateQuantityUnitsResult = await catalogConcept.updatePurchaseOption(
      {
        purchaseOption: poTraderJoes,
        quantity: 2.0,
      },
    );
    assertAndLog(
      "error" in updateQuantityUnitsResult,
      false,
      "Updating quantity should succeed",
      stepMessage,
      ++checkIndex,
    );
    const updateUnitsResult = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      units: "oz",
    });
    assertAndLog(
      "error" in updateUnitsResult,
      false,
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
    assertAndLog(
      "error" in updatePriceResult,
      false,
      "Updating price should succeed",
      stepMessage,
      ++checkIndex,
    );
    const updateStoreResult = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      store: "Whole Foods",
    });
    assertAndLog(
      "error" in updateStoreResult,
      false,
      "Updating store should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poTraderJoes} })`,
    );
    const po2DetailsAfterUpdate = await catalogConcept
      ._getPurchaseOptionDetails(
        { purchaseOption: poTraderJoes },
      );
    assertAndLog(
      po2DetailsAfterUpdate[0].quantity,
      2.0,
      "Quantity updated to 2.0",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      po2DetailsAfterUpdate[0].units,
      "oz",
      "Units updated to 'oz'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      po2DetailsAfterUpdate[0].price,
      3.00,
      "Price updated to 3.00",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      po2DetailsAfterUpdate[0].store,
      "Whole Foods",
      "Store updated to 'Whole Foods'",
      stepMessage,
      ++checkIndex,
    );

    // **Test requires: invalid quantity/price updates**
    console.log(`  Attempting to update PO with invalid quantity (0)`);
    const invalidUpdateQuantity = await catalogConcept.updatePurchaseOption({
      purchaseOption: poTraderJoes,
      quantity: 0,
    });
    assertAndLog(
      "error" in invalidUpdateQuantity,
      true,
      "Updating with quantity <= 0 should error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (invalidUpdateQuantity as { error: string }).error,
      "Quantity must be greater than 0.",
      "Error message for invalid quantity update is correct",
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
    assertAndLog(
      "error" in addPOOrderResult,
      false,
      "addPurchaseOptionOrder should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification** (direct collection access for optional fields not in public queries)
    const poSproutsDoc = await catalogConcept.purchaseOptions.findOne({
      _id: poSprouts,
    });
    assertExists(poSproutsDoc, "PurchaseOption doc should exist");
    assertAndLog(
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
    assertAndLog(
      "error" in addItemOrderResult,
      false,
      "addItemOrder should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification** (direct collection access for optional fields not in public queries)
    const itemDoc = await catalogConcept.items.findOne({
      _id: groundPepperItem,
    });
    assertExists(itemDoc, "Item doc should exist");
    assertAndLog(
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
    assertAndLog(
      "error" in removeAliasResult,
      false,
      "Removing alias 'pepper' should succeed",
      stepMessage,
      ++checkIndex,
    );

    // **Verification with Queries**
    // _getItemNames
    console.log(`  Calling _getItemNames({ item: ${groundPepperItem} })`);
    const itemNamesAfterRemove = await catalogConcept._getItemNames({
      item: groundPepperItem,
    });
    assertAndLog(
      itemNamesAfterRemove[0].names.includes("pepper"),
      false,
      "Item names should no longer include 'pepper'",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      itemNamesAfterRemove[0].names,
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
    assertAndLog(
      "error" in removeLastNameResult,
      true,
      "Removing the only name should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (removeLastNameResult as { error: string }).error,
      `Cannot remove the only name for Item "${groundPepperItem}".`,
      "Error message for removing only name is correct",
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
      assertAndLog(
        "error" in removePOResult,
        false,
        "Removing purchase option should succeed",
        stepMessage,
        ++checkIndex,
      );

      // **Verification with Queries**
      // _getItemPurchaseOptions
      console.log(
        `  Calling _getItemPurchaseOptions({ item: ${groundPepperItem} })`,
      );
      const itemPurchaseOptionsAfterRemove = await catalogConcept
        ._getItemPurchaseOptions(
          { item: groundPepperItem },
        );
      assertAndLog(
        itemPurchaseOptionsAfterRemove[0].purchaseOptions.length,
        1,
        "Item should now have 1 purchase option remaining",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        itemPurchaseOptionsAfterRemove[0].purchaseOptions.includes(
          poTraderJoes,
        ),
        false,
        "Trader Joe's/Whole Foods PO should no longer be linked to the item",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        itemPurchaseOptionsAfterRemove[0].purchaseOptions.includes(poSprouts),
        true,
        "Sprout's PO should still be linked to the item",
        stepMessage,
        ++checkIndex,
      );

      // _getPurchaseOptionDetails (for the removed PO)
      console.log(
        `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poTraderJoes} })`,
      );
      const removedPODetails = await catalogConcept._getPurchaseOptionDetails({
        purchaseOption: poTraderJoes,
      });
      assertAndLog(
        "error" in removedPODetails[0],
        true,
        "Querying details of a removed PO should return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (removedPODetails[0] as { error: string }).error,
        `PurchaseOption with ID "${poTraderJoes}" not found.`,
        "Error message for removed PO is correct",
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
    assertAndLog(
      "error" in deleteItemResult,
      false,
      "Deleting the item should succeed",
    );

    // **Verification with Queries**
    // _getAllItems
    console.log(`  Calling _getAllItems()`);
    const allItemsAfterDelete = await catalogConcept._getAllItems();
    assertAndLog(
      allItemsAfterDelete[0].items.length,
      0,
      "Catalog should be empty after deleting the item",
      stepMessage,
      ++checkIndex,
    );

    // _getItemByName (original name)
    console.log(`  Calling _getItemByName({ name: "ground pepper" })`);
    const itemByNameAfterDelete = await catalogConcept._getItemByName({
      name: "ground pepper",
    });
    assertAndLog(
      "error" in itemByNameAfterDelete[0],
      true,
      "Querying deleted item by name should return an error",
      stepMessage,
      ++checkIndex,
    );

    // _getPurchaseOptionDetails (remaining PO)
    console.log(
      `  Calling _getPurchaseOptionDetails({ purchaseOption: ${poSprouts} })`,
    );
    const remainingPODetails = await catalogConcept._getPurchaseOptionDetails({
      purchaseOption: poSprouts,
    });
    assertAndLog(
      "error" in remainingPODetails[0],
      true,
      "Querying details of associated PO (Sprout's) after item deletion should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (remainingPODetails[0] as { error: string }).error,
      `PurchaseOption with ID "${poSprouts}" not found.`,
      "Error message for deleted associated PO is correct",
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
    assertAndLog(
      "error" in deleteNonExistentResult,
      true,
      "Deleting a non-existent item should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (deleteNonExistentResult as { error: string }).error,
      `Item with ID "${nonExistentItem}" not found.`,
      "Error message for deleting non-existent item is correct",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

```

Error: Property 'item' does not exist on type '{ item: ID; } | { error: string; }'.
Property 'item' does not exist on type '{ error: string; }
