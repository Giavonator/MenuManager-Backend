---
timestamp: 'Thu Oct 23 2025 18:53:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_185303.1571ddd6.md]]'
content_id: 992ee2a250cb32cab4cf088ec1932787d6e259e0bdd571b09b794fdbf2d40e5e
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "StoreCatalog" + ".";

// Generic types of this concept
type Item = ID;
type PurchaseOption = ID;
type AtomicOrder = ID; // Generic parameter from concept definition
type SelectOrder = ID; // Generic parameter from concept definition

// --- Action Input/Output Types ---

// createItem
type CreateItemInput = { primaryName: string };
type CreateItemOutput = Result<{ item: Item }>;

// deleteItem
type DeleteItemInput = { item: Item };
type DeleteItemOutput = Result<Empty>;

// addPurchaseOption
type AddPurchaseOptionInput = {
  item: Item;
  quantity: number;
  units: string;
  price: number;
  store: string;
};
type AddPurchaseOptionOutput = Result<{ purchaseOption: PurchaseOption }>;

// updatePurchaseOption (overloaded)
type UpdatePurchaseOptionInput =
  & { purchaseOption: PurchaseOption }
  & (
    | { quantity: number }
    | { units: string }
    | { price: number }
    | { store: string }
    | { atomicOrder: AtomicOrder }
  );
type UpdatePurchaseOptionOutput = Result<Empty>;

// removePurchaseOption
type RemovePurchaseOptionInput = { item: Item; purchaseOption: PurchaseOption };
type RemovePurchaseOptionOutput = Result<Empty>;

// addItemName
type AddItemNameInput = { item: Item; name: string };
type AddItemNameOutput = Result<Empty>;

// removeItemName
type RemoveItemNameInput = { item: Item; name: string };
type RemoveItemNameOutput = Result<Empty>;

// confirmPurchaseOption
type ConfirmPurchaseOptionInput = { purchaseOption: PurchaseOption };
type ConfirmPurchaseOptionOutput = Result<Empty>;

// addPurchaseOptionOrder (found in implementation, not spec - adding types for consistency)
type AddPurchaseOptionOrderInput = {
  purchaseOption: PurchaseOption;
  atomicOrder: AtomicOrder;
};
type AddPurchaseOptionOrderOutput = Result<Empty>;

// addItemOrder (found in implementation, not spec - adding types for consistency)
type AddItemOrderInput = { item: Item; selectOrder: SelectOrder };
type AddItemOrderOutput = Result<Empty>;

// --- Query Input/Output Types ---

// _getItemByName
type GetItemByNameInput = { name: string };
type GetItemByNameOutput = Result<{ item: Item }[]>; // Queries return array of results

// _getItemByPurchaseOption
type GetItemByPurchaseOptionInput = { purchaseOption: PurchaseOption };
type GetItemByPurchaseOptionOutput = Result<{ item: Item }[]>;

// _getItemNames
type GetItemNamesInput = { item: Item };
type GetItemNamesOutput = Result<{ names: string[] }[]>;

// _getItemPurchaseOptions
type GetItemPurchaseOptionsInput = { item: Item };
type GetItemPurchaseOptionsOutput = Result<{ purchaseOptions: PurchaseOption[] }[]>;

// _getPurchaseOptionDetails
type GetPurchaseOptionDetailsInput = { purchaseOption: PurchaseOption };
type GetPurchaseOptionDetailsOutput = Result<
  {
    quantity: number;
    units: string;
    price: number;
    store: string;
    confirmed: boolean;
  }[]
>;

// _getAllItems
type GetAllItemsInput = Empty; // No explicit arguments for this query
type GetAllItemsOutput = Result<{ items: Item[] }[]>;

/**
 * a set of Item with
 *   a names Set of String
 *   a purchaseOptions Set of PurchaseOption
 *   a purchase SelectOrder
 */
interface ItemDoc {
  _id: Item;
  names: string[];
  purchaseOptions: PurchaseOption[];
  selectOrderId?: SelectOrder;
}

/**
 * a set of PurchaseOption with
 *   a store String
 *   a quantity Float
 *   a units String
 *   a price Float
 *   a confirmed Bool
 *   a purchase AtomicOrder
 */
