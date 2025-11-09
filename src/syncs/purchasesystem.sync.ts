import { actions, Frames, Sync } from "@engine";
import {
  CookBook,
  MenuCollection,
  PurchaseSystem,
  Requesting,
  StoreCatalog,
  UserAuthentication,
  WeeklyCart,
} from "@concepts";
import { ID } from "@utils/types.ts";

// ============================================================================
// StoreCatalog → PurchaseSystem Syncs
// ============================================================================

// createSelectOrder when StoreCatalog.createItem
export const CreateSelectOrderOnItemCreate: Sync = ({ item }) => ({
  when: actions([StoreCatalog.createItem, {}, { item }]),
  then: actions([
    PurchaseSystem.createSelectOrder,
    { associateID: item },
  ]),
});

// deleteSelectOrder when StoreCatalog.deleteItem
export const DeleteSelectOrderOnItemDelete: Sync = ({
  item,
  selectOrder,
  order,
}) => ({
  when: actions([StoreCatalog.deleteItem, { item }, {}]),
  where: async (frames) => {
    // Find SelectOrder by associateID (item)
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const itemValue = frameRecord[item] as string;

      if (!itemValue || typeof itemValue !== "string") {
        continue; // Skip if item is not valid
      }

      const orderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: itemValue },
        { order },
      ) as Promise<Frames>);

      // Filter to get SelectOrder (has childAtomicOrders property) and extract _id
      for (const orderFrame of orderFrames) {
        const orderFrameRecord = orderFrame as Record<symbol, unknown>;
        const orderValue = orderFrameRecord[order];
        if (
          orderValue &&
          typeof orderValue === "object" &&
          "childAtomicOrders" in orderValue
        ) {
          const selectOrderId = (orderValue as unknown as { _id: string })._id;
          resultFrames.push({
            ...orderFrame,
            [selectOrder]: selectOrderId,
          });
        }
      }
    }
    return resultFrames;
  },
  then: actions([PurchaseSystem.deleteSelectOrder, { selectOrder }]),
});

