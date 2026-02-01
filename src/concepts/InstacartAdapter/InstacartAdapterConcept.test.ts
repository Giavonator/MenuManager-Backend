import { testDb } from "@utils/database.ts";
import InstacartAdapterConcept from "./InstacartAdapterConcept.ts";
import {
  assertAndLog,
  printStepHeader,
  printTestHeader,
} from "../../utils/testing.ts";
import type { LineItem } from "./InstacartAdapterConcept.ts";

// Mock fetch for testing
let originalFetch: typeof fetch;
let fetchMock: typeof fetch;

function setupFetchMock() {
  originalFetch = globalThis.fetch;
  fetchMock = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const requestBody = init?.body ? JSON.parse(init.body as string) : {};

    // Mock successful response
    if (url.includes("/idp/v1/products/products_link")) {
      // Validate request structure
      if (
        !requestBody.title ||
        !requestBody.line_items ||
        !Array.isArray(requestBody.line_items) ||
        requestBody.line_items.length === 0
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          { status: 400, statusText: "Bad Request" },
        );
      }

      // Check Authorization header
      const authHeader = init?.headers
        ? (init.headers as Record<string, string>)["Authorization"]
        : null;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, statusText: "Unauthorized" },
        );
      }

      // Return mock successful response
      return new Response(
        JSON.stringify({
          url: "https://www.instacart.com/shopping_lists/abc123xyz",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Default: network error simulation
    throw new Error("Network error");
  };
  globalThis.fetch = fetchMock;
}

function teardownFetchMock() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
}

Deno.test("InstacartAdapter - Principle Fulfillment", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const adapter = new InstacartAdapterConcept(db);

  // Setup fetch mock
  setupFetchMock();

  try {
    // Temporarily set API key for testing
    const originalApiKey = Deno.env.get("INSTACART_API_KEY");
    Deno.env.set("INSTACART_API_KEY", "test-api-key-123");

    await t.step(
      "1. Create shopping list with valid items (Milk, Eggs, Flour)",
      async () => {
        const stepMessage =
          "1. Create shopping list with valid items (Milk, Eggs, Flour)";
        printStepHeader(stepMessage);
        let checkIndex = 0;

        const lineItems: LineItem[] = [
          {
            name: "Milk",
            display_text: "2 cups Milk",
            quantity: 2,
            unit: "cup",
          },
          {
            name: "Eggs",
            display_text: "12 each Eggs",
            quantity: 12,
            unit: "each",
          },
          {
            name: "Flour",
            display_text: "500 g Flour",
            quantity: 500,
            unit: "g",
          },
        ];

        const result = await adapter.createShoppingList({
          title: "Week of 2025-01-26 - 2025-02-01 - Shopping List",
          weekStart: "2025-01-26",
          linkbackOrigin: "https://yourdomain.com",
          lineItems,
        });

        assertAndLog(
          "url" in result,
          true,
          "Shopping list should be created successfully",
          stepMessage,
          ++checkIndex,
        );

        if ("url" in result) {
          assertAndLog(
            typeof result.url,
            "string",
            "URL should be a string",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            result.url.length > 0,
            true,
            "URL should not be empty",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            result.url.includes("instacart.com"),
            true,
            "URL should be an Instacart URL",
            stepMessage,
            ++checkIndex,
          );
        }
      },
    );

    // Restore original API key
    if (originalApiKey) {
      Deno.env.set("INSTACART_API_KEY", originalApiKey);
    } else {
      Deno.env.delete("INSTACART_API_KEY");
    }
  } finally {
    teardownFetchMock();
    await client.close();
  }
});

