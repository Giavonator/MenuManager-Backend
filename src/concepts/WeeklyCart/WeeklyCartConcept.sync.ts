import { actions, Frames, Sync } from "@engine";
import {
  CookBook,
  MenuCollection,
  PurchaseSystem,
  Requesting,
  StoreCatalog,
  UserAuthentication,
  WeeklyCart,
} from "@concepts";
import { convertWithinCategory } from "@utils/instacart_units.ts";
import { ID } from "@utils/types.ts";

const toDateOnlyString = (date: Date): string =>
  date.toISOString().split("T")[0];

const normalizeDateString = (value: string): string | null => {
  const parsed = new Date(value);
  ``;
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setUTCHours(0, 0, 0, 0);
  return toDateOnlyString(parsed);
};

// ============================================================================
// EnsureCartExistsOnMenuCreate Sync
// When a menu is created, ensure a cart exists for that week
// ============================================================================

export const EnsureCartExistsOnMenuCreate: Sync = ({
  menu,
  date,
  cart,
}) => ({
  when: actions(
    [MenuCollection.createMenu, {}, { menu }],
  ),
  where: async (frames) => {
    // Get menu details to extract the date and check if cart exists
    const resultFrames = new Frames();
    for (const frame of frames) {
      const menuFrames = await (new Frames(frame).query(
        MenuCollection._getMenuDetails as unknown as (
          input: { menu: string },
        ) => Promise<
          Array<{
            name: string;
            date: Date;
            owner: string;
          }>
        >,
        { menu },
        { date },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const dateValue = menuFrameRecord[date];
        if (!(dateValue instanceof Date)) {
          continue;
        }

        // Check if cart exists for this date
        const cartFrames = await (new Frames(menuFrame).query(
          WeeklyCart._getCartByDate as unknown as (
            input: { date: Date },
          ) => Promise<Array<{ cart: string }>>,
          { date: dateValue },
          { cart },
        ) as Promise<Frames>);

        // Only create cart if it doesn't exist
        if (cartFrames.length === 0) {
          resultFrames.push(menuFrame);
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.createCart,
    { dateInWeek: date },
  ]),
});

// ============================================================================
// AddMenuToCartOnMenuCreate Sync
// When a menu is created, add it to the appropriate cart (cart must exist)
// ============================================================================

export const AddMenuToCartOnMenuCreate: Sync = ({
  menu,
  date,
  cart,
}) => ({
  when: actions(
    [MenuCollection.createMenu, {}, { menu }],
  ),
  where: async (frames) => {
    // Get menu details to extract the date and verify cart exists
    const resultFrames = new Frames();
    for (const frame of frames) {
      const menuFrames = await (new Frames(frame).query(
        MenuCollection._getMenuDetails as unknown as (
          input: { menu: string },
        ) => Promise<
          Array<{
            name: string;
            date: Date;
            owner: string;
          }>
        >,
        { menu },
        { date },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const dateValue = menuFrameRecord[date];
        if (!(dateValue instanceof Date)) {
          continue;
        }

        // Check if cart exists for this date
        const cartFrames = await (new Frames(menuFrame).query(
          WeeklyCart._getCartByDate as unknown as (
            input: { date: Date },
          ) => Promise<Array<{ cart: string }>>,
          { date: dateValue },
          { cart },
        ) as Promise<Frames>);

        // Only proceed if cart exists (or will exist after EnsureCartExistsOnMenuCreate)
        // Since syncs can run in parallel, we'll also match on cart creation
        if (cartFrames.length > 0) {
          // Cart already exists
          resultFrames.push(menuFrame);
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.addMenuToCart,
    { menu, menuDate: date },
  ]),
});

// AddMenuToCartAfterMenuCreateCart: Call addMenuToCart after cart is created for menu
export const AddMenuToCartAfterMenuCreateCart: Sync = ({
  menu,
  date,
  cart,
  startDate,
  endDate,
}) => ({
  when: actions(
    [
      WeeklyCart.createCart,
      {},
      { cart },
    ],
    [
      MenuCollection.createMenu,
      {},
      { menu },
    ],
  ),
  where: async (frames) => {
    // Match frames where the cart was created for the menu's date
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const cartValue = frameRecord[cart] as string | undefined;

      if (typeof cartValue !== "string") {
        continue;
      }

      // Get cart's date range
      const cartDatesFrames = await (new Frames(frame).query(
        WeeklyCart._getCartDates as unknown as (
          input: { cart: string },
        ) => Promise<
          Array<{
            startDate: Date;
            endDate: Date;
          }>
        >,
        { cart: cartValue },
        { startDate, endDate },
      ) as Promise<Frames>);

      // Get menu's date
      const menuFrames = await (new Frames(frame).query(
        MenuCollection._getMenuDetails as unknown as (
          input: { menu: string },
        ) => Promise<
          Array<{
            name: string;
            date: Date;
            owner: string;
          }>
        >,
        { menu },
        { date },
      ) as Promise<Frames>);

      // Check if menu date is within cart's week
      for (const cartDatesFrame of cartDatesFrames) {
        const cartDatesFrameRecord = cartDatesFrame as Record<symbol, unknown>;
        const startDateValue = cartDatesFrameRecord[startDate];
        const endDateValue = cartDatesFrameRecord[endDate];

        if (
          !(startDateValue instanceof Date) ||
          !(endDateValue instanceof Date)
        ) {
          continue;
        }

        for (const menuFrame of menuFrames) {
          const menuFrameRecord = menuFrame as Record<symbol, unknown>;
          const dateValue = menuFrameRecord[date];

          if (!(dateValue instanceof Date)) {
            continue;
          }

          // Normalize dates for comparison
          const normalizedMenuDate = new Date(dateValue);
          normalizedMenuDate.setUTCHours(0, 0, 0, 0);

          const normalizedStartDate = new Date(startDateValue);
          normalizedStartDate.setUTCHours(0, 0, 0, 0);

          const normalizedEndDate = new Date(endDateValue);
          normalizedEndDate.setUTCHours(0, 0, 0, 0);

          // If menuDate is within the cart's week, include this frame
          if (
            normalizedMenuDate >= normalizedStartDate &&
            normalizedMenuDate <= normalizedEndDate
          ) {
            resultFrames.push({
              ...frame, // Include original frame to preserve menu, cart, and other symbols
              ...cartDatesFrame,
              ...menuFrame,
            });
          }
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.addMenuToCart,
    { menu, menuDate: date },
  ]),
});

// ============================================================================
// RemoveMenuOnMenuDelete Sync
// When a menu is deleted, remove it from its cart
// ============================================================================

export const RemoveMenuOnMenuDelete: Sync = ({
  menu,
}) => ({
  when: actions(
    [MenuCollection.deleteMenu, { menu }, {}],
  ),
  where: async (frames) => {
    // Check if menu is in a cart before attempting removal
    const resultFrames = new Frames();
    for (const frame of frames) {
      const cartFrames = await (new Frames(frame).query(
        WeeklyCart._getCartWithMenu as unknown as (
          input: { menu: string },
        ) => Promise<Array<{ cart: string }>>,
        { menu },
        {},
      ) as Promise<Frames>);

      // Only proceed if menu is in a cart (cartFrames has results)
      // If cartFrames is empty, menu wasn't in a cart, so we don't need to remove it
      if (cartFrames.length > 0) {
        resultFrames.push(frame);
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.removeMenuFromCart,
    { menu },
  ]),
});

// ============================================================================
// EnsureCartExistsOnMenuDateChange Sync
// When a menu's date is updated, ensure a cart exists for the new week
// ============================================================================

export const EnsureCartExistsOnMenuDateChange: Sync = ({
  menu,
  date,
  newDate,
  cart,
}) => ({
  when: actions(
    [
      MenuCollection.updateMenu,
      { menu, date },
      {},
    ],
  ),
  where: async (frames) => {
    // Filter frames where date parameter was provided (indicates date change)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const dateValue = frameRecord[date];
      return dateValue !== undefined && dateValue !== null &&
        dateValue instanceof Date;
    });

    if (frames.length === 0) {
      return new Frames(); // No date change, return empty frames
    }

    // Get menu's new date and check if cart exists
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Use the date from the frame (already set by updateMenu action)
      const frameRecord = frame as Record<symbol, unknown>;
      const newDateValue = frameRecord[date];

      if (!(newDateValue instanceof Date)) {
        continue;
      }

      // Check if cart exists for the new date
      const cartFrames = await (new Frames(frame).query(
        WeeklyCart._getCartByDate as unknown as (
          input: { date: Date },
        ) => Promise<Array<{ cart: string }>>,
        { date: newDateValue },
        { cart },
      ) as Promise<Frames>);

      // Only create cart if it doesn't exist
      if (cartFrames.length === 0) {
        resultFrames.push(frame);
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.createCart,
    { dateInWeek: date },
  ]),
});

// ============================================================================
// MoveMenuOnMenuDateChange Sync
// When a menu's date is updated, move it to the cart for the new date atomically
// This replaces RemoveMenuOnMenuDateChange and AddMenuOnMenuDateChange
// ============================================================================

export const MoveMenuOnMenuDateChange: Sync = ({
  menu,
  date,
  cart,
}) => ({
  when: actions(
    [
      MenuCollection.updateMenu,
      { menu, date },
      {},
    ],
  ),
  where: async (frames) => {
    // Filter frames where date parameter was provided (indicates date change)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const dateValue = frameRecord[date];
      return dateValue !== undefined && dateValue !== null &&
        dateValue instanceof Date;
    });

    if (frames.length === 0) {
      return new Frames();
    }

    // Check if cart exists for the new date
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const dateValue = frameRecord[date] as Date;
      const menuValue = frameRecord[menu] as string;

      if (!(dateValue instanceof Date) || typeof menuValue !== "string") {
        continue;
      }

      // Check if cart exists for new date
      const cartFrames = await (new Frames(frame).query(
        WeeklyCart._getCartByDate as unknown as (
          input: { date: Date },
        ) => Promise<Array<{ cart: string }>>,
        { date: dateValue },
        { cart },
      ) as Promise<Frames>);

      // Only proceed if cart exists (or will exist after EnsureCartExistsOnMenuDateChange)
      if (cartFrames.length > 0) {
        resultFrames.push({
          ...frame,
          [date]: dateValue,
        });
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.moveMenuToCart,
    { menu, menuDate: date },
  ]),
});

// ============================================================================
// Request Syncs for addMenuToCart
// Handle HTTP requests for adding menus to carts with proper cart creation
// ============================================================================

// AddMenuToCartRequest: Handle request when cart already exists
export const AddMenuToCartRequest: Sync = ({
  request,
  menu,
  menuDate,
  cart,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/WeeklyCart/addMenuToCart",
      menu,
      menuDate,
    },
    { request },
  ]),
  where: async (frames) => {
    // Check if cart exists for the menuDate
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const menuDateValue = frameRecord[menuDate] as Date | undefined;
      if (!(menuDateValue instanceof Date)) {
        continue;
      }

      const cartFrames = await (new Frames(frame).query(
        WeeklyCart._getCartByDate as unknown as (
          input: { date: Date },
        ) => Promise<Array<{ cart: string }>>,
        { date: menuDateValue },
        { cart },
      ) as Promise<Frames>);

      // Only include frames where cart exists
      for (const cartFrame of cartFrames) {
        const cartFrameRecord = cartFrame as Record<symbol, unknown>;
        const cartValue = cartFrameRecord[cart];
        if (typeof cartValue === "string") {
          resultFrames.push(cartFrame);
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.addMenuToCart,
    { menu, menuDate },
  ]),
});

// AddMenuToCartRequestCreateCart: Handle request when cart doesn't exist
export const AddMenuToCartRequestCreateCart: Sync = ({
  request,
  menu,
  menuDate,
  cart,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/WeeklyCart/addMenuToCart",
      menu,
      menuDate,
    },
    { request },
  ]),
  where: async (frames) => {
    // Check if cart exists for the menuDate
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const menuDateValue = frameRecord[menuDate] as Date | undefined;
      if (!(menuDateValue instanceof Date)) {
        continue;
      }

      const cartFrames = await (new Frames(frame).query(
        WeeklyCart._getCartByDate as unknown as (
          input: { date: Date },
        ) => Promise<Array<{ cart: string }>>,
        { date: menuDateValue },
        { cart },
      ) as Promise<Frames>);

      // Only include frames where cart does NOT exist
      if (cartFrames.length === 0) {
        resultFrames.push(frame);
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.createCart,
    { dateInWeek: menuDate },
  ]),
});

