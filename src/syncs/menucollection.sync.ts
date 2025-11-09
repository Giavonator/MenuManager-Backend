import { actions, Frames, Sync } from "@engine";
import { Requesting, MenuCollection, UserAuthentication } from "@concepts";

// ============================================================================
// createMenu Syncs
// Authorization: Anyone authenticated (session required)
// Special: Uses session user as actingUser, concept verifies no menu exists for date
// ============================================================================

export const CreateMenuRequest: Sync = ({
  request,
  name,
  date,
  session,
  actingUser,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/MenuCollection/createMenu",
        name,
        date,
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

    // Add session user as actingUser to each frame
    const resultFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;
      resultFrames.push({
        ...frame,
        [actingUser]: sessionValue,
      });
    }
    return resultFrames;
  },
  then: actions([
    MenuCollection.createMenu,
    { name, date, actingUser },
  ]),
});

export const CreateMenuResponse: Sync = ({ request, menu }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/createMenu" }, { request }],
    [MenuCollection.createMenu, {}, { menu }],
  ),
  then: actions([Requesting.respond, { request, menu }]),
});

export const CreateMenuResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/createMenu" }, { request }],
    [MenuCollection.createMenu, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const CreateMenuAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/createMenu", session }, {
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
      error: "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// updateMenu Syncs
// Authorization: Only owner or admin
// ============================================================================

export const UpdateMenuRequest: Sync = ({
  request,
  menu,
  session,
  name,
  date,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/MenuCollection/updateMenu",
        menu,
        session,
        name,
        date,
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

    // Extract user from session and get menu owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get menu details to find owner
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
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const ownerValue = menuFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(menuFrame).query(
            UserAuthentication._getIsUserAdmin as unknown as (
              input: { user: string },
            ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
            { user: sessionValue },
            { isAdmin },
          ) as Promise<Frames>);

          // Filter out frames with errors and check authorization
          for (const adminFrame of adminFrames) {
            const adminFrameRecord = adminFrame as Record<symbol, unknown>;
            const adminResult = adminFrameRecord[isAdmin];
            if (typeof adminResult === "boolean") {
              const userIsAdmin = adminResult === true;
              const userIsOwner = ownerValue === sessionValue;
              // Authorization: allow if (user is owner) OR (user is admin)
              if (userIsOwner || userIsAdmin) {
                authCheckedFrames.push(adminFrame);
              }
            }
          }
        }
      }
    }
    return authCheckedFrames;
  },
  then: actions([
    MenuCollection.updateMenu,
    { menu, name, date },
  ]),
});

export const UpdateMenuResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/updateMenu" }, { request }],
    [MenuCollection.updateMenu, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const UpdateMenuResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/updateMenu" }, { request }],
    [MenuCollection.updateMenu, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const UpdateMenuAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/updateMenu", session }, {
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
      error: "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// deleteMenu Syncs
// Authorization: Only owner or admin
// ============================================================================

export const DeleteMenuRequest: Sync = ({
  request,
  menu,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/MenuCollection/deleteMenu",
        menu,
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

    // Extract user from session and get menu owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get menu details to find owner
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
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const ownerValue = menuFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(menuFrame).query(
            UserAuthentication._getIsUserAdmin as unknown as (
              input: { user: string },
            ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
            { user: sessionValue },
            { isAdmin },
          ) as Promise<Frames>);

          // Filter out frames with errors and check authorization
          for (const adminFrame of adminFrames) {
            const adminFrameRecord = adminFrame as Record<symbol, unknown>;
            const adminResult = adminFrameRecord[isAdmin];
            if (typeof adminResult === "boolean") {
              const userIsAdmin = adminResult === true;
              const userIsOwner = ownerValue === sessionValue;
              // Authorization: allow if (user is owner) OR (user is admin)
              if (userIsOwner || userIsAdmin) {
                authCheckedFrames.push(adminFrame);
              }
            }
          }
        }
      }
    }
    return authCheckedFrames;
  },
  then: actions([MenuCollection.deleteMenu, { menu }]),
});

