
## MenuCollection

**concept** MenuCollection \[User, Recipe, Order]

**purpose** Organize and present a collection of recipes as a single menu for a specific date, allowing for individual recipe scaling within the menu.

**principle** A user `createMenu` for their "Christmas Dinner" on "Dec 25, 2024". They then `addRecipe` "Turkey" and "Gravy" from the `CookBook`, setting scaling factors for each. Later, realizing they need more gravy, they `changeRecipeScaling` for "Gravy". An `Order` is automatically created (in PurchaseSystem) for this menu, aggregating all recipe ingredient costs.

**state**\
  a set of Menu with\
    a name String\
    a date String // Ex. "YYYY-MM-DD"\
    an owner User // Reference to an external User entity\
    a menuRecipes Map of Recipe to Float // Map of RecipeID (from CookBook) to its specific scaling factor within this menu\
    an order Order // Reference to an external Order entity (from PurchaseSystem) representing this menu's total order

**actions**\
  createMenu (name: String, date: String, owner: User): (menu: Menu)\
    **requires** `name` is not empty, `date` is a valid date string, `owner` exists. No other `Menu` exists for this `owner` on this `date`.\
    **effects** Creates a new `Menu` with the given `name`, `date`, and `owner`. It will have an empty set of `menuRecipes`. An associated `Order` is expected to be created in `PurchaseSystem` (via syncs) and its ID stored in `menu.order`. Returns the new `Menu` ID.

  updateMenu (menu: Menu, name: String)\
  updateMenu (menu: Menu, date: String)\
    **requires** `menu` exists. (Ownership check would be handled by syncs or external authorization).\
    **effects** Updates the specified attribute of the `menu`.

  addRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)\
    **requires** `menu` exists, `recipe` exists (in CookBook). `scalingFactor` > 0. `menu` does not already contain `recipe`.\
    **effects** Adds the `recipe` with its `scalingFactor` to `menu.menuRecipes`. This change will trigger an update to the associated `Order` in `PurchaseSystem` (via syncs).

  removeRecipe (menu: Menu, recipe: Recipe)\
    **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`.\
    **effects** Removes `recipe` from `menu.menuRecipes`. This change will trigger an `updateOrderQuantitiesAndCost` in `PurchaseSystem` (via syncs) for `menu.order`.

  changeRecipeScaling (menu: Menu, recipe: Recipe, newScalingFactor: Float)\
    **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`. `newScalingFactor` > 0.\
    **effects** Updates the `scalingFactor` for `recipe` within `menu.menuRecipes` to `newScalingFactor`. This change will trigger an `updateOrderQuantitiesAndCost` in `PurchaseSystem` (via syncs) for `menu.order`.

  addOrderToMenu (menu: Menu, order: Order)\
    **requires** `menu` exists. `order` exists. `menu` does not already have an associated order.\
    **effects** Sets `menu.order` to `order`.

**queries**\
  _getMenuDetails (menu: Menu): (name: String, date: String, owner: User, orderID: Order)\
    **requires** `menu` exists.\
    **effects** Returns details about the `menu` and its associated `order` ID.

  _getRecipesInMenu (menu: Menu): (menuRecipes: Map of Recipe to Float)\
    **requires** `menu` exists.\
    **effects** Returns the map of `Recipe` IDs to their `scalingFactor`s for the given `menu`.

  _getMenusOwnedByUser (user: User): (menus: Set of Menu)\
    **requires** `user` exists.\
    **effects** Returns the set of all `Menu` entities where the `owner` attribute matches the given user.

  _getMenuByDate (date: String, owner: User): (menu: Menu)\
    **requires** A menu exists for `date` owned by `owner`.\
    **effects** Returns the `Menu` ID associated with that `date` and `owner`.