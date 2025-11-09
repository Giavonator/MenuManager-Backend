import { actions, Frames, Sync } from "@engine";
import { Requesting, StoreCatalog, UserAuthentication } from "@concepts";

// ============================================================================
// deleteItem Syncs
// Authorization: Admin only if item has confirmed POs, anyone if no confirmed POs
// ============================================================================

export const DeleteItemRequest: Sync = ({
  request,
  item,
  session,
  isAdmin,
  purchaseOptions: pos,
  purchaseOption: po,
  confirmed: poConfirmed,
  hasConfirmedPOs,
}) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/deleteItem", item, session }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Extract user from session in each frame (session IS the user ID)
    // Map each frame to use the session value as the user for the admin query
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status using the session value as the user ID
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and add to result
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean") {
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    frames = adminCheckedFrames;

    // Get all purchase options for the item
    frames = await (frames.query(
      StoreCatalog._getItemPurchaseOptions as unknown as (
        input: { item: string },
      ) => Promise<Array<{ purchaseOptions: string[] }>>,
      { item },
      { purchaseOptions: pos },
    ) as Promise<Frames>);

    // Process each frame to check if item has confirmed purchase options
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const options = frameRecord[pos] as string[] | undefined;

      // If no purchase options, item has no confirmed POs
      if (!options || options.length === 0) {
        resultFrames.push({
          ...frame,
          [hasConfirmedPOs]: false,
        });
        continue;
      }

      // Check each purchase option to see if any are confirmed
      let itemHasConfirmed = false;
      for (const option of options) {
        // Create a new frame with the purchase option set
        const poFrame: Record<symbol, unknown> = {};
        // Copy all symbol properties from the original frame
        const symbols = Object.getOwnPropertySymbols(frame);
        for (const sym of symbols) {
          poFrame[sym] = (frame as Record<symbol, unknown>)[sym];
        }
        // Set the purchase option for this check
        poFrame[po] = option;

        const checkedFrames = await (new Frames(poFrame).query(
          StoreCatalog._getPurchaseOptionDetails as unknown as (
            input: { purchaseOption: string },
          ) => Promise<Array<{ confirmed: boolean }>>,
          { purchaseOption: po },
          { confirmed: poConfirmed },
        ) as Promise<Frames>);

        const hasConfirmedPO = checkedFrames.some((f) => {
          const conf = (f as Record<symbol, unknown>)[poConfirmed];
          return conf === true;
        });

        if (hasConfirmedPO) {
          itemHasConfirmed = true;
          break;
        }
      }

      // Add frame with hasConfirmedPOs flag
      resultFrames.push({
        ...frame,
        [hasConfirmedPOs]: itemHasConfirmed,
      });
    }

    // Authorization: allow if (no confirmed POs) OR (user is admin)
    return resultFrames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const userIsAdmin = frameRecord[isAdmin] === true;
      const itemHasConfirmed = frameRecord[hasConfirmedPOs] === true;
      return !itemHasConfirmed || userIsAdmin;
    });
  },
  then: actions([StoreCatalog.deleteItem, { item }]),
});

export const DeleteItemResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/deleteItem" }, { request }],
    [StoreCatalog.deleteItem, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const DeleteItemResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/deleteItem" }, { request }],
    [StoreCatalog.deleteItem, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const DeleteItemAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/deleteItem", session }, {
      request,
    }],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// addPurchaseOption Syncs
// Authorization: Admin only if item already has confirmed POs, anyone if no confirmed POs
// ============================================================================

