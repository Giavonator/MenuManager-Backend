[@concept-design-overview](../background/concept-design-overview.md)

[@concept-specifications](../background/concept-specifications.md)

[@MenuManager.md](../concepts/MenuManager/MenuManager.md)

I've realized that having one very large concept does not work, and is a pain to implement and test. We would like to refactor the MenuManager concept into five seperate concepts: StoreCatalog, CookBook, FrenchMeal, ShoppingCart, PurchaseSystem. Instead of having one big concept, instead these basic concepts will be synchronized together to perform what the previous MenuManger was doing. Your goal is to use the old MenuManager along with the additional notes below, and write a concept file for each of the new concepts.

StoreCatalog: Should be the set of Item from MenuManager. Changes to be made:
1. Each Item should have a set of PurchaseAmount, where each PurchaseAmount has a quantity (Ex. 3) and a units ("lbs"). That way we can store different sizes of things that we would be able to purchase.

FrenchMeal: Should contain the set of Recipe, but don't include cost for the recipe. Instead for each recipe have an associated 'Order' that will be defined in PurchaseSystem. Whenever a change happens to the recipe, it will be synchronously mapped to that recipes order. Changes to be made to the recipes:
1. Recipe should no longer be tied to a Menu within its scope. Remove menu from all updateRecipe and createRecipe.
2. Creating a recipe should now only require a recipe name. The rest should be updated using updateRecipe.
3. Create an designateOwner action that asignes a User as the owner to a recipe. It must require that the recipe doesn't already have an owner.
4. Create duplicateRecipe that takes in a recipe ID and a user ID, which will duplicate the recipe and have the new user own that duplicated recipe.
5. Modify pullRecipeFromWebsite to addCopiedIngredients that should instead take in a String that would be the copy and pasting of all the ingredients from the user. This way the LLM can parse through directly the ingredients (which is most of the work), and then add them to the Recipe. This should also return the set of ingredients that were not added to the recipe. That way we are able to inform the user of ones that were forgotten.

FrenchMeal: This should be the set of Menu that have a set of Recipe, but only Recipe ID. As this is its own concept now the Menu cannot see everything that is within the Recipe, but rather is more just like a list of Recipe. The Menu should no longer have a cost, but instead an associated 'Order' that will be defined in PurchaseSystem. Changes to he made to menus:
1. Create an addRecipe action that associated a recipe ID with the Menu. The menu owner does not need to own the recipe. This addRecipe should only take the Recipe ID and a scaling for that Recipe.
2. Create changeRecipeScaling action that can change the scaling of a Recipe within the Menu.
3. Each Menu should have stored the ID of its respective Order.

ShoppingCart: This should be the set of Cart that contain the set of Menu for a specific week. It should have the startDate, endDate, set of Menu, and the ID for its respective Order.
1. List of actions should be createCart, addMenuToCart, removeMenuFromCart.

PurchaseSystem: Really the only new concept, and is replacing the set of Cart. Instead we should now have a set of Order that contain: a set of SubOrder, a set of ParentOrder, a cost Float, a purchased Flag. The actions for this concept should be: createOrder, addSubOrder, addParentOrder, removeSubOrder, removeParentOrder, marOrderAsPurchased.

---

You currently have a monolithic `MenuManager` concept. Your goal is to refactor its functionality into five distinct, modular concepts: `StoreCatalog`, `CookBook`, `MenuCollection`, `ShoppingCart`, and `PurchaseSystem`. These new concepts should be independent and then connected via explicit `synchronizations` to replicate the overall functionality of the original `MenuManager`.

For each new concept, you should provide its complete specification, including:

*   **`concept`**: Name and any type parameters.
*   **`purpose`**: A concise, need-focused, specific, and evaluable statement.
*   **`principle`**: An archetypal scenario demonstrating how the concept fulfills its purpose.
*   **`state`**: A data model representing the concept's persistent information, clearly defining relationships and properties.
*   **`actions`**: A set of user-facing and system actions with their input arguments, results, preconditions (`requires`), and postconditions (`effects`).
*   **`queries`**: A set of explicit queries for retrieving information from the concept's state.

Below are the detailed requirements and specific changes for each concept. Please pay close attention to the relationships between concepts and how functionality is distributed to ensure clear separation of concerns.