// createAtomicOrder when StoreCatalog.addPurchaseOption
export const CreateAtomicOrderOnPurchaseOptionAdd: Sync = ({
  purchaseOption,
  item,
  quantity,
  units,
  price,
  selectOrder,
  _order,
}) => ({
  when: actions([
    StoreCatalog.addPurchaseOption,
    {},
    { purchaseOption },
  ]),
  where: async (frames) => {
    // Get purchase option details and item
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const purchaseOptionValue = frameRecord[purchaseOption] as string;

      if (!purchaseOptionValue || typeof purchaseOptionValue !== "string") {
        continue; // Skip if purchaseOption is not valid
      }

      // Get item for this purchase option - call query directly to check for errors
      const itemQueryResult = await StoreCatalog._getItemByPurchaseOption({
        purchaseOption: purchaseOptionValue as ID,
      });

      // Check for error - queries return either arrays or error objects
      if (!Array.isArray(itemQueryResult) || "error" in itemQueryResult) {
        continue; // Skip this frame if query failed
      }

      // Get purchase option details - call query directly to check for errors
      const poDetailsResult = await StoreCatalog._getPurchaseOptionDetails({
        purchaseOption: purchaseOptionValue as ID,
      });

      // Check for error
      if (!Array.isArray(poDetailsResult) || "error" in poDetailsResult) {
        continue; // Skip this frame if query failed
      }

      // Process each item result
      for (const itemResult of itemQueryResult) {
        const itemValue = itemResult.item;
        if (typeof itemValue !== "string") {
          continue;
        }

        // Process each purchase option details result
        for (const poDetail of poDetailsResult) {
          // Find SelectOrder by associateID (item) - call query directly to check for errors
          const selectOrderQueryResult = await PurchaseSystem
            ._getOrderByAssociateID({
              associateID: itemValue,
            });

          // Check for error
          if (
            !Array.isArray(selectOrderQueryResult) ||
            "error" in selectOrderQueryResult
          ) {
            continue; // Skip if query failed
          }

          // Filter to get SelectOrder (has childAtomicOrders property) and extract _id
          for (const orderResult of selectOrderQueryResult) {
            const orderValue = orderResult.order;
            if (
              orderValue &&
              typeof orderValue === "object" &&
              "childAtomicOrders" in orderValue
            ) {
              const selectOrderId =
                (orderValue as unknown as { _id: string })._id;
              resultFrames.push({
                ...frame,
                [item]: itemValue,
                [quantity]: poDetail.quantity,
                [units]: poDetail.units,
                [price]: poDetail.price,
                [selectOrder]: selectOrderId,
              });
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.createAtomicOrder,
    {
      selectOrder,
      associateID: purchaseOption,
      quantity,
      units,
      price,
    },
  ]),
});

// deleteAtomicOrder when StoreCatalog.removePurchaseOption
export const DeleteAtomicOrderOnPurchaseOptionRemove: Sync = ({
  item,
  purchaseOption,
  atomicOrder,
  selectOrder,
  _order,
}) => ({
  when: actions([
    StoreCatalog.removePurchaseOption,
    { item, purchaseOption },
    {},
  ]),
  where: async (frames) => {
    // Find AtomicOrder by associateID (purchaseOption)
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const purchaseOptionValue = frameRecord[purchaseOption] as string;

      if (!purchaseOptionValue || typeof purchaseOptionValue !== "string") {
        continue; // Skip if purchaseOption is not valid
      }

      // Find AtomicOrder by associateID (purchaseOption) - call query directly to check for errors
      const orderQueryResult = await PurchaseSystem._getOrderByAssociateID({
        associateID: purchaseOptionValue as ID,
      });

      // Check for error - queries return either arrays or error objects
      if (!Array.isArray(orderQueryResult) || "error" in orderQueryResult) {
        continue; // Skip this frame if query failed (atomic order may not exist)
      }

      // Filter to get AtomicOrder (has parentOrder property) and extract IDs
      for (const orderResult of orderQueryResult) {
        const orderValue = orderResult.order;
        if (
          orderValue &&
          typeof orderValue === "object" &&
          "parentOrder" in orderValue
        ) {
          const atomicOrderValue = orderValue as {
            _id: string;
            parentOrder: string;
          };
          // Get the parent SelectOrder ID and AtomicOrder ID
          resultFrames.push({
            ...frame,
            [selectOrder]: atomicOrderValue.parentOrder,
            [atomicOrder]: atomicOrderValue._id,
          });
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.deleteAtomicOrder,
    { selectOrder, atomicOrder },
  ]),
});

// updateAtomicOrder when StoreCatalog.updatePurchaseOption (quantity)
export const UpdateAtomicOrderQuantityOnPurchaseOptionUpdate: Sync = ({
  purchaseOption,
  quantity,
  atomicOrder,
  order,
}) => ({
  when: actions([
    StoreCatalog.updatePurchaseOption,
    { purchaseOption, quantity },
    {},
  ]),
  where: async (frames) => {
    // Find AtomicOrder by associateID (purchaseOption)
    const resultFrames = new Frames();
    for (const frame of frames) {
      const orderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: purchaseOption },
        { order },
      ) as Promise<Frames>);

      // Filter to get AtomicOrder (has parentOrder property) and extract _id
      for (const orderFrame of orderFrames) {
        const orderFrameRecord = orderFrame as Record<symbol, unknown>;
        const orderValue = orderFrameRecord[order];
        if (
          orderValue &&
          typeof orderValue === "object" &&
          "parentOrder" in orderValue
        ) {
          const atomicOrderId = (orderValue as unknown as { _id: string })._id;
          resultFrames.push({
            ...orderFrame,
            [atomicOrder]: atomicOrderId,
          });
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.updateAtomicOrder,
    { atomicOrder, quantity },
  ]),
});

// updateAtomicOrder when StoreCatalog.updatePurchaseOption (units)
export const UpdateAtomicOrderUnitsOnPurchaseOptionUpdate: Sync = ({
  purchaseOption,
  units,
  atomicOrder,
  order,
}) => ({
  when: actions([
    StoreCatalog.updatePurchaseOption,
    { purchaseOption, units },
    {},
  ]),
  where: async (frames) => {
    // Find AtomicOrder by associateID (purchaseOption)
    const resultFrames = new Frames();
    for (const frame of frames) {
      const orderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: purchaseOption },
        { order },
      ) as Promise<Frames>);

      // Filter to get AtomicOrder (has parentOrder property) and extract _id
      for (const orderFrame of orderFrames) {
        const orderFrameRecord = orderFrame as Record<symbol, unknown>;
        const orderValue = orderFrameRecord[order];
        if (
          orderValue &&
          typeof orderValue === "object" &&
          "parentOrder" in orderValue
        ) {
          const atomicOrderId = (orderValue as unknown as { _id: string })._id;
          resultFrames.push({
            ...orderFrame,
            [atomicOrder]: atomicOrderId,
          });
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.updateAtomicOrder,
    { atomicOrder, units },
  ]),
});

// updateAtomicOrder when StoreCatalog.updatePurchaseOption (price)
export const UpdateAtomicOrderPriceOnPurchaseOptionUpdate: Sync = ({
  purchaseOption,
  price,
  atomicOrder,
  order,
}) => ({
  when: actions([
    StoreCatalog.updatePurchaseOption,
    { purchaseOption, price },
    {},
  ]),
  where: async (frames) => {
    // Find AtomicOrder by associateID (purchaseOption)
    const resultFrames = new Frames();
    for (const frame of frames) {
      const orderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: purchaseOption },
        { order },
      ) as Promise<Frames>);

      // Filter to get AtomicOrder (has parentOrder property) and extract _id
      for (const orderFrame of orderFrames) {
        const orderFrameRecord = orderFrame as Record<symbol, unknown>;
        const orderValue = orderFrameRecord[order];
        if (
          orderValue &&
          typeof orderValue === "object" &&
          "parentOrder" in orderValue
        ) {
          const atomicOrderId = (orderValue as unknown as { _id: string })._id;
          resultFrames.push({
            ...orderFrame,
            [atomicOrder]: atomicOrderId,
          });
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.updateAtomicOrder,
    { atomicOrder, price },
  ]),
});

// ============================================================================
// CookBook → PurchaseSystem Syncs
// ============================================================================

// createCompositeOrder when CookBook.createRecipe
export const CreateCompositeOrderOnRecipeCreate: Sync = ({ recipe }) => ({
  when: actions([CookBook.createRecipe, {}, { recipe }]),
  then: actions([
    PurchaseSystem.createCompositeOrder,
    { associateID: recipe },
  ]),
});

// addSelectOrderToCompositeOrder when CookBook.addRecipeIngredient
export const AddSelectOrderToCompositeOrderOnIngredientAdd: Sync = ({
  recipe,
  name,
  quantity,
  item,
  selectOrder,
  compositeOrder,
  order,
  scaleFactor,
  ingredients,
  baseQuantity,
  baseUnits,
}) => ({
  when: actions([
    CookBook.addRecipeIngredient,
    { recipe, name, quantity },
    {},
  ]),
  where: async (frames) => {
    // Find item by name in StoreCatalog
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const recipeValue = frameRecord[recipe] as string;
      const nameValue = frameRecord[name] as string;
      const quantityValue = frameRecord[quantity] as number;

      if (!recipeValue || !nameValue || typeof quantityValue !== "number") {
        continue;
      }

      // Query recipe ingredients to get the ingredient's units
      const recipeIngredientsFrames = await (new Frames(frame).query(
        CookBook._getRecipeIngredients as unknown as (
          input: { recipe: string },
        ) => Promise<
          Array<{
            ingredients: Array<{
              name: string;
              quantity: number;
              units: string;
            }>;
          }>
        >,
        { recipe: recipeValue },
        { ingredients },
      ) as Promise<Frames>);

      if (recipeIngredientsFrames.length === 0) {
        continue;
      }

      // Find the ingredient in the recipe to get its units
      const recipeIngredientsFrame = recipeIngredientsFrames[0];
      const recipeIngredientsRecord = recipeIngredientsFrame as Record<
        symbol,
        unknown
      >;
      const ingredientsArray = recipeIngredientsRecord[ingredients] as
        | Array<{
          name: string;
          quantity: number;
          units: string;
        }>
        | undefined;

      if (!ingredientsArray || !Array.isArray(ingredientsArray)) {
        continue;
      }

      const ingredient = ingredientsArray.find((ing) => ing.name === nameValue);

      if (!ingredient) {
        continue;
      }

      const recipeUnits = ingredient.units;
      const recipeQuantity = quantityValue;

      const itemFrames = await (new Frames(frame).query(
        StoreCatalog._getItemByName as unknown as (
          input: { name: string },
        ) => Promise<Array<{ item: string }>>,
        { name: nameValue },
        { item },
      ) as Promise<Frames>);

      // If item not found, skip this sync
      if (itemFrames.length === 0) {
        continue;
      }

      // Find SelectOrder by associateID (item)
      for (const itemFrame of itemFrames) {
        const itemFrameRecord = itemFrame as Record<symbol, unknown>;
        const itemValue = itemFrameRecord[item];
        if (typeof itemValue === "string") {
          const selectOrderFrames = await (new Frames(itemFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: itemValue },
            { order },
          ) as Promise<Frames>);

          // Find CompositeOrder by associateID (recipe)
          for (const soFrame of selectOrderFrames) {
            const soFrameRecord = soFrame as Record<symbol, unknown>;
            const orderValue = soFrameRecord[order];
            if (
              orderValue &&
              typeof orderValue === "object" &&
              "childAtomicOrders" in orderValue
            ) {
              const selectOrderId =
                (orderValue as unknown as { _id: string })._id;


              // Query SelectOrder details to get baseQuantity and baseUnits
              const selectOrderDetailsFrames = await (new Frames(soFrame).query(
                PurchaseSystem._getSelectOrderDetails as unknown as (
                  input: { selectOrder: string },
                ) => Promise<
                  Array<{
                    baseQuantity: number;
                    baseUnits: string;
                  }>
                >,
                { selectOrder: selectOrderId },
                { baseQuantity, baseUnits },
              ) as Promise<Frames>);

              if (selectOrderDetailsFrames.length === 0) {
                continue;
              }

              const selectOrderDetailsFrame = selectOrderDetailsFrames[0];
              const selectOrderDetailsRecord =
                selectOrderDetailsFrame as Record<
                  symbol,
                  unknown
                >;
              const baseQuantityValue = selectOrderDetailsRecord[
                baseQuantity
              ] as number | undefined;
              const baseUnitsValue = selectOrderDetailsRecord[
                baseUnits
              ] as string | undefined;

              if (
                baseQuantityValue === undefined ||
                baseUnitsValue === undefined
              ) {
                continue;
              }


              // Handle edge cases
              if (baseQuantityValue === -1) {
                continue;
              }

              if (baseQuantityValue <= 0) {
                continue;
              }

              // Convert recipe quantity to baseUnits if units differ
              let convertedRecipeQuantity = recipeQuantity;
              if (recipeUnits !== baseUnitsValue) {
                // For common conversions:
                const recipeUnitsLower = recipeUnits.toLowerCase();
                const baseUnitsLower = baseUnitsValue.toLowerCase();
                if (
                  (recipeUnitsLower === "lb" || recipeUnitsLower === "lbs") &&
                  (baseUnitsLower === "lb" || baseUnitsLower === "lbs")
                ) {
                  // Same unit, different spelling
                  convertedRecipeQuantity = recipeQuantity;
                } else if (
                  recipeUnitsLower === "oz" && baseUnitsLower === "oz"
                ) {
                  convertedRecipeQuantity = recipeQuantity;
                } else if (
                  recipeUnitsLower === "oz" && baseUnitsLower === "lbs"
                ) {
                  // Convert oz to lbs: 1 lb = 16 oz
                  convertedRecipeQuantity = recipeQuantity / 16;
                } else if (
                  (recipeUnitsLower === "lb" || recipeUnitsLower === "lbs") &&
                  baseUnitsLower === "oz"
                ) {
                  // Convert lbs to oz: 1 lb = 16 oz
                  convertedRecipeQuantity = recipeQuantity * 16;
                } else {
                  // For other cases, assume numeric conversion (units match)
                  convertedRecipeQuantity = recipeQuantity;
                }
              } else {
              }

              // Calculate scale factor: recipeQuantity / baseQuantity
              const calculatedScaleFactor = convertedRecipeQuantity /
                baseQuantityValue;


              if (
                !isFinite(calculatedScaleFactor) || calculatedScaleFactor <= 0
              ) {
                continue;
              }

              const compositeOrderFrames = await (
                new Frames(soFrame).query(
                  PurchaseSystem._getOrderByAssociateID as unknown as (
                    input: { associateID: string },
                  ) => Promise<
                    Array<{
                      order:
                        | {
                          _id: string;
                          associateID: string;
                          parentOrder?: string;
                        }
                        | {
                          _id: string;
                          associateID: string;
                          childAtomicOrders?: string[];
                        }
                        | {
                          _id: string;
                          associateID: string;
                          childSelectOrders?: Record<string, number>;
                        };
                    }>
                  >,
                  { associateID: recipeValue },
                  { order },
                ) as Promise<Frames>
              );

              // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
              for (const coFrame of compositeOrderFrames) {
                const coFrameRecord = coFrame as Record<symbol, unknown>;
                const coOrderValue = coFrameRecord[order];
                if (
                  coOrderValue &&
                  typeof coOrderValue === "object" &&
                  "childSelectOrders" in coOrderValue
                ) {
                  const compositeOrderId =
                    (coOrderValue as unknown as { _id: string })._id;
                  resultFrames.push({
                    ...coFrame,
                    [selectOrder]: selectOrderId,
                    [compositeOrder]: compositeOrderId,
                    [scaleFactor]: calculatedScaleFactor,
                  });
                }
              }
            }
          }
        }
      }
    }

    return resultFrames;
  },
  then: actions([
    PurchaseSystem.addSelectOrderToCompositeOrder,
    {
      compositeOrder,
      selectOrder,
      scaleFactor,
    },
  ]),
});

