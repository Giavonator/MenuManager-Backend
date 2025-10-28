---
timestamp: 'Tue Oct 28 2025 18:41:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_184128.2d43c81f.md]]'
content_id: 52bbcc77db6718acee8b36ea5f75c83fbca9b8e721eaf44de3ba7a22137d1974
---

# response:

```typescript
import { Collection, Db, UpdateFilter } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "PurchaseSystem" + ".";

// Generic types of this concept (these are now the IDs)
type AtomicOrder = ID;
type SelectOrder = ID;
type CompositeOrder = ID;

/* State Interfaces (these are now the Doc interfaces) */

/**
 * a set of AtomicOrder with
 * 	an associateID ID // Associate Order to external globally unique ID
 * 	a quantity Float // Ex. 3.0
 * 	a units String // Ex. "lbs", "oz", "count"
 * 	a price Float // Ex. 5.99 (cost for this specific quantity)
 * 	a parentOrder SelectOrder
 */
interface AtomicOrderDoc {
  _id: AtomicOrder; // Use the new ID type
  associateID: ID;
  quantity: number;
  units: string;
  price: number;
  parentOrder: SelectOrder; // Use the new ID type
}

/**
 * a set of SelectOrder with
 * 	an associateID ID // Associate Order to external globally unique ID
 * 	a baseQuantity Float // Ex. 1.0, (-1 if no childAtomicOrders yet, if so ignore it during calculations)
 * 	a baseUnits String // Ex. "lbs", internal unit conversion table if AtomicOrder has different units
 * 	a childAtomicOrders Set of AtomicOrder // AtomicOrder options available for *this* SelectOrder.
 * 	a parentOrders Set of CompositeOrder\\
 */
interface SelectOrderDoc {
  _id: SelectOrder; // Use the new ID type
  associateID: ID;
  baseQuantity: number; // -1 if no options, otherwise quantity of first added atomic order.
  baseUnits: string; // "" if no options, otherwise units of first added atomic order.
  childAtomicOrders: AtomicOrder[]; // Use the new ID type
  parentOrders: CompositeOrder[]; // Use the new ID type
}

/**
 * a set of CompositeOrder with
 * 	an associateID ID // Associate Order to external globally unique ID
 * 	a childSelectOrders Map of SelectOrder to Float // Scale factor for purchasing calculations
 * 	a childCompositeOrders Map of CompositeOrder to Float // Scale factor for purchasing calculations
 * 	an optimalPurchase Map of AtomicOrder to Int // Calculated during calculateOptimalPurchase, must purchase whole AtomicOrders
 * 	a totalCost Float // Optimally calculated
 * 	a parentOrder CompositeOrder
 * 	a rootOrder CompositeOrder
 * 	a purchased Bool
 */
interface CompositeOrderDoc {
  _id: CompositeOrder; // Use the new ID type
  associateID: ID;
  childSelectOrders: Record<SelectOrder, number>; // Use the new ID type
  childCompositeOrders: Record<CompositeOrder, number>; // Use the new ID type
  optimalPurchase: Record<AtomicOrder, number>; // Use the new ID type
  totalCost: number;
  parentOrder: CompositeOrder; // Use the new ID type
  rootOrder: CompositeOrder; // Use the new ID type
  purchased: boolean;
}

/* Action Input/Output Types */

// createSelectOrder
type CreateSelectOrderInput = { associateID: ID };
type CreateSelectOrderOutput = Result<{ selectOrder: SelectOrder }>;

// createAtomicOrder
type CreateAtomicOrderInput = {
  selectOrder: SelectOrder;
  associateID: ID;
  quantity: number;
  units: string;
  price: number;
};
type CreateAtomicOrderOutput = Result<{ atomicOrder: AtomicOrder }>;

// deleteAtomicOrder
type DeleteAtomicOrderInput = { selectOrder: SelectOrder; atomicOrder: AtomicOrder };
type DeleteAtomicOrderOutput = Result<Empty>;

// updateAtomicOrder (overloaded)
type UpdateAtomicOrderInputQuantity = { atomicOrder: AtomicOrder; quantity: number };
type UpdateAtomicOrderInputUnits = { atomicOrder: AtomicOrder; units: string };
type UpdateAtomicOrderInputPrice = { atomicOrder: AtomicOrder; price: number };
type UpdateAtomicOrderOutput = Result<Empty>;

// createCompositeOrder
type CreateCompositeOrderInput = { associateID: ID };
type CreateCompositeOrderOutput = Result<{ compositeOrder: CompositeOrder }>;

// addSelectOrderToCompositeOrder
type AddSelectOrderToCompositeOrderInput = {
  compositeOrder: CompositeOrder;
  selectOrder: SelectOrder;
  scaleFactor: number;
};
type AddSelectOrderToCompositeOrderOutput = Result<Empty>;

// removeSelectOrderFromCompositeOrder
type RemoveSelectOrderFromCompositeOrderInput = {
  compositeOrder: CompositeOrder;
  selectOrder: SelectOrder;
};
type RemoveSelectOrderFromCompositeOrderOutput = Result<Empty>;

// addCompositeSubOrder
type AddCompositeSubOrderInput = { parentOrder: CompositeOrder; childOrder: CompositeOrder };
type AddCompositeSubOrderOutput = Result<Empty>;

// removeCompositeSubOrder
type RemoveCompositeSubOrderInput = { parentOrder: CompositeOrder; childOrder: CompositeOrder };
type RemoveCompositeSubOrderOutput = Result<Empty>;

// updateSubOrderScaleFactor
type UpdateSubOrderScaleFactorInput = {
  parentOrder: CompositeOrder;
  childOrder: SelectOrder | CompositeOrder;
  newScaleFactor: number;
};
type UpdateSubOrderScaleFactorOutput = Result<Empty>;

// deleteCompositeOrder
type DeleteCompositeOrderInput = { compositeOrder: CompositeOrder };
type DeleteCompositeOrderOutput = Result<Empty>;

// calculateOptimalPurchase
type CalculateOptimalPurchaseInput = { compositeOrders: CompositeOrder[] };
type CalculateOptimalPurchaseOutput = Result<Empty>;

// purchaseOrder
type PurchaseOrderInput = { compositeOrder: CompositeOrder };
type PurchaseOrderOutput = Result<Empty>;

/* Query Input/Output Types */

// _getOrderByAssociateID
type GetOrderByAssociateIDInput = { associateID: ID };
type GetOrderByAssociateIDOutput = Result<
  { order: AtomicOrderDoc | SelectOrderDoc | CompositeOrderDoc }[]
>;

// _getOptimalPurchase
type GetOptimalPurchaseInput = { compositeOrder: CompositeOrder };
type GetOptimalPurchaseOutput = Result<
  { optimalPurchase: Record<AtomicOrder, number> }[]
>;

// _getOrderCost
type GetOrderCostInput = { compositeOrder: CompositeOrder };
type GetOrderCostOutput = Result<{ totalCost: number }[]>;

/**
 * PurchaseSystemConcept
 *
 * purpose: Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts),
 * tracking their purchase status and optimizing selections from available purchasing options.
 */
export default class PurchaseSystemConcept {
  atomicOrders: Collection<AtomicOrderDoc>;
  selectOrders: Collection<SelectOrderDoc>;
  compositeOrders: Collection<CompositeOrderDoc>;

  constructor(private readonly db: Db) {
    this.atomicOrders = this.db.collection(PREFIX + "atomicOrders");
    this.selectOrders = this.db.collection(PREFIX + "selectOrders");
    this.compositeOrders = this.db.collection(PREFIX + "compositeOrders");
  }

  /**
   * Helper to ensure an error message is always a string.
   */
  private getErrorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  /**
   * Helper to find any order (Atomic, Select, or Composite) by its associateID.
   * This is used internally for requirements checking.
   */
  private async findAnyOrderByAssociateID(
    associateID: ID,
  ): Promise<AtomicOrderDoc | SelectOrderDoc | CompositeOrderDoc | null> {
    const atomic = await this.atomicOrders.findOne({ associateID });
    if (atomic) return atomic;
    const select = await this.selectOrders.findOne({ associateID });
    if (select) return select;
    const composite = await this.compositeOrders.findOne({ associateID });
    if (composite) return composite;
    return null;
  }

  /**
   * Helper to find any order (Atomic, Select, or Composite) by its _id.
   * This is used internally for requirements checking.
   */
  private async findAnyOrderById(
    _id: ID,
  ): Promise<AtomicOrderDoc | SelectOrderDoc | CompositeOrderDoc | null> {
    const atomic = await this.atomicOrders.findOne({ _id: _id as AtomicOrder });
    if (atomic) return atomic;
    const select = await this.selectOrders.findOne({ _id: _id as SelectOrder });
    if (select) return select;
    const composite = await this.compositeOrders.findOne({
      _id: _id as CompositeOrder,
    });
    if (composite) return composite;
    return null;
  }

  /**
   * Helper to determine if a cycle would be formed when adding a child composite order to a parent.
   * @param parentId The ID of the potential parent composite order.
   * @param childId The ID of the potential child composite order.
   * @returns True if a cycle would be formed, false otherwise.
   */
  private async wouldFormCycle(
    parentId: CompositeOrder,
    childId: CompositeOrder,
  ): Promise<boolean> {
    if (parentId === childId) return true; // Direct self-referential cycle

    const visited = new Set<CompositeOrder>();
    const queue: CompositeOrder[] = [childId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === parentId) return true; // Parent is an ancestor of child, adding child would form a cycle
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const current = await this.compositeOrders.findOne({ _id: currentId });
      if (current) {
        for (const grandchildId of Object.keys(current.childCompositeOrders)) {
          if (!visited.has(grandchildId as CompositeOrder)) {
            queue.push(grandchildId as CompositeOrder);
          }
        }
      }
    }

    return false;
  }

  /**
   * Recursively updates the rootOrder for a composite order and all its children.
   * @param compositeOrderId The ID of the composite order to start the update from.
   * @param newRootOrderId The ID of the new root order.
   */
  private async updateRootOrderRecursive(
    compositeOrderId: CompositeOrder,
    newRootOrderId: CompositeOrder,
  ): Promise<void> {
    const composite = await this.compositeOrders.findOne({
      _id: compositeOrderId,
    });
    if (composite && composite.rootOrder !== newRootOrderId) {
      await this.compositeOrders.updateOne(
        { _id: compositeOrderId },
        { $set: { rootOrder: newRootOrderId } },
      );
      for (const childId of Object.keys(composite.childCompositeOrders)) {
        await this.updateRootOrderRecursive(childId as CompositeOrder, newRootOrderId);
      }
    }
  }

  /**
   * Action to create a new SelectOrder.
   *
   * createSelectOrder (associateID: ID): (selectOrder: SelectOrder)
   *
   * **requires** No order already exists for `associateID` within this `PurchaseSystem` concept.
   *
   * **effects** Creates a new `SelectOrder` with `associateID`. Initializes `childAtomicOrders` to empty,
   * `baseQuantity` to -1.0, `baseUnits` to "" (ie. no units yet), `parentOrders` to empty. Returns new `selectOrder` ID.
   */
  async createSelectOrder(
    input: CreateSelectOrderInput,
  ): Promise<CreateSelectOrderOutput> {
    try {
      const { associateID } = input;

      // Requires: No order already exists for `associateID`.
      if (await this.findAnyOrderByAssociateID(associateID)) {
        return {
          error: `Order with associateID '${associateID}' already exists.`,
        };
      }

      const newSelectOrderID = freshID() as SelectOrder;
      const newSelectOrder: SelectOrderDoc = {
        _id: newSelectOrderID,
        associateID,
        baseQuantity: -1.0,
        baseUnits: "",
        childAtomicOrders: [],
        parentOrders: [],
      };

      await this.selectOrders.insertOne(newSelectOrder);

      return { selectOrder: newSelectOrderID };
    } catch (e: unknown) {
      return {
        error: `Failed to create SelectOrder: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Action to create a new AtomicOrder.
   *
   * createAtomicOrder (selectOrder: SelectOrder, associateID: ID, quantity: Float, units: String, price: Float): (atomicOrder: AtomicOrder)
   *
   * **requires** `selectOrder` exists. No order already exists for `associateID` within this `PurchaseSystem` concept.
   *
   * **effects** Creates `atomicOrder` with `associateID`, `quantity`, `units`, `price` as arguments and `parentOrder` set to `selectOrder`.
   * Adds `atomicOrder` to `selectOrder.childAtomicOrders`. If this is the first AtomicOrder option for `selectOrder` sets
   * `selectOrder.baseUnits` and `selectOrder.baseQuantity` to `units` and `quantity` respectively, if its a subsequent
   * then no modification to `selectOrder.baseUnits` and `selectOrder.baseQuantity` is necessary.
   * Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates)
   * of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.
   */
  async createAtomicOrder(
    input: CreateAtomicOrderInput,
  ): Promise<CreateAtomicOrderOutput> {
    try {
      const {
        selectOrder: selectOrderID,
        associateID,
        quantity,
        units,
        price,
      } = input;

      // Requires: `selectOrder` exists.
      const existingSelectOrder = await this.selectOrders.findOne({
        _id: selectOrderID,
      });
      if (!existingSelectOrder) {
        return { error: `SelectOrder with ID '${selectOrderID}' not found.` };
      }

      // Requires: No order already exists for `associateID`.
      if (await this.findAnyOrderByAssociateID(associateID)) {
        return {
          error: `Order with associateID '${associateID}' already exists.`,
        };
      }

      const newAtomicOrderID = freshID() as AtomicOrder;
      const newAtomicOrder: AtomicOrderDoc = {
        _id: newAtomicOrderID,
        associateID,
        quantity,
        units,
        price,
        parentOrder: selectOrderID,
      };

      await this.atomicOrders.insertOne(newAtomicOrder);

      const updateSelectOrder: UpdateFilter<SelectOrderDoc> = {
        $push: { childAtomicOrders: newAtomicOrderID },
      };

      // If this is the first AtomicOrder option for `selectOrder`
      if (existingSelectOrder.childAtomicOrders.length === 0) {
        updateSelectOrder.$set = {
          baseQuantity: quantity,
          baseUnits: units,
        };
      }

      await this.selectOrders.updateOne(
        { _id: selectOrderID },
        updateSelectOrder,
      );

      // Call calculateOptimalPurchase for relevant root orders
      const rootOrdersToRecalculate = new Set<CompositeOrder>();
      for (const parentCompositeOrderID of existingSelectOrder.parentOrders) {
        const parentCompositeOrder = await this.compositeOrders.findOne({
          _id: parentCompositeOrderID,
        });
        if (parentCompositeOrder) {
          rootOrdersToRecalculate.add(parentCompositeOrder.rootOrder);
        }
      }
      if (rootOrdersToRecalculate.size > 0) {
        await this.calculateOptimalPurchase({
          compositeOrders: Array.from(rootOrdersToRecalculate),
        });
      }

      return { atomicOrder: newAtomicOrderID };
    } catch (e: unknown) {
      return {
        error: `Failed to create AtomicOrder: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Action to delete an AtomicOrder.
   *
   * deleteAtomicOrder (selectOrder: SelectOrder, atomicOrder: AtomicOrder)
   *
   * **requires** `selectOrder` exists. `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.
   *
   * **effects** Removes `atomicOrder` from `selectOrder.childAtomicOrders`. Delete `atomicOrder`.
   * If `atomicOrder` was the last AtomicOrder in `selectOrder.childAtomicOrders` then sets
   * `selectOrder.baseQuantity` to -1 and `selectOrder.baseUnits` to "".
   * Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates)
   * of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.
   */
  async deleteAtomicOrder(
    input: DeleteAtomicOrderInput,
  ): Promise<DeleteAtomicOrderOutput> {
    try {
      const { selectOrder: selectOrderID, atomicOrder: atomicOrderID } = input;

      // Requires: `selectOrder` exists.
      const existingSelectOrder = await this.selectOrders.findOne({
        _id: selectOrderID,
      });
      if (!existingSelectOrder) {
        return { error: `SelectOrder with ID '${selectOrderID}' not found.` };
      }

      // Requires: `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.
      const existingAtomicOrder = await this.atomicOrders.findOne({
        _id: atomicOrderID,
      });
      if (!existingAtomicOrder) {
        return { error: `AtomicOrder with ID '${atomicOrderID}' not found.` };
      }
      if (!existingSelectOrder.childAtomicOrders.includes(atomicOrderID)) {
        return {
          error:
            `AtomicOrder '${atomicOrderID}' is not a child of SelectOrder '${selectOrderID}'.`,
        };
      }

      // Remove `atomicOrder` from `selectOrder.childAtomicOrders`.
      await this.selectOrders.updateOne(
        { _id: selectOrderID },
        { $pull: { childAtomicOrders: atomicOrderID } },
      );

      // Delete `atomicOrder`.
      await this.atomicOrders.deleteOne({ _id: atomicOrderID });

      // If `atomicOrder` was the first AtomicOrder or the last one, update baseQuantity/baseUnits
      const updatedSelectOrder = await this.selectOrders.findOne({
        _id: selectOrderID,
      }); // Re-fetch updated select order
      if (updatedSelectOrder) {
        if (updatedSelectOrder.childAtomicOrders.length === 0) {
          // If no more atomic orders, reset base quantity/units
          await this.selectOrders.updateOne(
            { _id: selectOrderID },
            { $set: { baseQuantity: -1, baseUnits: "" } },
          );
        } else if (
          existingSelectOrder.baseQuantity === existingAtomicOrder.quantity &&
          existingSelectOrder.baseUnits === existingAtomicOrder.units
        ) {
          // If the deleted atomic order was setting the base quantity/units,
          // update them to the first remaining atomic order.
          const firstRemainingAtomicOrder = await this.atomicOrders.findOne({
            _id: updatedSelectOrder.childAtomicOrders[0],
          });
          if (firstRemainingAtomicOrder) {
            await this.selectOrders.updateOne(
              { _id: selectOrderID },
              {
                $set: {
                  baseQuantity: firstRemainingAtomicOrder.quantity,
                  baseUnits: firstRemainingAtomicOrder.units,
                },
              },
            );
          } else {
            // Fallback in case of unexpected empty childAtomicOrders after re-fetch.
            await this.selectOrders.updateOne(
              { _id: selectOrderID },
              { $set: { baseQuantity: -1, baseUnits: "" } },
            );
          }
        }
      }

      // Call calculateOptimalPurchase for relevant root orders
      const rootOrdersToRecalculate = new Set<CompositeOrder>();
      for (const parentCompositeOrderID of existingSelectOrder.parentOrders) {
        const parentCompositeOrder = await this.compositeOrders.findOne({
          _id: parentCompositeOrderID,
        });
        if (parentCompositeOrder) {
          rootOrdersToRecalculate.add(parentCompositeOrder.rootOrder);
        }
      }
      if (rootOrdersToRecalculate.size > 0) {
        await this.calculateOptimalPurchase({
          compositeOrders: Array.from(rootOrdersToRecalculate),
        });
      }

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to delete AtomicOrder: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Action to update an AtomicOrder's quantity, units, or price.
   *
   * updateAtomicOrder (atomicOrder: AtomicOrder, quantity: Float)
   * updateAtomicOrder (atomicOrder: AtomicOrder, units: String)
   * updateAtomicOrder (atomicOrder: AtomicOrder, price: Float)
   *
   * **requires** `atomicOrder` exists.
   *
   * **effects** Updates the respective attribute within `atomicOrder`.
   * Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates)
   * of every `parentOrder.rootOrder` within `atomicOrder.parentOrder.parentOrders`.
   */
  async updateAtomicOrder(
    input:
      | UpdateAtomicOrderInputQuantity
      | UpdateAtomicOrderInputUnits
      | UpdateAtomicOrderInputPrice,
  ): Promise<UpdateAtomicOrderOutput> {
    try {
      const { atomicOrder: atomicOrderID } = input;

      // Requires: `atomicOrder` exists.
      const existingAtomicOrder = await this.atomicOrders.findOne({
        _id: atomicOrderID,
      });
      if (!existingAtomicOrder) {
        return { error: `AtomicOrder with ID '${atomicOrderID}' not found.` };
      }

      const updateFields: Partial<AtomicOrderDoc> = {};
      if ("quantity" in input) {
        updateFields.quantity = input.quantity;
      }
      if ("units" in input) {
        updateFields.units = input.units;
      }
      if ("price" in input) {
        updateFields.price = input.price;
      }

      if (Object.keys(updateFields).length > 0) {
        await this.atomicOrders.updateOne(
          { _id: atomicOrderID },
          { $set: updateFields },
        );

        // Effects related to SelectOrder base quantity/units if this atomic order was the first one
        const parentSelectOrder = await this.selectOrders.findOne({
          _id: existingAtomicOrder.parentOrder,
        });
        if (
          parentSelectOrder &&
          parentSelectOrder.childAtomicOrders[0] === atomicOrderID
        ) {
          const updatedAtomicOrder = await this.atomicOrders.findOne({
            _id: atomicOrderID,
          });
          if (updatedAtomicOrder) {
            await this.selectOrders.updateOne(
              { _id: parentSelectOrder._id },
              {
                $set: {
                  baseQuantity: updatedAtomicOrder.quantity,
                  baseUnits: updatedAtomicOrder.units,
                },
              },
            );
          }
        }
      }

      // Call calculateOptimalPurchase for relevant root orders
      const rootOrdersToRecalculate = new Set<CompositeOrder>();
      const parentSelectOrder = await this.selectOrders.findOne({
        _id: existingAtomicOrder.parentOrder,
      });
      if (parentSelectOrder) {
        for (const parentCompositeOrderID of parentSelectOrder.parentOrders) {
          const parentCompositeOrder = await this.compositeOrders.findOne({
            _id: parentCompositeOrderID,
          });
          if (parentCompositeOrder) {
            rootOrdersToRecalculate.add(parentCompositeOrder.rootOrder);
          }
        }
      }
      if (rootOrdersToRecalculate.size > 0) {
        await this.calculateOptimalPurchase({
          compositeOrders: Array.from(rootOrdersToRecalculate),
        });
      }

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to update AtomicOrder: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Action to create a new CompositeOrder.
   *
   * createCompositeOrder (associateID: ID): (compositeOrder: CompositeOrder)
   *
   * **requires** No order already exists for `associateID` within this `PurchaseSystem` concept.
   *
   * **effects** Creates a new `CompositeOrder` with `associateID`. Initializes `childSelectOrders` to empty,
   * `childCompositeOrders` to empty, optimalPurchase to empty, `totalCost` to 0.0, `purchased` to `false`,
   * `parentOrder` to itself (if `parentOrder` is itself then we know we are at root), and `rootOrder` to itself.
   * Returns the new `CompositeOrder` ID.
   */
  async createCompositeOrder(
    input: CreateCompositeOrderInput,
  ): Promise<CreateCompositeOrderOutput> {
    try {
      const { associateID } = input;

      // Requires: No order already exists for `associateID`.
      if (await this.findAnyOrderByAssociateID(associateID)) {
        return {
          error: `Order with associateID '${associateID}' already exists.`,
        };
      }

      const newCompositeOrderID = freshID() as CompositeOrder;
      const newCompositeOrder: CompositeOrderDoc = {
        _id: newCompositeOrderID,
        associateID,
        childSelectOrders: {},
        childCompositeOrders: {},
        optimalPurchase: {},
        totalCost: 0.0,
        purchased: false,
        parentOrder: newCompositeOrderID, // It is its own parent initially (root)
        rootOrder: newCompositeOrderID, // It is its own root initially
      };

      await this.compositeOrders.insertOne(newCompositeOrder);

      return { compositeOrder: newCompositeOrderID };
    } catch (e: unknown) {
      return {
        error: `Failed to create CompositeOrder: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Action to add a SelectOrder to a CompositeOrder.
   *
   * addSelectOrderToCompositeOrder (compositeOrder: CompositeOrder, selectOrder: SelectOrder, scaleFactor: Float)
   *
   * **requires** `compositeOrder` exists. `selectOrder` exists. `scaleFactor` > 0.
   *
   * **effects** Maps `selectOrder` within `compositeOrder.childSelectOrders` to the given `scaleFactor`.
   * Adds `compositeOrder` to the set `selectOrder.parentOrders`.
   * Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.
   */
  async addSelectOrderToCompositeOrder(
    input: AddSelectOrderToCompositeOrderInput,
  ): Promise<AddSelectOrderToCompositeOrderOutput> {
    try {
      const {
        compositeOrder: compositeOrderID,
        selectOrder: selectOrderID,
        scaleFactor,
      } = input;

      // Requires: `compositeOrder` exists.
      const existingCompositeOrder = await this.compositeOrders.findOne({
        _id: compositeOrderID,
      });
      if (!existingCompositeOrder) {
        return {
          error: `CompositeOrder with ID '${compositeOrderID}' not found.`,
        };
      }

      // Requires: `selectOrder` exists.
      const existingSelectOrder = await this.selectOrders.findOne({
        _id: selectOrderID,
      });
      if (!existingSelectOrder) {
        return { error: `SelectOrder with ID '${selectOrderID}' not found.` };
      }

      // Requires: `scaleFactor` > 0.
      if (scaleFactor <= 0) {
        return { error: "Scale factor must be greater than 0." };
      }

      // Update `compositeOrder.childSelectOrders`
      await this.compositeOrders.updateOne(
        { _id: compositeOrderID },
        { $set: { [`childSelectOrders.${selectOrderID}`]: scaleFactor } },
      );

      // Add `compositeOrder` to `selectOrder.parentOrders` (ensure no duplicates)
      if (!existingSelectOrder.parentOrders.includes(compositeOrderID)) {
        await this.selectOrders.updateOne(
          { _id: selectOrderID },
          { $push: { parentOrders: compositeOrderID } },
        );
      }

      // Call `calculateOptimalPurchase` for the root order
      await this.calculateOptimalPurchase({
        compositeOrders: [existingCompositeOrder.rootOrder],
      });

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to add SelectOrder to CompositeOrder: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Action to remove a SelectOrder from a CompositeOrder.
   *
   * removeSelectOrderFromCompositeOrder (compositeOrder: CompositeOrder, selectOrder: SelectOrder)
   *
   * **requires** `compositeOrder` exists. `selectOrder` exists. `selectOrder` is within `compositeOrder.childSelectOrders`.
   *
   * **effects** Removes `selectOrder` from `compositeOrder.childSelectOrders`.
   * Removes `compositeOrder` from the set `selectOrder.parentOrders`.
   * Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.
   */
  async removeSelectOrderFromCompositeOrder(
    input: RemoveSelectOrderFromCompositeOrderInput,
  ): Promise<RemoveSelectOrderFromCompositeOrderOutput> {
    try {
      const { compositeOrder: compositeOrderID, selectOrder: selectOrderID } =
        input;

      // Requires: `compositeOrder` exists.
      const existingCompositeOrder = await this.compositeOrders.findOne({
        _id: compositeOrderID,
      });
      if (!existingCompositeOrder) {
        return {
          error: `CompositeOrder with ID '${compositeOrderID}' not found.`,
        };
      }

      // Requires: `selectOrder` exists.
      const existingSelectOrder = await this.selectOrders.findOne({
        _id: selectOrderID,
      });
      if (!existingSelectOrder) {
        return { error: `SelectOrder with ID '${selectOrderID}' not found.` };
      }

      // Requires: `selectOrder` is within `compositeOrder.childSelectOrders`.
      if (!(selectOrderID in existingCompositeOrder.childSelectOrders)) {
        return {
          error:
            `SelectOrder '${selectOrderID}' is not a child of CompositeOrder '${compositeOrderID}'.`,
        };
      }

      // Remove `selectOrder` from `compositeOrder.childSelectOrders`.
      await this.compositeOrders.updateOne(
        { _id: compositeOrderID },
        { $unset: { [`childSelectOrders.${selectOrderID}`]: "" } },
      );

      // Remove `compositeOrder` from `selectOrder.parentOrders`.
      await this.selectOrders.updateOne(
        { _id: selectOrderID },
        { $pull: { parentOrders: compositeOrderID } },
      );

      // Call `calculateOptimalPurchase` for the root order
      await this.calculateOptimalPurchase({
        compositeOrders: [existingCompositeOrder.rootOrder],
      });

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to remove SelectOrder from CompositeOrder: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Action to add a Composite sub-order to a parent CompositeOrder.
   *
   * addCompositeSubOrder (parentOrder: CompositeOrder, childOrder: CompositeOrder)
   *
   * **requires** `parentOrder` exists. `childOrder` exists.
   * For all `childOrder.childCompositeOrders` and the subsequent CompositeOrder children,
   * none of which are within `parentOrder.childCompositeOrders` or its subsequent children
   * (Essentially requires no cycle to be formed).
   *
   * **effects** Adds `childOrder` to `parentOrder.childCompositeOrders`.
   * Sets `childOrder.parentOrder` to `parentOrder` and `childOrder.rootOrder` to `parentOrder.rootOrder`.
   * Sets all `childOrder.childCompositeOrders` and their subsequent CompositeOrder children to have new root `parentOrder.rootOrder`.
   * Lastly, calls `calculateOptimalPurchase` for one `parentOrder.rootOrder` afterwards.
   */
  async addCompositeSubOrder(
    input: AddCompositeSubOrderInput,
  ): Promise<AddCompositeSubOrderOutput> {
    try {
      const { parentOrder: parentOrderID, childOrder: childOrderID } = input;

      // Requires: `parentOrder` exists.
      const existingParentOrder = await this.compositeOrders.findOne({
        _id: parentOrderID,
      });
      if (!existingParentOrder) {
        return { error: `Parent CompositeOrder '${parentOrderID}' not found.` };
      }

      // Requires: `childOrder` exists.
      const existingChildOrder = await this.compositeOrders.findOne({
        _id: childOrderID,
      });
      if (!existingChildOrder) {
        return { error: `Child CompositeOrder '${childOrderID}' not found.` };
      }

      // Cannot add a composite order to itself
      if (parentOrderID === childOrderID) {
        return { error: "Cannot add a composite order as a child of itself." };
      }

      // Requires: No cycle to be formed.
      if (await this.wouldFormCycle(parentOrderID, childOrderID)) {
        return {
          error:
            `Adding CompositeOrder '${childOrderID}' to '${parentOrderID}' would form a cycle.`,
        };
      }

      // Add `childOrder` to `parentOrder.childCompositeOrders` (with default scale factor 1.0)
      await this.compositeOrders.updateOne(
        { _id: parentOrderID },
        { $set: { [`childCompositeOrders.${childOrderID}`]: 1.0 } }, // Default scale factor
      );

      // Set `childOrder.parentOrder` to `parentOrder`.
      await this.compositeOrders.updateOne(
        { _id: childOrderID },
        { $set: { parentOrder: parentOrderID } },
      );

      // Sets all `childOrder.childCompositeOrders` and their subsequent CompositeOrder children to have new root `parentOrder.rootOrder`.
      await this.updateRootOrderRecursive(
        childOrderID,
        existingParentOrder.rootOrder,
      );

      // Call `calculateOptimalPurchase` for the root order
      await this.calculateOptimalPurchase({
        compositeOrders: [existingParentOrder.rootOrder],
      });

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to add Composite sub-order: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Action to remove a Composite sub-order from a parent CompositeOrder.
   *
   * removeCompositeSubOrder (parentOrder: CompositeOrder, childOrder: CompositeOrder)
   *
   * **requires** `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders`.
   *
   * **effects** Removes `childOrder` from `parentOrder.childCompositeOrders`.
   * Sets `childOrder.parentOrder` and `childOrder.rootOrder` to `childOrder` (itself).
   * Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder` and `childOrder` (if different).
   */
  async removeCompositeSubOrder(
    input: RemoveCompositeSubOrderInput,
  ): Promise<RemoveCompositeSubOrderOutput> {
    try {
      const { parentOrder: parentOrderID, childOrder: childOrderID } = input;

      // Requires: `parentOrder` exists.
      const existingParentOrder = await this.compositeOrders.findOne({
        _id: parentOrderID,
      });
      if (!existingParentOrder) {
        return { error: `Parent CompositeOrder '${parentOrderID}' not found.` };
      }

      // Requires: `childOrder` exists and is in `parentOrder.childCompositeOrders`.
      const existingChildOrder = await this.compositeOrders.findOne({
        _id: childOrderID,
      });
      if (!existingChildOrder) {
        return { error: `Child CompositeOrder '${childOrderID}' not found.` };
      }
      if (!(childOrderID in existingParentOrder.childCompositeOrders)) {
        return {
          error:
            `Child CompositeOrder '${childOrderID}' is not a child of Parent CompositeOrder '${parentOrderID}'.`,
        };
      }

      // Remove `childOrder` from `parentOrder.childCompositeOrders`.
      await this.compositeOrders.updateOne(
        { _id: parentOrderID },
        { $unset: { [`childCompositeOrders.${childOrderID}`]: "" } },
      );

      // Sets `childOrder.parentOrder` and `childOrder.rootOrder` to `childOrder` (itself).
      // Also update its children recursively.
      await this.compositeOrders.updateOne(
        { _id: childOrderID },
        { $set: { parentOrder: childOrderID } },
      );
      await this.updateRootOrderRecursive(childOrderID, childOrderID);

      // Call `calculateOptimalPurchase` for relevant root orders
      const rootOrdersToRecalculate = new Set<CompositeOrder>();
      rootOrdersToRecalculate.add(existingParentOrder.rootOrder);
      // If the child became a new root, also recalculate its tree.
      // This is implicit if childOrderID is added to rootOrdersToRecalculate.
      if (existingChildOrder.rootOrder !== childOrderID) { // If child's old root was different from its new root
        rootOrdersToRecalculate.add(childOrderID); // Add child's new root
      }

      await this.calculateOptimalPurchase({
        compositeOrders: Array.from(rootOrdersToRecalculate),
      });

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to remove Composite sub-order: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Action to update the scale factor of a child order (Select or Composite) within a parent CompositeOrder.
   *
   * updateSubOrderScaleFactor (parentOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder), newScaleFactor: Float)
   *
   * **requires** `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders` or in `parentOrder.childSelectOrders`.
   * `newScaleFactor` > 0.
   *
   * **effects** Maps `childOrder` within `parentOrder.childCompositeOrders` or `parentOrder.childSelectOrders`
   * (depending on what type child is) to `newScaleFactor`.
   * Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder`.
   */
  async updateSubOrderScaleFactor(
    input: UpdateSubOrderScaleFactorInput,
  ): Promise<UpdateSubOrderScaleFactorOutput> {
    try {
      const {
        parentOrder: parentOrderID,
        childOrder: childOrderID,
        newScaleFactor,
      } = input;

      // Requires: `parentOrder` exists.
      const existingParentOrder = await this.compositeOrders.findOne({
        _id: parentOrderID,
      });
      if (!existingParentOrder) {
        return { error: `Parent CompositeOrder '${parentOrderID}' not found.` };
      }

      // Requires: `childOrder` exists.
      const existingChildOrder = await this.findAnyOrderById(childOrderID);
      if (!existingChildOrder) {
        return { error: `Child Order '${childOrderID}' not found.` };
      }

      // Requires: `newScaleFactor` > 0.
      if (newScaleFactor <= 0) {
        return { error: "New scale factor must be greater than 0." };
      }

      let updateField: string | null = null;
      if (childOrderID in existingParentOrder.childSelectOrders) {
        updateField = `childSelectOrders.${childOrderID}`;
      } else if (childOrderID in existingParentOrder.childCompositeOrders) {
        updateField = `childCompositeOrders.${childOrderID}`;
      } else {
        return {
          error:
            `Child Order '${childOrderID}' is not a direct child of CompositeOrder '${parentOrderID}'.`,
        };
      }

      // Update the scale factor
      await this.compositeOrders.updateOne(
        { _id: parentOrderID },
        { $set: { [updateField]: newScaleFactor } },
      );

      // Call `calculateOptimalPurchase` for the root order
      await this.calculateOptimalPurchase({
        compositeOrders: [existingParentOrder.rootOrder],
      });

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to update sub-order scale factor: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Action to delete a CompositeOrder.
   *
   * deleteCompositeOrder (compositeOrder: CompositeOrder)
   *
   * **requires** `compositeOrder` exists.
   *
   * **effects** Calls removeSelectOrderFromCompositeOrder for every SelectOrder in `compositeOrder.childSelectOrders`.
   * Recursively calls deleteCompositeOrder for every CompositeOrder in `compositeOrder.childCompositeOrders`.
   * If `compositeOrder` had a parent, it's removed from the parent's `childCompositeOrders`.
   * Calls `calculateOptimalPurchase` for the root of the affected tree(s).
   * Finally, removes `compositeOrder` from the state.
   */
  async deleteCompositeOrder(
    input: DeleteCompositeOrderInput,
  ): Promise<DeleteCompositeOrderOutput> {
    try {
      const { compositeOrder: compositeOrderID } = input;

      // Requires: `compositeOrder` exists.
      const existingCompositeOrder = await this.compositeOrders.findOne({
        _id: compositeOrderID,
      });
      if (!existingCompositeOrder) {
        return {
          error: `CompositeOrder with ID '${compositeOrderID}' not found.`,
        };
      }

      const parentOfDeleted = existingCompositeOrder.parentOrder;

      // Handle children: remove SelectOrders first
      // Note: removeSelectOrderFromCompositeOrder updates its own root. This can be optimized to batch calls.
      for (
        const selectOrderID of Object.keys(
          existingCompositeOrder.childSelectOrders,
        )
      ) {
        await this.removeSelectOrderFromCompositeOrder({
          compositeOrder: compositeOrderID,
          selectOrder: selectOrderID as SelectOrder,
        });
      }

      // Recursively delete child CompositeOrders
      // Use a temporary array to avoid modifying the map during iteration
      const childCompositeOrderIDs = Object.keys(
        existingCompositeOrder.childCompositeOrders,
      );
      for (const childCompositeOrderID of childCompositeOrderIDs) {
        // This recursive call will handle removing children from their parents and updating roots
        await this.deleteCompositeOrder({
          compositeOrder: childCompositeOrderID as CompositeOrder,
        });
      }

      // If this order has a parent, remove it from the parent's children map
      if (parentOfDeleted !== compositeOrderID) { // Not a root itself
        await this.compositeOrders.updateOne(
          { _id: parentOfDeleted },
          { $unset: { [`childCompositeOrders.${compositeOrderID}`]: "" } },
        );
      }

      // Finally, remove `compositeOrder` from the state.
      await this.compositeOrders.deleteOne({ _id: compositeOrderID });

      // Call `calculateOptimalPurchase` for the affected root order(s)
      const rootOrdersToRecalculate = new Set<CompositeOrder>();
      if (parentOfDeleted !== compositeOrderID) { // If the deleted order had a parent, recalculate that parent's root
        const parentOrderDoc = await this.compositeOrders.findOne({
          _id: parentOfDeleted,
        });
        if (parentOrderDoc) {
          rootOrdersToRecalculate.add(parentOrderDoc.rootOrder);
        }
      }

      if (rootOrdersToRecalculate.size > 0) {
        await this.calculateOptimalPurchase({
          compositeOrders: Array.from(rootOrdersToRecalculate),
        });
      }

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to delete CompositeOrder: ${this.getErrorMessage(e)}`,
      };
    }
  }

  /**
   * Helper to perform a DFS for collecting tree info (composite orders, select order IDs) and resetting costs.
   * @param compositeOrderID The current composite order ID to process.
   * @param compositeOrdersInTree Map to store all CompositeOrder docs in the tree (cached).
   * @param inDegreeMap Map to build in-degrees for topological sort.
   * @param visitedForTreeBuilding Set to prevent infinite loops in cyclic graphs.
   * @param allSelectOrderIdsInTree Set to collect unique select order IDs for base optimization.
   */
  private async dfsCollectTreeInfoAndReset(
    compositeOrderID: CompositeOrder,
    compositeOrdersInTree: Map<CompositeOrder, CompositeOrderDoc>,
    inDegreeMap: Map<CompositeOrder, number>,
    visitedForTreeBuilding: Set<CompositeOrder>,
    allSelectOrderIdsInTree: Set<SelectOrder>,
  ): Promise<void> {
    if (visitedForTreeBuilding.has(compositeOrderID)) {
      return; // Already visited in this traversal
    }
    visitedForTreeBuilding.add(compositeOrderID);

    const currentComposite = await this.compositeOrders.findOne({
      _id: compositeOrderID,
    });
    if (!currentComposite) {
      console.warn(
        `dfsCollectTreeInfoAndReset: CompositeOrder '${compositeOrderID}' not found.`,
      );
      return;
    }

    compositeOrdersInTree.set(compositeOrderID, currentComposite); // Cache the document
    inDegreeMap.set(
      compositeOrderID,
      Object.keys(currentComposite.childCompositeOrders).length,
    );

    // Reset totalCost and optimalPurchase in DB for this composite order
    await this.compositeOrders.updateOne(
      { _id: compositeOrderID },
      { $set: { totalCost: 0.0, optimalPurchase: {} } },
    );

    // Collect unique SelectOrder IDs referenced by this composite order
    for (const selectID in currentComposite.childSelectOrders) {
      allSelectOrderIdsInTree.add(selectID as SelectOrder);
    }

    // Recurse for child CompositeOrders
    for (const childCompID in currentComposite.childCompositeOrders) {
      await this.dfsCollectTreeInfoAndReset(
        childCompID as CompositeOrder,
        compositeOrdersInTree,
        inDegreeMap,
        visitedForTreeBuilding,
        allSelectOrderIdsInTree,
      );
    }
  }

  /**
   * Action to calculate the optimal purchase for a set of CompositeOrders.
   * This is a complex action that traverses the composite order tree, aggregates requirements,
   * finds optimal atomic order combinations, and propagates costs and optimal purchases upwards.
   *
   * calculateOptimalPurchase (compositeOrders: Set of CompositeOrder)
   *
   * **requires** Every CompositeOrder in `compositeOrders` exists.
   *
   * **effects** Don't add to state but for this action keep track of `processedRootNodes`.
   * For each `compositeOrder` in the passed in set of `compositeOrders`:
   * If `compositeOrder.purchased`, skip it.
   * If `compositeOrder.rootOrder` is in `processedRootNodes`, skip it.
   * Now knowing we have a tree that has not been purchased or already calculated during this action, we continue.
   * From the `compositeOrder.rootOrder` we propagate down multiplying the scaling factors,
   * until we have gone through every CompositeOrder in the tree and now have a map of SelectOrder to Float
   * for every SelectOrder we need to purchase for this `compositeOrder.rootOrder`
   * (if SelectOrder doesn't have an AtomicOrder option, have cost for this SelectOrder during calculations be zero).
   * For each individual SelectOrder now knowing its total scale factor,
   * we select the optimal AtomicOrder that when purchased in multiples can buy at least the necessary quantity for the least amount of money.
   * Now knowing all of the optimal AtomicOrders, we use those to propagate up from the leaf CompositeOrders
   * calculating their costs and setting the `compositeOrder.totalCost` and `compositeOrder.optimalPurchase` map for every CompositeOrder.
   */
  async calculateOptimalPurchase(
    input: CalculateOptimalPurchaseInput,
  ): Promise<CalculateOptimalPurchaseOutput> {
    try {
      const { compositeOrders: compositeOrderIDs } = input;
      const processedRootNodes = new Set<CompositeOrder>();

      for (const initialCompositeOrderID of compositeOrderIDs) {
        const initialCompositeOrder = await this.compositeOrders.findOne({
          _id: initialCompositeOrderID,
        });
        if (!initialCompositeOrder) {
          console.warn(
            `calculateOptimalPurchase: CompositeOrder with ID '${initialCompositeOrderID}' not found. Skipping.`,
          );
          continue;
        }

        if (initialCompositeOrder.purchased) {
          continue; // Skip if already purchased
        }

        const rootOrderID = initialCompositeOrder.rootOrder;
        if (processedRootNodes.has(rootOrderID)) {
          continue; // Already processed this root tree in this call
        }
        processedRootNodes.add(rootOrderID);

        const compositeOrdersInTree = new Map<CompositeOrder, CompositeOrderDoc>(); // All CompositeOrder docs for current root tree
        const inDegree = new Map<CompositeOrder, number>(); // For topological sort in Pass 2 (number of unprocessed children)
        const visitedForTreeBuilding = new Set<CompositeOrder>(); // To prevent loops during the DFS traversal
        const allSelectOrderIdsInTree = new Set<SelectOrder>(); // To collect unique select order IDs for base optimization

        // Pass 1: Downward DFS to build tree structure, reset costs, and collect unique SelectOrder IDs
        await this.dfsCollectTreeInfoAndReset(
          rootOrderID,
          compositeOrdersInTree,
          inDegree,
          visitedForTreeBuilding,
          allSelectOrderIdsInTree,
        );

        const baseSelectOrderOptimalChoices = new Map<
          SelectOrder,
          { atomicId: AtomicOrder; quantity: number; cost: number } // quantity is number of atomic units to buy base, cost is for baseQuantity
        >();

        for (const selectOrderID of allSelectOrderIdsInTree) {
          const selectOrderDoc = await this.selectOrders.findOne({
            _id: selectOrderID,
          });
          if (!selectOrderDoc || selectOrderDoc.baseQuantity === -1) {
            continue; // Skip if no options or uninitialized base quantity
          }

          let bestAtomicOption: AtomicOrderDoc | null = null;
          let minCostForBaseQuantity = Infinity;
          let optimalAtomicUnitsToBuyForBase = 0;

          const atomicOptions = await this.atomicOrders
            .find({ _id: { $in: selectOrderDoc.childAtomicOrders } })
            .toArray();

          for (const atomicOption of atomicOptions) {
            if (atomicOption.quantity <= 0) continue; // Invalid atomic option (e.g., division by zero)

            if (atomicOption.units !== selectOrderDoc.baseUnits) {
              console.warn(
                `Unit mismatch for SelectOrder '${selectOrderID}' (base: ${selectOrderDoc.baseUnits}) and AtomicOrder '${atomicOption._id}' (prov: ${atomicOption.units}). Assuming cost calculation is based on numeric quantity despite unit difference. A robust system would require unit conversion.`,
              );
            }

            const numUnitsToBuy = Math.ceil(
              selectOrderDoc.baseQuantity / atomicOption.quantity,
            );
            const currentOptionCost = numUnitsToBuy * atomicOption.price;

            if (currentOptionCost < minCostForBaseQuantity) {
              minCostForBaseQuantity = currentOptionCost;
              bestAtomicOption = atomicOption;
              optimalAtomicUnitsToBuyForBase = numUnitsToBuy;
            }
          }

          if (bestAtomicOption) {
            baseSelectOrderOptimalChoices.set(selectOrderID, {
              atomicId: bestAtomicOption._id,
              quantity: optimalAtomicUnitsToBuyForBase,
              cost: minCostForBaseQuantity,
            });
          }
          // If no bestAtomicOption found (e.g., no compatible atomic orders), it's not added to the map.
          // This implies a cost/quantity contribution of 0 from this SelectOrder.
        }

        // Pass 2: Upward Traversal (Topological Sort) to Aggregate Costs and Optimal Purchases
        const compositeOrderProcessQueue: CompositeOrder[] = [];
        const compositeIdToChildrenMap = new Map<CompositeOrder, CompositeOrder[]>(); // Helper to quickly find children for processing

        // Initialize queue with leaf composite orders (those with no composite children)
        for (const compositeID of compositeOrdersInTree.keys()) {
          const comp = compositeOrdersInTree.get(compositeID)!;
          const childCompIDs = Object.keys(comp.childCompositeOrders).map(
            (id) => id as CompositeOrder,
          );
          compositeIdToChildrenMap.set(compositeID, childCompIDs); // Cache children list

          if (inDegree.get(compositeID) === 0) { // Leaf nodes have 0 composite children to depend on
            compositeOrderProcessQueue.push(compositeID);
          }
        }

        const calculatedIntermediateResults = new Map<
          CompositeOrder,
          { cost: number; optimal: Record<AtomicOrder, number> }
        >();

        while (compositeOrderProcessQueue.length > 0) {
          const currentCompositeID = compositeOrderProcessQueue.shift()!;
          const currentComposite = compositeOrdersInTree.get(
            currentCompositeID,
          )!; // Get from our cached map

          let currentCompositeTotalCost = 0;
          const currentCompositeOptimalPurchase: Record<AtomicOrder, number> = {};

          // Add contributions from direct child SelectOrders (scaled by currentComposite's scale factors)
          for (const selectID in currentComposite.childSelectOrders) {
            const selectScale = currentComposite.childSelectOrders[selectID];
            const baseOptimal = baseSelectOrderOptimalChoices.get(
              selectID as SelectOrder,
            );

            if (baseOptimal) {
              currentCompositeTotalCost += baseOptimal.cost * selectScale;
              const atomicID = baseOptimal.atomicId;
              // Quantities in optimalPurchase are specified as Ints. Apply Math.ceil after scaling.
              const atomicQuantityToBuy = Math.ceil(
                baseOptimal.quantity * selectScale,
              );
              currentCompositeOptimalPurchase[atomicID] =
                (currentCompositeOptimalPurchase[atomicID] || 0) +
                atomicQuantityToBuy;
            }
          }

          // Add contributions from direct child CompositeOrders (scaled by currentComposite's scale factors)
          for (
            const childCompID
              of compositeIdToChildrenMap.get(currentCompositeID) || []
          ) {
            const childScale =
              currentComposite.childCompositeOrders[childCompID];
            const childResults = calculatedIntermediateResults.get(
              childCompID as CompositeOrder,
            ); // Should be calculated by now due to topological sort

            if (childResults) {
              currentCompositeTotalCost += childResults.cost * childScale;
              for (const atomicID in childResults.optimal) {
                // Quantities in optimalPurchase are specified as Ints. Apply Math.ceil after scaling.
                currentCompositeOptimalPurchase[atomicID as AtomicOrder] =
                  (currentCompositeOptimalPurchase[atomicID as AtomicOrder] || 0) +
                  Math.ceil(childResults.optimal[atomicID as AtomicOrder] * childScale);
              }
            } else {
              console.error(
                `Error: Child CompositeOrder '${childCompID}' results not found during topological sort processing for parent '${currentCompositeID}'. This indicates a graph cycle or a logic error in building the topological order.`,
              );
            }
          }

          // Cache the results for this composite order (for its parents to use)
          calculatedIntermediateResults.set(currentCompositeID, {
            cost: currentCompositeTotalCost,
            optimal: currentCompositeOptimalPurchase,
          });

          // Update MongoDB for this composite order
          await this.compositeOrders.updateOne(
            { _id: currentCompositeID },
            {
              $set: {
                totalCost: currentCompositeTotalCost,
                optimalPurchase: currentCompositeOptimalPurchase,
              },
            },
          );

          // Decrement in-degree of *parents* of currentCompositeID
          // Find parents by iterating all nodes in the tree (from cached map)
          for (const parentID of compositeOrdersInTree.keys()) {
            const parentComp = compositeOrdersInTree.get(parentID)!;
            // Check if currentCompositeID is a direct child of parentComp
            if (currentCompositeID in parentComp.childCompositeOrders) {
              const parentRemainingDependencies = inDegree.get(parentID);
              if (parentRemainingDependencies !== undefined) {
                const newInDegree = parentRemainingDependencies - 1;
                inDegree.set(parentID, newInDegree);
                if (newInDegree === 0) { // If parent is now ready (all its composite children processed)
                  compositeOrderProcessQueue.push(parentID);
                }
              }
            }
          }
        }
      } // End of outer loop for initialCompositeOrderID

      return {};
    } catch (e: unknown) {
      return {
        error: `Failed to calculate optimal purchase: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Action to mark a CompositeOrder and its children as purchased.
   *
   * purchaseOrder (compositeOrder: CompositeOrder)
   *
   * **requires** `compositeOrder` exists. `compositeOrder.rootOrder` is itself. `compositeOrder.purchased` is false.
   * All `SelectOrder`s within the tree have at least one AtomicOrder option.
   *
   * **effects** Recursively sets `purchased` to `true` for all CompositeOrders rooted from `compositeOrder`.
   */
  async purchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrderOutput> {
    try {
      const { compositeOrder: compositeOrderID } = input;

      // Requires: `compositeOrder` exists.
      const existingCompositeOrder = await this.compositeOrders.findOne({
        _id: compositeOrderID,
      });
      if (!existingCompositeOrder) {
        return {
          error: `CompositeOrder with ID '${compositeOrderID}' not found.`,
        };
      }

      // Requires: `compositeOrder.rootOrder` is itself.
      if (existingCompositeOrder.rootOrder !== compositeOrderID) {
        return {
          error:
            `CompositeOrder '${compositeOrderID}' is not a root order. Only root orders can be purchased.`,
        };
      }

      // Requires: `compositeOrder.purchased` is false.
      if (existingCompositeOrder.purchased) {
        return {
          error:
            `CompositeOrder '${compositeOrderID}' has already been purchased.`,
        };
      }

      // Requires: All `SelectOrder`s within the tree have at least one AtomicOrder option.
      // A simplified check: if totalCost is 0 and there are items in optimalPurchase,
      // it might indicate unfulfillable requirements. If optimalPurchase is empty,
      // it simply means nothing needs to be purchased (e.g., an empty recipe).
      // If totalCost is 0 but optimalPurchase is not empty, it's a suspicious state indicating failed optimization.
      if (
        existingCompositeOrder.totalCost === 0 &&
        Object.keys(existingCompositeOrder.optimalPurchase).length > 0
      ) {
        return {
          error:
            `CompositeOrder '${compositeOrderID}' cannot be purchased; some required SelectOrders may lack valid AtomicOrder options or lead to zero cost purchases with positive quantities.`,
        };
      }

      // Recursively sets `purchased` to `true` for all CompositeOrders rooted from `compositeOrder`.
      const queue: CompositeOrder[] = [compositeOrderID];
      const visited = new Set<CompositeOrder>();

      while (queue.length > 0) {
        const currentID = queue.shift()!;
        if (visited.has(currentID)) continue;
        visited.add(currentID);

        await this.compositeOrders.updateOne(
          { _id: currentID },
          { $set: { purchased: true } },
        );

        const currentComposite = await this.compositeOrders.findOne({
          _id: currentID,
        });
        if (currentComposite) {
          for (
            const childID of Object.keys(currentComposite.childCompositeOrders)
          ) {
            if (!visited.has(childID as CompositeOrder)) {
              queue.push(childID as CompositeOrder);
            }
          }
        }
      }

      return {};
    } catch (e: unknown) {
      return { error: `Failed to purchase order: ${this.getErrorMessage(e)}` };
    }
  }

  /* Queries */

  /**
   * Query to get any order (Atomic, Select, or Composite) by its associateID.
   *
   * _getOrderByAssociateID (associateID: ID): (order: (AtomicOrder | SelectOrder | CompositeOrder))
   *
   * **requires** Order exists with `associateID`.
   *
   * **effects** Returns the `order` associated with that ID.
   */
  async _getOrderByAssociateID(
    input: GetOrderByAssociateIDInput,
  ): Promise<GetOrderByAssociateIDOutput> {
    try {
      const { associateID } = input;
      const order = await this.findAnyOrderByAssociateID(associateID);

      if (!order) {
        return { error: `No order found with associateID '${associateID}'.` };
      }

      return [{ order }];
    } catch (e: unknown) {
      return {
        error: `Failed to retrieve order by associateID: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Query to get the optimal purchase map for a CompositeOrder.
   *
   * _getOptimalPurchase (compositeOrder: CompositeOrder): (optimalPurchase: Map of AtomicOrder to Int)
   *
   * **requires** `compositeOrder` exists.
   *
   * **effects** Returns `compositeOrder.optimalPurchase`.
   */
  async _getOptimalPurchase(
    input: GetOptimalPurchaseInput,
  ): Promise<GetOptimalPurchaseOutput> {
    try {
      const { compositeOrder: compositeOrderID } = input;

      // Requires: `compositeOrder` exists.
      const existingCompositeOrder = await this.compositeOrders.findOne({
        _id: compositeOrderID,
      });
      if (!existingCompositeOrder) {
        return {
          error: `CompositeOrder with ID '${compositeOrderID}' not found.`,
        };
      }

      return [{ optimalPurchase: existingCompositeOrder.optimalPurchase }];
    } catch (e: unknown) {
      return {
        error: `Failed to retrieve optimal purchase: ${
          this.getErrorMessage(e)
        }`,
      };
    }
  }

  /**
   * Query to get the total cost of a CompositeOrder.
   *
   * _getOrderCost (compositeOrder: CompositeOrder): (totalCost: Float)
   *
   * **requires** `compositeOrder` exists.
   *
   * **effects** Returns the `totalCost` of the `compositeOrder`.
   */
  async _getOrderCost(input: GetOrderCostInput): Promise<GetOrderCostOutput> {
    try {
      const { compositeOrder: compositeOrderID } = input;

      // Requires: `compositeOrder` exists.
      const existingCompositeOrder = await this.compositeOrders.findOne({
        _id: compositeOrderID,
      });
      if (!existingCompositeOrder) {
        return {
          error: `CompositeOrder with ID '${compositeOrderID}' not found.`,
        };
      }

      return [{ totalCost: existingCompositeOrder.totalCost }];
    } catch (e: unknown) {
      return {
        error: `Failed to retrieve order cost: ${this.getErrorMessage(e)}`,
      };
    }
  }
}
```
