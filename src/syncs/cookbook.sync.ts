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
    console.log(`[Sync: UpdateRecipeRequest] Starting where clause with ${frames.length} frame(s)`);
    
    // Filter out frames without session (authentication required)
    const initialFrameCount = frames.length;
    frames = frames.filter((frame) => {
      const frameRecord = frame as Record<symbol, unknown>;
      const sessionValue = frameRecord[session];
      const isValid = typeof sessionValue === "string" && sessionValue.length > 0;
      if (!isValid) {
        console.log(`[Sync: UpdateRecipeRequest] Frame filtered out - invalid session: ${sessionValue}`);
      }
      return isValid;
    });
    console.log(`[Sync: UpdateRecipeRequest] After session filtering: ${frames.length}/${initialFrameCount} frame(s)`);

    if (frames.length === 0) {
      console.log(`[Sync: UpdateRecipeRequest] No frames with valid session, returning empty`);
      return new Frames();
    }

    // First, query the request input to get all fields from the HTTP request
    // This allows us to access optional fields that weren't in the when clause
    try {
      console.log(`[Sync: UpdateRecipeRequest] Querying request input for ${frames.length} frame(s)`);
      const requestIds = frames.map(f => {
        const fr = f as Record<symbol, unknown>;
        return fr[request];
      });
      console.log(`[Sync: UpdateRecipeRequest] Request IDs:`, requestIds);
      
      const framesWithRequestInput = await (frames.query(
        Requesting._getRequestInput as unknown as (
          input: { request: string },
        ) => Promise<
          Array<{ input: { path: string; [key: string]: unknown } }>
        >,
        { request },
        { input: requestInput },
      ) as Promise<Frames>);
      console.log(`[Sync: UpdateRecipeRequest] Request input query returned ${framesWithRequestInput.length} frame(s)`);

      // Filter out frames where request was not found
      const validFrames = framesWithRequestInput.filter((frame) => {
        const frameRecord = frame as Record<symbol, unknown>;
        const input = frameRecord[requestInput] as
          | { path: string; [key: string]: unknown }
          | undefined;
        if (input === undefined || input === null) {
          console.log(`[Sync: UpdateRecipeRequest] Frame filtered out - request input not found`);
        }
        return input !== undefined && input !== null;
      });
      console.log(`[Sync: UpdateRecipeRequest] After request input validation: ${validFrames.length} frame(s)`);

      if (validFrames.length === 0) {
        console.log(`[Sync: UpdateRecipeRequest] No valid request input found, returning empty`);
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
        
        console.log(`[Sync: UpdateRecipeRequest] Processing frame - session: ${sessionValue}, recipe: ${recipeValue}`);
        console.log(`[Sync: UpdateRecipeRequest] Request input fields:`, Object.keys(input));

        // Extract optional fields from the request input
        const instructionsValue = input.instructions;
        const servingQuantityValue = input.servingQuantity;
        const dishTypeValue = input.dishType;
        const nameValue = input.name;

        console.log(`[Sync: UpdateRecipeRequest] Optional fields - instructions: ${instructionsValue !== undefined ? 'present' : 'missing'}, servingQuantity: ${servingQuantityValue !== undefined ? 'present' : 'missing'}, dishType: ${dishTypeValue !== undefined ? 'present' : 'missing'}, name: ${nameValue !== undefined ? 'present' : 'missing'}`);

        // Check if at least one update field is present
        const hasInstructions = instructionsValue !== undefined &&
          instructionsValue !== null;
        const hasServingQuantity = servingQuantityValue !== undefined &&
          servingQuantityValue !== null;
        const hasDishType = dishTypeValue !== undefined && dishTypeValue !== null;
        const hasName = nameValue !== undefined && nameValue !== null;

        if (!hasInstructions && !hasServingQuantity && !hasDishType && !hasName) {
          console.log(`[Sync: UpdateRecipeRequest] Frame skipped - no update fields present`);
          continue;
        }
        console.log(`[Sync: UpdateRecipeRequest] Frame has update fields - proceeding with authorization`);

        // Get recipe details to find owner
        try {
          console.log(`[Sync: UpdateRecipeRequest] Querying recipe details for recipe: ${recipeValue}`);
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
          console.log(`[Sync: UpdateRecipeRequest] Recipe query returned ${recipeFrames.length} frame(s)`);

          // Filter out frames with errors (recipe not found)
          for (const recipeFrame of recipeFrames) {
            const recipeFrameRecord = recipeFrame as Record<symbol, unknown>;
            const ownerValue = recipeFrameRecord[owner];
            if (typeof ownerValue === "string") {
              console.log(`[Sync: UpdateRecipeRequest] Recipe owner: ${ownerValue}, session user: ${sessionValue}`);
              
              // Check if user is admin
              try {
                console.log(`[Sync: UpdateRecipeRequest] Querying admin status for user: ${sessionValue}`);
                const adminFrames = await (new Frames(recipeFrame).query(
                  UserAuthentication._getIsUserAdmin as unknown as (
                    input: { user: string },
                  ) => Promise<Array<{ isAdmin: boolean } | { error: string }>>,
                  { user: sessionValue },
                  { isAdmin },
                ) as Promise<Frames>);
                console.log(`[Sync: UpdateRecipeRequest] Admin query returned ${adminFrames.length} frame(s)`);

                // Filter out frames with errors and check authorization
                for (const adminFrame of adminFrames) {
                  const adminFrameRecord = adminFrame as Record<symbol, unknown>;
                  const adminResult = adminFrameRecord[isAdmin];
                  if (typeof adminResult === "boolean") {
                    const userIsAdmin = adminResult === true;
                    const userIsOwner = ownerValue === sessionValue;
                    console.log(`[Sync: UpdateRecipeRequest] Authorization - userIsAdmin: ${userIsAdmin}, userIsOwner: ${userIsOwner}`);
                    
                    // Authorization: allow if (user is owner) OR (user is admin)
                    if (userIsOwner || userIsAdmin) {
                      console.log(`[Sync: UpdateRecipeRequest] Authorization passed - creating frame with update fields`);
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
                    } else {
                      console.log(`[Sync: UpdateRecipeRequest] Authorization failed - user is not owner or admin`);
                    }
                  } else {
                    console.log(`[Sync: UpdateRecipeRequest] Admin query returned non-boolean result:`, adminResult);
                  }
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[Sync: UpdateRecipeRequest] Error querying admin status:`, errorMessage);
                if (error instanceof Error && error.stack) {
                  console.error(`[Sync: UpdateRecipeRequest] Stack trace:`, error.stack);
                }
              }
            } else {
              console.log(`[Sync: UpdateRecipeRequest] Recipe query did not return valid owner:`, ownerValue);
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
      console.log(`[Sync: UpdateRecipeRequest] Where clause completed - returning ${authCheckedFrames.length} frame(s)`);
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

