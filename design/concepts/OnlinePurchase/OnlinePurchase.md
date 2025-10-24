
## OnlinePurchase

**concept** OnlinePurchase

**purpose** Manage a comprehensive catalog of purchasable ingredients, their alternative names, and available purchase options across different stores.

**principle** An administrator `createItem` for a new ingredient like "ground pepper". They then discover multiple `PurchaseOption`s for it, such as "3 lbs for $5.99 at Sprout's" and "1 lb for $2.50 at Trader Joe's", and `addPurchaseOption` for each. Later, another user refers to "pepper", so the administrator `addItemName` "pepper" as an alias. Once verified, the administrator `confirmItem` so it can be used in orders.

**state**\
  a set of Item with\
    a names Set of String // Ex. {'pepper', 'ground pepper', 'course pepper'}\
    a confirmed Bool // false if unverified, true if verified by administrator\
    a set of PurchaseOption with\
        a store String // Ex. "Sprout's"\
        a quantity Float // Ex. 3.0\
        a units String // Ex. "lbs", "oz", "count"\
        a price Float // Ex. 5.99\
        a purchase Order\
  a set of Order with\
    a totalCost Float\
    a purchased Bool\
    an optimalPurchase Map of store String to PurchaseOption
    a subOrders Set of Order // Set of OrderIDs (from this concept) whose costs/items are aggregated into this one\
    a parentOrders Set of Order // Set of OrderIDs (from this concept) that aggregate this one

**actions**\
  createItem (primaryName: String): (item: Item)\
    **requires** no Item already exists with `primaryName` in its names set.\
    **effects** Creates a new `Item` with `primaryName` in its `names` set, `confirmed` set to `false`, and no `PurchaseOption`s. Returns the new `Item` ID.

  deleteItem (item: Item)\
    **requires** `item` exists.\
    **effects** Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.

  addItemName (item: Item, name: String)\
    **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).\
    **effects** Adds `name` to the `names` set of `item`.

  removeItemName (item: Item, name: String)\
    **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.\
    **effects** Removes `name` from the `names` set of `item`.

  confirmItem (item: Item)\
    **requires** `item` exists, `item` is not already `confirmed`.\
    **effects** Sets `item.confirmed` to `true`.

  addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)\
    **requires** `item` exists. `quantity` > 0, `price` >= 0.\
    **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.

  updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)\
  updatePurchaseOption (purchaseOption: PurchaseOption, units: String)\
  updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)\
  updatePurchaseOption (purchaseOption: PurchaseOption, store: String)\
  updatePurchaseOption (purchaseOption: PurchaseOption, order: Order)\
    **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.\
    **effects** Updates the specified attribute of the `purchaseOption`.

  removePurchaseOption (item: Item, purchaseOption: PurchaseOption)\
    **requires** `item` exists, `purchaseOption` is associated with `item`.\
    **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.

  addOrderToPurchaseOption (purchaseOption: PurchaseOption, order: Order)\
    **requires** `purchaseOption` exists. `order` exists. `purchaseOption` does not already have an associated order.\
    **effects** Sets `PurchaseOption.order` to `order`.

  createItemOrder (item: Item): (order: Order)\
    **requires** `item` exists.\
    **effects** Creates a new `Order` with `purchased` set to `false`. `itemQuantities` is initialized to `initialItemQuantities`. `cost` is calculated based on `initialItemQuantities` and `Item` prices (obtained via syncs/queries to `StoreCatalog`). Returns the new `Order` ID.

  updateOrderQuantitiesAndCost (order: Order, itemQuantitiesDelta: Map of Item to Float)\
    **requires** `order` exists. All `Item`s in `itemQuantitiesDelta` exist (in StoreCatalog). Applying `itemQuantitiesDelta` does not result in negative quantities for any item.\
    **effects** Updates `order.itemQuantities` by adding the `itemQuantitiesDelta`. Recalculates `order.cost` based on the new `itemQuantities` and `Item` prices (from `StoreCatalog`). Propagates this change to all `parentOrders` (via syncs).

  addSubOrder (parentOrder: Order, subOrder: Order)\
    **requires** `parentOrder` and `subOrder` exist. `subOrder` is not already a sub-order of `parentOrder`.\
    **effects** Adds `subOrder` to `parentOrder.subOrders`. Adds `parentOrder` to `subOrder.parentOrders`. Aggregates `subOrder.itemQuantities` and `subOrder.cost` into `parentOrder.itemQuantities` and `parentOrder.cost`. Propagates changes up `parentOrder`'s hierarchy.

  removeSubOrder (parentOrder: Order, subOrder: Order)\
    **requires** `parentOrder` and `subOrder` exist, `subOrder` is a sub-order of `parentOrder`.\
    **effects** Removes `subOrder` from `parentOrder.subOrders`. Removes `parentOrder` from `subOrder.parentOrders`. Subtracts `subOrder.itemQuantities` and `subOrder.cost` from `parentOrder.itemQuantities` and `parentOrder.cost`. Propagates changes up `parentOrder`'s hierarchy (via syncs).

  purchaseOrder (order: Order)\
    **requires** `order` exists, `order.purchased` is `false`. All items(Typically restricted to administrators via syncs).\
    **effects** Sets `order.purchased` to `true`.

**queries**
  _getItemByName (name: String): (item: Item)\
    **requires** An item exists with `name` in its `names` set.\
    **effects** Returns the `Item` ID with the given name.

  _getItemByPurchaseOption (purchaseOption: PurchaseOption): (item: Item)\
    **requires** An item exists with `purchaseOption` in its `purchaseOption` set.\
    **effects** Returns the `Item` ID with the given purchaseOption.

  _getItemByDetails (item: Item): (name: String, confirmed: Bool, purchaseOptions: Set of PurchaseOption)\
    **requires** `item` exists.\
    **effects** Returns the associated details of the item.

  _getPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)\
    **requires** `item` exists.\
    **effects** Returns the set of all `PurchaseOption`s for the given `item`.

  _getAllItems (): (items: Set of Item)\
    **requires** nothing.\
    **effects** Returns a set of all `Item` entity IDs.
