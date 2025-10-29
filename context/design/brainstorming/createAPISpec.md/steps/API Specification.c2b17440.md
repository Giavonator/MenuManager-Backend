---
timestamp: 'Tue Oct 28 2025 20:37:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203719.baaed448.md]]'
content_id: c2b174403c51931f060dd7a5c99fe07df491348e5193bea82985b4b9d4d2b1a4
---

# API Specification: MenuCollection Concept

**Purpose:** Organize and present a collection of recipes as a single menu for a specific date, allowing for individual recipe scaling within the menu.

***

## API Endpoints

### POST /api/MenuCollection/createMenu

**Description:** Creates a new menu for a given date, owned by a specific user.

**Requirements:**

* `name` is not empty, `date` is in the future, `actingUser` exists. No other `Menu` exists for this `actingUser` on this `date`.

**Effects:**

* Creates a new `Menu` with the given `name`, `date`, and `owner`=`actingUser`. It will have an empty set of `menuRecipes`. Returns the new `Menu` ID.

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

***

### POST /api/MenuCollection/updateMenu

**Description:** Updates either the name or the date of an existing menu.

**Requirements:**

* `menu` exists, no `otherMenu` on date has the same `menu.user` for new date.

**Effects:**

* Updates the specified attribute of the `menu`.

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

***

### POST /api/MenuCollection/addRecipe

**Description:** Adds a recipe to a menu with a specified scaling factor.

**Requirements:**

* `menu` exists, `recipe` exists. `scalingFactor` > 0. `menu` does not already contain `recipe`.

**Effects:**

* Adds the `recipe` with its `scalingFactor` to `menu.menuRecipes`.

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

***

### POST /api/MenuCollection/removeRecipe

**Description:** Removes a recipe from a menu.

**Requirements:**

* `menu` exists, `recipe` exists in `menu.menuRecipes`.

**Effects:**

* Removes `recipe` from `menu.menuRecipes`.

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

***

### POST /api/MenuCollection/changeRecipeScaling

**Description:** Changes the scaling factor for an existing recipe within a menu.

**Requirements:**

* `menu` exists, `recipe` exists in `menu.menuRecipes`. `newScalingFactor` > 0.

**Effects:**

* Updates the `scalingFactor` for `recipe` within `menu.menuRecipes` to `newScalingFactor`.

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

***

### POST /api/MenuCollection/\_getMenuDetails

**Description:** Returns the name, date, and owner of a specified menu.

**Requirements:**

* `menu` exists.

**Effects:**

* Returns details about the `menu`.

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

***

### POST /api/MenuCollection/\_getRecipesInMenu

**Description:** Returns a map of recipe IDs to their scaling factors for a given menu.

**Requirements:**

* `menu` exists.

**Effects:**

* Returns the map of `Recipe` IDs to their `scalingFactor`s for the given `menu`.

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

***

### POST /api/MenuCollection/\_getMenusOwnedByUser

**Description:** Returns the set of all menus owned by a specific user.

**Requirements:**

* `user` exists.

**Effects:**

* Returns the set of all `Menu` entities where the `owner` attribute matches the given user.

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

***

### POST /api/MenuCollection/\_getMenuByDate

**Description:** Returns the menu ID associated with a specific date and owner.

**Requirements:**

* A menu exists for `date` owned by `owner`.

**Effects:**

* Returns the `Menu` ID associated with that `date` and `owner`.

**Request Body:**

```json
{
  "date": "string",
  "owner": "string"
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

***
