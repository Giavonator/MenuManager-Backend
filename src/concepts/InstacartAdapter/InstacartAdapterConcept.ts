import { Db } from "npm:mongodb";
import { Result } from "@utils/types.ts";
import "jsr:@std/dotenv/load";

// Environment configuration
const INSTACART_API_KEY = Deno.env.get("INSTACART_API_KEY");
const INSTACART_BASE_URL = Deno.env.get("INSTACART_BASE_URL") ??
  "https://connect.dev.instacart.tools";

// --- LineItem Type ---
export interface LineItem {
  name: string;
  display_text?: string;
  quantity: number;
  unit: string;
}

// --- Action Input/Output Types ---

// createShoppingList (title: String, weekStart: String, linkbackOrigin: String, lineItems: Array<LineItem>): (url: String)
// createShoppingList (...): (error: String)
type CreateShoppingListInput = {
  title: string;
  weekStart: string;
  linkbackOrigin: string;
  lineItems: LineItem[];
};
type CreateShoppingListOutput = Result<{ url: string }>;

// Instacart API request/response types
interface InstacartLineItem {
  name: string;
  display_text?: string;
  quantity: number;
  unit: string;
  line_item_measurements?: Array<{ quantity: number; unit: string }>;
}

interface InstacartRequest {
  title: string;
  line_items: InstacartLineItem[];
  link_type?: string;
  landing_page_configuration?: {
    partner_linkback_url: string;
    enable_pantry_items?: boolean;
  };
  expires_in?: number;
  image_url?: string;
}

interface InstacartResponse {
  products_link_url: string;
}

export default class InstacartAdapterConcept {
  constructor(private readonly db: Db) {
    // No collections needed - stateless adapter
  }

  /**
   * createShoppingList (title: String, weekStart: String, linkbackOrigin: String, lineItems: Array<LineItem>): (url: String)
   * createShoppingList (...): (error: String)
   *
   * **requires** `title` is non-empty, `weekStart` is a valid date string in YYYY-MM-DD format, `linkbackOrigin` is a valid URL, `lineItems` array is non-empty, and each line item has `name` (non-empty), `quantity` (>= 1), and `unit` (non-empty). `INSTACART_API_KEY` environment variable must be set.
   *
   * **effects** Transforms the input data to Instacart's API format, makes an HTTP POST request to Instacart's `/idp/v1/products/products_link` endpoint, and returns the shopping list URL from Instacart's response. On error, returns an error message.
   */
  async createShoppingList(
    {
      title,
      weekStart,
      linkbackOrigin,
      lineItems,
    }: CreateShoppingListInput,
  ): Promise<CreateShoppingListOutput> {
    try {
      // Validate API key
      if (!INSTACART_API_KEY) {
        return {
          error: "INSTACART_API_KEY is not configured",
        };
      }

      // Validate required fields
      if (!title || title.trim().length === 0) {
        return {
          error: "Title is required and cannot be empty",
        };
      }

      if (!weekStart || weekStart.trim().length === 0) {
        return {
          error: "weekStart is required and cannot be empty",
        };
      }

      // Validate date format (basic check for YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(weekStart)) {
        return {
          error: "weekStart must be in YYYY-MM-DD format",
        };
      }

      if (!linkbackOrigin || linkbackOrigin.trim().length === 0) {
        return {
          error: "linkbackOrigin is required and cannot be empty",
        };
      }

      // Validate lineItems
      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        return {
          error: "No valid ingredients provided",
        };
      }

      // Validate each line item
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (!item.name || item.name.trim().length === 0) {
          return {
            error: `Line item ${i + 1}: name is required and cannot be empty`,
          };
        }
        if (typeof item.quantity !== "number" || item.quantity < 1) {
          return {
            error: `Line item ${i + 1}: quantity must be a number >= 1`,
          };
        }
        if (!item.unit || item.unit.trim().length === 0) {
          return {
            error: `Line item ${i + 1}: unit is required and cannot be empty`,
          };
        }
      }

      // Build linkback URL
      const linkbackUrl = `${linkbackOrigin}/weekly-cart`;

      // Transform line items to Instacart format
      const instacartLineItems: InstacartLineItem[] = lineItems.map((item) => {
        const instacartItem: InstacartLineItem = {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        };

        // Add display_text if provided
        if (item.display_text) {
          instacartItem.display_text = item.display_text;
        }

        return instacartItem;
      });

      // Build Instacart API request
      const instacartRequest: InstacartRequest = {
        title,
        line_items: instacartLineItems,
        link_type: "shopping_list",
        landing_page_configuration: {
          partner_linkback_url: linkbackUrl,
        },
      };

      // Make HTTP request to Instacart API
      const apiUrl = `${INSTACART_BASE_URL}/idp/v1/products/products_link`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${INSTACART_API_KEY}`,
        },
        body: JSON.stringify(instacartRequest),
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage =
          `Instacart API error: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error || errorJson.message) {
            errorMessage = `Instacart API error: ${
              errorJson.error || errorJson.message
            }`;
          }
        } catch {
          // If error response is not JSON, use the text
          if (errorText) {
            errorMessage = `Instacart API error: ${errorText}`;
          }
        }
        return { error: errorMessage };
      }

      // Parse response
      const responseText = await response.text();
      let responseData: InstacartResponse;
      try {
        responseData = JSON.parse(responseText) as InstacartResponse;
      } catch (parseError) {
        return {
          error: `Invalid JSON response from Instacart API: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`,
        };
      }

      // Validate response has URL
      if (
        !responseData.products_link_url ||
        typeof responseData.products_link_url !== "string"
      ) {
        return {
          error: "Invalid response from Instacart API: missing or invalid URL",
        };
      }

      return { url: responseData.products_link_url };
    } catch (e: unknown) {
      // Safely extract the error message
      const errorMessage = e instanceof Error ? e.message : String(e);

      // Log the detailed error for debugging purposes
      console.error(
        `InstacartAdapter.createShoppingList failed: ${errorMessage}`,
      );

      // Return a standardized error object
      return { error: `Failed to create shopping list: ${errorMessage}` };
    }
  }
}
