---
timestamp: 'Tue Oct 28 2025 20:37:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203719.baaed448.md]]'
content_id: eac2db27dbe7bd4a4a4db828db41bb093ce95d669b5c870f29f0fea14ac4d34c
---

# API Specification: StoreCatalog Concept

**Purpose:** Manage a comprehensive catalog of purchasable ingredients, their alternative names, and available purchase options across different stores.

***

## API Endpoints

### POST /api/StoreCatalog/createItem

**Description:** Creates a new item in the catalog with a primary name.

**Requirements:**

* No Item already exists with `primaryName` in its names set.

**Effects:**

* Creates a new `Item` with `primaryName` in its `names` set and no empty `purchaseOptions`. Returns the new `Item` ID.

**Request Body:**

```json
{
  "primaryName": "string"
}
```

**Success Response Body (Action):**

```json
{
  "item": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/StoreCatalog/deleteItem

**Description:** Removes an item from the catalog, along with all its associated purchase options.

**Requirements:**

* `item` exists.

**Effects:**

* Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.

**Request Body:**

```json
{
  "item": "string"
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

### POST /api/StoreCatalog/addPurchaseOption

**Description:** Adds a new purchase option to an existing item.

**Requirements:**

* `item` exists. `quantity` > 0, `price` >= 0.

**Effects:**

* Adds a new `purchaseOption` to `item.purchaseOptions` set with the specified details. Returns the new `PurchaseOption` ID.

**Request Body:**

```json
{
  "item": "string",
  "quantity": "number",
  "units": "string",
  "price": "number",
  "store": "string"
}
```

**Success Response Body (Action):**

```json
{
  "purchaseOption": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/StoreCatalog/updatePurchaseOption

**Description:** Updates a specific attribute (quantity, units, price, or store) of a purchase option.

**Requirements:**

* `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.

**Effects:**

* Updates the specified attribute of the `purchaseOption`.

**Request Body (Update Quantity):**

```json
{
  "purchaseOption": "string",
  "quantity": "number"
}
```

**Request Body (Update Units):**

```json
{
  "purchaseOption": "string",
  "units": "string"
}
```

**Request Body (Update Price):**

```json
{
  "purchaseOption": "string",
  "price": "number"
}
```

**Request Body (Update Store):**

```json
{
  "purchaseOption": "string",
  "store": "string"
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

### POST /api/StoreCatalog/removePurchaseOption

**Description:** Removes a specific purchase option from an item's associated options.

**Requirements:**

* `item` exists, `purchaseOption` is associated with `item`.

**Effects:**

* Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.

**Request Body:**

```json
{
  "item": "string",
  "purchaseOption": "string"
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

### POST /api/StoreCatalog/addItemName

**Description:** Adds an additional name (alias) to an existing item.

**Requirements:**

* `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).

**Effects:**

* Adds `name` to the `names` set of `item`.

**Request Body:**

```json
{
  "item": "string",
  "name": "string"
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

### POST /api/StoreCatalog/removeItemName

**Description:** Removes an existing name (alias) from an item, provided it's not the only name.

**Requirements:**

* `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.

**Effects:**

* Removes `name` from the `names` set of `item`.

**Request Body:**

```json
{
  "item": "string",
  "name": "string"
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

### POST /api/StoreCatalog/confirmPurchaseOption

**Description:** Marks a purchase option as confirmed.

**Requirements:**

* `purchaseOption` exists, `purchaseOption` is not already `confirmed`.

**Effects:**

* Sets `purchaseOption.confirmed` to `true`.

**Request Body:**

```json
{
  "purchaseOption": "string"
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

### POST /api/StoreCatalog/\_getItemByName

**Description:** Returns the ID of an item that has the given name as one of its aliases.

**Requirements:**

* An item exists with `name` in its `names` set.

**Effects:**

* Returns the `Item` ID with the given name.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "item": "string"
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

### POST /api/StoreCatalog/\_getItemByPurchaseOption

**Description:** Returns the ID of an item that is associated with the given purchase option.

**Requirements:**

* An item exists with `purchaseOption` in its `purchaseOption` set.

**Effects:**

* Returns the `Item` ID with the given purchaseOption.

**Request Body:**

```json
{
  "purchaseOption": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "item": "string"
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

### POST /api/StoreCatalog/\_getItemNames

**Description:** Returns all names (aliases) associated with a given item.

**Requirements:**

* `item` exists.

**Effects:**

* Returns the associated details of the item.

**Request Body:**

```json
{
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "names": [
      "string"
    ]
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

### POST /api/StoreCatalog/\_getItemPurchaseOptions

**Description:** Returns the set of all `PurchaseOption` IDs for a given item.

**Requirements:**

* `item` exists.

**Effects:**

* Returns the set of all `PurchaseOption`s for the given `item`.

**Request Body:**

```json
{
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "purchaseOptions": [
      "string"
    ]
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

### POST /api/StoreCatalog/\_getPurchaseOptionDetails

**Description:** Returns the detailed information for a specific purchase option.

**Requirements:**

* `purchaseOption` exists.

**Effects:**

* Returns the set of details given `purchaseOption`.

**Request Body:**

```json
{
  "purchaseOption": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "quantity": "number",
    "units": "string",
    "price": "number",
    "store": "string",
    "confirmed": "boolean"
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

### POST /api/StoreCatalog/\_getAllItems

**Description:** Returns a set of all `Item` entity IDs currently in the catalog.

**Requirements:**

* nothing.

**Effects:**

* Returns a set of all `Item` entity IDs.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "items": [
      "string"
    ]
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