---

*** General Clarifications:

1.  **Entity IDs:** `Recipe`, `Menu`, `Item`, `Cart`, `Order` are opaque entity types (like `User` in the original prompt).
2.  **Concept Type Parameters:** The original `MenuManager` was `Menu [User]`. For each of the concepts if it needs the opaque type `Recipe` or `Menu` then it should include it in the same manner as for the `MenuManager`.

---

*** Concept 1: StoreCatalog

This concept should manage the master list of all purchasable items and their purchasing options.

*   **Relationship to `MenuManager`:** This concept will replace the `a set of Item` part of the original `MenuManager`'s state.
*   **State Changes:**
    *   An `Item` should no longer have `quantity` or `units` directly.
    *   Instead, each `Item` must have a **set of `PurchaseOption`s**. Each `PurchaseOption` should include:
        *   `quantity`: A `Float` representing the purchasable amount (e.g., `3.0`).
        *   `units`: A `String` (e.g., "lbs", "oz", "count").
        *   `price`: A `Float` for the cost of this specific `PurchaseOption`.
        *   `store`: A `String` indicating where this `PurchaseOption` can be bought.
    *   An `Item` should retain its `Set of String names` (for aliases like 'pepper', 'ground pepper') and its `confirmed Bool` flag.
*   **Actions:**
    *   Consolidate and adapt the item-related actions from `MenuManager` to fit the new `PurchaseOption` structure. Specifically, define actions for:
        *   `createItem`: To add a new `Item` to the catalog. It should initially have no `PurchaseOption`s and be `unconfirmed`.
        *   `addPurchaseOption`: To add a specific `PurchaseOption` (quantity, units, price, store) to an existing `Item`.
        *   `updatePurchaseOption`: To modify an existing `PurchaseOption`'s quantity, units, price, or store.
        *   `removeItemName` and `addItemName`: For managing aliases.
        *   `confirmItem`: An action (likely restricted to an administrator) to mark an `Item` as confirmed.
    *   **Clarification:** Should there be an action to remove a `PurchaseOption` from an `Item`?
*   **Queries:** Define queries to retrieve items, their purchase options, and other relevant item-specific information.

---

*** Concept 2: CookBook

This concept should manage the repository of recipes. It focuses purely on recipe definition, independent of specific menus or pricing.

*   **Suggested Name:** Renamed from "FrenchMeal" (for recipes) to avoid confusion.
*   **Relationship to `MenuManager`:** This replaces the `a set of Recipe` part of the original `MenuManager` state, but as a top-level entity, not nested under `Menu`.
*   **State Changes:**
    *   A `Recipe` should include: `name String`, `instructions String`, `servingQuantity Int`, `scalingFactor Float`, `dishType String`.
    *   A `Recipe` **must not** include `dishPrice Float` or any direct cost information.
    *   A `Recipe` should *no longer* store the `owner User` directly. Ownership will be managed by the `designateOwner` action.
    *   A `Recipe` must also store its ingredients. An ingredient entry within a recipe should be a reference to an `Item` from the `StoreCatalog` and the `amount Int` specific to that recipe.
*   **Actions:**
    *   `createRecipe (name: String)`: Creates a new recipe with only a name. Other details (instructions, serving quantity, etc.) are set via `updateRecipe` actions. It should not assign an owner.
    *   `updateRecipe (recipe: Recipe, ...)`: Overloaded actions to update `instructions`, `servingQuantity`, `scalingFactor` (ensure consistent type, Float), `dishType`, `name`.
    *   `designateOwner (recipe: Recipe, user: User)`: Assigns a `User` as the owner of a recipe. Requires the recipe to not already have an owner.
    *   `duplicateRecipe (recipe: Recipe, user: User)`: Duplicates an existing recipe, assigning the new copy to the specified `user`. All ingredients and other properties should be copied.
        *   **Clarification:** What if the target `user` already owns a recipe with the same name? Should it fail, or append a suffix (e.g., " (Copy)")?
    *   `addRecipeIngredient (recipe: Recipe, item: Item, amount: Int)`: Adds or updates an ingredient (`Item` reference from `StoreCatalog` with its `amount`) to a recipe.
    *   `removeRecipeIngredient (recipe: Recipe, item: Item)`: Removes an ingredient from a recipe.
    *   `addCopiedIngredients (recipe: Recipe, ingredientText: String)`: This replaces the `pullRecipeFromWebsite` action's ingredient parsing functionality. It takes a raw string of ingredients, uses an internal LLM to parse them, and attempts to map them to existing `Item`s in `StoreCatalog`.
        *   **Effect:** Add parsed ingredients to the recipe. Return a `Set of String` containing any parsed ingredient names that could *not* be mapped to an `Item` in `StoreCatalog`.
        *   **Clarification:** Does `addCopiedIngredients` handle parsing *only* ingredients, or other recipe details like instructions or name as well? For this exercise, assume it focuses *only* on ingredients.
