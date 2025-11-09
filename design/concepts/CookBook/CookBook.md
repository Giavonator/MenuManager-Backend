
# CookBook

**concept** CookBook [User]

**purpose** Store and manage definitions of recipes, including their ingredients, instructions, and ownership, enabling reuse and duplication for chefs.

**principle** A chef `createRecipe` for "Spicy Pasta". They `addRecipeIngredient` for pasta, tomatoes, and spices. After defining all instructions and serving details via `updateRecipe`, they `designateOwner` themselves. Another chef finds "Spicy Pasta", `duplicateRecipe` a new recipe as "Mild Pasta" under their ownership, and `updateRecipe`/`updateRecipeIngredient` to change the recipe more to their liking.

**state**\
  a set of Recipe with\
    a name String\
    an instructions String\
    a servingQuantity Int\
    a dishType String\
    an owner User\
    an ingredients set of Ingredient with\
      a name String\
      a quantity Float\
      a units String

**actions**\
  createRecipe (name: String, user: User): (recipe: Recipe)\
    **requires** `name` is not empty.\
    **effects** Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1), empty `dishType`, `owner` set to `user`, and no ingredients. Returns the new `Recipe` ID.

  updateRecipe (recipe: Recipe, instructions: String)\
  updateRecipe (recipe: Recipe, servingQuantity: Int)\
  updateRecipe (recipe: Recipe, dishType: String)\
  updateRecipe (recipe: Recipe, name: String)\
    **requires** `recipe` exists. (`servingQuantity` > 0 // Only for servingQuantity update).\
    **effects** Updates the specified attribute of the `recipe`.

  duplicateRecipe (originalRecipe: Recipe, user: User, newName: String): (newRecipe: Recipe)\
    **requires** `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.\
    **effects** Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity, dishType, and all ingredients including their names, quantities, and units). Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.

  addRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)\
    **requires** `recipe` exists. `name` is not an existing ingredient in recipe. `quantity` > 0. `units` is not empty.\
    **effects** New `Ingredient` with the given `name`, `quantity`, and `units` is added to `recipe.ingredients`.

  updateRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)\
    **requires** `recipe` exists. `recipe.ingredients` contaings ingredient with `name`. `quantity` > 0. `units` is not empty.\
    **effects** Ingredient with `name` in `recipe.ingredients` has parameters `quantity` and `units` updated.

  removeRecipeIngredient (recipe: Recipe, name: String)\
    **requires** `recipe` exists. An ingredient with `name` exists in `recipe.ingredients`.\
    **effects** Removes the `Ingredient` with the given `name` from `recipe.ingredients`.

**queries**\
  \_getRecipeDetails (recipe: Recipe): (name: String, instructions: String, servingQuantity: Int, dishType: String, owner: User)\
    **requires** `recipe` exists.\
    **effects** Returns all primary attributes of the recipe.

  \_getRecipeIngredients (recipe: Recipe): (ingredients: Set of Ingredient)\
    **requires** `recipe` exists.\
    **effects** Returns the set of all ingredients (each with its name, quantity, and units) for the `recipe`.

  \_getRecipesOwnedByUser (user: User): (recipes: Set of Recipe)\
    **requires** `user` exists.\
    **effects** Returns the set of all recipes owned by the given `user`. This can be an empty set if there are no current Recipes.