---
timestamp: 'Fri Oct 24 2025 06:49:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_064936.529c6389.md]]'
content_id: 408d11ed31221511089f7555fb7d5072a4978c21ac50c319c3c052fc723486f7
---

# file: src/concepts/CookBook/CookBookConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "CookBook" + ".";

// Generic types of this concept
type User = ID;
type Recipe = ID;

/**
 * Interface for the nested Ingredient object within a Recipe.
 * a name String
 * a quantity Float
 * a units String
 */
interface IngredientSchema {
  // _id is added for better MongoDB array management (e.g., precise updates/deletes)
  // although not explicitly in the concept spec's definition of Ingredient's properties.
  _id: ID;
  name: string;
  quantity: number;
  units: string;
}

/**
 * Interface for a Recipe document stored in MongoDB.
 * a set of Recipe with
 *   a name String
 *   an instructions String
 *   a servingQuantity Int
 *   a dishType String
 *   an owner User
 *   an ingredients set of Ingredient with
 *     a name String
 *     a quantity Float
 *     a units String
 */
interface RecipeSchema {
  _id: Recipe;
  name: string;
  instructions: string;
  servingQuantity: number;
  dishType: string;
  owner: User;
  ingredients: IngredientSchema[];
}

// --- Action Input/Output Types ---

type CreateRecipeInput = { name: string; user: User };
type CreateRecipeOutput = Result<{ recipe: Recipe }>;

// Update Recipe Overloads - using a union type for a single implementation method
type UpdateRecipeInstructionsInput = { recipe: Recipe; instructions: string };
type UpdateRecipeServingQuantityInput = {
  recipe: Recipe;
  servingQuantity: number;
};
type UpdateRecipeDishTypeInput = { recipe: Recipe; dishType: string };
type UpdateRecipeNameInput = { recipe: Recipe; name: string };
type UpdateRecipeInput =
  | UpdateRecipeInstructionsInput
  | UpdateRecipeServingQuantityInput
  | UpdateRecipeDishTypeInput
  | UpdateRecipeNameInput;
type UpdateRecipeOutput = Result<Empty>;

type DuplicateRecipeInput = {
  originalRecipe: Recipe;
  user: User;
  newName: string;
};
type DuplicateRecipeOutput = Result<{ newRecipe: Recipe }>;

type AddRecipeIngredientInput = {
  recipe: Recipe;
  name: string;
  quantity: number;
  units: string;
};
type AddRecipeIngredientOutput = Result<Empty>;

type UpdateRecipeIngredientInput = {
  recipe: Recipe;
  name: string;
  quantity: number;
  units: string;
};
type UpdateRecipeIngredientOutput = Result<Empty>;

type RemoveRecipeIngredientInput = { recipe: Recipe; name: string };
type RemoveRecipeIngredientOutput = Result<Empty>;

// --- Query Input/Output Types ---

type GetRecipeDetailsInput = { recipe: Recipe };
type GetRecipeDetailsOutput = Result<
  {
    name: string;
    instructions: string;
    servingQuantity: number;
    dishType: string;
    owner: User;
  }[]
>;

type GetRecipeIngredientsInput = { recipe: Recipe };
type GetRecipeIngredientsOutput = Result<
  {
    ingredients: { name: string; quantity: number; units: string }[];
  }[]
>;

type GetRecipesOwnedByUserInput = { user: User };
type GetRecipesOwnedByUsersOutput = Result<{ recipe: Recipe; name: string }[]>;

/**
 * **concept** CookBook [User]
 *
 * **purpose** Store and manage definitions of recipes, including their ingredients,
 * instructions, and ownership, enabling reuse and duplication for chefs.
 *
 * **principle** A chef `createRecipe` for "Spicy Pasta". They `addRecipeIngredient` for pasta,
 * tomatoes, and spices. After defining all instructions and serving details via `updateRecipe`,
 * they `designateOwner` themselves. Another chef finds "Spicy Pasta", `duplicateRecipe` a new
 * recipe as "Mild Pasta" under their ownership, and `updateRecipe`/`updateRecipeIngredient`
 * to change the recipe more to their liking.
 */
export default class CookBookConcept {
  private recipes: Collection<RecipeSchema>;

  constructor(private readonly db: Db) {
    this.recipes = this.db.collection(PREFIX + "recipes");
  }