Deno.test("InstacartAdapter - Error Cases", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const adapter = new InstacartAdapterConcept(db);

  // Setup fetch mock
  setupFetchMock();

  try {
    await t.step("1. Missing API key", async () => {
      const stepMessage = "1. Missing API key";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // Ensure API key is not set
      const originalApiKey = Deno.env.get("INSTACART_API_KEY");
      Deno.env.delete("INSTACART_API_KEY");

      const result = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "Milk", quantity: 1, unit: "cup" }],
      });

      assertAndLog(
        "error" in result,
        true,
        "Should return error when API key is missing",
        stepMessage,
        ++checkIndex,
      );

      if ("error" in result) {
        assertAndLog(
          result.error.includes("INSTACART_API_KEY"),
          true,
          "Error message should mention INSTACART_API_KEY",
          stepMessage,
          ++checkIndex,
        );
      }

      // Restore original API key
      if (originalApiKey) {
        Deno.env.set("INSTACART_API_KEY", originalApiKey);
      }
    });

    await t.step("2. Empty line items array", async () => {
      const stepMessage = "2. Empty line items array";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      Deno.env.set("INSTACART_API_KEY", "test-key");

      const result = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [],
      });

      assertAndLog(
        "error" in result,
        true,
        "Should return error when lineItems is empty",
        stepMessage,
        ++checkIndex,
      );

      if ("error" in result) {
        assertAndLog(
          result.error.includes("No valid ingredients"),
          true,
          "Error message should mention no valid ingredients",
          stepMessage,
          ++checkIndex,
        );
      }
    });

    await t.step("3. Invalid weekStart format", async () => {
      const stepMessage = "3. Invalid weekStart format";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      Deno.env.set("INSTACART_API_KEY", "test-key");

      const result = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "invalid-date",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "Milk", quantity: 1, unit: "cup" }],
      });

      assertAndLog(
        "error" in result,
        true,
        "Should return error when weekStart format is invalid",
        stepMessage,
        ++checkIndex,
      );

      if ("error" in result) {
        assertAndLog(
          result.error.includes("YYYY-MM-DD"),
          true,
          "Error message should mention YYYY-MM-DD format",
          stepMessage,
          ++checkIndex,
        );
      }
    });

    await t.step("4. Missing required fields", async () => {
      const stepMessage = "4. Missing required fields";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      Deno.env.set("INSTACART_API_KEY", "test-key");

      // Test missing title
      const result1 = await adapter.createShoppingList({
        title: "",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "Milk", quantity: 1, unit: "cup" }],
      });

      assertAndLog(
        "error" in result1,
        true,
        "Should return error when title is empty",
        stepMessage,
        ++checkIndex,
      );

      // Test missing line item name
      const result2 = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "", quantity: 1, unit: "cup" }],
      });

      assertAndLog(
        "error" in result2,
        true,
        "Should return error when line item name is empty",
        stepMessage,
        ++checkIndex,
      );

      // Test invalid quantity
      const result3 = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "Milk", quantity: 0, unit: "cup" }],
      });

      assertAndLog(
        "error" in result3,
        true,
        "Should return error when quantity is less than 1",
        stepMessage,
        ++checkIndex,
      );
    });

    await t.step("5. Instacart API error (401 Unauthorized)", async () => {
      const stepMessage = "5. Instacart API error (401 Unauthorized)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // Override fetch mock for this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, statusText: "Unauthorized" },
        );
      };

      Deno.env.set("INSTACART_API_KEY", "invalid-key");

      const result = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "Milk", quantity: 1, unit: "cup" }],
      });

      assertAndLog(
        "error" in result,
        true,
        "Should return error when API returns 401",
        stepMessage,
        ++checkIndex,
      );

      if ("error" in result) {
        assertAndLog(
          result.error.includes("401") || result.error.includes("Unauthorized"),
          true,
          "Error message should mention 401 or Unauthorized",
          stepMessage,
          ++checkIndex,
        );
      }

      // Restore fetch mock
      globalThis.fetch = originalFetch;
    });

    await t.step("6. Network error", async () => {
      const stepMessage = "6. Network error";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // Override fetch mock to throw network error
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (): Promise<Response> => {
        throw new Error("Network connection failed");
      };

      Deno.env.set("INSTACART_API_KEY", "test-key");

      const result = await adapter.createShoppingList({
        title: "Test List",
        weekStart: "2025-01-26",
        linkbackOrigin: "https://example.com",
        lineItems: [{ name: "Milk", quantity: 1, unit: "cup" }],
      });

      assertAndLog(
        "error" in result,
        true,
        "Should return error when network fails",
        stepMessage,
        ++checkIndex,
      );

      if ("error" in result) {
        assertAndLog(
          result.error.includes("Failed to create shopping list"),
          true,
          "Error message should indicate failure to create shopping list",
          stepMessage,
          ++checkIndex,
        );
      }

      // Restore fetch mock
      globalThis.fetch = originalFetch;
    });
  } finally {
    teardownFetchMock();
    await client.close();
  }
});

