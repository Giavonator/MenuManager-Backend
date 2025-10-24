---
timestamp: 'Thu Oct 23 2025 17:21:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_172158.608573eb.md]]'
content_id: 3e785d2bf40627bacf7524687736399c94b1d46a62aa131078cb24f5bd224122
---

# file: src/concepts/StoreCatalog/StoreCatalogConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "StoreCatalog" + ".";

// Generic types of this concept
type Item = ID;
type PurchaseOption = ID;
type Order = ID; // Generic parameter

/**
 * a set of Item with
 *   a names Set of String
 *   a confirmed Bool
 */
interface ItemDoc {
  _id: Item;
  names: string[];
  confirmed: boolean;
}

/**
 * a set of PurchaseOption with
 *   a store String
 *   a quantity Float
 *   a units String
 *   a price Float
 *   a purchase Order (optional link to an order)
 */
interface PurchaseOptionDoc {
  _id: PurchaseOption;
  itemId: Item; // Foreign key to link to Item
  store: string;
  quantity: number;
  units: string;
  price: number;
  orderId?: Order; // Optional, can be null/undefined initially
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
   *
   * **effects** Creates a new `Item` with `primaryName` in its `names` set, `confirmed` set to `false`, and no `PurchaseOption`s. Returns the new `Item` ID.
   */
  async createItem({ primaryName }: { primaryName: string }): Promise<{ item: Item } | { error: string }> {
    const existingItem = await this.items.findOne({ names: primaryName });
    if (existingItem) {
      return { error: `An item with the name "${primaryName}" already exists.` };
    }

    const newItemId = freshID();
    const newItem: ItemDoc = {
      _id: newItemId,
      names: [primaryName],
      confirmed: false,
    };

    await this.items.insertOne(newItem);
    return { item: newItemId };
  }

  /**
   * deleteItem (item: Item)
   *
   * **requires** `item` exists.
   *
   * **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.
   */
  async deleteItem({ item }: { item: Item }): Promise<Empty | { error: string }> {
    const result = await this.items.deleteOne({ _id: item });
    if (result.deletedCount === 0) {
      return { error: `Item with ID "${item}" not found.` };
    }

    // Delete associated purchase options
    await this.purchaseOptions.deleteMany({ itemId: item });

    return {};
  }

  /**
   * addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
   *
   * **requires** `item` exists. `quantity` > 0, `price` >= 0.
   *
   * **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.
   */
  async addPurchaseOption(
    { item, quantity, units, price, store }: { item: Item; quantity: number; units: string; price: number; store: string },
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
    };

