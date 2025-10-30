
## MenuCollection

**concept** MenuCollection \[User, Recipe]

**purpose** Organize and present a collection of recipes as a single menu for a specific date, allowing for individual recipe scaling within the menu.

**principle** A user `createMenu` for their "Christmas Dinner" on "Dec 25, 2024". They then `addRecipe` "Turkey" and "Gravy" from the `CookBook`, setting scaling factors for each. Later, realizing they need more gravy, they `changeRecipeScaling` for "Gravy". Afterwards the user determines they want "Ham" instead of "Turkey", they can `removeRecipe` for "Turkey" and then `addRecipe` for "Ham".

**state**\
  a set of Menu with\
    a name String\
    a date Date // Conform to 'YYYY-MM-DD', date-only type no time\
    an owner User // Reference to an external User entity\
    a menuRecipes Map of Recipe to Float // Map of RecipeID (from CookBook) to its specific scaling factor within this menu\

**actions**\
  createMenu (name: String, date: Date, actingUser: User): (menu: Menu)\
    **requires** `name` is not empty, `date` is in the future, `actingUser` exists. No other `Menu` exists for this `actingUser` on this `date`.\
    **effects** Creates a new `Menu` with the given `name`, `date`, and `owner`=`actingUser`. It will have an empty set of `menuRecipes`. Returns the new `Menu` ID. (Future ownership check would be handled by syncs or external authorization)

  updateMenu (menu: Menu, name: String)\
  updateMenu (menu: Menu, date: Date)\
    **requires** `menu` exists, no `otherMenu` on date has the same `menu.user` for new date.\
    **effects** Updates the specified attribute of the `menu`.

  addRecipe (menu: Menu, recipe: Recipe, scalingFactor: Float)\
    **requires** `menu` exists, `recipe` exists. `scalingFactor` > 0. `menu` does not already contain `recipe`.\
    **effects** Adds the `recipe` with its `scalingFactor` to `menu.menuRecipes`.

  removeRecipe (menu: Menu, recipe: Recipe)\
    **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`.\
    **effects** Removes `recipe` from `menu.menuRecipes`.

  changeRecipeScaling (menu: Menu, recipe: Recipe, newScalingFactor: Float)\
    **requires** `menu` exists, `recipe` exists in `menu.menuRecipes`. `newScalingFactor` > 0.\
    **effects** Updates the `scalingFactor` for `recipe` within `menu.menuRecipes` to `newScalingFactor`.

**queries**\
  _getMenuDetails (menu: Menu): (name: String, date: Date, owner: User)\
    **requires** `menu` exists.\
    **effects** Returns details about the `menu`.

  _getRecipesInMenu (menu: Menu): (menuRecipes: Map of Recipe to Float)\
    **requires** `menu` exists.\
    **effects** Returns the map of `Recipe` IDs to their `scalingFactor`s for the given `menu`.

  _getMenusOwnedByUser (user: User): (menus: Set of Menu)\
    **requires** `user` exists.\
    **effects** Returns the set of all `Menu` entities where the `owner` attribute matches the given user.

  _getMenuByDate (date: Date): (menu: Menu)\
    **requires** A menu exists for `date`.\
    **effects** Returns the `Menu` ID associated with that `date`.