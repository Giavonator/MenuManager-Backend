# MenuManager API Specification

## API Specification: StoreCatalog Concept

**Purpose:** Manage a comprehensive catalog of purchasable ingredients, their alternative names, and available purchase options across different stores.

---

### API Endpoints

#### POST /api/StoreCatalog/createItem

**Description:** Creates a new item in the catalog with a primary name.

**Requirements:**
- No Item already exists with `primaryName` in its names set.

**Effects:**
- Creates a new `Item` with `primaryName` in its `names` set and no empty `purchaseOptions`. Returns the new `Item` ID.

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

---

#### POST /api/StoreCatalog/deleteItem

**Description:** Removes an item from the catalog, along with all its associated purchase options.

**Requirements:**
- `item` exists.

**Effects:**
- Removes `item` from the catalog. Also removes all `PurchaseOption`s where `purchaseOption.item` is `item`.

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

---

#### POST /api/StoreCatalog/addPurchaseOption

**Description:** Adds a new purchase option to an existing item.

**Requirements:**
- `item` exists. `quantity` > 0, `price` >= 0.

**Effects:**
- Adds a new `purchaseOption` to `item.purchaseOptions` set with the specified details. Returns the new `PurchaseOption` ID.

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

---

#### POST /api/StoreCatalog/updatePurchaseOption

**Description:** Updates a specific attribute (quantity, units, price, or store) of a purchase option.

**Requirements:**
- `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.

**Effects:**
- Updates the specified attribute of the `purchaseOption`.

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

---

#### POST /api/StoreCatalog/removePurchaseOption

**Description:** Removes a specific purchase option from an item's associated options.

**Requirements:**
- `item` exists, `purchaseOption` is associated with `item`.

**Effects:**
- Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.

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

---

#### POST /api/StoreCatalog/addItemName

**Description:** Adds an additional name (alias) to an existing item.

**Requirements:**
- `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).

**Effects:**
- Adds `name` to the `names` set of `item`.

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

---

#### POST /api/StoreCatalog/removeItemName

**Description:** Removes an existing name (alias) from an item, provided it's not the only name.