export const AddPurchaseOptionRequest: Sync = ({
  request,
  item,
  session,
  quantity,
  units,
  price,
  store,
  isAdmin,
  purchaseOptions: pos,
  purchaseOption: po,
  confirmed: poConfirmed,
  hasConfirmedPOs,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/StoreCatalog/addPurchaseOption",
        item,
        session,
        quantity,
        units,
        price,
        store,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Extract user from session in each frame (session IS the user ID)
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status using the session value as the user ID
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and add to result
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean") {
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    frames = adminCheckedFrames;

    // Get all purchase options for the item
    frames = await (frames.query(
      StoreCatalog._getItemPurchaseOptions as unknown as (
        input: { item: string },
      ) => Promise<Array<{ purchaseOptions: string[] }>>,
      { item },
      { purchaseOptions: pos },
    ) as Promise<Frames>);

    // Process each frame to check if item has confirmed purchase options
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const options = frameRecord[pos] as string[] | undefined;

      // If no purchase options, item has no confirmed POs
      if (!options || options.length === 0) {
        resultFrames.push({
          ...frame,
          [hasConfirmedPOs]: false,
        });
        continue;
      }

      // Check each purchase option to see if any are confirmed
      let itemHasConfirmed = false;
      for (const option of options) {
        // Create a new frame with the purchase option set
        const poFrame: Record<symbol, unknown> = {};
        // Copy all symbol properties from the original frame
        const symbols = Object.getOwnPropertySymbols(frame);
        for (const sym of symbols) {
          poFrame[sym] = (frame as Record<symbol, unknown>)[sym];
        }
        // Set the purchase option for this check
        poFrame[po] = option;

        const checkedFrames = await (new Frames(poFrame).query(
          StoreCatalog._getPurchaseOptionDetails as unknown as (
            input: { purchaseOption: string },
          ) => Promise<Array<{ confirmed: boolean }>>,
          { purchaseOption: po },
          { confirmed: poConfirmed },
        ) as Promise<Frames>);

        const hasConfirmedPO = checkedFrames.some((f) => {
          const conf = (f as Record<symbol, unknown>)[poConfirmed];
          return conf === true;
        });

        if (hasConfirmedPO) {
          itemHasConfirmed = true;
          break;
        }
      }

      // Add frame with hasConfirmedPOs flag
      resultFrames.push({
        ...frame,
        [hasConfirmedPOs]: itemHasConfirmed,
      });
    }

    // Authorization: allow if (no confirmed POs) OR (user is admin)
    return resultFrames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const userIsAdmin = frameRecord[isAdmin] === true;
      const itemHasConfirmed = frameRecord[hasConfirmedPOs] === true;
      return !itemHasConfirmed || userIsAdmin;
    });
  },
  then: actions([StoreCatalog.addPurchaseOption, {
    item,
    quantity,
    units,
    price,
    store,
  }]),
});

export const AddPurchaseOptionResponse: Sync = ({
  request,
  purchaseOption,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/addPurchaseOption" },
      { request },
    ],
    [StoreCatalog.addPurchaseOption, {}, { purchaseOption }],
  ),
  then: actions([Requesting.respond, { request, purchaseOption }]),
});

export const AddPurchaseOptionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/addPurchaseOption" },
      { request },
    ],
    [StoreCatalog.addPurchaseOption, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const AddPurchaseOptionAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/addPurchaseOption", session }, {
      request,
    }],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// updatePurchaseOption Syncs
// Authorization: Admin only for confirmed POs, anyone for non-confirmed
// ============================================================================

export const UpdatePurchaseOptionRequest: Sync = ({
  request,
  purchaseOption,
  session,
  quantity,
  units,
  price,
  store,
  isAdmin,
  confirmed: poConfirmed,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/StoreCatalog/updatePurchaseOption",
        purchaseOption,
        session,
        quantity,
        units,
        price,
        store,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Extract user from session in each frame (session IS the user ID)
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status using the session value as the user ID
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and add to result
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean") {
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    frames = adminCheckedFrames;

    // Get purchase option details to check if it's confirmed
    frames = await (frames.query(
      StoreCatalog._getPurchaseOptionDetails as unknown as (
        input: { purchaseOption: string },
      ) => Promise<Array<{ confirmed: boolean }>>,
      { purchaseOption },
      { confirmed: poConfirmed },
    ) as Promise<Frames>);

    // Filter out frames with errors (PO not found)
    frames = frames.filter((frame) => {
      const conf = (frame as Record<symbol, unknown>)[poConfirmed];
      return typeof conf === "boolean";
    });

    // Authorization: allow if (PO not confirmed) OR (user is admin)
    return frames.filter((frame) => {
      const userIsAdmin = (frame as Record<symbol, unknown>)[isAdmin] ===
        true;
      const isConfirmed = (frame as Record<symbol, unknown>)[poConfirmed] ===
        true;
      return !isConfirmed || userIsAdmin;
    });
  },
  then: actions([
    StoreCatalog.updatePurchaseOption,
    { purchaseOption, quantity, units, price, store },
  ]),
});