*   **Queries:** Define queries for retrieving recipes, their details, and their ingredient lists.

---

*** Concept 3: MenuCollection

This concept should manage the composition of menus, which are collections of recipes with specific scaling. It no longer handles costs directly.

*   **Suggested Name:** Renamed from "FrenchMeal" (for menus) to avoid confusion.
*   **Relationship to `MenuManager`:** This replaces the `a set of Menu` part of the original `MenuManager` state.
*   **State Changes:**
    *   A `Menu` should include: `name String`, `date String`, `owner User`.
    *   A `Menu` **must not** include `menuCost Float`.
    *   A `Menu` should store a **set of `MenuRecipe` entries**. Each `MenuRecipe` should be:
        *   A reference to a `RecipeID` (from `CookBook`).
        *   A `scalingFactor Float` specific to this recipe within this menu.
    *   Each `Menu` should store an `OrderID` (from `PurchaseSystem`), representing the aggregated order for this menu.
*   **Actions:**
    *   `createMenu (name: String, date: String, owner: User)`: Creates a new, empty menu owned by the specified user.
    *   `updateMenu (menu: Menu, name: String)` and `updateMenu (menu: Menu, date: String)`: Actions to update menu attributes.
    *   `addRecipe (menu: Menu, recipe: RecipeID, scalingFactor: Float)`: Associates a `RecipeID` (from `CookBook`) with the `Menu` and defines its `scalingFactor` within that menu. The menu owner does not need to own the recipe.
    *   `removeRecipe (menu: Menu, recipe: RecipeID)`: Removes a `RecipeID` from the `Menu`.
    *   `changeRecipeScaling (menu: Menu, recipe: RecipeID, newScalingFactor: Float)`: Modifies the scaling factor of a specific `RecipeID` within the `Menu`.
*   **Queries:** Define queries to retrieve menus, the recipes within them, and their scaling factors.

---

*** Concept 4: ShoppingCart

This concept manages weekly shopping carts, which are collections of menus for a specific period. It focuses on scheduling and grouping menus, deferring detailed cost management to `PurchaseSystem`.

*   **Relationship to `MenuManager`:** This replaces the `a set of Cart` part of the original `MenuManager` state.
*   **State Changes:**
    *   A `Cart` should include: `startDate String`, `endDate String` (implicitly derived from `startDate`).
    *   A `Cart` should store a **set of `MenuID`s** (from `MenuCollection`).
    *   A `Cart` **must not** include `weeklyCost Float`.
    *   Each `Cart` should store an `OrderID` (from `PurchaseSystem`), representing the aggregated order for this cart.
*   **Actions:**
    *   `createCart (startDate: String, owner: User)`: Creates an empty cart with a given `startDate`.
        *   **Requires:** `startDate` must be a Sunday. No other cart exists for this `owner` with this `startDate`.
        *   **Effects:** `endDate` is set to the Friday of the same week. The cart is owned by the specified `user`.
    *   `addMenuToCart (cart: Cart, menu: MenuID)`: Adds a `MenuID` (from `MenuCollection`) to the `Cart`.
        *   **Requires:** The `Menu` referenced by `MenuID` must have a `date` that falls within the `cart`'s `startDate` and `endDate`. The `cart` must not already contain a menu for that specific date.
    *   `removeMenuFromCart (cart: Cart, menu: MenuID)`: Removes a `MenuID` from the `Cart`.