// removeSelectOrderFromCompositeOrder when CookBook.removeRecipeIngredient
export const RemoveSelectOrderFromCompositeOrderOnIngredientRemove: Sync = ({
  recipe,
  name,
  item,
  selectOrder,
  compositeOrder,
  order,
}) => ({
  when: actions([CookBook.removeRecipeIngredient, { recipe, name }, {}]),
  where: async (frames) => {
    // Find item by name in StoreCatalog
    const resultFrames = new Frames();
    for (const frame of frames) {
      const itemFrames = await (new Frames(frame).query(
        StoreCatalog._getItemByName as unknown as (
          input: { name: string },
        ) => Promise<Array<{ item: string }>>,
        { name },
        { item },
      ) as Promise<Frames>);

      // If item not found, skip this sync
      if (itemFrames.length === 0) {
        continue;
      }

      // Find SelectOrder by associateID (item)
      for (const itemFrame of itemFrames) {
        const itemFrameRecord = itemFrame as Record<symbol, unknown>;
        const itemValue = itemFrameRecord[item];
        if (typeof itemValue === "string") {
          const selectOrderFrames = await (new Frames(itemFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: itemValue },
            { order },
          ) as Promise<Frames>);

          // Find CompositeOrder by associateID (recipe)
          for (const soFrame of selectOrderFrames) {
            const soFrameRecord = soFrame as Record<symbol, unknown>;
            const orderValue = soFrameRecord[order];
            if (
              orderValue &&
              typeof orderValue === "object" &&
              "childAtomicOrders" in orderValue
            ) {
              const selectOrderId =
                (orderValue as unknown as { _id: string })._id;
              const compositeOrderFrames = await (
                new Frames(soFrame).query(
                  PurchaseSystem._getOrderByAssociateID as unknown as (
                    input: { associateID: string },
                  ) => Promise<
                    Array<{
                      order:
                        | {
                          _id: string;
                          associateID: string;
                          parentOrder?: string;
                        }
                        | {
                          _id: string;
                          associateID: string;
                          childAtomicOrders?: string[];
                        }
                        | {
                          _id: string;
                          associateID: string;
                          childSelectOrders?: Record<string, number>;
                        };
                    }>
                  >,
                  { associateID: recipe },
                  { order },
                ) as Promise<Frames>
              );

              // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
              for (const coFrame of compositeOrderFrames) {
                const coFrameRecord = coFrame as Record<symbol, unknown>;
                const coOrderValue = coFrameRecord[order];
                if (
                  coOrderValue &&
                  typeof coOrderValue === "object" &&
                  "childSelectOrders" in coOrderValue
                ) {
                  const compositeOrderId =
                    (coOrderValue as unknown as { _id: string })._id;
                  resultFrames.push({
                    ...coFrame,
                    [selectOrder]: selectOrderId,
                    [compositeOrder]: compositeOrderId,
                  });
                }
              }
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.removeSelectOrderFromCompositeOrder,
    { compositeOrder, selectOrder },
  ]),
});

// updateSubOrderScaleFactor when CookBook.updateRecipeIngredient
export const UpdateSubOrderScaleFactorOnIngredientUpdate: Sync = ({
  recipe,
  name,
  quantity,
  units,
  item,
  selectOrder,
  compositeOrder,
  order,
  scaleFactor,
  ingredients,
  baseQuantity,
  baseUnits,
}) => ({
  when: actions([
    CookBook.updateRecipeIngredient,
    { recipe, name, quantity, units },
    {},
  ]),
  where: async (frames) => {
    // Find item by name in StoreCatalog
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const recipeValue = frameRecord[recipe] as string;
      const nameValue = frameRecord[name] as string;
      const quantityValue = frameRecord[quantity] as number;
      const unitsValue = frameRecord[units] as string;

      if (
        !recipeValue || !nameValue || typeof quantityValue !== "number" ||
        !unitsValue
      ) {
        continue;
      }

      // Query recipe ingredients to get the ingredient's units
      const recipeIngredientsFrames = await (new Frames(frame).query(
        CookBook._getRecipeIngredients as unknown as (
          input: { recipe: string },
        ) => Promise<
          Array<{
            ingredients: Array<{
              name: string;
              quantity: number;
              units: string;
            }>;
          }>
        >,
        { recipe: recipeValue },
        { ingredients },
      ) as Promise<Frames>);

      if (recipeIngredientsFrames.length === 0) {
        continue;
      }

      // Find the ingredient in the recipe to get its units
      const recipeIngredientsFrame = recipeIngredientsFrames[0];
      const recipeIngredientsRecord = recipeIngredientsFrame as Record<
        symbol,
        unknown
      >;
      const ingredientsArray = recipeIngredientsRecord[ingredients] as
        | Array<{
          name: string;
          quantity: number;
          units: string;
        }>
        | undefined;

      if (!ingredientsArray || !Array.isArray(ingredientsArray)) {
        continue;
      }

      const ingredient = ingredientsArray.find((ing) => ing.name === nameValue);

      if (!ingredient) {
        continue;
      }

      const recipeUnits = ingredient.units;
      const recipeQuantity = quantityValue;

      const itemFrames = await (new Frames(frame).query(
        StoreCatalog._getItemByName as unknown as (
          input: { name: string },
        ) => Promise<Array<{ item: string }>>,
        { name: nameValue },
        { item },
      ) as Promise<Frames>);

      // If item not found, skip this sync
      if (itemFrames.length === 0) {
        continue;
      }

      // Find SelectOrder by associateID (item)
      for (const itemFrame of itemFrames) {
        const itemFrameRecord = itemFrame as Record<symbol, unknown>;
        const itemValue = itemFrameRecord[item];
        if (typeof itemValue === "string") {
          const selectOrderFrames = await (new Frames(itemFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: itemValue },
            { order },
          ) as Promise<Frames>);

          // Find CompositeOrder by associateID (recipe)
          for (const soFrame of selectOrderFrames) {
            const soFrameRecord = soFrame as Record<symbol, unknown>;
            const orderValue = soFrameRecord[order];
            if (
              orderValue &&
              typeof orderValue === "object" &&
              "childAtomicOrders" in orderValue
            ) {
              const selectOrderId =
                (orderValue as unknown as { _id: string })._id;


              // Query SelectOrder details to get baseQuantity and baseUnits
              const selectOrderDetailsFrames = await (new Frames(soFrame).query(
                PurchaseSystem._getSelectOrderDetails as unknown as (
                  input: { selectOrder: string },
                ) => Promise<
                  Array<{
                    baseQuantity: number;
                    baseUnits: string;
                  }>
                >,
                { selectOrder: selectOrderId },
                { baseQuantity, baseUnits },
              ) as Promise<Frames>);

              if (selectOrderDetailsFrames.length === 0) {
                continue;
              }

              const selectOrderDetailsFrame = selectOrderDetailsFrames[0];
              const selectOrderDetailsRecord =
                selectOrderDetailsFrame as Record<
                  symbol,
                  unknown
                >;
              const baseQuantityValue = selectOrderDetailsRecord[
                baseQuantity
              ] as number | undefined;
              const baseUnitsValue = selectOrderDetailsRecord[
                baseUnits
              ] as string | undefined;

              if (
                baseQuantityValue === undefined ||
                baseUnitsValue === undefined
              ) {
                continue;
              }


              // Handle edge cases
              if (baseQuantityValue === -1) {
                continue;
              }

              if (baseQuantityValue <= 0) {
                continue;
              }

              // Convert recipe quantity to baseUnits if units differ
              let convertedRecipeQuantity = recipeQuantity;
              if (recipeUnits !== baseUnitsValue) {
                // For common conversions:
                const recipeUnitsLower = recipeUnits.toLowerCase();
                const baseUnitsLower = baseUnitsValue.toLowerCase();
                if (
                  (recipeUnitsLower === "lb" || recipeUnitsLower === "lbs") &&
                  (baseUnitsLower === "lb" || baseUnitsLower === "lbs")
                ) {
                  // Same unit, different spelling
                  convertedRecipeQuantity = recipeQuantity;
                } else if (
                  recipeUnitsLower === "oz" && baseUnitsLower === "oz"
                ) {
                  convertedRecipeQuantity = recipeQuantity;
                } else if (
                  recipeUnitsLower === "oz" && baseUnitsLower === "lbs"
                ) {
                  // Convert oz to lbs: 1 lb = 16 oz
                  convertedRecipeQuantity = recipeQuantity / 16;
                } else if (
                  (recipeUnitsLower === "lb" || recipeUnitsLower === "lbs") &&
                  baseUnitsLower === "oz"
                ) {
                  // Convert lbs to oz: 1 lb = 16 oz
                  convertedRecipeQuantity = recipeQuantity * 16;
                } else {
                  // For other cases, assume numeric conversion (units match)
                  convertedRecipeQuantity = recipeQuantity;
                }
              } else {
              }

              // Calculate scale factor: recipeQuantity / baseQuantity
              const calculatedScaleFactor = convertedRecipeQuantity /
                baseQuantityValue;


              if (
                !isFinite(calculatedScaleFactor) || calculatedScaleFactor <= 0
              ) {
                continue;
              }

              const compositeOrderFrames = await (
                new Frames(soFrame).query(
                  PurchaseSystem._getOrderByAssociateID as unknown as (
                    input: { associateID: string },
                  ) => Promise<
                    Array<{
                      order:
                        | {
                          _id: string;
                          associateID: string;
                          parentOrder?: string;
                        }
                        | {
                          _id: string;
                          associateID: string;
                          childAtomicOrders?: string[];
                        }
                        | {
                          _id: string;
                          associateID: string;
                          childSelectOrders?: Record<string, number>;
                        };
                    }>
                  >,
                  { associateID: recipeValue },
                  { order },
                ) as Promise<Frames>
              );

              // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
              for (const coFrame of compositeOrderFrames) {
                const coFrameRecord = coFrame as Record<symbol, unknown>;
                const coOrderValue = coFrameRecord[order];
                if (
                  coOrderValue &&
                  typeof coOrderValue === "object" &&
                  "childSelectOrders" in coOrderValue
                ) {
                  const compositeOrderId =
                    (coOrderValue as unknown as { _id: string })._id;
                  resultFrames.push({
                    ...coFrame,
                    [selectOrder]: selectOrderId,
                    [compositeOrder]: compositeOrderId,
                    [scaleFactor]: calculatedScaleFactor,
                  });
                }
              }
            }
          }
        }
      }
    }

    return resultFrames;
  },
  then: actions([
    PurchaseSystem.updateSubOrderScaleFactor,
    {
      parentOrder: compositeOrder,
      childOrder: selectOrder,
      newScaleFactor: scaleFactor,
    },
  ]),
});

// ============================================================================
// MenuCollection → PurchaseSystem Syncs
// ============================================================================

// createCompositeOrder when MenuCollection.createMenu
export const CreateCompositeOrderOnMenuCreate: Sync = ({ menu }) => ({
  when: actions([MenuCollection.createMenu, {}, { menu }]),
  where: (frames) => {
    if (frames.length === 0) {
      console.warn(
        "[CreateCompositeOrderOnMenuCreate] ERROR: No frames matched! Sync will not create composite order.",
      );
      return frames;
    }
    return frames;
  },
  then: actions([
    PurchaseSystem.createCompositeOrder,
    { associateID: menu },
  ]),
});

// addCompositeSubOrder when MenuCollection.addRecipe
export const AddCompositeSubOrderOnMenuAddRecipe: Sync = ({
  menu,
  recipe,
  scalingFactor,
  menuCompositeOrder,
  recipeCompositeOrder,
  order,
}) => ({
  when: actions([
    MenuCollection.addRecipe,
    { menu, recipe, scalingFactor },
    {},
  ]),
  where: async (frames) => {
    // Find CompositeOrder for menu and recipe
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Find menu CompositeOrder
      const menuOrderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: menu },
        { order },
      ) as Promise<Frames>);

      // Find recipe CompositeOrder
      for (const menuFrame of menuOrderFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const menuOrderValue = menuFrameRecord[order];
        if (
          menuOrderValue &&
          typeof menuOrderValue === "object" &&
          "childSelectOrders" in menuOrderValue
        ) {
          const menuOrderId =
            (menuOrderValue as unknown as { _id: string })._id;
          const recipeOrderFrames = await (new Frames(menuFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: recipe },
            { order },
          ) as Promise<Frames>);

          // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
          for (const recipeFrame of recipeOrderFrames) {
            const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
            const recipeOrderValue = recipeFrameRecord[order];
            if (
              recipeOrderValue &&
              typeof recipeOrderValue === "object" &&
              "childSelectOrders" in recipeOrderValue
            ) {
              const recipeOrderId =
                (recipeOrderValue as unknown as { _id: string })._id;
              // Preserve scalingFactor from original frame to ensure it's available in then clause
              const originalFrameRecord = frame as Record<symbol, unknown>;
              const scalingFactorValue = originalFrameRecord[scalingFactor];
              resultFrames.push({
                ...recipeFrame,
                [menuCompositeOrder]: menuOrderId,
                [recipeCompositeOrder]: recipeOrderId,
                [scalingFactor]: scalingFactorValue,
              });
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.addCompositeSubOrder,
    {
      parentOrder: menuCompositeOrder,
      childOrder: recipeCompositeOrder,
      scaleFactor: scalingFactor,
    },
  ]),
});