// AddMenuToCartAfterCartCreate: Call addMenuToCart after cart is created
export const AddMenuToCartAfterCartCreate: Sync = ({
  request,
  menu,
  menuDate,
  cart,
  startDate,
  endDate,
}) => ({
  when: actions(
    [
      WeeklyCart.createCart,
      {},
      { cart },
    ],
    [
      Requesting.request,
      {
        path: "/WeeklyCart/addMenuToCart",
        menu,
        menuDate,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Match frames where the cart's week contains the menuDate from the request
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const menuDateValue = frameRecord[menuDate] as Date | undefined;
      const cartValue = frameRecord[cart] as string | undefined;

      if (!(menuDateValue instanceof Date) || typeof cartValue !== "string") {
        continue;
      }

      // Get cart's date range
      const cartDatesFrames = await (new Frames(frame).query(
        WeeklyCart._getCartDates as unknown as (
          input: { cart: string },
        ) => Promise<
          Array<{
            startDate: Date;
            endDate: Date;
          }>
        >,
        { cart: cartValue },
        { startDate, endDate },
      ) as Promise<Frames>);

      for (const cartDatesFrame of cartDatesFrames) {
        const cartDatesFrameRecord = cartDatesFrame as Record<
          symbol,
          unknown
        >;
        const startDateValue = cartDatesFrameRecord[startDate];
        const endDateValue = cartDatesFrameRecord[endDate];

        if (
          !(startDateValue instanceof Date) ||
          !(endDateValue instanceof Date)
        ) {
          continue;
        }

        // Normalize dates for comparison
        const normalizedMenuDate = new Date(menuDateValue);
        normalizedMenuDate.setUTCHours(0, 0, 0, 0);

        const normalizedStartDate = new Date(startDateValue);
        normalizedStartDate.setUTCHours(0, 0, 0, 0);

        const normalizedEndDate = new Date(endDateValue);
        normalizedEndDate.setUTCHours(0, 0, 0, 0);

        // If menuDate is within the cart's week, include this frame
        if (
          normalizedMenuDate >= normalizedStartDate &&
          normalizedMenuDate <= normalizedEndDate
        ) {
          resultFrames.push(cartDatesFrame);
        }
      }
    }
    return resultFrames;
  },
  then: actions([
    WeeklyCart.addMenuToCart,
    { menu, menuDate },
  ]),
});

// AddMenuToCartResponse: Respond to successful addMenuToCart requests
export const AddMenuToCartResponse: Sync = ({
  request,
  cart,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/WeeklyCart/addMenuToCart" },
      { request },
    ],
    [WeeklyCart.addMenuToCart, {}, { cart }],
  ),
  then: actions([Requesting.respond, { request, cart }]),
});