**Requirements:**
- `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.

**Effects:**
- Removes `name` from the `names` set of `item`.

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

---

#### POST /api/StoreCatalog/confirmPurchaseOption

**Description:** Marks a purchase option as confirmed.

**Requirements:**
- `purchaseOption` exists, `purchaseOption` is not already `confirmed`.

**Effects:**
- Sets `purchaseOption.confirmed` to `true`.

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

---

#### POST /api/StoreCatalog/_getItemByName

**Description:** Returns the ID of an item that has the given name as one of its aliases.

**Requirements:**
- An item exists with `name` in its `names` set.

**Effects:**
- Returns the `Item` ID with the given name.

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

---

#### POST /api/StoreCatalog/_getItemByPurchaseOption

**Description:** Returns the ID of an item that is associated with the given purchase option.

**Requirements:**
- An item exists with `purchaseOption` in its `purchaseOption` set.

**Effects:**
- Returns the `Item` ID with the given purchaseOption.

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

---

#### POST /api/StoreCatalog/_getItemNames

**Description:** Returns all names (aliases) associated with a given item.

**Requirements:**
- `item` exists.

**Effects:**
- Returns the associated details of the item.

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

---

#### POST /api/StoreCatalog/_getItemPurchaseOptions

**Description:** Returns the set of all `PurchaseOption` IDs for a given item.

**Requirements:**
- `item` exists.

**Effects:**
- Returns the set of all `PurchaseOption`s for the given `item`.

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

---

#### POST /api/StoreCatalog/_getPurchaseOptionDetails

**Description:** Returns the detailed information for a specific purchase option.

**Requirements:**
- `purchaseOption` exists.

**Effects:**
- Returns the set of details given `purchaseOption`.

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

---

#### POST /api/StoreCatalog/_getAllItems

**Description:** Returns a set of all `Item` entity IDs currently in the catalog.

**Requirements:**
- nothing.

**Effects:**
- Returns a set of all `Item` entity IDs.

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

---

## API Specification: UserAuthentication Concept

**Purpose:** limit User access to particular subset of resources

---

### API Endpoints

#### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password. The first registered user is automatically an admin.

**Requirements:**
- no User exists with username

**Effects:**
- creates new User w/ username and password, if first user created admin flag set to true

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with the provided username and password.

**Requirements:**
- User exists with that username and password

**Effects:**
- authenticated as returned User and can view other concepts data that User has

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/UserAuthentication/deleteUser

**Description:** Deletes a specified user from the system.

**Requirements:**
- `userToDelete` is in `Users`
- and (not `userToDelete.admin` or (count(u in Users where `u.admin` is true) > 1))

**Effects:**
- removes `userToDelete` from `Users`

**Request Body:**
```json
{
  "userToDelete": "string"
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

---

#### POST /api/UserAuthentication/grantAdmin

**Description:** Grants administrative privileges to a target user.

**Requirements:**
- `targetUser` is in `Users`

**Effects:**
- sets `targetUser.admin` to true

**Request Body:**
```json
{
  "targetUser": "string"
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

---

#### POST /api/UserAuthentication/updatePassword

**Description:** Updates the password for a specified user.

**Requirements:**
- `user` is in `Users`
- and `user.password` matches `oldPassword`

**Effects:**
- `user.password` is set to `newPassword`

**Request Body:**
```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
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

---

#### POST /api/UserAuthentication/_getIsUserAdmin

**Description:** Checks if a specified user has administrative privileges.

**Requirements:**
- `user` is in `Users`

**Effects:**
- returns `user.admin`

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "isAdmin": "boolean"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/UserAuthentication/_getListOfUsers

**Description:** Returns a list of all registered user IDs.

**Requirements:**
- true

**Effects:**
- returns the set of all `Users`

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "users": [
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

---

#### POST /api/UserAuthentication/_getNumberOfAdmins

**Description:** Returns the total count of users with administrative privileges.

**Requirements:**
- true

**Effects:**
- returns count(u in Users where `u.admin` is true)

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "count": "number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/UserAuthentication/_getUsername

**Description:** Returns the username for a specified user.

**Requirements:**
- `user` is in `Users`

**Effects:**
- returns `user.username`

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "username": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## API Specification: MenuCollection Concept

**Purpose:** Organize and present a collection of recipes as a single menu for a specific date, allowing for individual recipe scaling within the menu.

---

### API Endpoints

#### POST /api/MenuCollection/createMenu

**Description:** Creates a new menu for a given date, owned by a specific user.

**Requirements:**
- `name` is not empty, `date` is in the future, `actingUser` exists. No other `Menu` exists for this `actingUser` on this `date`.

**Effects:**
- Creates a new `Menu` with the given `name`, `date`, and `owner`=`actingUser`. It will have an empty set of `menuRecipes`. Returns the new `Menu` ID.

**Request Body:**
```json
{
  "name": "string",
  "date": "string",
  "actingUser": "string"
}
```

**Success Response Body (Action):**
```json
{
  "menu": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/MenuCollection/updateMenu

**Description:** Updates either the name or the date of an existing menu.

**Requirements:**
- `menu` exists, no `otherMenu` on date has the same `menu.user` for new date.

**Effects:**
- Updates the specified attribute of the `menu`.

**Request Body (Update Name):**
```json
{
  "menu": "string",
  "name": "string"
}
```

**Request Body (Update Date):**
```json
{
  "menu": "string",
  "date": "string"
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

---

#### POST /api/MenuCollection/addRecipe

**Description:** Adds a recipe to a menu with a specified scaling factor.

**Requirements:**
- `menu` exists, `recipe` exists. `scalingFactor` > 0. `menu` does not already contain `recipe`.

**Effects:**
- Adds the `recipe` with its `scalingFactor` to `menu.menuRecipes`.

**Request Body:**
```json
{
  "menu": "string",
  "recipe": "string",
  "scalingFactor": "number"
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

---

#### POST /api/MenuCollection/removeRecipe

**Description:** Removes a recipe from a menu.

**Requirements:**
- `menu` exists, `recipe` exists in `menu.menuRecipes`.

**Effects:**
- Removes `recipe` from `menu.menuRecipes`.

**Request Body:**
```json
{
  "menu": "string",
  "recipe": "string"
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

---

#### POST /api/MenuCollection/changeRecipeScaling

**Description:** Changes the scaling factor for an existing recipe within a menu.

**Requirements:**
- `menu` exists, `recipe` exists in `menu.menuRecipes`. `newScalingFactor` > 0.

**Effects:**
- Updates the `scalingFactor` for `recipe` within `menu.menuRecipes` to `newScalingFactor`.

**Request Body:**
```json
{
  "menu": "string",
  "recipe": "string",
  "newScalingFactor": "number"
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

---

#### POST /api/MenuCollection/_getMenuDetails

**Description:** Returns the name, date, and owner of a specified menu.

**Requirements:**
- `menu` exists.

**Effects:**
- Returns details about the `menu`.

**Request Body:**
```json
{
  "menu": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "name": "string",
    "date": "string",
    "owner": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/MenuCollection/_getRecipesInMenu

**Description:** Returns a map of recipe IDs to their scaling factors for a given menu.

**Requirements:**
- `menu` exists.

**Effects:**
- Returns the map of `Recipe` IDs to their `scalingFactor`s for the given `menu`.

**Request Body:**
```json
{
  "menu": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "menuRecipes": {
      "recipeId": "number"
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

---

#### POST /api/MenuCollection/_getMenusOwnedByUser

**Description:** Returns the set of all menus owned by a specific user.

**Requirements:**
- `user` exists.

**Effects:**
- Returns the set of all `Menu` entities where the `owner` attribute matches the given user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "menus": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/MenuCollection/_getMenuByDate

**Description:** Returns the menu ID associated with a specific date.

**Requirements:**
- A menu exists for `date`.

**Effects:**
- Returns the `Menu` ID associated with that `date`.

**Request Body:**
```json
{
  "date": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "menu": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## API Specification: PurchaseSystem Concept

**Purpose:** Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts), tracking their purchase status and optimizing selections from available purchasing options.

---

### API Endpoints

#### POST /api/PurchaseSystem/createSelectOrder

**Description:** Creates a new `SelectOrder` representing an item with multiple purchase options.

**Requirements:**
- No order already exists for `associateID` within this `PurchaseSystem` concept.

**Effects:**
- Creates a new `SelectOrder` with `associateID`. Initializes `childAtomicOrders` to empty, `baseQuantity` to -1.0, `baseUnits` to "" (ie. no units yet), `parentOrders` to empty. Returns new `selectOrder` ID.

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

---

#### POST /api/PurchaseSystem/createAtomicOrder

**Description:** Creates a new `AtomicOrder` (a specific purchase option) and associates it with a `SelectOrder`.

**Requirements:**
- `selectOrder` exists. No order already exists for `associateID` within this `PurchaseSystem` concept.

**Effects:**
- Creates `atomicOrder` with `associateID`, `quantity`, `units`, `price` as arguments and `parentOrder` set to `selectOrder`. Adds `atomicOrder` to `selectOrder.childAtomicOrders`. If this is the first AtomicOrder option for `selectOrder` sets `selectOrder.baseUnits` and `selectOrder.baseQuantity` to `units` and `quantity` respectively, if its a subsequent then no modification to `selectOrder.baseUnits` and `selectOrder.baseQuantity` is necessary. Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.

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

---

#### POST /api/PurchaseSystem/deleteAtomicOrder

**Description:** Deletes a specific `AtomicOrder` from a `SelectOrder` and triggers recalculation of optimal purchases.

**Requirements:**
- `selectOrder` exists. `atomicOrder` exists and is in `selectOrder.childAtomicOrders`.

**Effects:**
- Removes `atomicOrder` from `selectOrder.childAtomicOrders`. Delete `atomicOrder`. If `atomicOrder` was the last AtomicOrder in `selectOrder.childAtomicOrders` then sets `selectOrder.baseQuantity` to -1 and `selectOrder.baseUnits` to "". Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `selectOrder.parentOrders`.

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

---

#### POST /api/PurchaseSystem/updateAtomicOrder

**Description:** Updates an attribute (quantity, units, or price) of an `AtomicOrder` and triggers recalculation.

**Requirements:**
- `atomicOrder` exists.

**Effects:**
- Updates the respective attribute withing `atomicOrder`. Lastly, calls `calculateOptimalPurchase` by passing in the set (set removes duplicates) of every `parentOrder.rootOrder` within `atomicOrder.parentOrder.parentOrders`.

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

---

#### POST /api/PurchaseSystem/createCompositeOrder

**Description:** Creates a new `CompositeOrder` for aggregating other orders.

**Requirements:**
- No order already exists for `associateID` within this `PurchaseSystem` concept.

**Effects:**
- Creates a new `CompositeOrder` with `associateID`. Initializes `childSelectOrders` to empty, `childCompositeOrders` to empty, optimalPurchase to empty, `totalCost` to 0.0, `purchased` to `false`, `parentOrder` to itself (if `parentOrder` is istelf then we know we are at root), and `rootOrder` to itself. Returns the new `CompositeOrder` ID.

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

---

#### POST /api/PurchaseSystem/addSelectOrderToCompositeOrder

**Description:** Adds a `SelectOrder` to a `CompositeOrder` with a specified scale factor and triggers recalculation.

**Requirements:**
- `compositeOrder` exists. `selectOrder` exists. `scaleFactor` > 0.

**Effects:**
- Maps `selectOrder` within `compositeOrder.childSelectOrders` to the given `scaleFactor`. Adds `compositeOrder` to the set `selectOrder.parentOrders`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.

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

---

#### POST /api/PurchaseSystem/removeSelectOrderFromCompositeOrder

**Description:** Removes a `SelectOrder` from a `CompositeOrder` and triggers recalculation.

**Requirements:**
- `compositeOrder` exists. `selectOrder` exists. `selectOrder` is within `compositeOrder.childSelectOrders`.

**Effects:**
- Removes `selectOrder` from `compositeOrder.childSelectOrders`. Removes `compositeOrder` from the set `selectOrder.parentOrders`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`.

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

---

#### POST /api/PurchaseSystem/addCompositeSubOrder

**Description:** Adds a child `CompositeOrder` to a parent `CompositeOrder`, forming a hierarchy and triggering recalculation.

**Requirements:**
- `parentOrder` exists. `childOrder` exists. For all `childOrder.childCompositeOrders` and the subsequent CompositeOrder children, none of which are within `parentOrder.childCompositeOrders` or its subsequent children (Essentially requires no cycle to be formed).

**Effects:**
- Adds `childOrder` to `parentOrder.childCompositeOrders`. Sets `childOrder.parentOrder` to `parentOrder` and `childOrder.rootOrder` to `parentOrder.rootOrder`. Sets all `childOrder.childCompositeOrders` and their subsequent CompositeOrder children to have new root `parentOrder.rootOrder`. Lastly, calls `calculateOptimalPurchase` for one `parentOrder.rootOrder` afterwards.

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

---

#### POST /api/PurchaseSystem/removeCompositeSubOrder

**Description:** Removes a child `CompositeOrder` from a parent `CompositeOrder`, updating roots and triggering recalculation.

**Requirements:**
- `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders`.

**Effects:**
- Removes `childOrder` from `parentOrder.childCompositeOrders`. Sets `childOrder.parentOrder` and `childOrder.rootOrder` to `childOrder` (itself). Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder` and `childOrder`.

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

---

#### POST /api/PurchaseSystem/updateSubOrderScaleFactor

**Description:** Updates the scale factor of a child order (either `SelectOrder` or `CompositeOrder`) within a parent `CompositeOrder`.

**Requirements:**
- `parentOrder` exists. `childOrder` exists and is in `parentOrder.childCompositeOrders` or in `parentOrder.childSelectOrders`. `newScaleFactor` > 0.

**Effects:**
- Maps `childOrder` within `parentOrder.childCompositeOrders` or `parentOrder.childSelectOrders` (depending on what type child is) to `newScaleFactor`. Lastly, calls `calculateOptimalPurchase` by passing in the set of just `parentOrder.rootOrder`.

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

---

#### POST /api/PurchaseSystem/deleteCompositeOrder

**Description:** Deletes a `CompositeOrder` and recursively cleans up its children (SelectOrders and other CompositeOrders) and triggers recalculation.

**Requirements:**
- `compositeOrder` exists.

**Effects:**
- Calls removeSelectOrderFromCompositeOrder for every SelectOrder in `compositeOrder.childSelectOrders`. Calls with parent being `compositeOrder.parentOrder`. Recursively calls deleteCompositeOrder for every CompositeOrder in `compositeOrder.childCompositeOrders`. Calls `calculateOptimalPurchase` by passing in the set of just `compositeOrder.rootOrder`. Finally, removes `compositeOrder` from the state.

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

---

#### POST /api/PurchaseSystem/calculateOptimalPurchase

**Description:** Calculates the most cost-effective combination of `AtomicOrder`s to fulfill all quantities required by a set of `CompositeOrder`s, updating their total cost and optimal purchase maps.

**Requirements:**
- Every CompositeOrder in `compositeOrder` exists.

**Effects:**
- Don't add to state but for this action keep track of `processedRootNodes`. For each `compositeOrder` in the passed in set of `compositeOrders`: If `compositeOrder.purchased`, skip it. If `compositeOrder.rootOrder` is in `processedRootNodes`, skip it. Now knowing we have a tree that has not been purchased or already calculated during this action, we continue. From the `compositeOrder.rootOrder` we propagate down multiplying the scaling factors, until we have gone through every CompositeOrder in the tree and now have a map of SelectOrder to Float for every SelectOrder we need to purchase for this `compositeOrder.rootOrder` (if SelectOrder doesn't have an AtomicOrder option, have cost for this SelectOrder during calculations be zero). For each individual SelectOrder now knowing its total scale factor, we select the optimal AtomicOrder that when purchased in multiples can buy at least the necessary quantity for the least amount of money. Now knowing all of the optimal AtomicOrders, we use those to propagate up from the leaf CompositeOrders calculating their costs and setting the `compositeOrder.totalCost` and `compositeOrder.optimalPurchase` map for every CompositeOrder.

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

---

#### POST /api/PurchaseSystem/purchaseOrder

**Description:** Marks a root `CompositeOrder` and all its descendant `CompositeOrder`s as purchased.

**Requirements:**
- `compositeOrder` exists. `compositeOrder.rootOrder` is itself. `compositeOrder.purchased` is false. All `SelectOrder`s within the tree have at least one AtomicOrder option.

**Effects:**
- Recursively sets `purchased` to `true` for all CompositeOrders rooted from `compositeOrder`.

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

---

#### POST /api/PurchaseSystem/_getOrderByAssociateID

**Description:** Returns any order (Atomic, Select, or Composite) associated with a given external ID.

**Requirements:**
- Order exists with `associateID`.

**Effects:**
- Returns the `order` associated with that ID.

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

---

#### POST /api/PurchaseSystem/_getOptimalPurchase

**Description:** Returns the calculated optimal purchase map for a `CompositeOrder`.

**Requirements:**
- `compositeOrder` exists.

**Effects:**
- Returns `compositeOrder.optimalPurchase`.

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

---

#### POST /api/PurchaseSystem/_getOrderCost

**Description:** Returns the total calculated cost of a `CompositeOrder`.

**Requirements:**
- `compositeOrder` exists.

**Effects:**
- Returns the `totalCost` of the `compositeOrder`.

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

---

## API Specification: WeeklyCart Concept

**Purpose:** Organize menus for a specific week into a coherent cart for ease of organization.

---

### API Endpoints

#### POST /api/WeeklyCart/createCart

**Description:** Creates a new weekly cart for the week containing the specified date.

**Requirements:**
- the current system date is before `dateInWeek`. No other `Cart` exists for the week containing `dateInWeek`.

**Effects:**
- Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week. Creates a new `Cart` with this `startDate` and `endDate`. It will have an empty set of `menus`.

**Request Body:**
```json
{
  "dateInWeek": "string"
}
```

**Success Response Body (Action):**
```json
{
  "cart": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/WeeklyCart/deleteCart

**Description:** Deletes the weekly cart corresponding to the week containing the specified date.

**Requirements:**
- there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.

**Effects:**
- Deletes `cart`.

**Request Body:**
```json
{
  "dateInWeek": "string"
}
```

**Success Response Body (Action):**
```json
{
  "cart": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/WeeklyCart/addMenuToCart

**Description:** Adds a menu to the weekly cart that encompasses the menu's date. If no such cart exists, a new one is created.

**Requirements:**
- `menu` exists.

**Effects:**
- Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate`. If such a cart doesn't exist, a createCart for that date and then add `menu` to the new cart. Return `cart` menu was added to.

**Request Body:**
```json
{
  "menu": "string",
  "menuDate": "string"
}
```

**Success Response Body (Action):**
```json
{
  "cart": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/WeeklyCart/removeMenuFromCart

**Description:** Removes a specified menu from the cart it currently belongs to.

**Requirements:**
- `menu` exists in a `cart.menus`.

**Effects:**
- Removes `menu` from `cart.menus`. Return `cart` that menu was removed from.

**Request Body:**
```json
{
  "menu": "string"
}
```

**Success Response Body (Action):**
```json
{
  "cart": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/WeeklyCart/_getCartDates

**Description:** Returns the start and end dates of a specified weekly cart.

**Requirements:**
- `cart` exists.

**Effects:**
- Returns `cart` `startDate` and `endDate`.

**Request Body:**
```json
{
  "cart": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "startDate": "string",
    "endDate": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/WeeklyCart/_getMenusInCart

**Description:** Returns the set of all menu IDs associated with a given weekly cart.

**Requirements:**
- `cart` exists.

**Effects:**
- Returns the set of all `Menu` IDs associated with the given `cart`.

**Request Body:**
```json
{
  "cart": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "menus": [
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

---

#### POST /api/WeeklyCart/_getCartByDate

**Description:** Returns the weekly cart that contains the specified date within its range.

**Requirements:**
- true.

**Effects:**
- Returns the `cart` for that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.

**Request Body:**
```json
{
  "date": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "cart": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## API Specification: CookBook Concept

**Purpose:** Store and manage definitions of recipes, including their ingredients, instructions, and ownership, enabling reuse and duplication for chefs.

---

### API Endpoints

#### POST /api/CookBook/createRecipe

**Description:** Creates a new recipe with a given name and owner.

**Requirements:**
- `name` is not empty.

**Effects:**
- Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1), empty `dishType`, `owner` set to `user`, and no ingredients. Returns the new `Recipe` ID.

**Request Body:**
```json
{
  "name": "string",
  "user": "string"
}
```

**Success Response Body (Action):**
```json
{
  "recipe": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/CookBook/updateRecipe

**Description:** Updates a specific attribute (instructions, serving quantity, dish type, or name) of a recipe.

**Requirements:**
- `recipe` exists. (`servingQuantity` > 0 // Only for servingQuantity update).

**Effects:**
- Updates the specified attribute of the `recipe`.

**Request Body (Update Instructions):**
```json
{
  "recipe": "string",
  "instructions": "string"
}
```

**Request Body (Update Serving Quantity):**
```json
{
  "recipe": "string",
  "servingQuantity": "number"
}
```

**Request Body (Update Dish Type):**
```json
{
  "recipe": "string",
  "dishType": "string"
}
```

**Request Body (Update Name):**
```json
{
  "recipe": "string",
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

---

#### POST /api/CookBook/duplicateRecipe

**Description:** Creates a new recipe that is a copy of an existing one, assigned to a new owner and with a new name.

**Requirements:**
- `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.

**Effects:**
- Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity, dishType, and all ingredients including their names, quantities, and units). Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.

**Request Body:**
```json
{
  "originalRecipe": "string",
  "user": "string",
  "newName": "string"
}
```

**Success Response Body (Action):**
```json
{
  "newRecipe": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/CookBook/addRecipeIngredient

**Description:** Adds a new ingredient with specified details to a recipe.

**Requirements:**
- `recipe` exists. `name` is not an existing ingredient in recipe. `quantity` > 0. `units` is not empty.

**Effects:**
- New `Ingredient` with the given `name`, `quantity`, and `units` is added to `recipe.ingredients`.

**Request Body:**
```json
{
  "recipe": "string",
  "name": "string",
  "quantity": "number",
  "units": "string"
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

---

#### POST /api/CookBook/updateRecipeIngredient

**Description:** Updates the quantity and units of an existing ingredient in a recipe.

**Requirements:**
- `recipe` exists. `recipe.ingredients` contaings ingredient with `name`. `quantity` > 0. `units` is not empty.

**Effects:**
- Ingredient with `name` in `recipe.ingredients` has parameters `quantity` and `units` updated.

**Request Body:**
```json
{
  "recipe": "string",
  "name": "string",
  "quantity": "number",
  "units": "string"
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

---

#### POST /api/CookBook/removeRecipeIngredient

**Description:** Removes a specified ingredient from a recipe.

**Requirements:**
- `recipe` exists. An ingredient with `name` exists in `recipe.ingredients`.

**Effects:**
- Removes the `Ingredient` with the given `name` from `recipe.ingredients`.

**Request Body:**
```json
{
  "recipe": "string",
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

---

#### POST /api/CookBook/_getRecipeDetails

**Description:** Returns the primary attributes (name, instructions, serving quantity, dish type, and owner) of a recipe.

**Requirements:**
- `recipe` exists.

**Effects:**
- Returns all primary attributes of the recipe.

**Request Body:**
```json
{
  "recipe": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "name": "string",
    "instructions": "string",
    "servingQuantity": "number",
    "dishType": "string",
    "owner": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

#### POST /api/CookBook/_getRecipeIngredients

**Description:** Returns the set of all ingredients, including their name, quantity, and units, for a recipe.

**Requirements:**
- `recipe` exists.

**Effects:**
- Returns the set of all ingredients (each with its name, quantity, and units) for the `recipe`.

**Request Body:**
```json
{
  "recipe": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "ingredients": [
      {
        "name": "string",
        "quantity": "number",
        "units": "string"
      }
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

---

#### POST /api/CookBook/_getRecipesOwnedByUser

**Description:** Returns the set of all recipes owned by a given user.

**Requirements:**
- `user` exists.

**Effects:**
- Returns the set of all recipes owned by the given `user`. This can be an empty set if there are no current Recipes.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "recipe": "string",
    "name": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}