// removeCompositeSubOrder when MenuCollection.removeRecipe
export const RemoveCompositeSubOrderOnMenuRemoveRecipe: Sync = ({
  menu,
  recipe,
  menuCompositeOrder,
  recipeCompositeOrder,
  order,
}) => ({
  when: actions([MenuCollection.removeRecipe, { menu, recipe }, {}]),
  where: async (frames) => {
    // Find CompositeOrder for menu and recipe
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Find menu CompositeOrder
      const menuOrderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: menu },
        { order },
      ) as Promise<Frames>);

      // Find recipe CompositeOrder
      for (const menuFrame of menuOrderFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const menuOrderValue = menuFrameRecord[order];
        if (
          menuOrderValue &&
          typeof menuOrderValue === "object" &&
          "childSelectOrders" in menuOrderValue
        ) {
          const menuOrderId =
            (menuOrderValue as unknown as { _id: string })._id;
          const recipeOrderFrames = await (new Frames(menuFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: recipe },
            { order },
          ) as Promise<Frames>);

          // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
          for (const recipeFrame of recipeOrderFrames) {
            const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
            const recipeOrderValue = recipeFrameRecord[order];
            if (
              recipeOrderValue &&
              typeof recipeOrderValue === "object" &&
              "childSelectOrders" in recipeOrderValue
            ) {
              const recipeOrderId =
                (recipeOrderValue as unknown as { _id: string })._id;
              resultFrames.push({
                ...recipeFrame,
                [menuCompositeOrder]: menuOrderId,
                [recipeCompositeOrder]: recipeOrderId,
              });
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.removeCompositeSubOrder,
    {
      parentOrder: menuCompositeOrder,
      childOrder: recipeCompositeOrder,
    },
  ]),
});

