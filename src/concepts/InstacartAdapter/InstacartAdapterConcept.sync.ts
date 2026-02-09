import { actions, Sync } from "@engine";
import { InstacartAdapter, Requesting } from "@concepts";

// ============================================================================
// createShoppingList Syncs
// Authorization: None required (public endpoint)
// ============================================================================

export const CreateShoppingListRequest: Sync = ({
  request,
  title,
  weekStart,
  linkbackOrigin,
  lineItems,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/Instacart/createShoppingList",
        title,
        weekStart,
        linkbackOrigin,
        lineItems,
      },
      { request },
    ],
  ),
  then: actions([
    InstacartAdapter.createShoppingList,
    { title, weekStart, linkbackOrigin, lineItems },
  ]),
});

export const CreateShoppingListResponse: Sync = ({ request, url }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Instacart/createShoppingList" },
      { request },
    ],
    [InstacartAdapter.createShoppingList, {}, { url }],
  ),
  then: actions([Requesting.respond, { request, url }]),
});

export const CreateShoppingListResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Instacart/createShoppingList" },
      { request },
    ],
    [InstacartAdapter.createShoppingList, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