export const UpdatePurchaseOptionResponse: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/updatePurchaseOption" },
      { request },
    ],
    [StoreCatalog.updatePurchaseOption, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const UpdatePurchaseOptionResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/updatePurchaseOption" },
      { request },
    ],
    [StoreCatalog.updatePurchaseOption, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const UpdatePurchaseOptionAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/StoreCatalog/updatePurchaseOption",
      session,
    }, {
      request,
    }],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// removePurchaseOption Syncs
// Authorization: Admin only for confirmed POs, anyone for non-confirmed
// ============================================================================

export const RemovePurchaseOptionRequest: Sync = ({
  request,
  item,
  purchaseOption,
  session,
  isAdmin,
  confirmed: poConfirmed,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/StoreCatalog/removePurchaseOption",
        item,
        purchaseOption,
        session,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Extract user from session in each frame (session IS the user ID)
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status using the session value as the user ID
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and add to result
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean") {
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    frames = adminCheckedFrames;

    // Get purchase option details to check if it's confirmed
    frames = await (frames.query(
      StoreCatalog._getPurchaseOptionDetails as unknown as (
        input: { purchaseOption: string },
      ) => Promise<Array<{ confirmed: boolean }>>,
      { purchaseOption },
      { confirmed: poConfirmed },
    ) as Promise<Frames>);

    // Filter out frames with errors (PO not found)
    frames = frames.filter((frame) => {
      const conf = (frame as Record<symbol, unknown>)[poConfirmed];
      return typeof conf === "boolean";
    });

    // Authorization: allow if (PO not confirmed) OR (user is admin)
    return frames.filter((frame) => {
      const userIsAdmin = (frame as Record<symbol, unknown>)[isAdmin] ===
        true;
      const isConfirmed = (frame as Record<symbol, unknown>)[poConfirmed] ===
        true;
      return !isConfirmed || userIsAdmin;
    });
  },
  then: actions([StoreCatalog.removePurchaseOption, { item, purchaseOption }]),
});

export const RemovePurchaseOptionResponse: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/removePurchaseOption" },
      { request },
    ],
    [StoreCatalog.removePurchaseOption, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const RemovePurchaseOptionResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/removePurchaseOption" },
      { request },
    ],
    [StoreCatalog.removePurchaseOption, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const RemovePurchaseOptionAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/StoreCatalog/removePurchaseOption",
      session,
    }, {
      request,
    }],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// confirmPurchaseOption Syncs
// Authorization: Admin only
// ============================================================================

export const ConfirmPurchaseOptionRequest: Sync = ({
  request,
  purchaseOption,
  session,
  isAdmin,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/confirmPurchaseOption", purchaseOption, session },
      { request },
    ],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Extract user from session in each frame (session IS the user ID)
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status using the session value as the user ID
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and add to result
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean") {
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    frames = adminCheckedFrames;

    // Authorization: only admins can confirm
    return frames.filter((frame) => {
      const adminResult = (frame as Record<symbol, unknown>)[isAdmin];
      return adminResult === true;
    });
  },
  then: actions([StoreCatalog.confirmPurchaseOption, { purchaseOption }]),
});

export const ConfirmPurchaseOptionResponse: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/confirmPurchaseOption" },
      { request },
    ],
    [StoreCatalog.confirmPurchaseOption, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const ConfirmPurchaseOptionResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/StoreCatalog/confirmPurchaseOption" },
      { request },
    ],
    [StoreCatalog.confirmPurchaseOption, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const ConfirmPurchaseOptionAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, {
      path: "/StoreCatalog/confirmPurchaseOption",
      session,
    }, {
      request,
    }],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// updateItemName Syncs
// Authorization: Admin only if item has confirmed POs, anyone if no confirmed POs
// ============================================================================