Deno.test("InstacartAdapter - Data Transformation", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const adapter = new InstacartAdapterConcept(db);

  // Setup fetch mock that captures the request
  let capturedRequest: any = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if (init?.body) {
      capturedRequest = JSON.parse(init.body as string);
    }
    return new Response(
      JSON.stringify({ url: "https://www.instacart.com/shopping_lists/test" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    Deno.env.set("INSTACART_API_KEY", "test-key");

    await t.step(
      "1. Verify correct transformation of input to Instacart format",
      async () => {
        const stepMessage =
          "1. Verify correct transformation of input to Instacart format";
        printStepHeader(stepMessage);
        let checkIndex = 0;

        const lineItems: LineItem[] = [
          {
            name: "Milk",
            display_text: "2 cups Milk",
            quantity: 2,
            unit: "cup",
          },
          {
            name: "Eggs",
            quantity: 12,
            unit: "each",
          },
        ];

        await adapter.createShoppingList({
          title: "Week of 2025-01-26 - 2025-02-01 - Shopping List",
          weekStart: "2025-01-26",
          linkbackOrigin: "https://yourdomain.com",
          lineItems,
        });

        assertAndLog(
          capturedRequest !== null,
          true,
          "Request should have been captured",
          stepMessage,
          ++checkIndex,
        );

        if (capturedRequest) {
          // Verify title
          assertAndLog(
            capturedRequest.title,
            "Week of 2025-01-26 - 2025-02-01 - Shopping List",
            "Title should be correctly set",
            stepMessage,
            ++checkIndex,
          );

          // Verify link_type
          assertAndLog(
            capturedRequest.link_type,
            "shopping_list",
            "link_type should be 'shopping_list'",
            stepMessage,
            ++checkIndex,
          );

          // Verify landing_page_configuration
          assertAndLog(
            capturedRequest.landing_page_configuration !== undefined,
            true,
            "landing_page_configuration should be set",
            stepMessage,
            ++checkIndex,
          );

          if (capturedRequest.landing_page_configuration) {
            assertAndLog(
              capturedRequest.landing_page_configuration.partner_linkback_url,
              "https://yourdomain.com/weekly-cart/2025-01-26",
              "linkback URL should be correctly constructed",
              stepMessage,
              ++checkIndex,
            );
          }

          // Verify line_items structure
          assertAndLog(
            Array.isArray(capturedRequest.line_items),
            true,
            "line_items should be an array",
            stepMessage,
            ++checkIndex,
          );

          assertAndLog(
            capturedRequest.line_items.length,
            2,
            "line_items should have 2 items",
            stepMessage,
            ++checkIndex,
          );

          // Verify first line item (with display_text)
          const firstItem = capturedRequest.line_items[0];
          assertAndLog(
            firstItem.name,
            "Milk",
            "First item name should be 'Milk'",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            firstItem.display_text,
            "2 cups Milk",
            "First item display_text should be set",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            firstItem.quantity,
            2,
            "First item quantity should be 2",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            firstItem.unit,
            "cup",
            "First item unit should be 'cup'",
            stepMessage,
            ++checkIndex,
          );

          // Verify second line item (without display_text)
          const secondItem = capturedRequest.line_items[1];
          assertAndLog(
            secondItem.name,
            "Eggs",
            "Second item name should be 'Eggs'",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            secondItem.display_text,
            undefined,
            "Second item display_text should be undefined",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            secondItem.quantity,
            12,
            "Second item quantity should be 12",
            stepMessage,
            ++checkIndex,
          );
          assertAndLog(
            secondItem.unit,
            "each",
            "Second item unit should be 'each'",
            stepMessage,
            ++checkIndex,
          );
        }
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    await client.close();
  }
});