*   **Queries:** Define queries to retrieve carts, and the menus associated with them.
*   **Clarification:** Should a `Cart` be owned by a `User`? (Implied by `owner: User` in `createCart` action).

---

*** Concept 5: PurchaseSystem

This is a new concept responsible for managing and aggregating orders, costs, and purchase status. It forms the financial backbone, consolidating cost information from various sources (recipes, menus, carts).

*   **Relationship to `MenuManager`:** This replaces the implicit cost calculation and item purchasing aspects of `MenuManager`'s `Cart`.
*   **State Changes:**
    *   A `set of Order` entities. Each `Order` should include:
        *   `cost`: A `Float` representing the total calculated cost.
        *   `purchased`: A `Bool` flag indicating if the order has been finalized.
        *   `owner`: A `User` who owns this order.
        *   `itemQuantities`: A `Map of ItemID to Float` representing the aggregated quantity of each `ItemID` (from `StoreCatalog`) needed for this order.
        *   `associatedEntityID`: An opaque `ID` (e.g., `RecipeID`, `MenuID`, `CartID`) indicating what this order directly represents.
        *   `subOrders`: A `Set of OrderID`s, representing orders whose costs and items are aggregated into this one.
        *   `parentOrders`: A `Set of OrderID`s, representing orders that aggregate this one.