export const UpdateItemNameRequest: Sync = ({
  request,
  item,
  name,
  session,
  isAdmin,
  purchaseOptions: pos,
  purchaseOption: po,
  confirmed: poConfirmed,
  hasConfirmedPOs,
}) => ({
  when: actions(
    [Requesting.request, {
      path: "/StoreCatalog/updateItemName",
      item,
      name,
      session,
    }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Filter out frames without session (authentication required)
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return typeof sessionValue === "string" && sessionValue.length > 0;
    });

    if (frames.length === 0) {
      return new Frames(); // No valid session, return empty frames
    }

    // Extract user from session in each frame (session IS the user ID)
    // Map each frame to use the session value as the user for the admin query
    const adminCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Query admin status using the session value as the user ID
      const adminFrames = await (new Frames(frame).query(
        UserAuthentication._getIsUserAdmin as unknown as (
          input: { user: string },
        ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
        { user: sessionValue },
        { isAdmin },
      ) as Promise<Frames>);

      // Filter out frames with errors and add to result
      for (const adminFrame of adminFrames) {
        const adminFrameRecord = adminFrame as Record<symbol, unknown>;
        const adminResult = adminFrameRecord[isAdmin];
        if (typeof adminResult === "boolean") {
          adminCheckedFrames.push(adminFrame);
        }
      }
    }
    frames = adminCheckedFrames;

    // Get all purchase options for the item
    frames = await (frames.query(
      StoreCatalog._getItemPurchaseOptions as unknown as (
        input: { item: string },
      ) => Promise<Array<{ purchaseOptions: string[] }>>,
      { item },
      { purchaseOptions: pos },
    ) as Promise<Frames>);

    // Process each frame to check if item has confirmed purchase options
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const options = frameRecord[pos] as string[] | undefined;

      // If no purchase options, item has no confirmed POs
      if (!options || options.length === 0) {
        resultFrames.push({
          ...frame,
          [hasConfirmedPOs]: false,
        });
        continue;
      }

      // Check each purchase option to see if any are confirmed
      let itemHasConfirmed = false;
      for (const option of options) {
        // Create a new frame with the purchase option set
        const poFrame: Record<symbol, unknown> = {};
        // Copy all symbol properties from the original frame
        const symbols = Object.getOwnPropertySymbols(frame);
        for (const sym of symbols) {
          poFrame[sym] = (frame as Record<symbol, unknown>)[sym];
        }
        // Set the purchase option for this check
        poFrame[po] = option;

        const checkedFrames = await (new Frames(poFrame).query(
          StoreCatalog._getPurchaseOptionDetails as unknown as (
            input: { purchaseOption: string },
          ) => Promise<Array<{ confirmed: boolean }>>,
          { purchaseOption: po },
          { confirmed: poConfirmed },
        ) as Promise<Frames>);

        const hasConfirmedPO = checkedFrames.some((f) => {
          const conf = (f as Record<symbol, unknown>)[poConfirmed];
          return conf === true;
        });

        if (hasConfirmedPO) {
          itemHasConfirmed = true;
          break;
        }
      }

      // Add frame with hasConfirmedPOs flag
      resultFrames.push({
        ...frame,
        [hasConfirmedPOs]: itemHasConfirmed,
      });
    }

    // Authorization: allow if (no confirmed POs) OR (user is admin)
    return resultFrames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const userIsAdmin = frameRecord[isAdmin] === true;
      const itemHasConfirmed = frameRecord[hasConfirmedPOs] === true;
      return !itemHasConfirmed || userIsAdmin;
    });
  },
  then: actions([StoreCatalog.updateItemName, { item, name }]),
});

export const UpdateItemNameResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/updateItemName" }, { request }],
    [StoreCatalog.updateItemName, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const UpdateItemNameResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/updateItemName" }, { request }],
    [StoreCatalog.updateItemName, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const UpdateItemNameAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/StoreCatalog/updateItemName", session }, {
      request,
    }],
  ),
  where: (frames) => {
    // Match frames where session is missing or invalid
    return frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      return !sessionValue || typeof sessionValue !== "string" ||
        sessionValue.length === 0;
    });
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error:
        "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});
