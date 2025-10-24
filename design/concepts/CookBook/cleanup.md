[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@CookBook](./CookBook.md)

List of modifications:
1. Please follow the same Markdown formatting.
2. Please use the '\' at the end of every line except the last one in a connected component. Only one '\' per line, do not split up a line with several breaks.
2. Only output the new CookBook.md specification.
3. Please mofify all indent tabs to not use spaces ' ' but rather ' ' for reading purposes.

# Please modify the concept above:

# response:

```
**concept** CookBook [User, Item, Order]\
**purpose** Store and manage definitions of recipes, including their ingredients, instructions, and ownership, \
enabling reuse and duplication for chefs.\
\
**principle** A chef `createRecipe` for "Spicy Pasta". They `addRecipeIngredient` for pasta, tomatoes, and spices. After defining all instructions and serving details via `updateRecipe`, they `designateOwner` themselves. Another chef finds "Spicy Pasta", `duplicateRecipe` a new recipe as "Mild Pasta" under their ownership, and `updateRecipe` to change the recipe more to their liking. Finally, the last chef sees these recipes and doesn't like either of them and decides to `createRecipe` their own and passes in all the ingredients using `addCopiedIngredients` by providing the copy paste list of ingredients. This chef finishes the rest of their "Alfredo Pasta" recipe using `updateRecipe`.\
\
**state**\
  a set of Recipe with\
    a name String\
    an instructions String\
    a servingQuantity Int\
    a dishType String\
    an owner User\
    an order Order\
    an ingredients set of Ingredient with\
      a name String\
      a quantity Float\
      a units String\
\
**actions**\
  createRecipe (name: String): (recipe: Recipe)\
    **requires** `name` is not empty.\
    **effects** Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1), empty `dishType`, no owner, no associated order, and no ingredients. Returns the new `Recipe` ID.\
\
  updateRecipe (recipe: Recipe, instructions: String)\
  updateRecipe (recipe: Recipe, servingQuantity: Int)\
  updateRecipe (recipe: Recipe, dishType: String)\
  updateRecipe (recipe: Recipe, name: String)\
    **requires** `recipe` exists. `servingQuantity` > 0.\
    **effects** Updates the specified attribute of the `recipe`.\
\
  designateOwner (recipe: Recipe, user: User)\
    **requires** `recipe` exists, `recipe` does not already have an owner.\
    **effects** Sets `recipe.owner` to `user`.\
\
  duplicateRecipe (originalRecipe: Recipe, user: User, newName: String): (newRecipe: Recipe)\
    **requires** `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.\
    **effects** Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity, dishType, and all ingredients including their names, quantities, and units). The new recipe will have no associated order initially. Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.\
\
  addRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)\
    **requires** `recipe` exists. `name` is not empty. `quantity` >= 0. `units` is not empty.\
    **effects** If an ingredient with the given `name` already exists in `recipe.ingredients`, its `quantity` and `units` are updated. If `quantity` is 0, the ingredient is removed. Otherwise, a new `Ingredient` with the given `name`, `quantity`, and `units` is added to `recipe.ingredients`.\
\
  removeRecipeIngredient (recipe: Recipe, name: String)\
    **requires** `recipe` exists. An ingredient with `name` exists in `recipe.ingredients`.\
    **effects** Removes the `Ingredient` with the given `name` from `recipe.ingredients`.\
\
  addCopiedIngredients (recipe: Recipe, ingredientText: String)\
    **requires** `recipe` exists. `ingredientText` is not empty.\
    **effects** Parses `ingredientText` (using an internal LLM or similar mechanism) to identify individual ingredients, their quantities, and units. For each parsed ingredient, if an ingredient with the same name already exists in `recipe.ingredients`, its `quantity` and `units` are updated. Otherwise, a new `Ingredient` with the parsed `name`, `quantity`, and `units` is added to `recipe.ingredients`. It is assumed all input text can be effectively parsed into valid ingredients.\
\
  addOrderToRecipe (recipe: Recipe, order: Order)\
    **requires** `recipe` exists. `order` exists. `recipe` does not already have an associated order.\
    **effects** Sets `recipe.order` to `order`.\
\
**queries**\
  \_getRecipeDetails (recipe: Recipe): (name: String, instructions: String, servingQuantity: Int, dishType: String, owner: User, order: Order)\
    **requires** `recipe` exists.\
    **effects** Returns all primary attributes of the recipe.\
\
  \_getRecipeIngredients (recipe: Recipe): (ingredients: Set of Ingredient)\
    **requires** `recipe` exists.\
    **effects** Returns the set of all ingredients (each with its name, quantity, and units) for the `recipe`.\
\
  \_getRecipesOwnedByUser (user: User): (recipes: Set of Recipe)\
    **requires** `user` exists.\
    **effects** Returns the set of all recipes owned by the given `user`.
```