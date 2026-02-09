# Instacart Developer Platform API: Shopping List Specification

This document outlines the technical requirements for integrating Instacart Shopping Lists into the application. It covers the API endpoints, authentication, request structure, and specific configurations for landing pages.

## 1. Environment & Authentication

The Instacart API has strict environment separation. Ensure the correct URL and API Key are used for the target environment.

### Base URLs
* **Development:** `https://connect.dev.instacart.tools`
* **Production:** `https://connect.instacart.com`

### Authentication
All requests must include the `Authorization` header with a Bearer token.
* **Header Format:** `Authorization: Bearer <YOUR_API_KEY>`
* **Key Format:** Keys typically start with a prefix (e.g., `keys.8Zd...`).

## 2. Create Shopping List Page

This endpoint generates a unique, shareable link that directs users to an Instacart shopping list page pre-filled with specified items.

* **Method:** `POST`
* **Endpoint:** `/idp/v1/products/products_link`

### Request Headers
| Header | Value |
| :--- | :--- |
| `Accept` | `application/json` |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <API_KEY>` |

### Request Body Structure

The request body is a JSON object with the following fields:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | The title of the shopping list (e.g., "Weekly Meal Prep"). |
| `line_items` | `array` | **Yes** | An array of product objects to include in the list. |
| `link_type` | `string` | No | Set to `"shopping_list"` (default) or `"recipe"`. |
| `image_url` | `string` | No | URL of an image (500x500px) to display on the page. |
| `landing_page_configuration`| `object` | No | Configuration for the destination page (see section 2.1). |
| `expires_in` | `integer`| No | Number of days until the link expires (Max 365). |

#### 2.1 LandingPageConfiguration Object
This object configures the user experience on the generated landing page.

| Field | Type | Description |
| :--- | :--- | :--- |
| `partner_linkback_url` | `string` | A URL linking back to your application or website. This allows users to return to your platform after viewing the list. |
| `enable_pantry_items` | `boolean` | If `true`, allows users to mark items as "pantry items" (already have at home). *Note: Primarily supported for 'recipe' link types.* |

#### 2.2 LineItem Object
Each item in the `line_items` array represents a product to be searched for or added.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | The term used to search Instacart's catalog (e.g., "Milk"). |
| `display_text` | `string` | No | Overrides the text shown to the user (e.g., show "1 Gallon Whole Milk" but search "Whole Milk"). |
| `quantity` | `number` | No | The amount of the item (default `1.0`). |
| `unit` | `string` | No | Unit of measure (e.g., `cup`, `oz`, `each`). Default is `each`. |
| `line_item_measurements` | `array` | No | Array of measurement objects to provide alternative units (e.g., both "oz" and "g"). |

---

### Example Request (cURL)
**Target:** Development Environment

```bash
curl --request POST \
  --url [https://connect.dev.instacart.tools/idp/v1/products/products_link](https://connect.dev.instacart.tools/idp/v1/products/products_link) \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer keys.YOUR_DEV_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Vegan Starter Pack",
    "image_url": "[https://example.com/images/vegan-pack.jpg](https://example.com/images/vegan-pack.jpg)",
    "link_type": "shopping_list",
    "landing_page_configuration": {
        "partner_linkback_url": "[https://myapp.com/meal-plans/vegan-week-1](https://myapp.com/meal-plans/vegan-week-1)"
    },
    "line_items": [
        {
            "name": "Tofu",
            "display_text": "Extra Firm Tofu",
            "quantity": 2,
            "unit": "package"
        },
        {
            "name": "Almond Milk",
            "quantity": 1,
            "unit": "gallon"
        },
        {
            "name": "Avocado",
            "line_item_measurements": [
                { "quantity": 2, "unit": "each" },
                { "quantity": 400, "unit": "grams" }
            ]
        }
    ]
}'