// updateSubOrderScaleFactor when MenuCollection.changeRecipeScaling
export const UpdateSubOrderScaleFactorOnMenuRecipeScaling: Sync = ({
  menu,
  recipe,
  newScalingFactor,
  menuCompositeOrder,
  recipeCompositeOrder,
  order,
}) => ({
  when: actions([
    MenuCollection.changeRecipeScaling,
    { menu, recipe, newScalingFactor },
    {},
  ]),
  where: async (frames) => {
    // Find CompositeOrder for menu and recipe
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Find menu CompositeOrder
      const menuOrderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: menu },
        { order },
      ) as Promise<Frames>);

      // Find recipe CompositeOrder
      for (const menuFrame of menuOrderFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const menuOrderValue = menuFrameRecord[order];
        if (
          menuOrderValue &&
          typeof menuOrderValue === "object" &&
          "childSelectOrders" in menuOrderValue
        ) {
          const menuOrderId =
            (menuOrderValue as unknown as { _id: string })._id;
          const recipeOrderFrames = await (new Frames(menuFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: recipe },
            { order },
          ) as Promise<Frames>);

          // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
          for (const recipeFrame of recipeOrderFrames) {
            const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
            const recipeOrderValue = recipeFrameRecord[order];
            if (
              recipeOrderValue &&
              typeof recipeOrderValue === "object" &&
              "childSelectOrders" in recipeOrderValue
            ) {
              const recipeOrderId =
                (recipeOrderValue as unknown as { _id: string })._id;
              // Preserve newScalingFactor from the original frame
              const originalFrameRecord = frame as Record<symbol, unknown>;
              const scalingFactorValue = originalFrameRecord[newScalingFactor];
              resultFrames.push({
                ...recipeFrame,
                [menuCompositeOrder]: menuOrderId,
                [recipeCompositeOrder]: recipeOrderId,
                [newScalingFactor]: scalingFactorValue,
              });
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.updateSubOrderScaleFactor,
    {
      parentOrder: menuCompositeOrder,
      childOrder: recipeCompositeOrder,
      newScaleFactor: newScalingFactor,
    },
  ]),
});

