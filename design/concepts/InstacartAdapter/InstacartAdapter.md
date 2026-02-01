
# InstacartAdapter

**concept** InstacartAdapter

**purpose** Bridge between our application and Instacart's Shopping List API to generate shareable shopping list links that users can access to view and purchase items.

**principle** When a user requests a shopping list with items (e.g., "2 cups Milk", "12 each Eggs", "500 g Flour"), the concept transforms the data format and calls Instacart's API to create a shopping list page. Instacart returns a shareable URL that directs users to a pre-filled shopping list page where they can view the items and complete their purchase. The linkback URL allows users to return to the application after viewing the list.

**state**\
  No persistent state. This is a stateless adapter that transforms requests and forwards them to Instacart's API.

**actions**\
  createShoppingList (title: String, weekStart: String, linkbackOrigin: String, lineItems: Array<LineItem>): (url: String)\
    **requires** `title` is non-empty, `weekStart` is a valid date string in YYYY-MM-DD format, `linkbackOrigin` is a valid URL, `lineItems` array is non-empty, and each line item has `name` (non-empty), `quantity` (>= 1), and `unit` (non-empty). `INSTACART_API_KEY` environment variable must be set.\
    **effects** Transforms the input data to Instacart's API format, makes an HTTP POST request to Instacart's `/idp/v1/products/products_link` endpoint, and returns the shopping list URL from Instacart's response.

**LineItem structure**\
  Each LineItem in the `lineItems` array has:\
    - `name`: String (required) - Product name for Instacart search (e.g., "Milk")\
    - `display_text`: String (optional) - Display text shown to user (e.g., "2 cups Milk")\
    - `quantity`: Number (required) - Quantity (minimum 1)\
    - `unit`: String (required) - Unit of measure (e.g., "cup", "oz", "each", "g", "kg", "ml", "l", "lb", "tsp", "tbsp")
