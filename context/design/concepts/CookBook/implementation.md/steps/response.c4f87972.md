---
timestamp: 'Fri Oct 24 2025 06:33:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251024_063347.885304d2.md]]'
content_id: c4f87972c44341ad0bf774ed23a4a64fbb913c8f200445feaff6ec704e816053
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID, Result } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "CookBook" + ".";

// Generic types of this concept
type User = ID; // External User type
type Recipe = ID; // ID for a Recipe entity

/**
 * Interface for an Ingredient sub-document within a Recipe.
 * a name String
 * a quantity Float
 * a units String
 */
interface IngredientDoc {
  _id: ID; // Unique ID for each ingredient entry, to simplify updates/deletions in arrays
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
 *   an ingredients set of Ingredient
 */
interface RecipeDoc {
  _id: Recipe;
  name: string;
  instructions: string;
  servingQuantity: number;
  dishType: string;
  owner?: User; // Optional, as it's assigned via designateOwner
  ingredients: IngredientDoc[];
}

// --- Action Input/Output Types ---

type CreateRecipeInput = { name: string };
type CreateRecipeOutput = Result<{ recipe: Recipe }>;

type UpdateRecipeInstructionsInput = { recipe: Recipe; instructions: string };
type UpdateRecipeServingQuantityInput = { recipe: Recipe; servingQuantity: number };
type UpdateRecipeDishTypeInput = { recipe: Recipe; dishType: string };
type UpdateRecipeNameInput = { recipe: Recipe; name: string };
type UpdateRecipeOutput = Result<Empty>;

type DesignateOwnerInput = { recipe: Recipe; user: User };
type DesignateOwnerOutput = Result<Empty>;

type DuplicateRecipeInput = { originalRecipe: Recipe; user: User; newName: string };
type DuplicateRecipeOutput = Result<{ newRecipe: Recipe }>;

type AddRecipeIngredientInput = { recipe: Recipe; name: string; quantity: number; units: string };
type AddRecipeIngredientOutput = Result<Empty>;

type UpdateRecipeIngredientInput = { recipe: Recipe; name: string; quantity: number; units: string };
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
    owner?: User;
  }[]
>;

type GetRecipeIngredientsInput = { recipe: Recipe };
type GetRecipeIngredientsOutput = Result<{ ingredients: IngredientDoc[] }[]>;

type GetRecipesOwnedByUserInput = { user: User };
type GetRecipesOwnedByUserOutput = Result<{ recipes: Recipe }[]>;

export default class CookBookConcept {
  recipes: Collection<RecipeDoc>;

  constructor(private readonly db: Db) {
    this.recipes = this.db.collection(PREFIX + "recipes");
  }

  /**
   * createRecipe (name: String): (recipe: Recipe)
   *
   * **requires** `name` is not empty.
   *
   * **effects** Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1), empty `dishType`, no owner, and no ingredients. Returns the new `Recipe` ID.
   */
  async createRecipe(
    { name }: CreateRecipeInput,
  ): Promise<CreateRecipeOutput> {
    if (!name || name.trim() === "") {
      return { error: "Recipe name cannot be empty." };
    }

    const newRecipeId = freshID();
    const newRecipe: RecipeDoc = {
      _id: newRecipeId,
      name: name,
      instructions: "",
      servingQuantity: 1, // Default serving quantity
      dishType: "",
      ingredients: [],
    };

    try {
      await this.recipes.insertOne(newRecipe);
      return { recipe: newRecipeId };
    } catch (e) {
      console.error("Error creating recipe:", e);
      return { error: "Failed to create recipe due to a database error." };
    }
  }

