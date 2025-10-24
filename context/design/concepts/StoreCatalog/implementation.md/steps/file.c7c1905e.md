---
timestamp: 'Thu Oct 23 2025 18:52:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_185232.9e3cd137.md]]'
content_id: c7c1905e93b1fb30b12903b823b7d8282556f1d0b5f67b602dab5498b670a7ac
---

# file: src/concepts/StoreCatalog/StoreCatalogConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "StoreCatalog" + ".";

// Generic types of this concept
type Item = ID;
type PurchaseOption = ID;
type AtomicOrder = ID;
type SelectOrder = ID;
type testingInput = Result<{ item: Item }>;

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
   * **requires** no Item already exists with `primaryName` in its names set.
   * **effects** Creates a new `Item` with `primaryName` in its `names` set and an empty `purchaseOptions` set. Returns the new `Item` ID.
   */
  async createItem(
    { primaryName }: { primaryName: string },
  ): Promise<testingInput> {
    const existingItem = await this.items.findOne({ names: primaryName });
    if (existingItem) {
      return {
        error: `An item with the name "${primaryName}" already exists.`,
      };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      names: [primaryName],
      purchaseOptions: [], // Initialize empty
      // selectOrderId is optional, not set on creation
    };

    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * **requires** `item` exists.
   * **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.
   */
  async deleteItem(
    { item }: { item: Item },
  ): Promise<Empty | { error: string }> {
    const result = await this.items.deleteOne({ _id: item });
    if (result.deletedCount === 0) {
      return { error: `Item with ID "${item}" not found.` };
    }

    // Delete associated purchase options from their own collection
    await this.purchaseOptions.deleteMany({ itemId: item });

    return {};
  }

  /**
   * **requires** `item` exists. `quantity` > 0, `price` >= 0.
   * **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.
   */
  async addPurchaseOption(
    { item, quantity, units, price, store }: {
      item: Item;
      quantity: number;
      units: string;
      price: number;
      store: string;
    },
  ): Promise<{ purchaseOption: PurchaseOption } | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (quantity <= 0) {
      return { error: "Quantity must be greater than 0." };
    }
    if (price < 0) {
      return { error: "Price cannot be negative." };
    }

    const newPurchaseOptionId = freshID();
    const newPurchaseOption: PurchaseOptionDoc = {
      _id: newPurchaseOptionId,
      itemId: item,
      store,
      quantity,
      units,
      price,
      confirmed: false, // PurchaseOption always starts unconfirmed
      // atomicOrderId is optional, not set on creation
    };

    await this.purchaseOptions.insertOne(newPurchaseOption);

    await this.items.updateOne(
      { _id: item },
      { $addToSet: { purchaseOptions: newPurchaseOptionId } },
    );

    return { purchaseOption: newPurchaseOptionId };
  }

  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)
   * updatePurchaseOption (purchaseOption: PurchaseOption, units: String)
   * updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)
   * updatePurchaseOption (purchaseOption: PurchaseOption, store: String)
   * **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    args:
      & { purchaseOption: PurchaseOption }
      & (
        | { quantity: number }
        | { units: string }
        | { price: number }
        | { store: string }
        | { atomicOrder: AtomicOrder }
      ),
  ): Promise<Empty | { error: string }> {
    const { purchaseOption } = args;
    const update: Partial<PurchaseOptionDoc> = {};

    if ("quantity" in args) {
      if (args.quantity <= 0) {
        return { error: "Quantity must be greater than 0." };
      }
      update.quantity = args.quantity;
    } else if ("units" in args) {
      update.units = args.units;
    } else if ("price" in args) {
      if (args.price < 0) {
        return { error: "Price cannot be negative." };
      }
      update.price = args.price;
    } else if ("store" in args) {
      update.store = args.store;
    } else if ("atomicOrder" in args) {
      update.atomicOrderId = args.atomicOrder;
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
   * **requires** `item` exists, `purchaseOption` is associated with `item`.
   * **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.
   */
  async removePurchaseOption(
    { item, purchaseOption }: { item: Item; purchaseOption: PurchaseOption },
  ): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }

    const result = await this.purchaseOptions.deleteOne({
      _id: purchaseOption,
      itemId: item,
    });
    if (result.deletedCount === 0) {
      return {
        error:
          `PurchaseOption with ID "${purchaseOption}" not found or not associated with Item "${item}".`,
      };
    }

    // Also remove the purchaseOption ID from the ItemDoc
    await this.items.updateOne(
      { _id: item },
      { $pull: { purchaseOptions: purchaseOption } },
    );

    return {};
  }

  /**
   * **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).
   * **effects** Adds `name` to the `names` set of `item`.
   */
  async addItemName(
    { item, name }: { item: Item; name: string },
  ): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (existingItem.names.includes(name)) {
      return {
        error: `Name "${name}" is already an alias for Item "${item}".`,
      };
    }

    await this.items.updateOne(
      { _id: item },
      { $addToSet: { names: name } },
    );
    return {};
  }

  /**
   * **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.
   * **effects** Removes `name` from the `names` set of `item`.
   */
  async removeItemName(
    { item, name }: { item: Item; name: string },
  ): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (!existingItem.names.includes(name)) {
      return { error: `Name "${name}" is not an alias for Item "${item}".` };
    }
    if (existingItem.names.length === 1) {
      return { error: `Cannot remove the only name for Item "${item}".` };
    }

    await this.items.updateOne(
      { _id: item },
      { $pull: { names: name } },
    );
    return {};
  }

  /**
   * **requires** `purchaseOption` exists, `purchaseOption` is not already `confirmed`.
   * **effects** Sets `purchaseOption.confirmed` to `true`.
   */
  async confirmPurchaseOption(
    { purchaseOption }: { purchaseOption: PurchaseOption },
  ): Promise<Empty | { error: string }> {
    const existingPurchaseOption = await this.purchaseOptions.findOne({
      _id: purchaseOption,
    });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }
    if (existingPurchaseOption.confirmed) {
      return {
        error:
          `PurchaseOption with ID "${purchaseOption}" is already confirmed.`,
      };
    }

    await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: { confirmed: true } },
    );
    return {};
  }

  /**
   * **requires** `purchaseOption` exists.
   * **effects** Sets `purchaseOption.atomicOrderId` to `atomicOrder`.
   */
  async addPurchaseOptionOrder(
    { purchaseOption, atomicOrder }: {
      purchaseOption: PurchaseOption;
      atomicOrder: AtomicOrder;
    },
  ): Promise<Empty | { error: string }> {
    const existingPurchaseOption = await this.purchaseOptions.findOne({
      _id: purchaseOption,
    });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }

    await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: { atomicOrderId: atomicOrder } },
    );
    return {};
  }

  /**
   * **requires** `item` exists.
   * **effects** Sets `item.selectOrderId` to `selectOrder`.
   */
  async addItemOrder(
    { item, selectOrder }: { item: Item; selectOrder: SelectOrder },
  ): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }

    await this.items.updateOne(
      { _id: item },
      { $set: { selectOrderId: selectOrder } },
    );
    return {};
  }

  /**
   * **requires** An item exists with `name` in its `names` set.
   * **effects** Returns the `Item` ID with the given name.
   */
  async _getItemByName(
    { name }: { name: string },
  ): Promise<Array<{ item: Item }> | Array<{ error: string }>> {
    const itemDoc = await this.items.findOne({ names: name });
    if (!itemDoc) {
      return [{ error: `Item with name "${name}" not found.` }];
    }
    return [{ item: itemDoc._id }];
  }

  /**
   * **requires** An item exists with `purchaseOption` in its `purchaseOption` set.
   * **effects** Returns the `Item` ID with the given purchaseOption.
   */
  async _getItemByPurchaseOption(
    { purchaseOption }: { purchaseOption: PurchaseOption },
  ): Promise<Array<{ item: Item }> | Array<{ error: string }>> {
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return [{
        error: `PurchaseOption with ID "${purchaseOption}" not found.`,
      }];
    }
    return [{ item: poDoc.itemId }];
  }

  /**
   * **requires** `item` exists.
   * **effects** Returns the associated names of the item.
   */
  async _getItemNames(
    { item }: { item: Item },
  ): Promise<Array<{ names: string[] }> | Array<{ error: string }>> {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${item}" not found.` }];
    }
    return [{ names: itemDoc.names }];
  }

  /**
   * **requires** `item` exists.
   * **effects** Returns the set of all `PurchaseOption`s for the given `item`.
   */
  async _getItemPurchaseOptions(
    { item }: { item: Item },
  ): Promise<
    Array<{ purchaseOptions: PurchaseOption[] }> | Array<{ error: string }>
  > {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${item}" not found.` }];
    }
    // Directly return purchaseOptions from ItemDoc as per Change 3
    return [{ purchaseOptions: itemDoc.purchaseOptions }];
  }

  /**
   * **requires** `purchaseOption` exists.
   * **effects** Returns the set of details given `purchaseOption`.
   */
  async _getPurchaseOptionDetails(
    { purchaseOption }: { purchaseOption: PurchaseOption },
  ): Promise<
    | Array<{
      quantity: number;
      units: string;
      price: number;
      store: string;
      confirmed: boolean;
    }>
    | Array<{ error: string }>
  > {
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return [{
        error: `PurchaseOption with ID "${purchaseOption}" not found.`,
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
   * **requires** nothing.
   * **effects** Returns a set of all `Item` entity IDs.
   */
  async _getAllItems(): Promise<Array<{ items: Item[] }>> {
    const allItems = await this.items.find({}).toArray();
    return [{ items: allItems.map((item) => item._id) }];
  }
}

```

CHANGES:

1. implementing-concepts was changed where we need to have the types for all actions and queries defined for inputs / outputs. This standarizes them at the top of the file. Make changes according to implementing-concepts new Input / Output Types.
