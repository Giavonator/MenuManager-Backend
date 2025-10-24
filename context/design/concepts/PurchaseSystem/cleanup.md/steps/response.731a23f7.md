---
timestamp: 'Thu Oct 23 2025 16:56:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_165603.cf852ec1.md]]'
content_id: 731a23f7f3151cdd8cdfdfd8d9425c105a9063cd49ae68162878040f121aa766
---

# response:

```
**concept** PurchaseSystem [PurchaseOption]

**purpose** Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts), tracking their purchase status.

**principle** An online optimizing purchasing system that first `createAtomicOrder` the different variants of something to purchase. That thing is then added as a `createSelectOrder`, where it is able to select any of its AtomicOrder in order to purchase the desired amount of that SelectOrder. A set of items are then composed into a `createCompositeOrder`, which starts from a base SelectOrder and its scaling. To this CompositeOrder we can `addSubOrder` which will add a scaling to either a different CompositeOrder or a SelectOrder. At any point for a CompositeOrder a `calculateOptimalPurchase` will calculate and update the cost for that CompositeOrder. Finally, a `purchaseOrder` can be placed on any head CompositeOrder (has no parents) and it will mark every SelectOrder and CompositeOrder in its subtree as purchased.

**state**
  a set of AtomicOrder with
    a purchaseOption PurchaseOption
    a quantity Float // Ex. 3.0
    a units String // Ex. "lbs", "oz", "count"
    a price Float // Ex. 5.99 (cost for this specific quantity)
    a parentSelectOrder SelectOrder

  a set of SelectOrder with
    a desiredQuantity Float // Ex. 5.0
    a desiredUnits String // Ex. "lbs"
    a childAtomicOrders Set of AtomicOrder
    a parentCompositeOrders Set of CompositeOrder
    a purchased Bool\
    // Implicit: optimalAtomicOrder: AtomicOrder?

  a set of CompositeOrder with
    a childOrders Map of (SelectOrder | CompositeOrder) to Float // Map from Order ID to its scale factor
    a parentCompositeOrders Set of CompositeOrder
    a totalCost Float // Optimally calculated
    a purchased Bool
    // Implicit: associatedEntity: AssociatedEntity

**actions**
  createAtomicOrder (purchaseOption: PurchaseOption, quantity: Float, units: String, price: Float, parentSelectOrder: SelectOrder): (atomicOrder: AtomicOrder)
    **requires** `purchaseOption` exists. `parentSelectOrder` exists.
    **effects** Creates a new `AtomicOrder` and associates it with `parentSelectOrder`. Adds the new `AtomicOrder` to `parentSelectOrder.childAtomicOrders`. Returns the new `AtomicOrder` ID.

  createSelectOrder (desiredQuantity: Float, desiredUnits: String): (selectOrder: SelectOrder)
    **requires** `desiredQuantity` > 0.
    **effects** Creates a new `SelectOrder` with `desiredQuantity`, `desiredUnits`. Initializes `purchased` to `false` and `optimalAtomicOrder` to null. Returns the new `SelectOrder` ID.

  createCompositeOrder (associatedEntity: AssociatedEntity): (compositeOrder: CompositeOrder)
    **requires** `associatedEntity` is a valid opaque ID (e.g., a RecipeID).
    **effects** Creates a new `CompositeOrder` with the given `associatedEntity`. Initializes `childOrders` to empty, `totalCost` to 0.0, and `purchased` to `false`. Returns the new `CompositeOrder` ID.

  addAvailableAtomicOrderToSelectOrder (selectOrder: SelectOrder, atomicOrder: AtomicOrder)
    **requires** `selectOrder` exists. `atomicOrder` exists. `atomicOrder.parentSelectOrder` is `selectOrder`.
    **effects** Adds `atomicOrder` to `selectOrder.childAtomicOrders`.

  removeAvailableAtomicOrderFromSelectOrder (selectOrder: SelectOrder, atomicOrder: AtomicOrder)
    **requires** `selectOrder` exists. `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.
    **effects** Removes `atomicOrder` from `selectOrder.childAtomicOrders`. If `atomicOrder` was `selectOrder.optimalAtomicOrder`, then `selectOrder.optimalAtomicOrder` is cleared. Triggers `calculateOptimalPurchase` for affected parent `CompositeOrder`s.

  addSubOrder (parentCompositeOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder), scaleFactor: Float)
    **requires** `parentCompositeOrder` exists. `childOrder` exists. `scaleFactor` > 0. `childOrder` is not already a child order of `parentCompositeOrder`.
    **effects** Adds `childOrder` to `parentCompositeOrder.childOrders` with the given `scaleFactor`. Adds `parentCompositeOrder` to `childOrder.parentCompositeOrders`. Triggers `calculateOptimalPurchase` for `parentCompositeOrder` and its ancestors.

  removeSubOrder (parentCompositeOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder))
    **requires** `parentCompositeOrder` exists. `childOrder` exists and is a child order of `parentCompositeOrder`.
    **effects** Removes `childOrder` from `parentCompositeOrder.childOrders`. Removes `parentCompositeOrder` from `childOrder.parentCompositeOrders`. Triggers `calculateOptimalPurchase` for `parentCompositeOrder` and its ancestors.

  updateSubOrderScaleFactor (parentCompositeOrder: CompositeOrder, childOrder: (SelectOrder | CompositeOrder), newScaleFactor: Float)
    **requires** `parentCompositeOrder` exists. `childOrder` exists and is a child order of `parentCompositeOrder`. `newScaleFactor` > 0.
    **effects** Updates the `scaleFactor` for `childOrder` in `parentCompositeOrder.childOrders`. Triggers `calculateOptimalPurchase` for `parentCompositeOrder` and its ancestors.

  calculateOptimalPurchase (compositeOrder: CompositeOrder)
    **requires** `compositeOrder` exists. All `SelectOrder`s in its subtree have `childAtomicOrders` populated.
    **effects** Recursively determines the optimal `AtomicOrder` for each `SelectOrder` in the `compositeOrder`'s subtree, setting `selectOrder.optimalAtomicOrder`. Updates `compositeOrder.totalCost` and the `totalCost` of all its ancestor `CompositeOrder`s based on these optimal selections and scale factors. Sets `purchased` to `false` for `compositeOrder` and all parent `CompositeOrder`s if any optimal selection changes.

  purchaseOrder (compositeOrder: CompositeOrder)
    **requires** `compositeOrder` exists and has an empty `parentCompositeOrders` set (it is a head node). All `SelectOrder`s nested under `compositeOrder` have an `optimalAtomicOrder` selected.
    **effects** Recursively sets `purchased` to `true` for `compositeOrder` and all `SelectOrder`s and `CompositeOrder`s in its subtree.

  deleteOrder (order: (AtomicOrder | SelectOrder | CompositeOrder))
    **requires** `order` exists.
    **effects** Deletes the specified `order`.