  /**
   * updateRecipe (recipe: Recipe, instructions: String)
   *
   * **requires** `recipe` exists.
   *
   * **effects** Updates the `instructions` attribute of the `recipe`.
   */
  async updateRecipeInstructions(
    { recipe, instructions }: UpdateRecipeInstructionsInput,
  ): Promise<UpdateRecipeOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $set: { instructions: instructions } },
      );
      return {};
    } catch (e) {
      console.error("Error updating recipe instructions:", e);
      return { error: "Failed to update recipe instructions due to a database error." };
    }
  }

  /**
   * updateRecipe (recipe: Recipe, servingQuantity: Int)
   *
   * **requires** `recipe` exists. `servingQuantity` > 0.
   *
   * **effects** Updates the `servingQuantity` attribute of the `recipe`.
   */
  async updateRecipeServingQuantity(
    { recipe, servingQuantity }: UpdateRecipeServingQuantityInput,
  ): Promise<UpdateRecipeOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }
    if (servingQuantity <= 0) {
      return { error: "Serving quantity must be greater than 0." };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $set: { servingQuantity: servingQuantity } },
      );
      return {};
    } catch (e) {
      console.error("Error updating recipe serving quantity:", e);
      return { error: "Failed to update recipe serving quantity due to a database error." };
    }
  }

  /**
   * updateRecipe (recipe: Recipe, dishType: String)
   *
   * **requires** `recipe` exists.
   *
   * **effects** Updates the `dishType` attribute of the `recipe`.
   */
  async updateRecipeDishType(
    { recipe, dishType }: UpdateRecipeDishTypeInput,
  ): Promise<UpdateRecipeOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $set: { dishType: dishType } },
      );
      return {};
    } catch (e) {
      console.error("Error updating recipe dish type:", e);
      return { error: "Failed to update recipe dish type due to a database error." };
    }
  }

  /**
   * updateRecipe (recipe: Recipe, name: String)
   *
   * **requires** `recipe` exists.
   *
   * **effects** Updates the `name` attribute of the `recipe`.
   */
  async updateRecipeName(
    { recipe, name }: UpdateRecipeNameInput,
  ): Promise<UpdateRecipeOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }
    if (!name || name.trim() === "") {
      return { error: "Recipe name cannot be empty." };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $set: { name: name } },
      );
      return {};
    } catch (e) {
      console.error("Error updating recipe name:", e);
      return { error: "Failed to update recipe name due to a database error." };
    }
  }

  /**
   * designateOwner (recipe: Recipe, user: User)
   *
   * **requires** `recipe` exists, `recipe` does not already have an owner.
   *
   * **effects** Sets `recipe.owner` to `user`.
   */
  async designateOwner(
    { recipe, user }: DesignateOwnerInput,
  ): Promise<DesignateOwnerOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }
    if (existingRecipe.owner) {
      return { error: `Recipe with ID ${recipe} already has an owner.` };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $set: { owner: user } },
      );
      return {};
    } catch (e) {
      console.error("Error designating owner:", e);
      return { error: "Failed to designate owner due to a database error." };
    }
  }

  /**
   * duplicateRecipe (originalRecipe: Recipe, user: User, newName: String): (newRecipe: Recipe)
   *
   * **requires** `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.
   *
   * **effects** Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity, dishType, and all ingredients including their names, quantities, and units). Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.
   */
  async duplicateRecipe(
    { originalRecipe, user, newName }: DuplicateRecipeInput,
  ): Promise<DuplicateRecipeOutput> {
    const originalDoc = await this.recipes.findOne({ _id: originalRecipe });
    if (!originalDoc) {
      return { error: `Original recipe with ID ${originalRecipe} not found.` };
    }
    if (!user) { // Assuming 'user exists' means 'user ID is provided and valid'
      return { error: "User ID is required for duplicating a recipe." };
    }
    if (!newName || newName.trim() === "") {
      return { error: "New recipe name cannot be empty." };
    }

    const existingRecipeWithNewName = await this.recipes.findOne({
      owner: user,
      name: newName,
    });
    if (existingRecipeWithNewName) {
      return {
        error: `A recipe named '${newName}' already exists for user ${user}.`,
      };
    }

    const duplicatedIngredients: IngredientDoc[] = originalDoc.ingredients.map(
      (
        ing,
      ) => ({
        _id: freshID(), // New ID for each ingredient in the duplicated recipe
        name: ing.name,
        quantity: ing.quantity,
        units: ing.units,
      }),
    );

    const newRecipeId = freshID();
    const duplicatedRecipe: RecipeDoc = {
      _id: newRecipeId,
      name: newName,
      instructions: originalDoc.instructions,
      servingQuantity: originalDoc.servingQuantity,
      dishType: originalDoc.dishType,
      owner: user,
      ingredients: duplicatedIngredients,
    };

    try {
      await this.recipes.insertOne(duplicatedRecipe);
      return { newRecipe: newRecipeId };
    } catch (e) {
      console.error("Error duplicating recipe:", e);
      return { error: "Failed to duplicate recipe due to a database error." };
    }
  }

  /**
   * addRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)
   *
   * **requires** `recipe` exists. `name` is not an existing ingredient in recipe. `quantity` > 0. `units` is not empty.
   *
   * **effects** New `Ingredient` with the given `name`, `quantity`, and `units` is added to `recipe.ingredients`.
   */
  async addRecipeIngredient(
    { recipe, name, quantity, units }: AddRecipeIngredientInput,
  ): Promise<AddRecipeIngredientOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }
    if (!name || name.trim() === "") {
      return { error: "Ingredient name cannot be empty." };
    }
    if (existingRecipe.ingredients.some((ing) => ing.name === name)) {
      return {
        error: `An ingredient named '${name}' already exists in this recipe.`,
      };
    }
    if (quantity <= 0) {
      return { error: "Ingredient quantity must be greater than 0." };
    }
    if (!units || units.trim() === "") {
      return { error: "Ingredient units cannot be empty." };
    }

    const newIngredient: IngredientDoc = {
      _id: freshID(),
      name: name,
      quantity: quantity,
      units: units,
    };

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $push: { ingredients: newIngredient } },
      );
      return {};
    } catch (e) {
      console.error("Error adding recipe ingredient:", e);
      return { error: "Failed to add ingredient due to a database error." };
    }
  }

  /**
   * updateRecipeIngredient (recipe: Recipe, name: String, quantity: Float, units: String)
   *
   * **requires** `recipe` exists. `recipe.ingredients` contains ingredient with `name`. `quantity` > 0. `units` is not empty.
   *
   * **effects** Ingredient with `name` in `recipe.ingredients` has parameters `quantity` and `units` updated.
   */
  async updateRecipeIngredient(
    { recipe, name, quantity, units }: UpdateRecipeIngredientInput,
  ): Promise<UpdateRecipeIngredientOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }
    const ingredientToUpdate = existingRecipe.ingredients.find((ing) =>
      ing.name === name
    );
    if (!ingredientToUpdate) {
      return {
        error: `Ingredient named '${name}' not found in recipe with ID ${recipe}.`,
      };
    }
    if (quantity <= 0) {
      return { error: "Ingredient quantity must be greater than 0." };
    }
    if (!units || units.trim() === "") {
      return { error: "Ingredient units cannot be empty." };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe, "ingredients.name": name },
        { $set: { "ingredients.$.quantity": quantity, "ingredients.$.units": units } },
      );
      return {};
    } catch (e) {
      console.error("Error updating recipe ingredient:", e);
      return { error: "Failed to update ingredient due to a database error." };
    }
  }

  /**
   * removeRecipeIngredient (recipe: Recipe, name: String)
   *
   * **requires** `recipe` exists. An ingredient with `name` exists in `recipe.ingredients`.
   *
   * **effects** Removes the `Ingredient` with the given `name` from `recipe.ingredients`.
   */
  async removeRecipeIngredient(
    { recipe, name }: RemoveRecipeIngredientInput,
  ): Promise<RemoveRecipeIngredientOutput> {
    const existingRecipe = await this.recipes.findOne({ _id: recipe });
    if (!existingRecipe) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }
    const ingredientToRemove = existingRecipe.ingredients.find((ing) =>
      ing.name === name
    );
    if (!ingredientToRemove) {
      return {
        error: `Ingredient named '${name}' not found in recipe with ID ${recipe}.`,
      };
    }

    try {
      await this.recipes.updateOne(
        { _id: recipe },
        { $pull: { ingredients: { name: name } } },
      );
      return {};
    } catch (e) {
      console.error("Error removing recipe ingredient:", e);
      return { error: "Failed to remove ingredient due to a database error." };
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
    const recipeDoc = await this.recipes.findOne({ _id: recipe }, {
      projection: {
        name: 1,
        instructions: 1,
        servingQuantity: 1,
        dishType: 1,
        owner: 1,
        _id: 0, // Exclude _id from the returned document
      },
    });

    if (!recipeDoc) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }

    return [{
      name: recipeDoc.name,
      instructions: recipeDoc.instructions,
      servingQuantity: recipeDoc.servingQuantity,
      dishType: recipeDoc.dishType,
      owner: recipeDoc.owner,
    }];
  }

  /**
   * _getRecipeIngredients (recipe: Recipe): (ingredients: Set of Ingredient)
   *
   * **requires** `recipe` exists.
   *
   * **effects** Returns the set of all ingredients (each with its name, quantity, and units) for the `recipe`.
   */
  async _getRecipeIngredients(
    { recipe }: GetRecipeIngredientsInput,
  ): Promise<GetRecipeIngredientsOutput> {
    const recipeDoc = await this.recipes.findOne({ _id: recipe }, {
      projection: { ingredients: 1, _id: 0 },
    });

    if (!recipeDoc) {
      return { error: `Recipe with ID ${recipe} not found.` };
    }

    // Map ingredients to match the expected output format if necessary,
    // but here IngredientDoc matches the conceptual model's Ingredient attributes directly.
    return [{ ingredients: recipeDoc.ingredients }];
  }

  /**
   * _getRecipesOwnedByUser (user: User): (recipes: Set of Recipe)
   *
   * **requires** `user` exists.
   *
   * **effects** Returns the set of all recipes owned by the given `user`.
   */
  async _getRecipesOwnedByUser(
    { user }: GetRecipesOwnedByUserInput,
  ): Promise<GetRecipesOwnedByUserOutput> {
    if (!user) {
      return { error: "User ID is required." };
    }

    const recipeDocs = await this.recipes.find({ owner: user }, {
      projection: { _id: 1 }, // Only return the recipe ID
    }).toArray();

    if (!recipeDocs || recipeDocs.length === 0) {
      // Return an empty array if no recipes are found, not an error
      return { recipes: [] };
    }

    // Map the documents to the expected output format
    return recipeDocs.map((doc) => ({ recipes: doc._id }));
  }
}
```