*   **Actions:**
    *   `createOrder (owner: User, associatedEntityID: ID)`: Creates a new order.
        *   **Clarification:** How is the initial `cost` and `itemQuantities` determined? Does it calculate based on the `associatedEntityID` (e.g., if `associatedEntityID` is a `RecipeID`, it calculates ingredient costs; if it's a `MenuID`, it aggregates recipe orders)?
    *   `addSubOrder (parentOrder: Order, subOrder: Order)`: Links a `subOrder` to a `parentOrder`, aggregating its cost and item quantities into the `parentOrder`.
    *   `removeSubOrder (parentOrder: Order, subOrder: Order)`: Unlinks a `subOrder`, adjusting the `parentOrder`'s cost and item quantities.
    *   `markOrderAsPurchased (order: Order)`: Sets the `purchased` flag to `true`.
    *   **Clarification:** Should there be actions to update the item quantities within an `Order` directly, or is this solely driven by `addSubOrder`/`removeSubOrder` and potentially synchronizations from `CookBook` and `MenuCollection` when recipes/menus change?
*   **Queries:** Define queries for retrieving orders, their costs, their contained items, and their purchase status.

---

# Please write the new concept files for each of the new concepts.


# response:

Here are the refactored concept specifications, designed to be modular and independently understandable, while collectively recreating the functionality of the original `MenuManager` through implied synchronizations.

---

### Concept 1: StoreCatalog

**concept** StoreCatalog
**purpose** Manage a comprehensive catalog of purchasable ingredients, their alternative names, and available purchase options across different stores.
**principle** An administrator `createItem` for a new ingredient like "ground pepper". They then discover multiple `PurchaseOption`s for it, such as "3 lbs for $5.99 at Sprout's" and "1 lb for $2.50 at Trader Joe's", and `addPurchaseOption` for each. Later, another user refers to "pepper", so the administrator `addItemName` "pepper" as an alias. Once verified, the administrator `confirmItem` so it can be used in orders.
**state**
  a set of Item with
    a names Set of String // Ex. {'pepper', 'ground pepper', 'course pepper'}
    a confirmed Bool // false if unverified, true if verified by administrator
  a set of PurchaseOption with
    a quantity Float // Ex. 3.0
    a units String // Ex. "lbs", "oz", "count"
    a price Float // Ex. 5.99
    a store String // Ex. "Sprout's"
  // Relationships:
  // Each Item is related to a set of PurchaseOption entities.

**actions**
  createItem (primaryName: String): (item: Item)
    **requires** no Item already exists with `primaryName` in its names set.
    **effects** Creates a new `Item` with `primaryName` in its `names` set, `confirmed` set to `false`, and no `PurchaseOption`s. Returns the new `Item` ID.

  addPurchaseOption (item: Item, quantity: Float, units: String, price: Float, store: String): (purchaseOption: PurchaseOption)
    **requires** `item` exists. `quantity` > 0, `price` >= 0.
    **effects** Adds a new `PurchaseOption` to `item` with the specified details. Returns the new `PurchaseOption` ID.

  updatePurchaseOption (purchaseOption: PurchaseOption, quantity: Float)
  updatePurchaseOption (purchaseOption: PurchaseOption, units: String)
  updatePurchaseOption (purchaseOption: PurchaseOption, price: Float)
  updatePurchaseOption (purchaseOption: PurchaseOption, store: String)
    **requires** `purchaseOption` exists. `quantity` > 0, `price` >= 0 for respective updates.
    **effects** Updates the specified attribute of the `purchaseOption`.

  removePurchaseOption (item: Item, purchaseOption: PurchaseOption)
    **requires** `item` exists, `purchaseOption` is associated with `item`.
    **effects** Removes `purchaseOption` from `item`'s associated `PurchaseOption`s.

  addItemName (item: Item, name: String)
    **requires** `item` exists, `name` is not already an alias for `item` (i.e., not in `item.names`).
    **effects** Adds `name` to the `names` set of `item`.

  removeItemName (item: Item, name: String)
    **requires** `item` exists, `name` is in the `names` set of `item`, and `name` is not the only name for the `item`.
    **effects** Removes `name` from the `names` set of `item`.

  confirmItem (item: Item)
    **requires** `item` exists, `item` is not already `confirmed`. (Typically restricted to administrators via syncs)
    **effects** Sets `item.confirmed` to `true`.

**queries**
  _getItemByName (name: String): (item: Item)
    **requires** An item exists with `name` in its `names` set.
    **effects** Returns the `Item` ID with the given name.

  _getPurchaseOptions (item: Item): (purchaseOptions: Set of PurchaseOption)
    **requires** `item` exists.
    **effects** Returns the set of all `PurchaseOption`s for the given `item`.

  _getAllItems (): (items: Set of Item)
    **requires** nothing.
    **effects** Returns a set of all `Item` entities.

---

### Concept 2: CookBook

**concept** CookBook \[User, Item, Recipe]
**purpose** Store and manage definitions of recipes, including their ingredients, instructions, and ownership, enabling reuse and duplication for chefs.
**principle** A chef `createRecipe` for "Spicy Pasta". They `addRecipeIngredient` for pasta, tomatoes, and spices. After defining all instructions and serving details via `updateRecipe`, they `designateOwner` themselves. Another chef finds "Spicy Pasta", `duplicateRecipe` it as "Mild Pasta" under their ownership, and `addCopiedIngredients` from an online source for new spices, receiving a list of unparsed items to review.
**state**
  a set of Recipe with
    a name String
    an instructions String
    a servingQuantity Int
    a scalingFactor Float // Default 1.0, applies to ingredients for base recipe
    a dishType String // Ex. "Appetizer", "Main Course", "Dessert"
    an owner User // Reference to an external User entity
    an ingredients Map of Item to Int // Map of ItemID (from StoreCatalog) to its base amount needed for the recipe

**actions**
  createRecipe (name: String): (recipe: Recipe)
    **requires** `name` is not empty.
    **effects** Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1), default `scalingFactor` (e.g., 1.0), empty `dishType`, no owner, and no ingredients. Returns the new `Recipe` ID.

  updateRecipe (recipe: Recipe, instructions: String)
  updateRecipe (recipe: Recipe, servingQuantity: Int)
  updateRecipe (recipe: Recipe, scalingFactor: Float)
  updateRecipe (recipe: Recipe, dishType: String)
  updateRecipe (recipe: Recipe, name: String)
    **requires** `recipe` exists. `servingQuantity` > 0. `scalingFactor` > 0.
    **effects** Updates the specified attribute of the `recipe`.

  designateOwner (recipe: Recipe, user: User)
    **requires** `recipe` exists, `recipe` does not already have an owner.
    **effects** Sets `recipe.owner` to `user`.

  duplicateRecipe (originalRecipe: Recipe, user: User, newName: String): (newRecipe: Recipe)
    **requires** `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.
    **effects** Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity, scalingFactor, dishType, ingredients). Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.

  addRecipeIngredient (recipe: Recipe, item: Item, amount: Int)
    **requires** `recipe` exists, `item` exists (in StoreCatalog). `amount` >= 0.
    **effects** If `amount` is > 0, adds or updates the `item` in `recipe.ingredients` with the specified `amount`. If `amount` is 0, the ingredient is removed.

  removeRecipeIngredient (recipe: Recipe, item: Item)
    **requires** `recipe` exists, `item` exists in `recipe.ingredients`.
    **effects** Removes `item` from `recipe.ingredients`.

  addCopiedIngredients (recipe: Recipe, ingredientText: String): (unparsedIngredients: Set of String)
    **requires** `recipe` exists. `ingredientText` is not empty.
    **effects** Parses `ingredientText` (using an internal LLM or similar mechanism) to identify individual ingredients and their amounts. For each parsed ingredient, attempts to match it with an existing `Item` in `StoreCatalog` (e.g., via `StoreCatalog._getItemByName`). Adds matched `Item`s and their amounts to `recipe.ingredients`. Returns a `Set of String` containing names of ingredients that could not be mapped to existing `Item`s.

**queries**
  _getRecipeDetails (recipe: Recipe): (name: String, instructions: String, servingQuantity: Int, scalingFactor: Float, dishType: String, owner: User)
    **requires** `recipe` exists.
    **effects** Returns all primary attributes of the recipe.

  _getRecipeIngredients (recipe: Recipe): (ingredients: Map of Item to Int)
    **requires** `recipe` exists.
    **effects** Returns the map of `Item` IDs to their base amounts for the `recipe`.

  _getRecipesOwnedByUser (user: User): (recipes: Set of Recipe)
    **requires** `user` exists.
    **effects** Returns the set of all recipes owned by the given `user`.

---

### Concept 3: MenuCollection

**concept** MenuCollection \[User, Recipe, Menu, Order]
**purpose** Organize and present a collection of recipes as a single menu for a specific date, allowing for individual recipe scaling within the menu.
**principle** A user `createMenu` for their "Christmas Dinner" on "Dec 25, 2024". They then `addRecipe` "Turkey" and "Gravy" from the `CookBook`, setting scaling factors for each. Later, realizing they need more gravy, they `changeRecipeScaling` for "Gravy". An `Order` is automatically created (in PurchaseSystem) for this menu, aggregating all recipe ingredient costs.
**state**
  a set of Menu with
    a name String
    a date String // Ex. "YYYY-MM-DD"
    an owner User // Reference to an external User entity
    a menuRecipes Map of Recipe to Float // Map of RecipeID (from CookBook) to its specific scaling factor within this menu
    an order Order // Reference to an external Order entity (from PurchaseSystem) representing this menu's total order

**actions**
  createMenu (name: String, date: String, owner: User): (menu: Menu)
    **requires** `name` is not empty, `date` is a valid date string, `owner` exists. No other `Menu` exists for this `owner` on this `date`.
    **effects** Creates a new `Menu` with the given `name`, `date`, and `owner`. It will have an empty set of `menuRecipes`. An associated `Order` is expected to be created in `PurchaseSystem` (via syncs) and its ID stored in `menu.order`. Returns the new `Menu` ID.

  updateMenu (menu: Menu, name: String)
  updateMenu (menu: Menu, date: String)
    **requires** `menu` exists. (Ownership check would be handled by syncs or external authorization).
    **effects** Updates the specified attribute of the `menu`.

  addRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)
    **requires** `menu` exists, `recipe` exists (in CookBook). `scalingFactor` > 0. `menu` does not already contain `recipe`.
    **effects** Adds the `recipe` with its `scalingFactor` to `menu.menuRecipes`. This change will trigger an update to the associated `Order` in `PurchaseSystem` (via syncs).

  removeRecipe (menu: Menu, recipe: Recipe)
    **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`.
    **effects** Removes `recipe` from `menu.menuRecipes`. This change will trigger an `updateOrderQuantitiesAndCost` in `PurchaseSystem` (via syncs) for `menu.order`.

  changeRecipeScaling (menu: Menu, recipe: Recipe, newScalingFactor: Float)
    **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`. `newScalingFactor` > 0.
    **effects** Updates the `scalingFactor` for `recipe` within `menu.menuRecipes` to `newScalingFactor`. This change will trigger an `updateOrderQuantitiesAndCost` in `PurchaseSystem` (via syncs) for `menu.order`.

**queries**
  _getMenuDetails (menu: Menu): (name: String, date: String, owner: User, orderID: Order)
    **requires** `menu` exists.
    **effects** Returns details about the `menu` and its associated `order` ID.

  _getRecipesInMenu (menu: Menu): (menuRecipes: Map of Recipe to Float)
    **requires** `menu` exists.
    **effects** Returns the map of `Recipe` IDs to their `scalingFactor`s for the given `menu`.

  _getMenusOwnedByUser (user: User): (menus: Set of Menu)
    **requires** `user` exists.
    **effects** Returns the set of all `Menu` entities where the `owner` attribute matches the given user.

  _getMenuByDate (date: String, owner: User): (menu: Menu)
    **requires** A menu exists for `date` owned by `owner`.
    **effects** Returns the `Menu` ID associated with that `date` and `owner`.

---

### Concept 4: ShoppingCart

**concept** ShoppingCart \[User, Menu, Cart, Order]
**purpose** Organize menus into weekly shopping lists, grouping them by a specific date range for consolidated purchasing.
**principle** A user `createCart` for the week starting "Sunday, Jan 1". They then `addMenuToCart` for "Monday Dinner" and "Wednesday Lunch". If "Wednesday Lunch" menu is later removed (e.g., due to cancellation), they `removeMenuFromCart`. An `Order` is automatically created (in PurchaseSystem) for this cart, aggregating all menu orders within it.
**state**
  a set of Cart with
    a startDate String // Ex. "YYYY-MM-DD", always a Sunday
    an endDate String // Ex. "YYYY-MM-DD", always the Friday of the same week as startDate
    an owner User // Reference to an external User entity
    a menus Set of Menu // Set of MenuIDs (from MenuCollection)
    an order Order // Reference to an external Order entity (from PurchaseSystem) representing this cart's total order

**actions**
  createCart (startDate: String, owner: User): (cart: Cart)
    **requires** `startDate` is a Sunday (e.g., "YYYY-MM-DD" format), `owner` exists. No other `Cart` exists for this `owner` with this `startDate`.
    **effects** Creates a new `Cart` with `startDate` and `owner`. `endDate` is set to the Friday of the same week. It will have an empty set of `menus`. An associated `Order` is expected to be created in `PurchaseSystem` (via syncs) and its ID stored in `cart.order`. Returns the new `Cart` ID.

  addMenuToCart (cart: Cart, menu: Menu)
    **requires** `cart` exists, `menu` exists (in MenuCollection). The `date` of `menu` (obtained from MenuCollection via syncs/queries) must fall within `cart.startDate` and `cart.endDate`. `cart` must not already contain a menu whose date matches `menu`'s date.
    **effects** Adds `menu` to `cart.menus`. This will trigger an `addSubOrder` action in `PurchaseSystem` (via syncs) to link `menu`'s order to `cart`'s order.

  removeMenuFromCart (cart: Cart, menu: Menu)
    **requires** `cart` exists, `menu` exists in `cart.menus`.
    **effects** Removes `menu` from `cart.menus`. This will trigger a `removeSubOrder` action in `PurchaseSystem` (via syncs) to unlink `menu`'s order from `cart`'s order.

**queries**
  _getCartDetails (cart: Cart): (startDate: String, endDate: String, owner: User, orderID: Order)
    **requires** `cart` exists.
    **effects** Returns details about the `cart` and its associated `order` ID.

  _getMenusInCart (cart: Cart): (menus: Set of Menu)
    **requires** `cart` exists.
    **effects** Returns the set of all `Menu` IDs associated with the given `cart`.

  _getCartsOwnedByUser (user: User): (carts: Set of Cart)
    **requires** `user` exists.
    **effects** Returns the set of all `Cart` entities owned by the given user.

---

### Concept 5: PurchaseSystem

**concept** PurchaseSystem \[User, Item, ID, Order]
**purpose** Manage and aggregate costs and required item quantities for various entities (recipes, menus, carts), tracking their purchase status.
**principle** When a new recipe is created (in CookBook), `createOrder` is called with its initial ingredients. When this recipe is added to a menu (in MenuCollection), a sync ensures the menu's `Order` `addSubOrder` of the recipe's `Order`. Similarly, when a menu is added to a cart (in ShoppingCart), the cart's `Order` `addSubOrder` of the menu's `Order`. If a recipe's ingredients change, `updateOrderQuantitiesAndCost` updates its associated order, propagating changes up the hierarchy. Finally, an administrator can `markOrderAsPurchased` once the shopping is complete.
**state**
  a set of Order with
    a cost Float // Total calculated cost of items in this order
    a purchased Bool // Flag indicating if the order has been finalized
    an owner User // Reference to an external User entity
    an itemQuantities Map of Item to Float // Aggregated quantity of each ItemID (from StoreCatalog) needed for this order
    an associatedEntityID ID // Opaque ID (e.g., RecipeID, MenuID, CartID) indicating what this order directly represents
    a subOrders Set of Order // Set of OrderIDs (from this concept) whose costs/items are aggregated into this one
    a parentOrders Set of Order // Set of OrderIDs (from this concept) that aggregate this one

**actions**
  createOrder (owner: User, associatedEntityID: ID, initialItemQuantities: Map of Item to Float): (order: Order)
    **requires** `owner` exists. `associatedEntityID` is a valid opaque ID. All `Item`s in `initialItemQuantities` exist (in StoreCatalog).
    **effects** Creates a new `Order` with `owner`, `associatedEntityID`, `purchased` set to `false`. `itemQuantities` is initialized to `initialItemQuantities`. `cost` is calculated based on `initialItemQuantities` and `Item` prices (obtained via syncs/queries to `StoreCatalog`). Returns the new `Order` ID.

  updateOrderQuantitiesAndCost (order: Order, itemQuantitiesDelta: Map of Item to Float)
    **requires** `order` exists. All `Item`s in `itemQuantitiesDelta` exist (in StoreCatalog). Applying `itemQuantitiesDelta` does not result in negative quantities for any item.
    **effects** Updates `order.itemQuantities` by adding the `itemQuantitiesDelta`. Recalculates `order.cost` based on the new `itemQuantities` and `Item` prices (from `StoreCatalog`). Propagates this change to all `parentOrders` (via syncs).

  addSubOrder (parentOrder: Order, subOrder: Order)
    **requires** `parentOrder` and `subOrder` exist. `subOrder` is not already a sub-order of `parentOrder`. `subOrder.owner` matches `parentOrder.owner`.
    **effects** Adds `subOrder` to `parentOrder.subOrders`. Adds `parentOrder` to `subOrder.parentOrders`. Aggregates `subOrder.itemQuantities` and `subOrder.cost` into `parentOrder.itemQuantities` and `parentOrder.cost`. Propagates changes up `parentOrder`'s hierarchy (via syncs).

  removeSubOrder (parentOrder: Order, subOrder: Order)
    **requires** `parentOrder` and `subOrder` exist, `subOrder` is a sub-order of `parentOrder`.
    **effects** Removes `subOrder` from `parentOrder.subOrders`. Removes `parentOrder` from `subOrder.parentOrders`. Subtracts `subOrder.itemQuantities` and `subOrder.cost` from `parentOrder.itemQuantities` and `parentOrder.cost`. Propagates changes up `parentOrder`'s hierarchy (via syncs).

  markOrderAsPurchased (order: Order)
    **requires** `order` exists, `order.purchased` is `false`. (Typically restricted to administrators via syncs).
    **effects** Sets `order.purchased` to `true`.

**queries**
  _getOrderDetails (order: Order): (cost: Float, purchased: Bool, owner: User, associatedEntityID: ID)
    **requires** `order` exists.
    **effects** Returns the main details of the `order`.

  _getOrderItems (order: Order): (itemQuantities: Map of Item to Float)
    **requires** `order` exists.
    **effects** Returns the map of `Item` IDs to their aggregated quantities for the `order`.

  _getOrdersOwnedByUser (user: User): (orders: Set of Order)
    **requires** `user` exists.
    **effects** Returns the set of all orders owned by the given `user`.

  _getUnpurchasedOrders (user: User): (orders: Set of Order)
    **requires** `user` exists.
    **effects** Returns the set of all orders owned by `user` that are not yet purchased.
# response:

