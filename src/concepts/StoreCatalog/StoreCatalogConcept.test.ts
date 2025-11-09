import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import StoreCatalogConcept from "./StoreCatalogConcept.ts";
import {
  assertAndLog,
  assertExistsAndLog,
  printStepHeader,
  printTestHeader,
} from "../../utils/testing.ts";

Deno.test("StoreCatalog - Principle Fulfillment", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let groundPepperItem: ID;
  let sproutsOption: ID;
  let traderJoesOption: ID;

  await t.step(
    "1. Administrator creates a new ingredient 'ground pepper'",
    async () => {
      const stepMessage =
        "1. Administrator creates a new ingredient 'ground pepper'";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const createResult = await catalog.createItem({
        primaryName: "ground pepper",
      });
      assertAndLog(
        "item" in createResult,
        true,
        "Item 'ground pepper' should be created",
        stepMessage,
        ++checkIndex,
      );
      groundPepperItem = (createResult as { item: ID }).item;
      assertExistsAndLog(
        groundPepperItem,
        "Created item ID should exist",
        stepMessage,
        ++checkIndex,
      );

      const queryResult = await catalog._getItemByName({
        name: "ground pepper",
      });
      assertAndLog(
        "error" in queryResult,
        false,
        "Query for 'ground pepper' should not return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (queryResult as { item: ID }[]).length,
        1,
        "Should find one item by name",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (queryResult as { item: ID }[])[0].item,
        groundPepperItem,
        "Queried item should match created item",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "2. Add multiple PurchaseOptions for 'ground pepper'",
    async () => {
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
      assertAndLog(
        "purchaseOption" in addSproutsResult,
        true,
        "Sprout's option should be added",
        stepMessage,
        ++checkIndex,
      );
      sproutsOption =
        (addSproutsResult as { purchaseOption: ID }).purchaseOption;
      assertExistsAndLog(
        sproutsOption,
        "Sprout's purchase option ID should exist",
        stepMessage,
        ++checkIndex,
      );

      // Trader Joe's option
      const addTraderJoesResult = await catalog.addPurchaseOption({
        item: groundPepperItem,
        quantity: 1.0,
        units: "lb",
        price: 2.50,
        store: "Trader Joe's",
      });
      assertAndLog(
        "purchaseOption" in addTraderJoesResult,
        true,
        "Trader Joe's option should be added",
        stepMessage,
        ++checkIndex,
      );
      traderJoesOption =
        (addTraderJoesResult as { purchaseOption: ID }).purchaseOption;
      assertExistsAndLog(
        traderJoesOption,
        "Trader Joe's purchase option ID should exist",
        stepMessage,
        ++checkIndex,
      );

      // Verify item has purchase options
      const itemOptionsQuery = await catalog._getItemPurchaseOptions({
        item: groundPepperItem,
      });
      assertAndLog(
        "error" in itemOptionsQuery,
        false,
        "Query for item purchase options should not error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (itemOptionsQuery as { purchaseOptions: ID[] }[]).length,
        1,
        "Should find purchase options for the item",
        stepMessage,
        ++checkIndex,
      );
      const itemOptions =
        (itemOptionsQuery as { purchaseOptions: ID[] }[])[0].purchaseOptions;
      assertAndLog(
        itemOptions.includes(sproutsOption),
        true,
        "Item should list Sprout's option",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        itemOptions.includes(traderJoesOption),
        true,
        "Item should list Trader Joe's option",
        stepMessage,
        ++checkIndex,
      );

      // Verify details of one option
      const sproutsDetails = await catalog._getPurchaseOptionDetails({
        purchaseOption: sproutsOption,
      });
      assertAndLog(
        "error" in sproutsDetails,
        false,
        "Query for Sprout's option details should not error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (sproutsDetails as any)[0].quantity,
        3.0,
        "Sprout's quantity should be 3.0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (sproutsDetails as any)[0].store,
        "Sprout's",
        "Sprout's store should be correct",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (sproutsDetails as any)[0].confirmed,
        false,
        "Sprout's option should initially be unconfirmed",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("3. Update item name from 'ground pepper' to 'pepper'", async () => {
    const stepMessage = "3. Update item name from 'ground pepper' to 'pepper'";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateNameResult = await catalog.updateItemName({
      item: groundPepperItem,
      name: "pepper",
    });
    assertAndLog(
      "success" in updateNameResult,
      true,
      "Updating item name to 'pepper' should succeed",
      stepMessage,
      ++checkIndex,
    );

    // Verify item can be found by new name
    const queryByNameResult = await catalog._getItemByName({ name: "pepper" });
    assertAndLog(
      "error" in queryByNameResult,
      false,
      "Query by name 'pepper' should not return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (queryByNameResult as { item: ID }[])[0].item,
      groundPepperItem,
      "Queried item by name should match",
      stepMessage,
      ++checkIndex,
    );

    // Verify old name no longer works
    const queryByOldNameResult = await catalog._getItemByName({
      name: "ground pepper",
    });
    assertAndLog(
      "error" in queryByOldNameResult,
      true,
      "Query by old name 'ground pepper' should return an error",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Confirm one of the PurchaseOptions", async () => {
    const stepMessage = "4. Confirm one of the PurchaseOptions";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const confirmResult = await catalog.confirmPurchaseOption({
      purchaseOption: sproutsOption,
    });
    assertAndLog(
      "success" in confirmResult,
      true,
      "Confirming Sprout's option should succeed",
      stepMessage,
      ++checkIndex,
    );

    const sproutsDetailsAfterConfirm = await catalog._getPurchaseOptionDetails({
      purchaseOption: sproutsOption,
    });
    assertAndLog(
      "error" in sproutsDetailsAfterConfirm,
      false,
      "Query for Sprout's option details after confirm should not error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (sproutsDetailsAfterConfirm as any)[0].confirmed,
      true,
      "Sprout's option should now be confirmed",
      stepMessage,
      ++checkIndex,
    );

    // Ensure the other option is still unconfirmed
    const traderJoesDetails = await catalog._getPurchaseOptionDetails({
      purchaseOption: traderJoesOption,
    });
    assertAndLog(
      (traderJoesDetails as any)[0].confirmed,
      false,
      "Trader Joe's option should still be unconfirmed",
      stepMessage,
      ++checkIndex,
    );
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
    assertAndLog(
      "item" in result,
      true,
      "Result should contain item ID",
      stepMessage,
      ++checkIndex,
    );
    const itemId = (result as { item: ID }).item;
    assertExistsAndLog(
      itemId,
      "Item ID should be generated",
      stepMessage,
      ++checkIndex,
    );

    const itemByName = await catalog._getItemByName({ name: "Flour" });
    assertAndLog(
      "error" in itemByName,
      false,
      "Item should be findable by name",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (itemByName as { item: ID }[])[0].item,
      itemId,
      "Item should have 'Flour' as its name",
      stepMessage,
      ++checkIndex,
    );

    const itemOptions = await catalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog(
      "purchaseOptions" in (itemOptions as any)[0],
      true,
      "Item purchase options should be retrievable",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.length,
      0,
      "New item should have no purchase options",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Failure to create item with existing primary name",
    async () => {
      const stepMessage =
        "2. Failure to create item with existing primary name";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      await catalog.createItem({ primaryName: "Sugar" }); // Create once
      const result = await catalog.createItem({ primaryName: "Sugar" }); // Attempt to create again
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for duplicate name",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `An item with the name "Sugar" already exists.`,
        "Correct error message should be returned",
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
    purchaseOptionToDelete =
      (addPOResult as { purchaseOption: ID }).purchaseOption;

    const items = await catalog._getAllItems({});
    assertAndLog(
      (items as { items: ID[] }[])[0].items.length,
      1,
      "Should have 1 item before deletion",
      stepMessage,
      ++checkIndex,
    );
    const poDetails = await catalog._getPurchaseOptionDetails({
      purchaseOption: purchaseOptionToDelete,
    });
    assertAndLog(
      "error" in poDetails,
      false,
      "Purchase option should exist before deletion",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Successful deletion of an item and its purchase options",
    async () => {
      const stepMessage =
        "2. Successful deletion of an item and its purchase options";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const deleteResult = await catalog.deleteItem({ item: itemToDelete });
      assertAndLog(
        "success" in deleteResult,
        true,
        "Deletion should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (deleteResult as { success: true }).success,
        true,
        "Successful deletion returns success: true",
        stepMessage,
        ++checkIndex,
      );

      const itemsAfterDelete = await catalog._getAllItems({});
      assertAndLog(
        (itemsAfterDelete as { items: ID[] }[])[0].items.length,
        0,
        "Should have 0 items after deletion",
        stepMessage,
        ++checkIndex,
      );

      const poDetailsAfterDelete = await catalog._getPurchaseOptionDetails({
        purchaseOption: purchaseOptionToDelete,
      });
      assertAndLog(
        "error" in poDetailsAfterDelete,
        true,
        "Purchase option should not exist after item deletion",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (poDetailsAfterDelete as { error: string }).error,
        `PurchaseOption with ID "${purchaseOptionToDelete}" not found.`,
        "Correct error message for deleted PO",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("3. Failure to delete a non-existent item", async () => {
    const stepMessage = "3. Failure to delete a non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentId = "nonExistentItem" as ID;
    const result = await catalog.deleteItem({ item: nonExistentId });
    assertAndLog(
      "error" in result,
      true,
      "Should return an error for non-existent item",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { error: string }).error,
      `Item with ID "${nonExistentId}" not found.`,
      "Correct error message should be returned",
      stepMessage,
      ++checkIndex,
    );
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
    assertAndLog(
      "purchaseOption" in result,
      true,
      "Result should contain purchase option ID",
      stepMessage,
      ++checkIndex,
    );
    const poId = (result as { purchaseOption: ID }).purchaseOption;
    assertExistsAndLog(
      poId,
      "Purchase option ID should be generated",
      stepMessage,
      ++checkIndex,
    );

    const poDetails = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      "error" in poDetails,
      false,
      "Purchase option details should be retrievable",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (poDetails as any)[0].quantity,
      1.0,
      "Quantity should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (poDetails as any)[0].store,
      "Grocery Store",
      "Store should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (poDetails as any)[0].confirmed,
      false,
      "Purchase option should be unconfirmed by default",
      stepMessage,
      ++checkIndex,
    );

    const itemOptions = await catalog._getItemPurchaseOptions({
      item: newItemId,
    });
    assertAndLog(
      (itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.includes(
        poId,
      ),
      true,
      "Item should list the new purchase option",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "3. Failure to add purchase option for non-existent item",
    async () => {
      const stepMessage =
        "3. Failure to add purchase option for non-existent item";
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
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for non-existent item",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `Item with ID "${nonExistentItem}" not found.`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. Failure to add purchase option with invalid quantity or price",
    async () => {
      const stepMessage =
        "4. Failure to add purchase option with invalid quantity or price";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const invalidQtyResult = await catalog.addPurchaseOption({
        item: newItemId,
        quantity: 0,
        units: "unit",
        price: 1,
        store: "Any",
      });
      assertAndLog(
        "error" in invalidQtyResult,
        true,
        "Should return error for quantity <= 0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (invalidQtyResult as { error: string }).error,
        "Quantity must be greater than 0.",
        "Correct error message for quantity",
        stepMessage,
        ++checkIndex,
      );

      const invalidPriceResult = await catalog.addPurchaseOption({
        item: newItemId,
        quantity: 1,
        units: "unit",
        price: -1,
        store: "Any",
      });
      assertAndLog(
        "error" in invalidPriceResult,
        true,
        "Should return error for price < 0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (invalidPriceResult as { error: string }).error,
        "Price cannot be negative.",
        "Correct error message for price",
        stepMessage,
        ++checkIndex,
      );
    },
  );

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
    assertExistsAndLog(
      poId,
      "Purchase option should be created",
      stepMessage,
      0,
    );
  });

  await t.step("2. Update quantity", async () => {
    const stepMessage = "2. Update quantity";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({
      purchaseOption: poId,
      quantity: 2,
    });
    assertAndLog(
      "success" in updateResult,
      true,
      "Quantity update should succeed",
      stepMessage,
      ++checkIndex,
    );

    const details = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      (details as any)[0].quantity,
      2,
      "Quantity should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Update units", async () => {
    const stepMessage = "3. Update units";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({
      purchaseOption: poId,
      units: "slices",
    });
    assertAndLog(
      "success" in updateResult,
      true,
      "Units update should succeed",
      stepMessage,
      ++checkIndex,
    );

    const details = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      (details as any)[0].units,
      "slices",
      "Units should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Update price", async () => {
    const stepMessage = "4. Update price";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({
      purchaseOption: poId,
      price: 3.00,
    });
    assertAndLog(
      "success" in updateResult,
      true,
      "Price update should succeed",
      stepMessage,
      ++checkIndex,
    );

    const details = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      (details as any)[0].price,
      3.00,
      "Price should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("5. Update store", async () => {
    const stepMessage = "5. Update store";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updatePurchaseOption({
      purchaseOption: poId,
      store: "Supermarket",
    });
    assertAndLog(
      "success" in updateResult,
      true,
      "Store update should succeed",
      stepMessage,
      ++checkIndex,
    );

    const details = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      (details as any)[0].store,
      "Supermarket",
      "Store should be updated",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "6. Failure to update non-existent purchase option",
    async () => {
      const stepMessage = "6. Failure to update non-existent purchase option";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentPO = "nonExistentPO" as ID;
      const result = await catalog.updatePurchaseOption({
        purchaseOption: nonExistentPO,
        price: 10,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for non-existent purchase option",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `PurchaseOption with ID "${nonExistentPO}" not found.`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "7. Failure to update with invalid quantity or price",
    async () => {
      const stepMessage = "7. Failure to update with invalid quantity or price";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const invalidQtyResult = await catalog.updatePurchaseOption({
        purchaseOption: poId,
        quantity: 0,
      });
      assertAndLog(
        "error" in invalidQtyResult,
        true,
        "Should return error for quantity <= 0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (invalidQtyResult as { error: string }).error,
        "Quantity must be greater than 0.",
        "Correct error message for quantity",
        stepMessage,
        ++checkIndex,
      );

      const invalidPriceResult = await catalog.updatePurchaseOption({
        purchaseOption: poId,
        price: -5.0,
      });
      assertAndLog(
        "error" in invalidPriceResult,
        true,
        "Should return error for price < 0",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (invalidPriceResult as { error: string }).error,
        "Price cannot be negative.",
        "Correct error message for price",
        stepMessage,
        ++checkIndex,
      );
    },
  );

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
    const createItemResult = await catalog.createItem({
      primaryName: "Cheese",
    });
    itemId = (createItemResult as { item: ID }).item;

    const addPOResult1 = await catalog.addPurchaseOption({
      item: itemId,
      quantity: 1,
      units: "block",
      price: 5,
      store: "Dairy",
    });
    poId1 = (addPOResult1 as { purchaseOption: ID }).purchaseOption;

    const addPOResult2 = await catalog.addPurchaseOption({
      item: itemId,
      quantity: 2,
      units: "slices",
      price: 3,
      store: "Deli",
    });
    poId2 = (addPOResult2 as { purchaseOption: ID }).purchaseOption;

    const itemOptions = await catalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog(
      (itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.length,
      2,
      "Item should have two purchase options initially",
      stepMessage,
      0,
    );
  });

  await t.step("2. Successful removal of a purchase option", async () => {
    const stepMessage = "2. Successful removal of a purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const removeResult = await catalog.removePurchaseOption({
      item: itemId,
      purchaseOption: poId1,
    });
    assertAndLog(
      "success" in removeResult,
      true,
      "Removal should succeed",
      stepMessage,
      ++checkIndex,
    );

    const itemOptions = await catalog._getItemPurchaseOptions({ item: itemId });
    assertAndLog(
      (itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.length,
      1,
      "Item should have one purchase option after removal",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.includes(
        poId1,
      ),
      false,
      "Removed PO should not be in item's options",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (itemOptions as { purchaseOptions: ID[] }[])[0].purchaseOptions.includes(
        poId2,
      ),
      true,
      "Other PO should still be present",
      stepMessage,
      ++checkIndex,
    );

    const poDetails = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId1,
    });
    assertAndLog(
      "error" in poDetails,
      true,
      "Removed purchase option should not exist",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (poDetails as { error: string }).error,
      `PurchaseOption with ID "${poId1}" not found.`,
      "Correct error for non-existent PO",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "3. Failure to remove purchase option from non-existent item",
    async () => {
      const stepMessage =
        "3. Failure to remove purchase option from non-existent item";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentItem = "nonExistentItem" as ID;
      const result = await catalog.removePurchaseOption({
        item: nonExistentItem,
        purchaseOption: poId2,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for non-existent item",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `Item with ID "${nonExistentItem}" not found.`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. Failure to remove non-existent purchase option from existing item",
    async () => {
      const stepMessage =
        "4. Failure to remove non-existent purchase option from existing item";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentPO = "nonExistentPO" as ID;
      const result = await catalog.removePurchaseOption({
        item: itemId,
        purchaseOption: nonExistentPO,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for non-existent PO",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `PurchaseOption with ID "${nonExistentPO}" not found or not associated with Item "${itemId}".`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("StoreCatalog - Action: updateItemName", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemId: ID;

  await t.step("1. Setup: Create item with a name", async () => {
    const stepMessage = "1. Setup: Create item with a name";
    printStepHeader(stepMessage);
    const createResult = await catalog.createItem({ primaryName: "Tomato" });
    itemId = (createResult as { item: ID }).item;
    const itemByName = await catalog._getItemByName({ name: "Tomato" });
    assertAndLog(
      (itemByName as { item: ID }[])[0].item,
      itemId,
      "Item should start with name 'Tomato'",
      stepMessage,
      0,
    );
  });

  await t.step("2. Successful update of item name", async () => {
    const stepMessage = "2. Successful update of item name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updateItemName({
      item: itemId,
      name: "Roma Tomato",
    });
    assertAndLog(
      "success" in updateResult,
      true,
      "Updating name should succeed",
      stepMessage,
      ++checkIndex,
    );

    const itemByName = await catalog._getItemByName({ name: "Roma Tomato" });
    assertAndLog(
      (itemByName as { item: ID }[])[0].item,
      itemId,
      "Item should now have name 'Roma Tomato'",
      stepMessage,
      ++checkIndex,
    );

    const itemByOldName = await catalog._getItemByName({ name: "Tomato" });
    assertAndLog(
      "error" in itemByOldName,
      true,
      "Old name 'Tomato' should no longer work",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Failure to update to name that already exists", async () => {
    const stepMessage = "3. Failure to update to name that already exists";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // Create another item
    const createResult2 = await catalog.createItem({ primaryName: "Cherry Tomato" });
    const itemId2 = (createResult2 as { item: ID }).item;

    // Try to update first item to second item's name
    const result = await catalog.updateItemName({
      item: itemId,
      name: "Cherry Tomato",
    });
    assertAndLog(
      "error" in result,
      true,
      "Should return an error for duplicate name",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { error: string }).error,
      `An item with the name "Cherry Tomato" already exists.`,
      "Correct error message",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Failure to update non-existent item", async () => {
    const stepMessage = "4. Failure to update non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const result = await catalog.updateItemName({
      item: nonExistentItem,
      name: "New Name",
    });
    assertAndLog(
      "error" in result,
      true,
      "Should return an error for non-existent item",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { error: string }).error,
      `Item with ID "${nonExistentItem}" not found.`,
      "Correct error message",
      stepMessage,
      ++checkIndex,
    );
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

    const details = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      (details as any)[0].confirmed,
      false,
      "Purchase option should start unconfirmed",
      stepMessage,
      0,
    );
  });

  await t.step("2. Successful confirmation of purchase option", async () => {
    const stepMessage = "2. Successful confirmation of purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const confirmResult = await catalog.confirmPurchaseOption({
      purchaseOption: poId,
    });
    assertAndLog(
      "success" in confirmResult,
      true,
      "Confirmation should succeed",
      stepMessage,
      ++checkIndex,
    );

    const details = await catalog._getPurchaseOptionDetails({
      purchaseOption: poId,
    });
    assertAndLog(
      (details as any)[0].confirmed,
      true,
      "Purchase option should now be confirmed",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "3. Failure to confirm an already confirmed purchase option",
    async () => {
      const stepMessage =
        "3. Failure to confirm an already confirmed purchase option";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const result = await catalog.confirmPurchaseOption({
        purchaseOption: poId,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for already confirmed PO",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `PurchaseOption with ID "${poId}" is already confirmed.`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. Failure to confirm non-existent purchase option",
    async () => {
      const stepMessage = "4. Failure to confirm non-existent purchase option";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentPO = "nonExistentPO" as ID;
      const result = await catalog.confirmPurchaseOption({
        purchaseOption: nonExistentPO,
      });
      assertAndLog(
        "error" in result,
        true,
        "Should return an error for non-existent PO",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `PurchaseOption with ID "${nonExistentPO}" not found.`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemByName", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let orangeId: ID;

  await t.step(
    "1. Setup: Create items with various names",
    async () => {
      const stepMessage = "1. Setup: Create items with various names";
      printStepHeader(stepMessage);
      const createOrange = await catalog.createItem({ primaryName: "Orange" });
      orangeId = (createOrange as { item: ID }).item;

      await catalog.createItem({ primaryName: "Apple" });
      console.log("    Created 'Orange' and 'Apple'");
    },
  );

  await t.step("2. Query by name", async () => {
    const stepMessage = "2. Query by name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByName({ name: "Orange" });
    assertAndLog(
      "error" in result,
      false,
      "Query for 'Orange' should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { item: ID }[]).length,
      1,
      "Should find one item",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { item: ID }[])[0].item,
      orangeId,
      "Should return the correct item ID",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Query for non-existent name", async () => {
    const stepMessage = "3. Query for non-existent name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByName({ name: "Banana" });
    assertAndLog(
      "error" in result,
      true,
      "Query for non-existent name should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { error: string }).error,
      `Item with name "Banana" not found.`,
      "Correct error message",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemName", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let itemId: ID;

  await t.step("1. Setup: Create item with a name", async () => {
    const stepMessage = "1. Setup: Create item with a name";
    printStepHeader(stepMessage);
    const createResult = await catalog.createItem({ primaryName: "Banana" });
    itemId = (createResult as { item: ID }).item;
    console.log(`    Created Item: ${itemId} with name "Banana"`);
  });

  await t.step("2. Query item name by ID", async () => {
    const stepMessage = "2. Query item name by ID";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemName({ item: itemId });
    assertAndLog(
      "error" in result,
      false,
      "Query for item name should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { name: string }[]).length,
      1,
      "Should return one result",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { name: string }[])[0].name,
      "Banana",
      "Should return the correct item name",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Query name after updating item name", async () => {
    const stepMessage = "3. Query name after updating item name";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const updateResult = await catalog.updateItemName({
      item: itemId,
      name: "Yellow Banana",
    });
    assertAndLog(
      "success" in updateResult,
      true,
      "Updating item name should succeed",
      stepMessage,
      ++checkIndex,
    );

    const result = await catalog._getItemName({ item: itemId });
    assertAndLog(
      "error" in result,
      false,
      "Query for updated item name should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { name: string }[])[0].name,
      "Yellow Banana",
      "Should return the updated item name",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Query name for non-existent item", async () => {
    const stepMessage = "4. Query name for non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const result = await catalog._getItemName({ item: nonExistentItem });
    assertAndLog(
      "error" in result,
      true,
      "Query for non-existent item should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { error: string }).error,
      `Item with ID "${nonExistentItem}" not found.`,
      "Correct error message",
      stepMessage,
      ++checkIndex,
    );
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
    console.log(
      `    Created Item: ${carrotItemId}, PurchaseOption: ${carrotPOId}`,
    );
  });

  await t.step("2. Query by existing purchase option", async () => {
    const stepMessage = "2. Query by existing purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemByPurchaseOption({
      purchaseOption: carrotPOId,
    });
    assertAndLog(
      "error" in result,
      false,
      "Query for item by PO should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { item: ID }[]).length,
      1,
      "Should find one item",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { item: ID }[])[0].item,
      carrotItemId,
      "Should return the correct item ID",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Query by non-existent purchase option", async () => {
    const stepMessage = "3. Query by non-existent purchase option";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentPO = "nonExistentPO" as ID;
    const result = await catalog._getItemByPurchaseOption({
      purchaseOption: nonExistentPO,
    });
    assertAndLog(
      "error" in result,
      true,
      "Query for non-existent PO should return an error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { error: string }).error,
      `PurchaseOption with ID "${nonExistentPO}" not found.`,
      "Correct error message",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("StoreCatalog - Query: _getItemPurchaseOptions", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const catalog = new StoreCatalogConcept(db);

  let peachId: ID;
  let peachPO1: ID;
  let peachPO2: ID;

  await t.step(
    "1. Setup: Create item with purchase options",
    async () => {
      const stepMessage =
        "1. Setup: Create item with purchase options";
      printStepHeader(stepMessage);
      const createPeach = await catalog.createItem({ primaryName: "Peach" });
      peachId = (createPeach as { item: ID }).item;

      const addPO1 = await catalog.addPurchaseOption({
        item: peachId,
        quantity: 1,
        units: "lb",
        price: 2.00,
        store: "Market",
      });
      peachPO1 = (addPO1 as { purchaseOption: ID }).purchaseOption;
      const addPO2 = await catalog.addPurchaseOption({
        item: peachId,
        quantity: 0.5,
        units: "kg",
        price: 3.50,
        store: "Organic",
      });
      peachPO2 = (addPO2 as { purchaseOption: ID }).purchaseOption;
      console.log(
        `    Created Item: ${peachId} with two POs: ${peachPO1}, ${peachPO2}`,
      );
    },
  );

  await t.step("2. Query item purchase options", async () => {
    const stepMessage = "2. Query item purchase options";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getItemPurchaseOptions({ item: peachId });
    assertAndLog(
      "error" in result,
      false,
      "Query for purchase options should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { purchaseOptions: ID[] }[]).length,
      1,
      "Should return one set of purchase options",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      JSON.stringify(
        (result as { purchaseOptions: ID[] }[])[0].purchaseOptions.sort(),
      ),
      JSON.stringify([peachPO1, peachPO2].sort()),
      "Should return all item purchase options",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Query PO for non-existent item", async () => {
    const stepMessage = "3. Query PO for non-existent item";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const nonExistentItem = "nonExistentItem" as ID;
    const poResult = await catalog._getItemPurchaseOptions({
      item: nonExistentItem,
    });
    assertAndLog(
      "error" in poResult,
      true,
      "PO query for non-existent item should error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (poResult as { error: string }).error,
      `Item with ID "${nonExistentItem}" not found.`,
      "Correct error message for POs",
      stepMessage,
      ++checkIndex,
    );
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
    console.log(
      `    Created Item: ${salmonItemId}, PurchaseOption: ${salmonPOId}`,
    );
  });

  await t.step("2. Query purchase option details", async () => {
    const stepMessage = "2. Query purchase option details";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const result = await catalog._getPurchaseOptionDetails({
      purchaseOption: salmonPOId,
    });
    assertAndLog(
      "error" in result,
      false,
      "Query for details should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as any[]).length,
      1,
      "Should return one set of details",
      stepMessage,
      ++checkIndex,
    );
    const details = (result as any[])[0];
    assertAndLog(
      details.quantity,
      1.5,
      "Quantity should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      details.units,
      "lb",
      "Units should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      details.price,
      15.99,
      "Price should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      details.store,
      "Fish Market",
      "Store should be correct",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      details.confirmed,
      false,
      "Confirmed status should be false",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "3. Query details for non-existent purchase option",
    async () => {
      const stepMessage = "3. Query details for non-existent purchase option";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const nonExistentPO = "nonExistentPO" as ID;
      const result = await catalog._getPurchaseOptionDetails({
        purchaseOption: nonExistentPO,
      });
      assertAndLog(
        "error" in result,
        true,
        "Query for non-existent PO details should error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (result as { error: string }).error,
        `PurchaseOption with ID "${nonExistentPO}" not found.`,
        "Correct error message",
        stepMessage,
        ++checkIndex,
      );
    },
  );

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
    assertAndLog(
      "error" in result,
      false,
      "Query for all items should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { items: ID[] }[]).length,
      1,
      "Should return one array of items",
      stepMessage,
      ++checkIndex,
    );
    const allItems = (result as { items: ID[] }[])[0].items;
    assertAndLog(
      allItems.length,
      2,
      "Should return two items",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      allItems.includes(item1),
      true,
      "Should include Item 1",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      allItems.includes(item2),
      true,
      "Should include Item 2",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Query all items when no items exist", async () => {
    const stepMessage = "3. Query all items when no items exist";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    await catalog.deleteItem({ item: item1 });
    await catalog.deleteItem({ item: item2 });

    const result = await catalog._getAllItems({});
    assertAndLog(
      "error" in result,
      false,
      "Query for all items should succeed even if empty",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (result as { items: ID[] }[]).length,
      1,
      "Should return one array of items",
      stepMessage,
      ++checkIndex,
    );
    const allItems = (result as { items: ID[] }[])[0].items;
    assertAndLog(
      allItems.length,
      0,
      "Should return an empty array if no items exist",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});