// deleteCompositeOrder when MenuCollection.deleteMenu
export const DeleteCompositeOrderOnMenuDelete: Sync = ({
  menu,
  compositeOrder,
  order,
}) => ({
  when: actions([MenuCollection.deleteMenu, { menu }, {}]),
  where: async (frames) => {
    // Find CompositeOrder by associateID (menu) and extract _id
    const resultFrames = new Frames();
    const orderFrames = await frames.query(
      PurchaseSystem._getOrderByAssociateID as unknown as (
        input: { associateID: string },
      ) => Promise<
        Array<{
          order:
            | { _id: string; associateID: string; parentOrder?: string }
            | { _id: string; associateID: string; childAtomicOrders?: string[] }
            | {
              _id: string;
              associateID: string;
              childSelectOrders?: Record<string, number>;
            };
        }>
      >,
      { associateID: menu },
      { order },
    );
    for (const orderFrame of orderFrames) {
      const orderFrameRecord = orderFrame as Record<symbol, unknown>;
      const orderValue = orderFrameRecord[order];
      if (
        orderValue &&
        typeof orderValue === "object" &&
        "childSelectOrders" in orderValue
      ) {
        const compositeOrderId = (orderValue as unknown as { _id: string })._id;
        resultFrames.push({
          ...orderFrame,
          [compositeOrder]: compositeOrderId,
        });
      }
    }
    return resultFrames;
  },
  then: actions([PurchaseSystem.deleteCompositeOrder, { compositeOrder }]),
});

