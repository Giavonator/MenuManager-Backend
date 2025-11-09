import { actions, Frames, Sync } from "@engine";
import { Requesting, CookBook, UserAuthentication } from "@concepts";

// ============================================================================
// updateRecipe Syncs
// Authorization: Only owner or admin
// ============================================================================

export const UpdateRecipeRequest: Sync = ({
  request,
  recipe,
  session,
  instructions,
  servingQuantity,
  dishType,
  name,
  isAdmin,
  owner,
  requestInput,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/CookBook/updateRecipe",
        recipe,
        session,
        // Optional fields are not included in when clause - they will be bound in where clause
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
      return new Frames();
    }

    // First, query the request input to get all fields from the HTTP request
    // This allows us to access optional fields that weren't in the when clause
    try {
      const framesWithRequestInput = await (frames.query(
        Requesting._getRequestInput as unknown as (
          input: { request: string },
        ) => Promise<
          Array<{ input: { path: string; [key: string]: unknown } }>
        >,
        { request },
        { input: requestInput },
      ) as Promise<Frames>);

      // Filter out frames where request was not found
      const validFrames = framesWithRequestInput.filter((frame) => {
        const frameRecord = frame as Record<symbol, unknown>;
        const input = frameRecord[requestInput] as
          | { path: string; [key: string]: unknown }
          | undefined;
        return input !== undefined && input !== null;
      });

      if (validFrames.length === 0) {
        return new Frames();
      }

      // Extract user from session and get recipe owner
      const authCheckedFrames = new Frames();
      for (const frame of validFrames) {
        const frameRecord = frame as Record<symbol, unknown>;
        const sessionValue = frameRecord[session] as string;
        const input = frameRecord[requestInput] as {
          path: string;
          [key: string]: unknown;
        };
        const recipeValue = frameRecord[recipe] as string;

        // Extract optional fields from the request input
        const instructionsValue = input.instructions;
        const servingQuantityValue = input.servingQuantity;
        const dishTypeValue = input.dishType;
        const nameValue = input.name;

        // Check if at least one update field is present
        const hasInstructions = instructionsValue !== undefined &&
          instructionsValue !== null;
        const hasServingQuantity = servingQuantityValue !== undefined &&
          servingQuantityValue !== null;
        const hasDishType = dishTypeValue !== undefined && dishTypeValue !== null;
        const hasName = nameValue !== undefined && nameValue !== null;

        if (!hasInstructions && !hasServingQuantity && !hasDishType && !hasName) {
          continue;
        }

        // Get recipe details to find owner
        try {
          const recipeFrames = await (new Frames(frame).query(
            CookBook._getRecipeDetails as unknown as (
              input: { recipe: string },
            ) => Promise<
              Array<{
                name: string;
                instructions: string;
                servingQuantity: number;
                dishType: string;
                owner: string;
              }>
            >,
            { recipe },
            { owner },
          ) as Promise<Frames>);

          // Filter out frames with errors (recipe not found)
          for (const recipeFrame of recipeFrames) {
            const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
            const ownerValue = recipeFrameRecord[owner];
            if (typeof ownerValue === "string") {
              // Check if user is admin
              try {
                const adminFrames = await (new Frames(recipeFrame).query(
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
                      // Create new frame with all optional fields explicitly bound
                      // Use null for missing fields (matchThen accepts null but throws on undefined)
                      const newFrame: Record<symbol, unknown> = {
                        ...adminFrame,
                        [instructions]: instructionsValue ?? null,
                        [servingQuantity]: servingQuantityValue ?? null,
                        [dishType]: dishTypeValue ?? null,
                        [name]: nameValue ?? null,
                      };
                      authCheckedFrames.push(newFrame);
                    }
                  }
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[Sync: UpdateRecipeRequest] Error querying admin status:`, errorMessage);
                if (error instanceof Error && error.stack) {
                  console.error(`[Sync: UpdateRecipeRequest] Stack trace:`, error.stack);
                }
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Sync: UpdateRecipeRequest] Error querying recipe details:`, errorMessage);
          if (error instanceof Error && error.stack) {
            console.error(`[Sync: UpdateRecipeRequest] Stack trace:`, error.stack);
          }
        }
      }
      return authCheckedFrames;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Sync: UpdateRecipeRequest] Error in where clause:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[Sync: UpdateRecipeRequest] Stack trace:`, error.stack);
      }
      throw error;
    }
  },
  then: actions([
    CookBook.updateRecipe,
    {
      recipe,
      instructions,
      servingQuantity,
      dishType,
      name,
    },
  ]),
});

export const UpdateRecipeResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/CookBook/updateRecipe" }, { request }],
    [CookBook.updateRecipe, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const UpdateRecipeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/CookBook/updateRecipe" }, { request }],
    [CookBook.updateRecipe, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const UpdateRecipeAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/CookBook/updateRecipe", session }, {
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
// addRecipeIngredient Syncs
// Authorization: Only owner or admin
// ============================================================================

export const AddRecipeIngredientRequest: Sync = ({
  request,
  recipe,
  name,
  quantity,
  units,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/CookBook/addRecipeIngredient",
        recipe,
        name,
        quantity,
        units,
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

    // Extract user from session and get recipe owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get recipe details to find owner
      const recipeFrames = await (new Frames(frame).query(
        CookBook._getRecipeDetails as unknown as (
          input: { recipe: string },
        ) => Promise<
          Array<{
            name: string;
            instructions: string;
            servingQuantity: number;
            dishType: string;
            owner: string;
          }>
        >,
        { recipe },
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (recipe not found)
      for (const recipeFrame of recipeFrames) {
        const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
        const ownerValue = recipeFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(recipeFrame).query(
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
    CookBook.addRecipeIngredient,
    { recipe, name, quantity, units },
  ]),
});

export const AddRecipeIngredientResponse: Sync = ({
  request,
  success,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/addRecipeIngredient" },
      { request },
    ],
    [CookBook.addRecipeIngredient, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const AddRecipeIngredientResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/addRecipeIngredient" },
      { request },
    ],
    [CookBook.addRecipeIngredient, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const AddRecipeIngredientAuthError: Sync = ({ request, session }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/addRecipeIngredient", session },
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

// ============================================================================
// updateRecipeIngredient Syncs
// Authorization: Only owner or admin
// ============================================================================

export const UpdateRecipeIngredientRequest: Sync = ({
  request,
  recipe,
  name,
  quantity,
  units,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/CookBook/updateRecipeIngredient",
        recipe,
        name,
        quantity,
        units,
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

    // Extract user from session and get recipe owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get recipe details to find owner
      const recipeFrames = await (new Frames(frame).query(
        CookBook._getRecipeDetails as unknown as (
          input: { recipe: string },
        ) => Promise<
          Array<{
            name: string;
            instructions: string;
            servingQuantity: number;
            dishType: string;
            owner: string;
          }>
        >,
        { recipe },
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (recipe not found)
      for (const recipeFrame of recipeFrames) {
        const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
        const ownerValue = recipeFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(recipeFrame).query(
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
    CookBook.updateRecipeIngredient,
    { recipe, name, quantity, units },
  ]),
});

export const UpdateRecipeIngredientResponse: Sync = ({
  request,
  success,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/updateRecipeIngredient" },
      { request },
    ],
    [CookBook.updateRecipeIngredient, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const UpdateRecipeIngredientResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/updateRecipeIngredient" },
      { request },
    ],
    [CookBook.updateRecipeIngredient, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const UpdateRecipeIngredientAuthError: Sync = ({
  request,
  session,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/updateRecipeIngredient", session },
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

// ============================================================================
// removeRecipeIngredient Syncs
// Authorization: Only owner or admin
// ============================================================================

export const RemoveRecipeIngredientRequest: Sync = ({
  request,
  recipe,
  name,
  session,
  isAdmin,
  owner,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/CookBook/removeRecipeIngredient",
        recipe,
        name,
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

    // Extract user from session and get recipe owner
    const authCheckedFrames = new Frames();
    for (const frame of frames) {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session] as string;

      // Get recipe details to find owner
      const recipeFrames = await (new Frames(frame).query(
        CookBook._getRecipeDetails as unknown as (
          input: { recipe: string },
        ) => Promise<
          Array<{
            name: string;
            instructions: string;
            servingQuantity: number;
            dishType: string;
            owner: string;
          }>
        >,
        { recipe },
        { owner },
      ) as Promise<Frames>);

      // Filter out frames with errors (recipe not found)
      for (const recipeFrame of recipeFrames) {
        const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
        const ownerValue = recipeFrameRecord[owner];
        if (typeof ownerValue === "string") {
          // Check if user is admin
          const adminFrames = await (new Frames(recipeFrame).query(
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
  then: actions([CookBook.removeRecipeIngredient, { recipe, name }]),
});

export const RemoveRecipeIngredientResponse: Sync = ({
  request,
  success,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/removeRecipeIngredient" },
      { request },
    ],
    [CookBook.removeRecipeIngredient, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const RemoveRecipeIngredientResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/removeRecipeIngredient" },
      { request },
    ],
    [CookBook.removeRecipeIngredient, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const RemoveRecipeIngredientAuthError: Sync = ({
  request,
  session,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/CookBook/removeRecipeIngredient", session },
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