  /**
   * createRecipe (name: String, user: User): (recipe: Recipe)
   *
   * **requires** `name` is not empty.
   *
   * **effects** Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1),
   * empty `dishType`, `owner` set to `user`, and no ingredients. Returns the new `Recipe` ID.
   */
  async createRecipe(
    { name, user }: CreateRecipeInput,
  ): Promise<CreateRecipeOutput> {
    if (!name || name.trim() === "") {
      return { error: "Recipe name cannot be empty." };
    }
    if (!user || user.trim() === "") {
      return { error: "User ID cannot be empty." };
    }

    const newRecipeId = freshID();
    const newRecipe: RecipeSchema = {
      _id: newRecipeId,
      name: name.trim(),
      instructions: "",
      servingQuantity: 1, // Default servingQuantity
      dishType: "",
      owner: user,
      ingredients: [],
    };

    try {
      await this.recipes.insertOne(newRecipe);
      return { recipe: newRecipeId };
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error creating recipe: ${errorMessage}`);
      return { error: `Failed to create recipe: ${errorMessage}` };
    }
  }

  /**
   * updateRecipe (recipe: Recipe, instructions: String)
   * updateRecipe (recipe: Recipe, servingQuantity: Int)
   * updateRecipe (recipe: Recipe, dishType: String)
   * updateRecipe (recipe: Recipe, name: String)
   *
   * **requires** `recipe` exists. (`servingQuantity` > 0 // Only for servingQuantity update).
   *
   * **effects** Updates the specified attribute of the `recipe`.
   */
  async updateRecipe(input: UpdateRecipeInput): Promise<UpdateRecipeOutput> {
    const { recipe: recipeId } = input as { recipe: Recipe }; // Extract recipe ID
    if (!recipeId || recipeId.trim() === "") {
      return { error: "Recipe ID cannot be empty." };
    }

    const filter = { _id: recipeId };
    const update: { $set: Partial<RecipeSchema> } = { $set: {} };

    // Determine which field to update based on the input structure
    if ("instructions" in input) {
      if (typeof input.instructions !== "string") {
        return { error: "Instructions must be a string." };
      }
      update.$set.instructions = input.instructions;
    } else if ("servingQuantity" in input) {
      if (
        typeof input.servingQuantity !== "number" || input.servingQuantity <= 0
      ) {
        return { error: "Serving quantity must be a positive number." };
      }
      // Ensure it's an integer if specified as Int in spec
      update.$set.servingQuantity = Math.floor(input.servingQuantity);
    } else if ("dishType" in input) {
      if (typeof input.dishType !== "string") {
        return { error: "Dish type must be a string." };
      }
      update.$set.dishType = input.dishType;
    } else if ("name" in input) {
      if (typeof input.name !== "string" || input.name.trim() === "") {
        return { error: "Recipe name cannot be empty." };
      }
      update.$set.name = input.name.trim();
    } else {
      return { error: "No valid field provided for update." };
    }

    try {
      const result = await this.recipes.updateOne(filter, update);
      if (result.matchedCount === 0) {
        return { error: `Recipe with ID '${recipeId}' not found.` };
      }
      return {};
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error updating recipe: ${errorMessage}`);
      return { error: `Failed to update recipe: ${errorMessage}` };
    }
  }

  /**
   * duplicateRecipe (originalRecipe: Recipe, user: User, newName: String): (newRecipe: Recipe)
   *
   * **requires** `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.
   *
   * **effects** Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity,
   * dishType, and all ingredients including their names, quantities, and units).
   * Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.
   */
  async duplicateRecipe({
    originalRecipe,
    user,
    newName,
  }: DuplicateRecipeInput): Promise<DuplicateRecipeOutput> {
    if (!originalRecipe || originalRecipe.trim() === "") {
      return { error: "Original recipe ID cannot be empty." };
    }
    if (!user || user.trim() === "") {
      return { error: "User ID cannot be empty." };
    }
    if (!newName || newName.trim() === "") {
      return { error: "New recipe name cannot be empty." };
    }

    try {
      const original = await this.recipes.findOne({ _id: originalRecipe });
      if (!original) {
        return {
          error: `Original recipe with ID '${originalRecipe}' not found.`,
        };
      }

      // Check if a recipe with newName already exists for this user
      const existingRecipe = await this.recipes.findOne({
        name: newName.trim(),
        owner: user,
      });
      if (existingRecipe) {
        return {
          error:
            `Recipe with name '${newName}' already exists for user '${user}'.`,
        };
      }

      const duplicatedRecipeId = freshID();
      const duplicatedRecipe: RecipeSchema = {
        _id: duplicatedRecipeId,
        name: newName.trim(),
        instructions: original.instructions,
        servingQuantity: original.servingQuantity,
        dishType: original.dishType,
        owner: user, // New owner
        ingredients: original.ingredients.map((ing) => ({
          // Deep copy ingredients and assign new unique IDs for each ingredient
          _id: freshID(),
          name: ing.name,
          quantity: ing.quantity,
          units: ing.units,
        })),
      };

      await this.recipes.insertOne(duplicatedRecipe);
      return { newRecipe: duplicatedRecipeId };
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error duplicating recipe: ${errorMessage}`);
      return { error: `Failed to duplicate recipe: ${errorMessage}` };
    }
  }

  /**
   * addRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)
   *
   * **requires** `recipe` exists. `name` is not an existing ingredient in recipe. `quantity` > 0. `units` is not empty.
   *
   * **effects** New `Ingredient` with the given `name`, `quantity`, and `units` is added to `recipe.ingredients`.
   */
  async addRecipeIngredient({
    recipe,
    name,
    quantity,
    units,
  }: AddRecipeIngredientInput): Promise<AddRecipeIngredientOutput> {
    if (!recipe || recipe.trim() === "") {
      return { error: "Recipe ID cannot be empty." };
    }
    if (!name || name.trim() === "") {
      return { error: "Ingredient name cannot be empty." };
    }
    if (typeof quantity !== "number" || quantity <= 0) {
      return { error: "Quantity must be a positive number." };
    }
    if (!units || units.trim() === "") {
      return { error: "Units cannot be empty." };
    }

    try {
      const existingRecipe = await this.recipes.findOne({ _id: recipe });
      if (!existingRecipe) {
        return { error: `Recipe with ID '${recipe}' not found.` };
      }

      const ingredientExists = existingRecipe.ingredients.some((ing) =>
        ing.name === name.trim()
      );
      if (ingredientExists) {
        return {
          error: `Ingredient '${name}' already exists in recipe '${recipe}'.`,
        };
      }

      const newIngredient: IngredientSchema = {
        _id: freshID(), // Assign a fresh ID for the new ingredient
        name: name.trim(),
        quantity,
        units: units.trim(),
      };

      const result = await this.recipes.updateOne(
        { _id: recipe },
        { $push: { ingredients: newIngredient } },
      );

      if (result.matchedCount === 0) {
        // This case should ideally be caught by the findOne above, but as a safeguard.
        return { error: `Recipe with ID '${recipe}' not found during update.` };
      }
      return {};
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error adding ingredient to recipe: ${errorMessage}`);
      return { error: `Failed to add ingredient to recipe: ${errorMessage}` };
    }
  }

  /**
   * updateRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)
   *
   * **requires** `recipe` exists. `recipe.ingredients` contains ingredient with `name`. `quantity` > 0. `units` is not empty.
   *
   * **effects** Ingredient with `name` in `recipe.ingredients` has parameters `quantity` and `units` updated.
   */
  async updateRecipeIngredient({
    recipe,
    name,
    quantity,
    units,
  }: UpdateRecipeIngredientInput): Promise<UpdateRecipeIngredientOutput> {
    if (!recipe || recipe.trim() === "") {
      return { error: "Recipe ID cannot be empty." };
    }
    if (!name || name.trim() === "") {
      return { error: "Ingredient name cannot be empty." };
    }
    if (typeof quantity !== "number" || quantity <= 0) {
      return { error: "Quantity must be a positive number." };
    }
    if (!units || units.trim() === "") {
      return { error: "Units cannot be empty." };
    }

    try {
      const result = await this.recipes.updateOne(
        { _id: recipe, "ingredients.name": name.trim() },
        {
          $set: {
            "ingredients.$.quantity": quantity, // Positional operator to update matched element
            "ingredients.$.units": units.trim(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return {
          error: `Recipe '${recipe}' or ingredient '${name}' not found.`,
        };
      }
      return {};
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error updating ingredient in recipe: ${errorMessage}`);
      return {
        error: `Failed to update ingredient in recipe: ${errorMessage}`,
      };
    }
  }

  /**
   * removeRecipeIngredient (recipe: Recipe, name: String)
   *
   * **requires** `recipe` exists. An ingredient with `name` exists in `recipe.ingredients`.
   *
   * **effects** Removes the `Ingredient` with the given `name` from `recipe.ingredients`.
   */
  async removeRecipeIngredient({
    recipe,
    name,
  }: RemoveRecipeIngredientInput): Promise<RemoveRecipeIngredientOutput> {
    if (!recipe || recipe.trim() === "") {
      return { error: "Recipe ID cannot be empty." };
    }
    if (!name || name.trim() === "") {
      return { error: "Ingredient name cannot be empty." };
    }

    try {
      const result = await this.recipes.updateOne(
        { _id: recipe },
        { $pull: { ingredients: { name: name.trim() } } }, // Remove by ingredient name
      );

      if (result.matchedCount === 0) {
        return {
          error: `Recipe '${recipe}' or ingredient '${name}' not found.`,
        };
      }
      return {};
    } catch (_Error: unknown) { // Fix: Add unknown type and safe error message extraction for _Error
      const errorMessage = _Error instanceof Error
        ? _Error.message
        : String(_Error);
      console.error(`Error removing ingredient from recipe: ${errorMessage}`);
      return {
        error: `Failed to remove ingredient from recipe: ${errorMessage}`,
      };
    }
  }

  /**
   * _getRecipeDetails (recipe: Recipe): (name: String, instructions: String, servingQuantity: Int, dishType: String, owner: User)
   *
   * **requires** `recipe` exists.
   *
   * **effects** Returns all primary attributes of the recipe.
   */
  async _getRecipeDetails(
    { recipe }: GetRecipeDetailsInput,
  ): Promise<GetRecipeDetailsOutput> {
    if (!recipe || recipe.trim() === "") {
      return { error: "Recipe ID cannot be empty." };
    }

    try {
      const foundRecipe = await this.recipes.findOne(
        { _id: recipe },
        {
          projection: {
            name: 1,
            instructions: 1,
            servingQuantity: 1,
            dishType: 1,
            owner: 1,
            _id: 0, // Exclude _id from the result as it's not specified in the output
          },
        },
      );

      if (!foundRecipe) {
        return { error: `Recipe with ID '${recipe}' not found.` };
      }

      return [
        {
          name: foundRecipe.name,
          instructions: foundRecipe.instructions,
          servingQuantity: foundRecipe.servingQuantity,
          dishType: foundRecipe.dishType,
          owner: foundRecipe.owner,
        },
      ];
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting recipe details: ${errorMessage}`);
      return { error: `Failed to retrieve recipe details: ${errorMessage}` };
    }
  }

  /**
   * _getRecipeIngredients (recipe: Recipe): (ingredients: Set of Ingredient)
   *
   * **requires** `recipe` exists.
   *
   * **effects** Returns the set of all ingredients (each with its name, quantity, and units) for the `recipe`.
   */
  async _getRecipeIngredients({
    recipe,
  }: GetRecipeIngredientsInput): Promise<GetRecipeIngredientsOutput> {
    if (!recipe || recipe.trim() === "") {
      return { error: "Recipe ID cannot be empty." };
    }

    try {
      const foundRecipe = await this.recipes.findOne(
        { _id: recipe },
        { projection: { ingredients: 1, _id: 0 } }, // Only project ingredients, exclude _id
      );

      if (!foundRecipe) {
        return { error: `Recipe with ID '${recipe}' not found.` };
      }

      // Map to the desired output format, excluding the internal ingredient _id
      const ingredientsOutput = foundRecipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        units: ing.units,
      }));

      return [{ ingredients: ingredientsOutput }];
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting recipe ingredients: ${errorMessage}`);
      return {
        error: `Failed to retrieve recipe ingredients: ${errorMessage}`,
      };
    }
  }

  /**
   * _getRecipesOwnedByUser (user: User): (recipes: Set of Recipe)
   *
   * **requires** `user` exists.
   *
   * **effects** Returns the set of all recipes owned by the given `user`. This can be an empty set if there are no current Recipes.
   */
  async _getRecipesOwnedByUser({
    user,
  }: GetRecipesOwnedByUserInput): Promise<GetRecipesOwnedByUsersOutput> {
    if (!user || user.trim() === "") {
      return { error: "User ID cannot be empty." };
    }

    try {
      const userRecipes = await this.recipes
        .find(
          { owner: user },
          { projection: { _id: 1, name: 1 } }, // Only return recipe ID and name
        )
        .toArray();

      // Map to the specified output format: an array of dictionaries, each with 'recipe' (ID) and 'name'.
      return userRecipes.map((r) => ({ recipe: r._id, name: r.name }));
    } catch (e: unknown) { // Fix: Add unknown type and safe error message extraction
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`Error getting recipes owned by user: ${errorMessage}`);
      return { error: `Failed to retrieve recipes for user: ${errorMessage}` };
    }
  }
}

```

Bug Lines 357-367.

Error message:

```
'e' is of type 'unknown'.deno-ts(18046)
(local var) e: unknown
```