// AddMenuToCartResponseError: Respond to failed addMenuToCart requests
export const AddMenuToCartResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/WeeklyCart/addMenuToCart" },
      { request },
    ],
    [WeeklyCart.addMenuToCart, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// AddMenuToCartRequestCartMissing: Respond when cart creation fails
export const AddMenuToCartRequestCartMissing: Sync = ({
  request,
  error,
  prefixedError,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/WeeklyCart/addMenuToCart" },
      { request },
    ],
    [WeeklyCart.createCart, {}, { error }],
  ),
  where: (frames) => {
    // Extract error message and prefix it
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const errorValue = frameRecord[error];
      if (typeof errorValue === "string") {
        resultFrames.push({
          ...frame,
          [prefixedError]:
            `Failed to create cart for menu addition: ${errorValue}`,
        });
      }
    }
    return resultFrames;
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error: prefixedError,
    },
  ]),
});

// ============================================================================
// WeeklyCart Page Bundle Sync
// Single request that returns all data needed for WeeklyCart page
// ============================================================================

export const WeeklyCartPageBundleRequest: Sync = ({
  request,
  cartId,
  weekStart,
  cart,
  week,
  menus,
  aggregatedIngredients,
  optimalPurchase,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/WeeklyCart/_getWeeklyCartPageBundle", cartId, weekStart },
    { request },
  ]),
  where: async (frames) => {
    const resultFrames = new Frames();
    for (const frame of frames) {
      const record = frame as Record<symbol, unknown>;
      const cartIdValue = record[cartId];
      const weekStartValue = record[weekStart];
      if (
        typeof cartIdValue !== "string" || typeof weekStartValue !== "string"
      ) {
        resultFrames.push({
          ...frame,
          [cart]: null,
          [week]: null,
          [menus]: [],
          [aggregatedIngredients]: [],
          [optimalPurchase]: { atomicOrders: [] },
        });
        continue;
      }

      const cartIdTyped = cartIdValue as ID;
      const normalizedWeekStart = normalizeDateString(weekStartValue);
      if (!normalizedWeekStart) {
        resultFrames.push({
          ...frame,
          [cart]: null,
          [week]: null,
          [menus]: [],
          [aggregatedIngredients]: [],
          [optimalPurchase]: { atomicOrders: [] },
        });
        continue;
      }

      const cartDatesResult = await WeeklyCart._getCartDates({
        cart: cartIdTyped,
      });
      if (!Array.isArray(cartDatesResult) || "error" in cartDatesResult) {
        resultFrames.push({
          ...frame,
          [cart]: null,
          [week]: null,
          [menus]: [],
          [aggregatedIngredients]: [],
          [optimalPurchase]: { atomicOrders: [] },
        });
        continue;
      }

      const { startDate, endDate } = cartDatesResult[0];
      const cartWeekStart = toDateOnlyString(startDate);
      const cartWeekEnd = toDateOnlyString(endDate);
      if (cartWeekStart !== normalizedWeekStart) {
        resultFrames.push({
          ...frame,
          [cart]: null,
          [week]: null,
          [menus]: [],
          [aggregatedIngredients]: [],
          [optimalPurchase]: { atomicOrders: [] },
        });
        continue;
      }

      const cartOrderResult = await PurchaseSystem._getOrderByAssociateID({
        associateID: cartIdTyped,
      });

      let cartCompositeOrderId: string | null = null;
      if (Array.isArray(cartOrderResult)) {
        for (const orderResult of cartOrderResult) {
          const orderValue = orderResult.order as unknown as
            | Record<string, unknown>
            | undefined;
          if (orderValue && "childSelectOrders" in orderValue) {
            cartCompositeOrderId = orderValue._id as string;
            break;
          }
        }
      }

      const menusResult = await WeeklyCart._getMenusInCart({
        cart: cartIdTyped,
      });
      const menuIds = Array.isArray(menusResult) && !("error" in menusResult)
        ? (menusResult as { menus: ID[] }[])[0]?.menus ?? []
        : [];
      const menusPayload: Array<{
        date: string;
        menuId: string;
        menuName: string | null;
        ownerId: string | null;
        ownerName: string | null;
        recipes: Array<{
          recipeId: string;
          name: string;
          scalingFactor: number;
          ingredients: Array<{
            name: string;
            quantity: number;
            units: string;
            note: string;
          }>;
        }>;
      }> = [];

      const menuVersionData: Array<{
        menuId: string;
        date: string;
        recipes: Array<{ recipeId: string; scalingFactor: number }>;
      }> = [];

      const recipeVersionMap = new Map<string, {
        recipeId: string;
        name: string;
        ingredients: Array<{ name: string; quantity: number; units: string }>;
      }>();

      const aggregateMap = new Map<string, {
        name: string;
        units: string;
        totalQuantity: number;
      }>();

      for (const menuIdValue of menuIds) {
        const menuIdTyped = menuIdValue as ID;
        const menuDetailsResult = await MenuCollection._getMenuDetails({
          menu: menuIdTyped,
        });
        if (!Array.isArray(menuDetailsResult) || "error" in menuDetailsResult) {
          continue;
        }

        const menuDate = toDateOnlyString(menuDetailsResult[0].date);
        const menuName = menuDetailsResult[0].name ?? null;
        const ownerId = menuDetailsResult[0].owner ?? null;
        let ownerName: string | null = null;
        if (ownerId) {
          const ownerNameResult = await UserAuthentication._getUsername({
            user: ownerId,
          });
          if (!("error" in ownerNameResult)) {
            ownerName = ownerNameResult.username ?? null;
          }
        }
        const menuRecipesResult = await MenuCollection._getRecipesInMenu({
          menu: menuIdTyped,
        });
        if (!Array.isArray(menuRecipesResult) || "error" in menuRecipesResult) {
          continue;
        }

        const menuRecipes = menuRecipesResult[0].menuRecipes || {};
        const recipesPayload: Array<{
          recipeId: string;
          name: string;
          scalingFactor: number;
          ingredients: Array<{
            name: string;
            quantity: number;
            units: string;
            note: string;
          }>;
        }> = [];

        const menuRecipeScales: Array<{
          recipeId: string;
          scalingFactor: number;
        }> = [];

        for (
          const [recipeId, scalingFactorRaw] of Object.entries(menuRecipes)
        ) {
          const recipeIdTyped = recipeId as ID;
          const scalingFactor = typeof scalingFactorRaw === "number"
            ? scalingFactorRaw
            : 1;
          menuRecipeScales.push({ recipeId, scalingFactor });

          const recipeDetailsResult = await CookBook._getRecipeDetails({
            recipe: recipeIdTyped,
          });
          if (
            !Array.isArray(recipeDetailsResult) ||
            "error" in recipeDetailsResult
          ) {
            continue;
          }
          const recipeName = recipeDetailsResult[0].name;

          const recipeIngredientsResult = await CookBook._getRecipeIngredients({
            recipe: recipeIdTyped,
          });
          if (
            !Array.isArray(recipeIngredientsResult) ||
            "error" in recipeIngredientsResult
          ) {
            continue;
          }

          const ingredients = recipeIngredientsResult[0].ingredients ?? [];
          recipesPayload.push({
            recipeId,
            name: recipeName,
            scalingFactor: scalingFactor,
            ingredients: ingredients.map((ing) => ({
              name: ing.name,
              quantity: ing.quantity,
              units: ing.units,
              note: "",
            })),
          });

          if (!recipeVersionMap.has(recipeId)) {
            recipeVersionMap.set(recipeId, {
              recipeId,
              name: recipeName,
              ingredients: ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity,
                units: ing.units,
              })),
            });
          }

          for (const ingredient of ingredients) {
            const name = ingredient.name.trim();
            const units = ingredient.units;
            const baseUnits = ingredient.units; // Placeholder; will be normalized later if needed
            const totalQuantity = ingredient.quantity * scalingFactor;
            const key = `${name}||${baseUnits}`;
            const existing = aggregateMap.get(key);
            if (existing) {
              existing.totalQuantity += totalQuantity;
            } else {
              aggregateMap.set(key, {
                name,
                units: baseUnits,
                totalQuantity,
              });
            }
          }
        }
        recipesPayload.sort((a, b) => a.recipeId.localeCompare(b.recipeId));
        menuRecipeScales.sort((a, b) => a.recipeId.localeCompare(b.recipeId));
        menusPayload.push({
          date: menuDate,
          menuId: menuIdValue,
          menuName,
          ownerId,
          ownerName,
          recipes: recipesPayload,
        });
        menuVersionData.push({
          menuId: menuIdValue,
          date: menuDate,
          recipes: menuRecipeScales,
        });
      }

      menusPayload.sort((a, b) =>
        a.date === b.date
          ? a.menuId.localeCompare(b.menuId)
          : a.date.localeCompare(b.date)
      );
      menuVersionData.sort((a, b) =>
        a.date === b.date
          ? a.menuId.localeCompare(b.menuId)
          : a.date.localeCompare(b.date)
      );

      const aggregatedList = Array.from(aggregateMap.values())
        .sort((a, b) =>
          a.name === b.name
            ? a.units.localeCompare(b.units)
            : a.name.localeCompare(b.name)
        );

      const purchaseOptionDetailsCache = new Map<string, {
        quantity: number;
        units: string;
        price: number;
        store: string;
        confirmed: boolean;
      }>();
      const purchaseOptionItemCache = new Map<string, string>();
      const atomicOrderByPurchaseOption = new Map<string, {
        atomicOrderId: string;
        quantity: number;
        units: string;
        price: number;
      }>();
      const atomicOrderDetailsById = new Map<string, {
        purchaseOptionId: string;
        itemId: string;
        quantity: number;
        units: string;
        price: number;
      }>();

      const aggregatedPayload: Array<{
        name: string;
        totalQuantity: number;
        units: string;
        catalogItem: null | {
          itemId: string;
          purchaseOptions: Array<{
            purchaseOptionId: string;
            quantity: number;
            units: string;
            price: number;
            store: string;
            confirmed: boolean;
            atomicOrderId: string | null;
            atomicOrder: null | {
              quantity: number;
              units: string;
              price: number;
            };
          }>;
        };
      }> = [];

      const nameToItemId = new Map<string, string>();

      for (const ingredient of aggregatedList) {
        const itemResult = await StoreCatalog._getItemByName({
          name: ingredient.name,
        });
        if (!Array.isArray(itemResult) || "error" in itemResult) {
          aggregatedPayload.push({
            ...ingredient,
            catalogItem: null,
          });
          continue;
        }

        const itemIdValue = itemResult[0].item as ID;
        nameToItemId.set(ingredient.name, itemIdValue);
        const itemPurchaseOptionsResult = await StoreCatalog
          ._getItemPurchaseOptions({
            item: itemIdValue,
          });
        const purchaseOptions = Array.isArray(itemPurchaseOptionsResult) &&
            !("error" in itemPurchaseOptionsResult)
          ? itemPurchaseOptionsResult[0].purchaseOptions
          : [];

        const purchaseOptionsPayload: Array<{
          purchaseOptionId: string;
          quantity: number;
          units: string;
          price: number;
          store: string;
          confirmed: boolean;
          atomicOrderId: string | null;
          atomicOrder: null | {
            quantity: number;
            units: string;
            price: number;
          };
        }> = [];

        for (const purchaseOptionId of purchaseOptions) {
          purchaseOptionItemCache.set(purchaseOptionId, itemIdValue);
          let details = purchaseOptionDetailsCache.get(purchaseOptionId);
          if (!details) {
            const detailsResult = await StoreCatalog._getPurchaseOptionDetails({
              purchaseOption: purchaseOptionId as ID,
            });
            if (Array.isArray(detailsResult) && !("error" in detailsResult)) {
              details = detailsResult[0];
              purchaseOptionDetailsCache.set(purchaseOptionId, details);
            }
          }

          let atomicOrderId: string | null = null;
          let atomicOrderDetails: null | {
            quantity: number;
            units: string;
            price: number;
          } = null;
          if (details) {
            const atomicOrderResult = await PurchaseSystem
              ._getOrderByAssociateID({
                associateID: purchaseOptionId as ID,
              });
            if (Array.isArray(atomicOrderResult)) {
              for (const orderResult of atomicOrderResult) {
                const orderValue = orderResult.order as unknown as
                  | Record<string, unknown>
                  | undefined;
                if (orderValue && "parentOrder" in orderValue) {
                  atomicOrderId = orderValue._id as string;
                  atomicOrderDetails = {
                    quantity: orderValue.quantity as number,
                    units: orderValue.units as string,
                    price: orderValue.price as number,
                  };
                  atomicOrderByPurchaseOption.set(purchaseOptionId, {
                    atomicOrderId,
                    ...atomicOrderDetails,
                  });
                  atomicOrderDetailsById.set(atomicOrderId, {
                    purchaseOptionId,
                    itemId: itemIdValue,
                    ...atomicOrderDetails,
                  });
                  break;
                }
              }
            }
          }

          if (details) {
            purchaseOptionsPayload.push({
              purchaseOptionId,
              quantity: details.quantity,
              units: details.units,
              price: details.price,
              store: details.store,
              confirmed: details.confirmed,
              atomicOrderId,
              atomicOrder: atomicOrderDetails,
            });
          }
        }

        purchaseOptionsPayload.sort((a, b) =>
          a.purchaseOptionId.localeCompare(b.purchaseOptionId)
        );

        aggregatedPayload.push({
          ...ingredient,
          catalogItem: {
            itemId: itemIdValue,
            purchaseOptions: purchaseOptionsPayload,
          },
        });
      }

      const optimalPurchaseResult = cartCompositeOrderId
        ? await PurchaseSystem._getOptimalPurchase({
          compositeOrder: cartCompositeOrderId as ID,
        })
        : { error: "Composite order not found." };
      const optimalPurchaseAtomicOrders: Array<{
        atomicOrderId: string;
        purchaseOptionId: string | null;
        itemId: string | null;
        quantity: number | null;
        units: string | null;
        price: number | null;
      }> = [];

      if (
        Array.isArray(optimalPurchaseResult) &&
        !("error" in optimalPurchaseResult)
      ) {
        const optimalMap = optimalPurchaseResult[0].optimalPurchase ?? {};
        for (const atomicOrderId of Object.keys(optimalMap)) {
          const details = atomicOrderDetailsById.get(atomicOrderId);
          if (details) {
            optimalPurchaseAtomicOrders.push({
              atomicOrderId,
              purchaseOptionId: details.purchaseOptionId,
              itemId: details.itemId,
              quantity: details.quantity,
              units: details.units,
              price: details.price,
            });
          } else {
            optimalPurchaseAtomicOrders.push({
              atomicOrderId,
              purchaseOptionId: null,
              itemId: null,
              quantity: null,
              units: null,
              price: null,
            });
          }
        }
      }

      optimalPurchaseAtomicOrders.sort((a, b) =>
        a.atomicOrderId.localeCompare(b.atomicOrderId)
      );

      // Normalize aggregated ingredient quantities and units to the units of the
      // chosen optimal purchase option for that item (when available) so the
      // frontend does not need to do conversions.
      const baseUnitByItemId = new Map<string, string>();
      for (const entry of optimalPurchaseAtomicOrders) {
        if (entry.itemId && entry.units) {
          baseUnitByItemId.set(entry.itemId, entry.units);
        }
      }

      const normalizedAggregatedMap = new Map<string, {
        name: string;
        totalQuantity: number;
        units: string;
        catalogItem: null | {
          itemId: string;
          purchaseOptions: Array<{
            purchaseOptionId: string;
            quantity: number;
            units: string;
            price: number;
            store: string;
            confirmed: boolean;
            atomicOrderId: string | null;
            atomicOrder: null | {
              quantity: number;
              units: string;
              price: number;
            };
          }>;
        };
      }>();

      for (const entry of aggregatedPayload) {
        const itemIdValue = entry.catalogItem?.itemId ?? null;
        const baseUnit = itemIdValue ? baseUnitByItemId.get(itemIdValue) : null;

        let targetUnits = entry.units;
        let targetQuantity = entry.totalQuantity;

        if (baseUnit && baseUnit !== entry.units) {
          const converted = convertWithinCategory(
            entry.totalQuantity,
            entry.units,
            baseUnit,
          );
          if (converted !== null && Number.isFinite(converted)) {
            targetUnits = baseUnit;
            targetQuantity = converted;
          }
        }

        const key = `${entry.name}||${targetUnits}`;
        const existing = normalizedAggregatedMap.get(key);
        if (existing) {
          existing.totalQuantity += targetQuantity;
        } else {
          normalizedAggregatedMap.set(key, {
            name: entry.name,
            totalQuantity: targetQuantity,
            units: targetUnits,
            catalogItem: entry.catalogItem,
          });
        }
      }

      const normalizedAggregatedList = Array.from(
        normalizedAggregatedMap.values(),
      )
        .sort((a, b) =>
          a.name === b.name
            ? a.units.localeCompare(b.units)
            : a.name.localeCompare(b.name)
        );

      // Normalize recipe ingredient units in menusPayload to the same base units,
      // so frontend consumers of menus[*].recipes[*].ingredients[*] see
      // purchase-option units rather than raw recipe units.
      for (const menu of menusPayload) {
        for (const recipe of menu.recipes) {
          for (const ingredient of recipe.ingredients) {
            const itemIdValue = nameToItemId.get(ingredient.name);
            if (!itemIdValue) continue;
            const baseUnit = baseUnitByItemId.get(itemIdValue);
            if (!baseUnit || baseUnit === ingredient.units) continue;

            const converted = convertWithinCategory(
              ingredient.quantity,
              ingredient.units,
              baseUnit,
            );
            if (converted !== null && Number.isFinite(converted)) {
              ingredient.quantity = converted;
              ingredient.units = baseUnit;
            }
          }
        }
      }

      resultFrames.push({
        ...frame,
        [cart]: cartCompositeOrderId
          ? { id: cartIdValue, compositeOrderId: cartCompositeOrderId }
          : { id: cartIdValue, compositeOrderId: null },
        [week]: { start: cartWeekStart, end: cartWeekEnd },
        [menus]: menusPayload,
        [aggregatedIngredients]: normalizedAggregatedList,
        [optimalPurchase]: { atomicOrders: optimalPurchaseAtomicOrders },
      });
    }
    return resultFrames;
  },
  then: actions([
    Requesting.respond,
    {
      request,
      cart,
      week,
      menus,
      aggregatedIngredients,
      optimalPurchase,
    },
  ]),
});
