import { actions, Frames, Sync } from "@engine";
import { MenuCollection, Requesting, WeeklyCart } from "@concepts";

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
// RemoveMenuOnMenuDateChange Sync
// When a menu's date changes and it was in a cart with a different week,
// remove it from the old cart first
// ============================================================================

export const RemoveMenuOnMenuDateChange: Sync = ({
  menu,
  date,
  currentCart,
  startDate,
  endDate,
  newDate,
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
      return dateValue !== undefined;
    });

    if (frames.length === 0) {
      return new Frames();
    }

    // Process each frame to check if menu needs to be removed from cart
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Get menu's new date
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
        { newDate },
      ) as Promise<Frames>);

      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const newDateValue = menuFrameRecord[newDate];
        if (!(newDateValue instanceof Date)) {
          continue;
        }

        // Check if menu is in a cart
        const cartFrames = await (new Frames(menuFrame).query(
          WeeklyCart._getCartWithMenu as unknown as (
            input: { menu: string },
          ) => Promise<Array<{ cart: string }>>,
          { menu },
          { currentCart },
        ) as Promise<Frames>);

        // If menu is not in a cart, skip removal
        if (cartFrames.length === 0) {
          continue;
        }

        // Menu is in a cart, check if new date is in a different week
        for (const cartFrame of cartFrames) {
          const cartFrameRecord = cartFrame as Record<symbol, unknown>;
          const currentCartValue = cartFrameRecord[currentCart];
          if (typeof currentCartValue !== "string") {
            continue;
          }

          // Get cart's date range
          const cartDatesFrames = await (new Frames(cartFrame).query(
            WeeklyCart._getCartDates as unknown as (
              input: { cart: string },
            ) => Promise<
              Array<{
                startDate: Date;
                endDate: Date;
              }>
            >,
            { cart: currentCartValue },
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
            const normalizedNewDate = new Date(newDateValue);
            normalizedNewDate.setUTCHours(0, 0, 0, 0);

            const normalizedStartDate = new Date(startDateValue);
            normalizedStartDate.setUTCHours(0, 0, 0, 0);

            const normalizedEndDate = new Date(endDateValue);
            normalizedEndDate.setUTCHours(0, 0, 0, 0);

            // If new date is outside the current cart's week, remove from cart
            if (
              normalizedNewDate < normalizedStartDate ||
              normalizedNewDate > normalizedEndDate
            ) {
              resultFrames.push(frame);
            }
          }
        }
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
      return dateValue !== undefined;
    });

    if (frames.length === 0) {
      return new Frames(); // No date change, return empty frames
    }

    // Get menu's new date and check if cart exists
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
        { newDate },
      ) as Promise<Frames>);

      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const newDateValue = menuFrameRecord[newDate];
        if (!(newDateValue instanceof Date)) {
          continue;
        }

        // Check if cart exists for the new date
        const cartFrames = await (new Frames(menuFrame).query(
          WeeklyCart._getCartByDate as unknown as (
            input: { date: Date },
          ) => Promise<Array<{ cart: string }>>,
          { date: newDateValue },
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
    { dateInWeek: newDate },
  ]),
});

// ============================================================================
// AddMenuOnMenuDateChange Sync
// When a menu's date is updated, add it to the cart for the new date
// This handles both: menu not in cart, and menu moved to new week
// ============================================================================

export const AddMenuOnMenuDateChange: Sync = ({
  menu,
  date,
  currentCart,
  startDate,
  endDate,
  newDate,
  newCart,
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
      return dateValue !== undefined;
    });

    if (frames.length === 0) {
      return new Frames(); // No date change, return empty frames
    }

    // Process each frame
    const resultFrames = new Frames();
    for (const frame of frames) {
      // Get menu's new date from menu details
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
        { newDate },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const newDateValue = menuFrameRecord[newDate];
        if (!(newDateValue instanceof Date)) {
          continue;
        }

        // Check if menu is currently in a cart
        const cartFrames = await (new Frames(menuFrame).query(
          WeeklyCart._getCartWithMenu as unknown as (
            input: { menu: string },
          ) => Promise<Array<{ cart: string }>>,
          { menu },
          { currentCart },
        ) as Promise<Frames>);

        // If menu is not in any cart, check if cart exists for new date
        if (cartFrames.length === 0) {
          // Check if cart exists for the new date
          const newCartFrames = await (new Frames(menuFrame).query(
            WeeklyCart._getCartByDate as unknown as (
              input: { date: Date },
            ) => Promise<Array<{ cart: string }>>,
            { date: newDateValue },
            { newCart },
          ) as Promise<Frames>);

          // Only proceed if cart exists (or will exist after EnsureCartExistsOnMenuDateChange)
          if (newCartFrames.length > 0) {
            resultFrames.push({
              ...menuFrame,
              [date]: newDateValue,
            });
          }
          continue;
        }

        // Menu is in a cart, check if new date is in a different week
        for (const cartFrame of cartFrames) {
          const cartFrameRecord = cartFrame as Record<symbol, unknown>;
          const currentCartValue = cartFrameRecord[currentCart];
          if (typeof currentCartValue !== "string") {
            continue;
          }

          // Get cart's date range
          const cartDatesFrames = await (new Frames(cartFrame).query(
            WeeklyCart._getCartDates as unknown as (
              input: { cart: string },
            ) => Promise<
              Array<{
                startDate: Date;
                endDate: Date;
              }>
            >,
            { cart: currentCartValue },
            { startDate, endDate },
          ) as Promise<Frames>);

          // Filter out frames with errors
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
            const normalizedNewDate = new Date(newDateValue);
            normalizedNewDate.setUTCHours(0, 0, 0, 0);

            const normalizedStartDate = new Date(startDateValue);
            normalizedStartDate.setUTCHours(0, 0, 0, 0);

            const normalizedEndDate = new Date(endDateValue);
            normalizedEndDate.setUTCHours(0, 0, 0, 0);

            // If new date is outside the current cart's week, add to new cart
            // If new date is within the current cart's week, do nothing
            if (
              normalizedNewDate < normalizedStartDate ||
              normalizedNewDate > normalizedEndDate
            ) {
              // Week changed, check if cart exists for new date
              const newCartFrames = await (new Frames(cartDatesFrame).query(
                WeeklyCart._getCartByDate as unknown as (
                  input: { date: Date },
                ) => Promise<Array<{ cart: string }>>,
                { date: newDateValue },
                { newCart },
              ) as Promise<Frames>);

              // Only proceed if cart exists (or will exist after EnsureCartExistsOnMenuDateChange)
              if (newCartFrames.length > 0) {
                resultFrames.push({
                  ...cartDatesFrame,
                  [date]: newDateValue,
                });
              }
            }
            // If new date is within the current cart's week, do nothing (menu already in correct cart)
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

// AddMenuAfterMenuDateChangeCart: Call addMenuToCart after cart is created for new date
export const AddMenuAfterMenuDateChangeCart: Sync = ({
  menu,
  date,
  cart,
  startDate,
  endDate,
  newDate,
}) => ({
  when: actions(
    [
      WeeklyCart.createCart,
      {},
      { cart },
    ],
    [
      MenuCollection.updateMenu,
      { menu, date },
      {},
    ],
  ),
  where: async (frames) => {
    // Match frames where the cart was created for the menu's new date
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

      // Get menu's new date
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
        { newDate },
      ) as Promise<Frames>);

      // Check if menu's new date is within cart's week
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
          const dateValue = menuFrameRecord[newDate];

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
              ...cartDatesFrame,
              ...menuFrame,
              [date]: dateValue,
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