interface PurchaseOptionDoc {
  _id: PurchaseOption;
  itemId: Item;
  store: string;
  quantity: number;
  units: string;
  price: number;
  confirmed: boolean;
  atomicOrderId?: AtomicOrder;
}

export default class StoreCatalogConcept {
  items: Collection<ItemDoc>;
  purchaseOptions: Collection<PurchaseOptionDoc>;

  constructor(private readonly db: Db) {
    this.items = this.db.collection(PREFIX + "items");
    this.purchaseOptions = this.db.collection(PREFIX + "purchaseOptions");
  }

  /**
   * createItem (primaryName: String): (item: Item)
   *
   * **requires** no Item already exists with `primaryName` in its names set.
   * **effects** Creates a new `Item` with `primaryName` in its `names` set and an empty `purchaseOptions` set. Returns the new `Item` ID.
   */
  async createItem(input: CreateItemInput): Promise<CreateItemOutput> {
    const existingItem = await this.items.findOne({ names: input.primaryName });
    if (existingItem) {
      return {
        error: `An item with the name "${input.primaryName}" already exists.`,
      };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      names: [input.primaryName],
      purchaseOptions: [], // Initialize empty
      // selectOrderId is optional, not set on creation
    };

    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * deleteItem (item: Item)
   *
   * **requires** `item` exists.
   * **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.
   */
  async deleteItem(input: DeleteItemInput): Promise<DeleteItemOutput> {
    const result = await this.items.deleteOne({ _id: input.item });
    if (result.deletedCount === 0) {
      return { error: `Item with ID "${input.item}" not found.` };
    }

    // Delete associated purchase options from their own collection
    await this.purchaseOptions.deleteMany({ itemId: input.item });

    return {};
  }

  /**
   * addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
   *
   * **requires** `item` exists. `quantity` > 0, `price` >= 0.
   * **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.
   */
  async addPurchaseOption(
    input: AddPurchaseOptionInput,
  ): Promise<AddPurchaseOptionOutput> {
    const existingItem = await this.items.findOne({ _id: input.item });
    if (!existingItem) {
      return { error: `Item with ID "${input.item}" not found.` };
    }
    if (input.quantity <= 0) {
      return { error: "Quantity must be greater than 0." };
    }
    if (input.price < 0) {
      return { error: "Price cannot be negative." };
    }

    const newPurchaseOptionId = freshID();
    const newPurchaseOption: PurchaseOptionDoc = {
      _id: newPurchaseOptionId,
      itemId: input.item,
      store: input.store,
      quantity: input.quantity,
      units: input.units,
      price: input.price,
      confirmed: false, // PurchaseOption always starts unconfirmed
      // atomicOrderId is optional, not set on creation
    };

    await this.purchaseOptions.insertOne(newPurchaseOption);

    await this.items.updateOne(
      { _id: input.item },
      { $addToSet: { purchaseOptions: newPurchaseOptionId } },
    );

    return { purchaseOption: newPurchaseOptionId };
  }

  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)
   * updatePurchaseOption (purchaseOption: PurchaseOption, units: String)
   * updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)
   * updatePurchaseOption (purchaseOption: PurchaseOption, store: String)
   * updatePurchaseOption (purchaseOption: PurchaseOption, order: Order) - (This is `atomicOrder` in implementation)
   *
   * **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    input: UpdatePurchaseOptionInput,
  ): Promise<UpdatePurchaseOptionOutput> {
    const { purchaseOption } = input;
    const update: Partial<PurchaseOptionDoc> = {};

    if ("quantity" in input) {
      if (input.quantity <= 0) {
        return { error: "Quantity must be greater than 0." };
      }
      update.quantity = input.quantity;
    } else if ("units" in input) {
      update.units = input.units;
    } else if ("price" in input) {
      if (input.price < 0) {
        return { error: "Price cannot be negative." };
      }
      update.price = input.price;
    } else if ("store" in input) {
      update.store = input.store;
    } else if ("atomicOrder" in input) {
      update.atomicOrderId = input.atomicOrder;
    } else {
      // This case should ideally not be reached with a well-formed discriminated union.
      // However, it's good practice to handle it or ensure type safety prevents it.
      return { error: "No valid update attribute provided." };
    }

    const result = await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: update },
    );

    if (result.matchedCount === 0) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }
    return {};
  }

  /**
   * removePurchaseOption (item: Item, purchaseOption: PurchaseOption)
   *
   * **requires** `item` exists, `purchaseOption` is associated with `item`.
   * **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.
   */
  async removePurchaseOption(
    input: RemovePurchaseOptionInput,
  ): Promise<RemovePurchaseOptionOutput> {
    const existingItem = await this.items.findOne({ _id: input.item });
    if (!existingItem) {
      return { error: `Item with ID "${input.item}" not found.` };
    }

    const result = await this.purchaseOptions.deleteOne({
      _id: input.purchaseOption,
      itemId: input.item,
    });
    if (result.deletedCount === 0) {
      return {
        error:
          `PurchaseOption with ID "${input.purchaseOption}" not found or not associated with Item "${input.item}".`,
      };
    }

    // Also remove the purchaseOption ID from the ItemDoc
    await this.items.updateOne(
      { _id: input.item },
      { $pull: { purchaseOptions: input.purchaseOption } },
    );

    return {};
  }

  /**
   * addItemName (item: Item, name: String)
   *
   * **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).
   * **effects** Adds `name` to the `names` set of `item`.
   */
  async addItemName(input: AddItemNameInput): Promise<AddItemNameOutput> {
    const existingItem = await this.items.findOne({ _id: input.item });
    if (!existingItem) {
      return { error: `Item with ID "${input.item}" not found.` };
    }
    if (existingItem.names.includes(input.name)) {
      return {
        error: `Name "${input.name}" is already an alias for Item "${input.item}".`,
      };
    }

    await this.items.updateOne(
      { _id: input.item },
      { $addToSet: { names: input.name } },
    );
    return {};
  }

  /**
   * removeItemName (item: Item, name: String)
   *
   * **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.
   * **effects** Removes `name` from the `names` set of `item`.
   */
  async removeItemName(
    input: RemoveItemNameInput,
  ): Promise<RemoveItemNameOutput> {
    const existingItem = await this.items.findOne({ _id: input.item });
    if (!existingItem) {
      return { error: `Item with ID "${input.item}" not found.` };
    }
    if (!existingItem.names.includes(input.name)) {
      return { error: `Name "${input.name}" is not an alias for Item "${input.item}".` };
    }
    if (existingItem.names.length === 1) {
      return { error: `Cannot remove the only name for Item "${input.item}".` };
    }

    await this.items.updateOne(
      { _id: input.item },
      { $pull: { names: input.name } },
    );
    return {};
  }

  /**
   * confirmPurchaseOption (purchaseOption: PurchaseOption)
   *
   * **requires** `purchaseOption` exists, `purchaseOption` is not already `confirmed`.
   * **effects** Sets `purchaseOption.confirmed` to `true`.
   */
  async confirmPurchaseOption(
    input: ConfirmPurchaseOptionInput,
  ): Promise<ConfirmPurchaseOptionOutput> {
    const existingPurchaseOption = await this.purchaseOptions.findOne({
      _id: input.purchaseOption,
    });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${input.purchaseOption}" not found.` };
    }
    if (existingPurchaseOption.confirmed) {
      return {
        error:
          `PurchaseOption with ID "${input.purchaseOption}" is already confirmed.`,
      };
    }

    await this.purchaseOptions.updateOne(
      { _id: input.purchaseOption },
      { $set: { confirmed: true } },
    );
    return {};
  }

  /**
   * addPurchaseOptionOrder (purchaseOption: PurchaseOption, atomicOrder: AtomicOrder)
   *
   * **requires** `purchaseOption` exists.
   * **effects** Sets `purchaseOption.atomicOrderId` to `atomicOrder`.
   */
  async addPurchaseOptionOrder(
    input: AddPurchaseOptionOrderInput,
  ): Promise<AddPurchaseOptionOrderOutput> {
    const existingPurchaseOption = await this.purchaseOptions.findOne({
      _id: input.purchaseOption,
    });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${input.purchaseOption}" not found.` };
    }

    await this.purchaseOptions.updateOne(
      { _id: input.purchaseOption },
      { $set: { atomicOrderId: input.atomicOrder } },
    );
    return {};
  }

  /**
   * addItemOrder (item: Item, selectOrder: SelectOrder)
   *
   * **requires** `item` exists.
   * **effects** Sets `item.selectOrderId` to `selectOrder`.
   */
  async addItemOrder(input: AddItemOrderInput): Promise<AddItemOrderOutput> {
    const existingItem = await this.items.findOne({ _id: input.item });
    if (!existingItem) {
      return { error: `Item with ID "${input.item}" not found.` };
    }

    await this.items.updateOne(
      { _id: input.item },
      { $set: { selectOrderId: input.selectOrder } },
    );
    return {};
  }

  /**
   * _getItemByName (name: String): (item: Item)
   *
   * **requires** An item exists with `name` in its `names` set.
   * **effects** Returns the `Item` ID with the given name.
   */
  async _getItemByName(
    input: GetItemByNameInput,
  ): Promise<GetItemByNameOutput> {
    const itemDoc = await this.items.findOne({ names: input.name });
    if (!itemDoc) {
      return [{ error: `Item with name "${input.name}" not found.` }];
    }
    return [{ item: itemDoc._id }];
  }

  /**
   * _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)
   *
   * **requires** An item exists with `purchaseOption` in its `purchaseOption` set.
   * **effects** Returns the `Item` ID with the given purchaseOption.
   */
  async _getItemByPurchaseOption(
    input: GetItemByPurchaseOptionInput,
  ): Promise<GetItemByPurchaseOptionOutput> {
    const poDoc = await this.purchaseOptions.findOne({ _id: input.purchaseOption });
    if (!poDoc) {
      return [{
        error: `PurchaseOption with ID "${input.purchaseOption}" not found.`,
      }];
    }
    return [{ item: poDoc.itemId }];
  }

  /**
   * _getItemNames (item: Item): (names: Set of String)
   *
   * **requires** `item` exists.
   * **effects** Returns the associated names of the item.
   */
  async _getItemNames(
    input: GetItemNamesInput,
  ): Promise<GetItemNamesOutput> {
    const itemDoc = await this.items.findOne({ _id: input.item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${input.item}" not found.` }];
    }
    return [{ names: itemDoc.names }];
  }

  /**
   * _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
   *
   * **requires** `item` exists.
   * **effects** Returns the set of all `PurchaseOption`s for the given `item`.
   */
  async _getItemPurchaseOptions(
    input: GetItemPurchaseOptionsInput,
  ): Promise<GetItemPurchaseOptionsOutput> {
    const itemDoc = await this.items.findOne({ _id: input.item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${input.item}" not found.` }];
    }
    return [{ purchaseOptions: itemDoc.purchaseOptions }];
  }

  /**
   * _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String, confirmed: Bool)
   *
   * **requires** `purchaseOption` exists.
   * **effects** Returns the set of details given `purchaseOption`.
   */
  async _getPurchaseOptionDetails(
    input: GetPurchaseOptionDetailsInput,
  ): Promise<GetPurchaseOptionDetailsOutput> {
    const poDoc = await this.purchaseOptions.findOne({ _id: input.purchaseOption });
    if (!poDoc) {
      return [{
        error: `PurchaseOption with ID "${input.purchaseOption}" not found.`,
      }];
    }
    return [{
      quantity: poDoc.quantity,
      units: poDoc.units,
      price: poDoc.price,
      store: poDoc.store,
      confirmed: poDoc.confirmed,
    }];
  }

  /**
   * _getAllItems (): (items: Set of Item)
   *
   * **requires** nothing.
   * **effects** Returns a set of all `Item` entity IDs.
   */
  async _getAllItems(): Promise<GetAllItemsOutput> {
    const allItems = await this.items.find({}).toArray();
    return [{ items: allItems.map((item) => item._id) }];
  }
}
```
