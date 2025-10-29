---
timestamp: 'Tue Oct 28 2025 20:37:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203719.baaed448.md]]'
content_id: 6fbf11841f58be9befe29249cdbc32846fe725fe7048671a401cac6215360adc
---

# API Specification: WeeklyCart Concept

**Purpose:** Organize menus for a specific week into a coherent cart for ease of organization.

***

## API Endpoints

### POST /api/WeeklyCart/createCart

**Description:** Creates a new weekly cart for the week containing the specified date.

**Requirements:**

* the current system date is before `dateInWeek`. No other `Cart` exists for the week containing `dateInWeek`.

**Effects:**

* Calculates the `startDate` as the Sunday of the week containing `dateInWeek` and `endDate` as the Saturday of the same week. Creates a new `Cart` with this `startDate` and `endDate`. It will have an empty set of `menus`.

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

***

### POST /api/WeeklyCart/deleteCart

**Description:** Deletes the weekly cart corresponding to the week containing the specified date.

**Requirements:**

* there exists a cart whose `startDate` and `endDate` range *contains* `dateInWeek`.

**Effects:**

* Deletes `cart`.

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

***

### POST /api/WeeklyCart/addMenuToCart

**Description:** Adds a menu to the weekly cart that encompasses the menu's date. If no such cart exists, a new one is created.

**Requirements:**

* `menu` exists.

**Effects:**

* Adds `menu` to `cart` whose `startDate` and `endDate` range *contains* `menuDate`. If such a cart doesn't exist, a createCart for that date and then add `menu` to the new cart. Return `cart` menu was added to.

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

***

### POST /api/WeeklyCart/removeMenuFromCart

**Description:** Removes a specified menu from the cart it currently belongs to.

**Requirements:**

* `menu` exists in a `cart.menus`.

**Effects:**

* Removes `menu` from `cart.menus`. Return `cart` that menu was removed from.

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

***

### POST /api/WeeklyCart/\_getCartDates

**Description:** Returns the start and end dates of a specified weekly cart.

**Requirements:**

* `cart` exists.

**Effects:**

* Returns `cart` `startDate` and `endDate`.

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

***

### POST /api/WeeklyCart/\_getMenusInCart

**Description:** Returns the set of all menu IDs associated with a given weekly cart.

**Requirements:**

* `cart` exists.

**Effects:**

* Returns the set of all `Menu` IDs associated with the given `cart`.

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

***

### POST /api/WeeklyCart/\_getCartByDate

**Description:** Returns the weekly cart that contains the specified date within its range.

**Requirements:**

* true.

**Effects:**

* Returns the `cart` for that contains `date` between `cart.startDate` and `cart.endDate`. If no such cart exists returns empty.

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

***