// ============================================================================
// WeeklyCart → PurchaseSystem Syncs
// ============================================================================

// createCompositeOrder when WeeklyCart.createCart
export const CreateCompositeOrderOnCartCreate: Sync = ({ cart }) => ({
  when: actions([WeeklyCart.createCart, {}, { cart }]),
  where: (frames) => {
    if (frames.length === 0) {
      console.warn(
        "[CreateCompositeOrderOnCartCreate] ERROR: No frames matched! Sync will not create composite order.",
      );
      return frames;
    }
    return frames;
  },
  then: actions([
    PurchaseSystem.createCompositeOrder,
    { associateID: cart },
  ]),
});

// addCompositeSubOrder when WeeklyCart.addMenuToCart (case 1: new cart, both orders created in this flow)
// This sync matches on addMenuToCart AND both composite order creations to ensure orders exist
export const AddCompositeSubOrderOnCartAddMenu: Sync = ({
  menu,
  cart,
  cartCompositeOrder,
  menuCompositeOrder,
  cartAssociateID,
  menuAssociateID,
}) => ({
  when: actions(
    [WeeklyCart.addMenuToCart, { menu }, { cart }],
    [
      PurchaseSystem.createCompositeOrder,
      { associateID: cartAssociateID },
      { compositeOrder: cartCompositeOrder },
    ],
    [
      PurchaseSystem.createCompositeOrder,
      { associateID: menuAssociateID },
      { compositeOrder: menuCompositeOrder },
    ],
  ),
  where: (frames) => {
    // Match frames where:
    // - cart from addMenuToCart matches associateID used to create cart composite order
    // - menu from addMenuToCart matches associateID used to create menu composite order
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const cartValue = frameRecord[cart];
      const menuValue = frameRecord[menu];
      const cartAssociateIDValue = frameRecord[cartAssociateID];
      const menuAssociateIDValue = frameRecord[menuAssociateID];
      const cartCompositeOrderValue = frameRecord[cartCompositeOrder];
      const menuCompositeOrderValue = frameRecord[menuCompositeOrder];

      // Verify that the cart from addMenuToCart matches the associateID used for cart composite order
      if (cartValue !== cartAssociateIDValue) {
        continue;
      }

      // Verify that the menu from addMenuToCart matches the associateID used for menu composite order
      if (menuValue !== menuAssociateIDValue) {
        continue;
      }

      // Verify both composite orders are present
      if (
        !cartCompositeOrderValue ||
        !menuCompositeOrderValue ||
        typeof cartCompositeOrderValue !== "string" ||
        typeof menuCompositeOrderValue !== "string"
      ) {
        continue;
      }

      // Create result frame with both composite order IDs
      resultFrames.push({
        ...frame,
        [cartCompositeOrder]: cartCompositeOrderValue,
        [menuCompositeOrder]: menuCompositeOrderValue,
      });
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.addCompositeSubOrder,
    {
      parentOrder: cartCompositeOrder,
      childOrder: menuCompositeOrder,
      scaleFactor: 1.0,
    },
  ]),
});