export const DeleteMenuResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/deleteMenu" }, { request }],
    [MenuCollection.deleteMenu, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const DeleteMenuResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/deleteMenu" }, { request }],
    [MenuCollection.deleteMenu, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const DeleteMenuAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/deleteMenu", session }, {
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
      error: "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// addRecipe Syncs
// Authorization: Only owner or admin
// ============================================================================

export const AddRecipeRequest: Sync = ({
  request,
  menu,
  recipe,
  scalingFactor,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/MenuCollection/addRecipe",
        menu,
        recipe,
        scalingFactor,
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

    // Extract user from session and get menu owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get menu details to find owner
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
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const ownerValue = menuFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(menuFrame).query(
            UserAuthentication._getIsUserAdmin as unknown as (
              input: { user: string },
            ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
            { user: sessionValue },
            { isAdmin },
          ) as Promise<Frames>);

          // Filter out frames with errors and check authorization
          for (const adminFrame of adminFrames) {
            const adminFrameRecord = adminFrame as Record<symbol, unknown>;
            const adminResult = adminFrameRecord[isAdmin];
            if (typeof adminResult === "boolean") {
              const userIsAdmin = adminResult === true;
              const userIsOwner = ownerValue === sessionValue;
              // Authorization: allow if (user is owner) OR (user is admin)
              if (userIsOwner || userIsAdmin) {
                authCheckedFrames.push(adminFrame);
              }
            }
          }
        }
      }
    }
    return authCheckedFrames;
  },
  then: actions([
    MenuCollection.addRecipe,
    { menu, recipe, scalingFactor },
  ]),
});

export const AddRecipeResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/addRecipe" }, { request }],
    [MenuCollection.addRecipe, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const AddRecipeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/addRecipe" }, { request }],
    [MenuCollection.addRecipe, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const AddRecipeAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/addRecipe", session }, {
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
      error: "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// removeRecipe Syncs
// Authorization: Only owner or admin
// ============================================================================

export const RemoveRecipeRequest: Sync = ({
  request,
  menu,
  recipe,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/MenuCollection/removeRecipe",
        menu,
        recipe,
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

    // Extract user from session and get menu owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get menu details to find owner
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
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const ownerValue = menuFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(menuFrame).query(
            UserAuthentication._getIsUserAdmin as unknown as (
              input: { user: string },
            ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
            { user: sessionValue },
            { isAdmin },
          ) as Promise<Frames>);

          // Filter out frames with errors and check authorization
          for (const adminFrame of adminFrames) {
            const adminFrameRecord = adminFrame as Record<symbol, unknown>;
            const adminResult = adminFrameRecord[isAdmin];
            if (typeof adminResult === "boolean") {
              const userIsAdmin = adminResult === true;
              const userIsOwner = ownerValue === sessionValue;
              // Authorization: allow if (user is owner) OR (user is admin)
              if (userIsOwner || userIsAdmin) {
                authCheckedFrames.push(adminFrame);
              }
            }
          }
        }
      }
    }
    return authCheckedFrames;
  },
  then: actions([MenuCollection.removeRecipe, { menu, recipe }]),
});

export const RemoveRecipeResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/removeRecipe" }, {
      request,
    }],
    [MenuCollection.removeRecipe, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const RemoveRecipeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/removeRecipe" }, {
      request,
    }],
    [MenuCollection.removeRecipe, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const RemoveRecipeAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/MenuCollection/removeRecipe", session }, {
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
      error: "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

// ============================================================================
// changeRecipeScaling Syncs
// Authorization: Only owner or admin
// ============================================================================

export const ChangeRecipeScalingRequest: Sync = ({
  request,
  menu,
  recipe,
  newScalingFactor,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/MenuCollection/changeRecipeScaling",
        menu,
        recipe,
        newScalingFactor,
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

    // Extract user from session and get menu owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get menu details to find owner
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
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (menu not found)
      for (const menuFrame of menuFrames) {
        const menuFrameRecord = menuFrame as Record<symbol, unknown>;
        const ownerValue = menuFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(menuFrame).query(
            UserAuthentication._getIsUserAdmin as unknown as (
              input: { user: string },
            ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
            { user: sessionValue },
            { isAdmin },
          ) as Promise<Frames>);

          // Filter out frames with errors and check authorization
          for (const adminFrame of adminFrames) {
            const adminFrameRecord = adminFrame as Record<symbol, unknown>;
            const adminResult = adminFrameRecord[isAdmin];
            if (typeof adminResult === "boolean") {
              const userIsAdmin = adminResult === true;
              const userIsOwner = ownerValue === sessionValue;
              // Authorization: allow if (user is owner) OR (user is admin)
              if (userIsOwner || userIsAdmin) {
                authCheckedFrames.push(adminFrame);
              }
            }
          }
        }
      }
    }
    return authCheckedFrames;
  },
  then: actions([
    MenuCollection.changeRecipeScaling,
    { menu, recipe, newScalingFactor },
  ]),
});

export const ChangeRecipeScalingResponse: Sync = ({ request, success }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/MenuCollection/changeRecipeScaling" },
      { request },
    ],
    [MenuCollection.changeRecipeScaling, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const ChangeRecipeScalingResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/MenuCollection/changeRecipeScaling" },
      { request },
    ],
    [MenuCollection.changeRecipeScaling, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const ChangeRecipeScalingAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/MenuCollection/changeRecipeScaling", session },
      { request },
    ],
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
      error: "Authentication required. Missing or invalid Authorization header.",
    },
  ]),
});

