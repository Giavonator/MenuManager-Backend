---
timestamp: 'Tue Oct 28 2025 20:37:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203719.baaed448.md]]'
content_id: b29bd203915f854b533beb2fbd8e6761cae17d5d1d67610a260dc57e39ba5363
---

# API Specification: PurchaseSystem Concept

**Purpose:** Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts), tracking their purchase status and optimizing selections from available purchasing options.

***

## API Endpoints

### POST /api/PurchaseSystem/createSelectOrder

**Description:** Creates a new `SelectOrder` representing an item with multiple purchase options.

**Requirements:**

* No order already exists for `associateID` within this `PurchaseSystem` concept.

**Effects:**

* Creates a new `SelectOrder` with `associateID`. Initializes `childAtomicOrders` to empty, `baseQuantity` to -1.0, `baseUnits` to "" (ie. no units yet), `parentOrders` to empty. Returns new `selectOrder` ID.

**Request Body:**

```json
{
  "associateID": "string"
}
```

**Success Response Body (Action):**

```json
{
  "selectOrder": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/createAtomicOrder

**Description:** Creates a new `AtomicOrder` (a specific purchase option) and associates it with a `SelectOrder`.

**Requirements:**

* `selectOrder` exists. No order already exists for `associateID` within this `PurchaseSystem` concept.

**Effects:**

* Creates `atomicOrder` with `associateID`, `quantity`, `units`, `price` as arguments and `parentOrder` set to `selectOrder`. Adds `atomicOrder` to `selectOrder.childAtomicOrders`. If this is the first AtomicOrder option for `selectOrder` sets `selectOrder.baseUnits` and `selectOrder.baseQuantity` to `units` and `quantity` respectively, if its a subsequent then no modification to `selectOrder.baseUnits` and `selectOrder.baseQuantity` is necessary. Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.

**Request Body:**

```json
{
  "selectOrder": "string",
  "associateID": "string",
  "quantity": "number",
  "units": "string",
  "price": "number"
}
```

**Success Response Body (Action):**

```json
{
  "atomicOrder": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/deleteAtomicOrder

**Description:** Deletes a specific `AtomicOrder` from a `SelectOrder` and triggers recalculation of optimal purchases.

**Requirements:**

* `selectOrder` exists. `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.

**Effects:**

* Removes `atomicOrder` from `selectOrder.childAtomicOrders`. Delete `atomicOrder`. If `atomicOrder` was the last AtomicOrder in `selectOrder.childAtomicOrders` then sets `selectOrder.baseQuantity` to -1 and `selectOrder.baseUnits` to "". Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.

**Request Body:**

```json
{
  "selectOrder": "string",
  "atomicOrder": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/updateAtomicOrder

**Description:** Updates an attribute (quantity, units, or price) of an `AtomicOrder` and triggers recalculation.

**Requirements:**

* `atomicOrder` exists.

**Effects:**

* Updates the respective attribute withing `atomicOrder`. Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `atomicOrder.parentOrder.parentOrders`.

**Request Body (Update Quantity):**

```json
{
  "atomicOrder": "string",
  "quantity": "number"
}
```

**Request Body (Update Units):**

```json
{
  "atomicOrder": "string",
  "units": "string"
}
```

**Request Body (Update Price):**

```json
{
  "atomicOrder": "string",
  "price": "number"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/createCompositeOrder

**Description:** Creates a new `CompositeOrder` for aggregating other orders.

**Requirements:**

* No order already exists for `associateID` within this `PurchaseSystem` concept.

**Effects:**

* Creates a new `CompositeOrder` with `associateID`. Initializes `childSelectOrders` to empty, `childCompositeOrders` to empty, optimalPurchase to empty, `totalCost` to 0.0, `purchased` to `false`, `parentOrder` to itself (if `parentOrder` is istelf then we know we are at root), and `rootOrder` to itself. Returns the new `CompositeOrder` ID.

**Request Body:**

```json
{
  "associateID": "string"
}
```

**Success Response Body (Action):**

```json
{
  "compositeOrder": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/addSelectOrderToCompositeOrder

**Description:** Adds a `SelectOrder` to a `CompositeOrder` with a specified scale factor and triggers recalculation.

**Requirements:**

* `compositeOrder` exists. `selectOrder` exists. `scaleFactor` > 0.

**Effects:**

* Maps `selectOrder` within `compositeOrder.childSelectOrders` to the given `scaleFactor`. Adds `compositeOrder` to the set `selectOrder.parentOrders`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.

**Request Body:**

```json
{
  "compositeOrder": "string",
  "selectOrder": "string",
  "scaleFactor": "number"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/removeSelectOrderFromCompositeOrder

**Description:** Removes a `SelectOrder` from a `CompositeOrder` and triggers recalculation.

**Requirements:**

* `compositeOrder` exists. `selectOrder` exists. `selectOrder` is within `compositeOrder.childSelectOrders`.

**Effects:**

* Removes `selectOrder` from `compositeOrder.childSelectOrders`. Removes `compositeOrder` from the set `selectOrder.parentOrders`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.

**Request Body:**

```json
{
  "compositeOrder": "string",
  "selectOrder": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/addCompositeSubOrder

**Description:** Adds a child `CompositeOrder` to a parent `CompositeOrder`, forming a hierarchy and triggering recalculation.

**Requirements:**

* `parentOrder` exists. `childOrder` exists. For all `childOrder.childCompositeOrders` and the subsequent CompositeOrder children, none of which are within `parentOrder.childCompositeOrders` or its subsequent children (Essentially requires no cycle to be formed).

**Effects:**

* Adds `childOrder` to `parentOrder.childCompositeOrders`. Sets `childOrder.parentOrder` to `parentOrder` and `childOrder.rootOrder` to `parentOrder.rootOrder`. Sets all `childOrder.childCompositeOrders` and their subsequent CompositeOrder children to have new root `parentOrder.rootOrder`. Lastly, calls `calculateOptimalPurchase` for one `parentOrder.rootOrder` afterwards.

**Request Body:**

```json
{
  "parentOrder": "string",
  "childOrder": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/removeCompositeSubOrder

**Description:** Removes a child `CompositeOrder` from a parent `CompositeOrder`, updating roots and triggering recalculation.

**Requirements:**

* `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders`.

**Effects:**

* Removes `childOrder` from `parentOrder.childCompositeOrders`. Sets `childOrder.parentOrder` and `childOrder.rootOrder` to `childOrder` (itself). Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder` and `childOrder`.

**Request Body:**

```json
{
  "parentOrder": "string",
  "childOrder": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/updateSubOrderScaleFactor

**Description:** Updates the scale factor of a child order (either `SelectOrder` or `CompositeOrder`) within a parent `CompositeOrder`.

**Requirements:**

* `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders` or in `parentOrder.childSelectOrders`. `newScaleFactor` > 0.

**Effects:**

* Maps `childOrder` within `parentOrder.childCompositeOrders` or `parentOrder.childSelectOrders` (depending on what type child is) to `newScaleFactor`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder`.

**Request Body:**

```json
{
  "parentOrder": "string",
  "childOrder": "string",
  "newScaleFactor": "number"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/deleteCompositeOrder

**Description:** Deletes a `CompositeOrder` and recursively cleans up its children (SelectOrders and other CompositeOrders) and triggers recalculation.

**Requirements:**

* `compositeOrder` exists.

**Effects:**

* Calls removeSelectOrderFromCompositeOrder for every SelectOrder in `compositeOrder.childSelectOrders`. Calls with parent being `compositeOrder.parentOrder`. Recursively calls deleteCompositeOrder for every CompositeOrder in `compositeOrder.childCompositeOrders`. Calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`. Finally, removes `compositeOrder` from the state.

**Request Body:**

```json
{
  "compositeOrder": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/calculateOptimalPurchase

**Description:** Calculates the most cost-effective combination of `AtomicOrder`s to fulfill all quantities required by a set of `CompositeOrder`s, updating their total cost and optimal purchase maps.

**Requirements:**

* Every CompositeOrder in `compositeOrder` exists.

**Effects:**

* Don't add to state but for this action keep track of `processedRootNodes`. For each `compositeOrder` in the passed in set of `compositeOrders`: If `compositeOrder.purchased`, skip it. If `compositeOrder.rootOrder` is in `processedRootNodes`, skip it. Now knowing we have a tree that has not been purchased or already calculated during this action, we continue. From the `compositeOrder.rootOrder` we propagate down multiplying the scaling factors, until we have gone through every CompositeOrder in the tree and now have a map of SelectOrder to Float for every SelectOrder we need to purchase for this `compositeOrder.rootOrder` (if SelectOrder doesn't have an AtomicOrder option, have cost for this SelectOrder during calculations be zero). For each individual SelectOrder now knowing its total scale factor, we select the optimal AtomicOrder that when purchased in multiples can buy at least the necessary quantity for the least amount of money. Now knowing all of the optimal AtomicOrders, we use those to propagate up from the leaf CompositeOrders calculating their costs and setting the `compositeOrder.totalCost` and `compositeOrder.optimalPurchase` map for every CompositeOrder.

**Request Body:**

```json
{
  "compositeOrders": [
    "string"
  ]
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/purchaseOrder

**Description:** Marks a root `CompositeOrder` and all its descendant `CompositeOrder`s as purchased.

**Requirements:**

* `compositeOrder` exists. `compositeOrder.rootOrder` is itself. `compositeOrder.purchased` is false. All `SelectOrder`s within the tree have at least one AtomicOrder option.

**Effects:**

* Recursively sets `purchased` to `true` for all CompositeOrders rooted from `compositeOrder`.

**Request Body:**

```json
{
  "compositeOrder": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/\_getOrderByAssociateID

**Description:** Returns any order (Atomic, Select, or Composite) associated with a given external ID.

**Requirements:**

* Order exists with `associateID`.

**Effects:**

* Returns the `order` associated with that ID.

**Request Body:**

```json
{
  "associateID": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "order": {
      "_id": "string",
      "associateID": "string",
      "quantity": "number",
      "units": "string",
      "price": "number",
      "parentOrder": "string",
      "baseQuantity": "number",
      "baseUnits": "string",
      "childAtomicOrders": [
        "string"
      ],
      "parentOrders": [
        "string"
      ],
      "childSelectOrders": {
        "selectOrderId": "number"
      },
      "childCompositeOrders": {
        "compositeOrderId": "number"
      },
      "optimalPurchase": {
        "atomicOrderId": "number"
      },
      "totalCost": "number",
      "rootOrder": "string",
      "purchased": "boolean"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/\_getOptimalPurchase

**Description:** Returns the calculated optimal purchase map for a `CompositeOrder`.

**Requirements:**

* `compositeOrder` exists.

**Effects:**

* Returns `compositeOrder.optimalPurchase`.

**Request Body:**

```json
{
  "compositeOrder": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "optimalPurchase": {
      "atomicOrderId": "number"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PurchaseSystem/\_getOrderCost

**Description:** Returns the total calculated cost of a `CompositeOrder`.

**Requirements:**

* `compositeOrder` exists.

**Effects:**

* Returns the `totalCost` of the `compositeOrder`.

**Request Body:**

```json
{
  "compositeOrder": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "totalCost": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