// addCompositeSubOrder when WeeklyCart.addMenuToCart (case 2: existing cart, only menu order created in this flow)
// This sync matches on addMenuToCart AND menu composite order creation
// The cart composite order already exists from when the cart was created earlier, so we query for it
export const AddCompositeSubOrderOnCartAddMenuExistingCart: Sync = ({
  menu,
  cart,
  cartCompositeOrder,
  menuCompositeOrder,
  menuAssociateID,
  _order,
}) => ({
  when: actions(
    [WeeklyCart.addMenuToCart, { menu }, { cart }],
    [
      PurchaseSystem.createCompositeOrder,
      { associateID: menuAssociateID },
      { compositeOrder: menuCompositeOrder },
    ],
  ),
  where: async (frames) => {
    // Match frames where:
    // - menu from addMenuToCart matches associateID used to create menu composite order
    // - cart composite order exists (query for it since it was created in a previous flow)
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const menuValue = frameRecord[menu];
      const menuAssociateIDValue = frameRecord[menuAssociateID];
      const menuCompositeOrderValue = frameRecord[menuCompositeOrder];
      const cartValue = frameRecord[cart];

      // Verify that the menu from addMenuToCart matches the associateID used for menu composite order
      if (menuValue !== menuAssociateIDValue) {
        continue;
      }

      // Verify menu composite order is present
      if (
        !menuCompositeOrderValue ||
        typeof menuCompositeOrderValue !== "string"
      ) {
        continue;
      }

      // Validate cart value before using it in query
      if (!cartValue || typeof cartValue !== "string") {
        continue;
      }

      // Query for cart composite order
      // If it doesn't exist yet, this is a new cart and the other sync will handle it
      // If it exists, this is an existing cart and we should handle it here
      const cartOrderQueryResult = await PurchaseSystem._getOrderByAssociateID({
        associateID: cartValue as ID,
      });

      // Check if query returned an error (order doesn't exist)
      if (!Array.isArray(cartOrderQueryResult)) {
        // Cart composite order doesn't exist yet - this is a new cart
        // The other sync (AddCompositeSubOrderOnCartAddMenu) will handle it
        // Skip this frame to avoid duplicate processing
        continue;
      }

      // Check if query returned empty result
      if (cartOrderQueryResult.length === 0) {
        // Cart composite order doesn't exist yet - this is a new cart
        // The other sync will handle it
        continue;
      }

      // Find the cart composite order (has childSelectOrders property)
      for (const cartOrderResult of cartOrderQueryResult) {
        const orderValue = cartOrderResult.order;
        if (
          orderValue &&
          typeof orderValue === "object" &&
          "childSelectOrders" in orderValue
        ) {
          const cartOrderId = (orderValue as unknown as { _id: string })._id;
          resultFrames.push({
            ...frame,
            [cartCompositeOrder]: cartOrderId,
            [menuCompositeOrder]: menuCompositeOrderValue,
          });
          // Only need one match
          break;
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.addCompositeSubOrder,
    {
      parentOrder: cartCompositeOrder,
      childOrder: menuCompositeOrder,
      scaleFactor: 1.0,
    },
  ]),
});

// removeCompositeSubOrder when WeeklyCart.removeMenuFromCart
export const RemoveCompositeSubOrderOnCartRemoveMenu: Sync = ({
  menu,
  cart,
  cartCompositeOrder,
  menuCompositeOrder,
  order,
}) => ({
  when: actions([WeeklyCart.removeMenuFromCart, { menu }, { cart }]),
  where: async (frames) => {
    // Find CompositeOrder for cart and menu
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Find cart CompositeOrder
      const cartOrderFrames = await (new Frames(frame).query(
        PurchaseSystem._getOrderByAssociateID as unknown as (
          input: { associateID: string },
        ) => Promise<
          Array<{
            order:
              | { _id: string; associateID: string; parentOrder?: string }
              | {
                _id: string;
                associateID: string;
                childAtomicOrders?: string[];
              }
              | {
                _id: string;
                associateID: string;
                childSelectOrders?: Record<string, number>;
              };
          }>
        >,
        { associateID: cart },
        { order },
      ));

      // Find menu CompositeOrder
      for (const cartFrame of cartOrderFrames) {
        const cartFrameRecord = cartFrame as Record<symbol, unknown>;
        const cartOrderValue = cartFrameRecord[order];
        if (
          cartOrderValue &&
          typeof cartOrderValue === "object" &&
          "childSelectOrders" in cartOrderValue
        ) {
          const cartOrderId =
            (cartOrderValue as unknown as { _id: string })._id;
          const menuOrderFrames = await (new Frames(cartFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: menu },
            { order },
          ));

          // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
          for (const menuFrame of menuOrderFrames) {
            const menuFrameRecord = menuFrame as Record<symbol, unknown>;
            const menuOrderValue = menuFrameRecord[order];
            if (
              menuOrderValue &&
              typeof menuOrderValue === "object" &&
              "childSelectOrders" in menuOrderValue
            ) {
              const menuOrderId =
                (menuOrderValue as unknown as { _id: string })._id;
              resultFrames.push({
                ...menuFrame,
                [cartCompositeOrder]: cartOrderId,
                [menuCompositeOrder]: menuOrderId,
              });
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    PurchaseSystem.removeCompositeSubOrder,
    {
      parentOrder: cartCompositeOrder,
      childOrder: menuCompositeOrder,
    },
  ]),
});

// deleteCompositeOrder when WeeklyCart.deleteCart
export const DeleteCompositeOrderOnCartDelete: Sync = ({
  dateInWeek,
  cart,
  compositeOrder,
  order,
}) => ({
  when: actions([WeeklyCart.deleteCart, { dateInWeek }, {}]),
  where: async (frames) => {
    // Query WeeklyCart to find cart for date
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Get cart by date using WeeklyCart._getCartByDate
      const cartFrames = await (new Frames(frame).query(
        WeeklyCart._getCartByDate as unknown as (
          input: { date: Date },
        ) => Promise<Array<{ cart: string }>>,
        { date: dateInWeek },
        { cart },
      ) as Promise<Frames>);

      // Find CompositeOrder by associateID (cart)
      for (const cartFrame of cartFrames) {
        const cartFrameRecord = cartFrame as Record<symbol, unknown>;
        const cartValue = cartFrameRecord[cart];
        if (typeof cartValue === "string") {
          const orderFrames = await (new Frames(cartFrame).query(
            PurchaseSystem._getOrderByAssociateID as unknown as (
              input: { associateID: string },
            ) => Promise<
              Array<{
                order:
                  | { _id: string; associateID: string; parentOrder?: string }
                  | {
                    _id: string;
                    associateID: string;
                    childAtomicOrders?: string[];
                  }
                  | {
                    _id: string;
                    associateID: string;
                    childSelectOrders?: Record<string, number>;
                  };
              }>
            >,
            { associateID: cartValue },
            { order },
          ));

          // Filter to get CompositeOrder (has childSelectOrders property) and extract _id
          for (const orderFrame of orderFrames) {
            const orderFrameRecord = orderFrame as Record<symbol, unknown>;
            const orderValue = orderFrameRecord[order];
            if (
              orderValue &&
              typeof orderValue === "object" &&
              "childSelectOrders" in orderValue
            ) {
              const compositeOrderId =
                (orderValue as unknown as { _id: string })._id;
              resultFrames.push({
                ...orderFrame,
                [compositeOrder]: compositeOrderId,
              });
            }
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([PurchaseSystem.deleteCompositeOrder, { compositeOrder }]),
});

// ============================================================================
// PurchaseSystem purchaseOrder Admin Authorization Sync
// ============================================================================

// purchaseOrder request with admin check
export const PurchaseOrderRequest: Sync = ({
  request,
  compositeOrder,
  session,
  isAdmin,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/PurchaseSystem/purchaseOrder",
        compositeOrder,
        session,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Check if user is admin
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and check authorization
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean" && adminResult === true) {
          // Only admins can purchase
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    return adminCheckedFrames;
  },
  then: actions([PurchaseSystem.purchaseOrder, { compositeOrder }]),
});

export const PurchaseOrderResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/PurchaseSystem/purchaseOrder" }, {
      request,
    }],
    [PurchaseSystem.purchaseOrder, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const PurchaseOrderResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/PurchaseSystem/purchaseOrder" }, {
      request,
    }],
    [PurchaseSystem.purchaseOrder, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const PurchaseOrderAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/PurchaseSystem/purchaseOrder", session },
      { request },
    ],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid, or user is not admin
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header, or user is not an admin.",
    },
  ]),
});