    await this.purchaseOptions.insertOne(newPurchaseOption);
    return { purchaseOption: newPurchaseOptionId };
  }

  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)
   *
   * **requires** `purchaseOption` exists. `quantity` > 0.
   *
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    { purchaseOption, quantity }: { purchaseOption: PurchaseOption; quantity: number },
  ): Promise<Empty | { error: string }>;
  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, units: String)
   *
   * **requires** `purchaseOption` exists.
   *
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    { purchaseOption, units }: { purchaseOption: PurchaseOption; units: string },
  ): Promise<Empty | { error: string }>;
  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)
   *
   * **requires** `purchaseOption` exists. `price` >= 0.
   *
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    { purchaseOption, price }: { purchaseOption: PurchaseOption; price: number },
  ): Promise<Empty | { error: string }>;
  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, store: String)
   *
   * **requires** `purchaseOption` exists.
   *
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    { purchaseOption, store }: { purchaseOption: PurchaseOption; store: string },
  ): Promise<Empty | { error: string }>;
  /**
   * updatePurchaseOption (purchaseOption: PurchaseOption, order: Order)
   *
   * **requires** `purchaseOption` exists.
   *
   * **effects** Updates the specified attribute of the `purchaseOption`.
   */
  async updatePurchaseOption(
    { purchaseOption, order }: { purchaseOption: PurchaseOption; order: Order },
  ): Promise<Empty | { error: string }>;
  async updatePurchaseOption(
    args: { purchaseOption: PurchaseOption } & (
      | { quantity: number }
      | { units: string }
      | { price: number }
      | { store: string }
      | { order: Order }
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
    } else if ("order" in args) {
      update.orderId = args.order;
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
   *
   * **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.
   */
  async removePurchaseOption(
    { item, purchaseOption }: { item: Item; purchaseOption: PurchaseOption },
  ): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }

    const result = await this.purchaseOptions.deleteOne({ _id: purchaseOption, itemId: item });
    if (result.deletedCount === 0) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found or not associated with Item "${item}".` };
    }
    return {};
  }

  /**
   * addItemName (item: Item, name: String)
   *
   * **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).
   *
   * **effects** Adds `name` to the `names` set of `item`.
   */
  async addItemName({ item, name }: { item: Item; name: string }): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (existingItem.names.includes(name)) {
      return { error: `Name "${name}" is already an alias for Item "${item}".` };
    }

    await this.items.updateOne(
      { _id: item },
      { $addToSet: { names: name } },
    );
    return {};
  }

  /**
   * removeItemName (item: Item, name: String)
   *
   * **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.
   *
   * **effects** Removes `name` from the `names` set of `item`.
   */
  async removeItemName({ item, name }: { item: Item; name: string }): Promise<Empty | { error: string }> {
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
   * confirmItem (item: Item)
   *
   * **requires** `item` exists, `item` is not already `confirmed`.
   *
   * **effects** Sets `item.confirmed` to `true`.
   */
  async confirmItem({ item }: { item: Item }): Promise<Empty | { error: string }> {
    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: `Item with ID "${item}" not found.` };
    }
    if (existingItem.confirmed) {
      return { error: `Item with ID "${item}" is already confirmed.` };
    }

    await this.items.updateOne(
      { _id: item },
      { $set: { confirmed: true } },
    );
    return {};
  }

  /**
   * addOrderToPurchaseOption (purchaseOption: PurchaseOption, order: Order)
   *
   * **requires** `purchaseOption` exists. `order` exists. `purchaseOption` does not already have an associated order.
   *
   * **effects** Sets `PurchaseOption.order` to `order`.
   */
  async addOrderToPurchaseOption(
    { purchaseOption, order }: { purchaseOption: PurchaseOption; order: Order },
  ): Promise<Empty | { error: string }> {
    const existingPurchaseOption = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!existingPurchaseOption) {
      return { error: `PurchaseOption with ID "${purchaseOption}" not found.` };
    }
    if (existingPurchaseOption.orderId !== undefined && existingPurchaseOption.orderId !== null) {
      return { error: `PurchaseOption with ID "${purchaseOption}" already has an associated order.` };
    }

    await this.purchaseOptions.updateOne(
      { _id: purchaseOption },
      { $set: { orderId: order } },
    );
    return {};
  }

  /**
   * _getItemByName (name: String): (item: Item)
   *
   * **requires** An item exists with `name` in its `names` set.
   *
   * **effects** Returns the `Item` ID with the given name.
   */
  async _getItemByName({ name }: { name: string }): Promise<Array<{ item: Item }> | Array<{ error: string }>> {
    const itemDoc = await this.items.findOne({ names: name });
    if (!itemDoc) {
      return [{ error: `Item with name "${name}" not found.` }];
    }
    return [{ item: itemDoc._id }];
  }

  /**
   * _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)
   *
   * **requires** An item exists with `purchaseOption` in its `purchaseOption` set.
   *
   * **effects** Returns the `Item` ID with the given purchaseOption.
   */
  async _getItemByPurchaseOption(
    { purchaseOption }: { purchaseOption: PurchaseOption },
  ): Promise<Array<{ item: Item }> | Array<{ error: string }>> {
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return [{ error: `PurchaseOption with ID "${purchaseOption}" not found.` }];
    }
    return [{ item: poDoc.itemId }];
  }

  /**
   * _getItemByDetails (item: Item): (name: String, confirmed: Bool, purchaseOptions: Set of PurchaseOption)
   *
   * **requires** `item` exists.
   *
   * **effects** Returns the associated details of the item.
   */
  async _getItemByDetails(
    { item }: { item: Item },
  ): Promise<Array<{ name: string; confirmed: boolean; purchaseOptions: PurchaseOption[] }> | Array<{ error: string }>> {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${item}" not found.` }];
    }

    const poDocs = await this.purchaseOptions.find({ itemId: item }).toArray();
    const purchaseOptions = poDocs.map((po) => po._id);

    return [{
      name: itemDoc.names[0] || "", // Returning the first name as "name: String" is singular
      confirmed: itemDoc.confirmed,
      purchaseOptions,
    }];
  }

  /**
   * _getItemPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
   *
   * **requires** `item` exists.
   *
   * **effects** Returns the set of all `PurchaseOption`s for the given `item`.
   */
  async _getItemPurchaseOptions(
    { item }: { item: Item },
  ): Promise<Array<{ purchaseOptions: PurchaseOption[] }> | Array<{ error: string }>> {
    const itemDoc = await this.items.findOne({ _id: item });
    if (!itemDoc) {
      return [{ error: `Item with ID "${item}" not found.` }];
    }

    const poDocs = await this.purchaseOptions.find({ itemId: item }).toArray();
    const purchaseOptions = poDocs.map((po) => po._id);
    return [{ purchaseOptions }];
  }

  /**
   * _getPurchaseOptionDetails (purchaseOption: PurchaseOption): (quantity: Float, units: String, price: Float, store: String)
   *
   * **requires** `purchaseOption` exists.
   *
   * **effects** Returns the set of details given `purchaseOption`.
   */
  async _getPurchaseOptionDetails(
    { purchaseOption }: { purchaseOption: PurchaseOption },
  ): Promise<
    Array<{ quantity: number; units: string; price: number; store: string }> | Array<{ error: string }>
  > {
    const poDoc = await this.purchaseOptions.findOne({ _id: purchaseOption });
    if (!poDoc) {
      return [{ error: `PurchaseOption with ID "${purchaseOption}" not found.` }];
    }
    return [{
      quantity: poDoc.quantity,
      units: poDoc.units,
      price: poDoc.price,
      store: poDoc.store,
    }];
  }

  /**
   * _getAllItems (): (items: Set of Item)
   *
   * **requires** nothing.
   *
   * **effects** Returns a set of all `Item` entity IDs.
   */
  async _getAllItems(): Promise<Array<{ items: Item[] }>> {
    const allItems = await this.items.find({}).toArray();
    return [{ items: allItems.map((item) => item._id) }];
  }
}
```