*   If `order` is an `AtomicOrder`: removes it from its `parentSelectOrder.childAtomicOrders`. If it was `optimalAtomicOrder` for its parent, that selection is cleared.
*   If `order` is a `SelectOrder`: removes it from all `parentCompositeOrders.childOrders` of its parents, and deletes its associated `AtomicOrder`s.
*   If `order` is a `CompositeOrder`: removes it from all `parentCompositeOrders.childOrders` of its parents, and removes its references to its own `childOrders`.
Triggers recalculation in any affected parent `CompositeOrder`s.

**queries**
  _getAtomicOrderDetails (atomicOrder: AtomicOrder): (purchaseOption: PurchaseOption, quantity: Float, units: String, price: Float, parentSelectOrder: SelectOrder)
    **requires** `atomicOrder` exists.
    **effects** Returns the `purchaseOption`, `quantity`, `units`, `price`, and `parentSelectOrder` of the `atomicOrder`.

  _getSelectOrderDetails (selectOrder: SelectOrder): (desiredQuantity: Float, desiredUnits: String, childAtomicOrders: Set of AtomicOrder, optimalAtomicOrder: AtomicOrder, purchased: Bool, parentCompositeOrders: Set of CompositeOrder)
    **requires** `selectOrder` exists.
    **effects** Returns the `desiredQuantity`, `desiredUnits`, `childAtomicOrders`, `optimalAtomicOrder`, `purchased`, and `parentCompositeOrders` of the `selectOrder`.

  _getCompositeOrderDetails (compositeOrder: CompositeOrder): (associatedEntity: AssociatedEntity, childOrders: Map of (SelectOrder | CompositeOrder) to Float, totalCost: Float, purchased: Bool, parentCompositeOrders: Set of CompositeOrder)
    **requires** `compositeOrder` exists.
    **effects** Returns the `associatedEntity`, `childOrders`, `totalCost`, `purchased`, and `parentCompositeOrders` of the `compositeOrder`.

  _getHeadCompositeOrders (): (compositeOrders: Set of CompositeOrder)
    **requires** true.
    **effects** Returns the set of all `CompositeOrder`s that have an empty `parentCompositeOrders` set.

  _getUnpurchasedHeadCompositeOrders (): (compositeOrders: Set of CompositeOrder)
    **requires** true.
    **effects** Returns the set of all `CompositeOrder`s that have an empty `parentCompositeOrders` set and where `purchased` is `false`.

  _getEffectiveSelectOrdersForComposite (compositeOrder: CompositeOrder): (effectiveSelectOrders: Map of SelectOrder to {effectiveQuantity: Float, effectiveUnits: String})
    **requires** `compositeOrder` exists.
    **effects** Traverses the hierarchy under `compositeOrder` and returns a map of each `SelectOrder` to its total required effective quantity and units, accounting for all scale factors.
```
