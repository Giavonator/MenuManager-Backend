---
timestamp: 'Tue Oct 28 2025 20:37:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203719.baaed448.md]]'
content_id: b9d1af70abb456968f6bd4ac7177ce4b8cb46fb6cbe0080faaa7b058c4d71015
---

# API Specification: CookBook Concept

**Purpose:** Store and manage definitions of recipes, including their ingredients, instructions, and ownership, enabling reuse and duplication for chefs.

***

## API Endpoints

### POST /api/CookBook/createRecipe

**Description:** Creates a new recipe with a given name and owner.

**Requirements:**

* `name` is not empty.

**Effects:**

* Creates a new `Recipe` with the given `name`, empty instructions, default `servingQuantity` (e.g., 1), empty `dishType`, `owner` set to `user`, and no ingredients. Returns the new `Recipe` ID.

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

***

### POST /api/CookBook/updateRecipe

**Description:** Updates a specific attribute (instructions, serving quantity, dish type, or name) of a recipe.

**Requirements:**

* `recipe` exists. (`servingQuantity` > 0 // Only for servingQuantity update).

**Effects:**

* Updates the specified attribute of the `recipe`.

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

***

### POST /api/CookBook/duplicateRecipe

**Description:** Creates a new recipe that is a copy of an existing one, assigned to a new owner and with a new name.

**Requirements:**

* `originalRecipe` exists. `user` exists. No other `Recipe` owned by `user` has `newName`.

**Effects:**

* Creates a new `Recipe` that is a copy of `originalRecipe` (name, instructions, servingQuantity, dishType, and all ingredients including their names, quantities, and units). Sets `newRecipe.owner` to `user` and `newRecipe.name` to `newName`. Returns the `newRecipe` ID.

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

***

### POST /api/CookBook/addRecipeIngredient

**Description:** Adds a new ingredient with specified details to a recipe.

**Requirements:**

* `recipe` exists. `name` is not an existing ingredient in recipe. `quantity` > 0. `units` is not empty.

**Effects:**

* New `Ingredient` with the given `name`, `quantity`, and `units` is added to `recipe.ingredients`.

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

***

### POST /api/CookBook/updateRecipeIngredient

**Description:** Updates the quantity and units of an existing ingredient in a recipe.

**Requirements:**

* `recipe` exists. `recipe.ingredients` contaings ingredient with `name`. `quantity` > 0. `units` is not empty.

**Effects:**

* Ingredient with `name` in `recipe.ingredients` has parameters `quantity` and `units` updated.

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

***

### POST /api/CookBook/removeRecipeIngredient

**Description:** Removes a specified ingredient from a recipe.

**Requirements:**

* `recipe` exists. An ingredient with `name` exists in `recipe.ingredients`.

**Effects:**

* Removes the `Ingredient` with the given `name` from `recipe.ingredients`.

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

***

### POST /api/CookBook/\_getRecipeDetails

**Description:** Returns the primary attributes (name, instructions, serving quantity, dish type, and owner) of a recipe.

**Requirements:**

* `recipe` exists.

**Effects:**

* Returns all primary attributes of the recipe.

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

***

### POST /api/CookBook/\_getRecipeIngredients

**Description:** Returns the set of all ingredients, including their name, quantity, and units, for a recipe.

**Requirements:**

* `recipe` exists.

**Effects:**

* Returns the set of all ingredients (each with its name, quantity, and units) for the `recipe`.

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

***

### POST /api/CookBook/\_getRecipesOwnedByUser

**Description:** Returns the set of all recipes owned by a given user.

**Requirements:**

* `user` exists.

**Effects:**

* Returns the set of all recipes owned by the given `user`. This can be an empty set if there are no current Recipes.

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
```
