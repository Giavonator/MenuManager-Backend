/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  "/api/UserAuthentication/register": "anyone should be able to register",
  "/api/UserAuthentication/authenticate": "everyone must authenticate",
  "/api/UserAuthentication/_getIsUserAdmin": "frontend must know if admin",
  "/api/UserAuthentication/_getListOfUsers": "to get menus from all users",
  "/api/UserAuthentication/_getUsername": "know people by username not just ID",
  "/api/StoreCatalog/createItem": "anyone can create an empty item",
  "/api/StoreCatalog/_getItemByName": "everyone needs to retrieve items",
  "/api/StoreCatalog/_getItemName": "everyone can retrieve item names",
  "/api/StoreCatalog/_getItemByPurchaseOption":
    "everyone needs to know item they are purchasing",
  "/api/StoreCatalog/_getItemPurchaseOptions":
    "everyone must know the cost of items",
  "/api/StoreCatalog/_getPurchaseOptionDetails":
    "everyone must know purchasing details",
  "/api/StoreCatalog/_getAllItems": "everyone must have access to all items",
  "/api/CookBook/createRecipe": "everyone can create a blank recipe",
  "/api/CookBook/duplicateRecipe": "everyone user can copy other recipes",
  "/api/CookBook/_getRecipesOwnedByUser":
    "everyone can view other people's recipes",
  "/api/CookBook/_getRecipeDetails": "everyone has recipe detail access",
  "/api/CookBook/_getRecipeIngredients":
    "everyone has recipe ingredient access",
  "/api/MenuCollection/_getMenuDetails": "everyone has access menu details",
  "/api/MenuCollection/_getRecipesInMenu":
    "everyone has access recipes within a menu",
  "/api/MenuCollection/_getMenusOwnedByUser":
    "everyone can view other people's menus",
  "/api/MenuCollection/_getMenuByDate": "everyone has access to view all menus",
  "/api/WeeklyCart/_getCartDates": "everyone has access to cart dates",
  "/api/WeeklyCart/_getMenusInCart":
    "everyone has access to view menus in carts",
  "/api/WeeklyCart/_getCartByDate": "everyone has access to view carts",
  "/api/WeeklyCart/_getCartWithMenu":
    "everyone has access to find cart by menu",
  "/api/PurchaseSystem/_getOrderByAssociateID": "everyone can view orders",
  "/api/PurchaseSystem/_getOptimalPurchase":
    "everyone can view optimal order purchase",
  "/api/PurchaseSystem/_getOrderCost": "everyone can view order costs",
  "/api/PurchaseSystem/_getSelectOrderDetails":
    "everyone can view select order details",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  "/api/UserAuthentication/deleteUser",
  "/api/UserAuthentication/grantAdmin",
  "/api/UserAuthentication/updatePassword",
  "/api/UserAuthentication/_getNumberOfAdmins",
  "/api/UserAuthentication/_getNumberOfAdminsInternal",
  "/api/StoreCatalog/deleteItem",
  "/api/StoreCatalog/addPurchaseOption",
  "/api/StoreCatalog/updatePurchaseOption",
  "/api/StoreCatalog/removePurchaseOption",
  "/api/StoreCatalog/confirmPurchaseOption",
  "/api/StoreCatalog/updateItemName",
  "/api/CookBook/updateRecipe",
  "/api/CookBook/addRecipeIngredient",
  "/api/CookBook/updateRecipeIngredient",
  "/api/CookBook/removeRecipeIngredient",
  "/api/MenuCollection/createMenu",
  "/api/MenuCollection/updateMenu",
  "/api/MenuCollection/deleteMenu",
  "/api/MenuCollection/addRecipe",
  "/api/MenuCollection/removeRecipe",
  "/api/MenuCollection/changeRecipeScaling",
  "/api/WeeklyCart/createCart",
  "/api/WeeklyCart/deleteCart",
  "/api/WeeklyCart/addMenuToCart",
  "/api/WeeklyCart/removeMenuFromCart",
  "/api/PurchaseSystem/createSelectOrder",
  "/api/PurchaseSystem/deleteSelectOrder",
  "/api/PurchaseSystem/createAtomicOrder",
  "/api/PurchaseSystem/deleteAtomicOrder",
  "/api/PurchaseSystem/updateAtomicOrder",
  "/api/PurchaseSystem/createCompositeOrder",
  "/api/PurchaseSystem/addSelectOrderToCompositeOrder",
  "/api/PurchaseSystem/removeSelectOrderFromCompositeOrder",
  "/api/PurchaseSystem/addCompositeSubOrder",
  "/api/PurchaseSystem/removeCompositeSubOrder",
  "/api/PurchaseSystem/updateSubOrderScaleFactor",
  "/api/PurchaseSystem/deleteCompositeOrder",
  "/api/PurchaseSystem/calculateOptimalPurchase",
  "/api/PurchaseSystem/purchaseOrder",
  "/api/PurchaseSystem/getErrorMessage",
  "/api/PurchaseSystem/findAnyOrderByAssociateID",
  "/api/PurchaseSystem/findAnyOrderById",
  "/api/PurchaseSystem/wouldFormCycle",
  "/api/PurchaseSystem/updateRootOrderRecursive",
  "/api/PurchaseSystem/dfsCollectTreeInfoAndReset",
];
