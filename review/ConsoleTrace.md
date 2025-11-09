# Console Trace

Below is the backend console output from the application runthrough.

For reference: [Menu Manager Video](https://www.youtube.com/watch?v=gaUMkUblu3s)
```
2025-11-09T22:02:58.575505772Z Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts

2025-11-09T22:03:02.389271673Z 

2025-11-09T22:03:02.389308604Z Registering concept passthrough routes.

2025-11-09T22:03:02.389325864Z   -> /api/CookBook/createRecipe

2025-11-09T22:03:02.389329424Z   -> /api/CookBook/duplicateRecipe

2025-11-09T22:03:02.389342525Z   -> /api/CookBook/_getRecipeDetails

2025-11-09T22:03:02.389358865Z   -> /api/CookBook/_getRecipeIngredients

2025-11-09T22:03:02.389372265Z   -> /api/CookBook/_getRecipesOwnedByUser

2025-11-09T22:03:02.389426556Z   -> /api/MenuCollection/_getMenuDetails

2025-11-09T22:03:02.389433016Z   -> /api/MenuCollection/_getRecipesInMenu

2025-11-09T22:03:02.389481627Z   -> /api/MenuCollection/_getMenusOwnedByUser

2025-11-09T22:03:02.389518548Z   -> /api/MenuCollection/_getMenuByDate

2025-11-09T22:03:02.38962261Z   -> /api/PurchaseSystem/_getOrderByAssociateID

2025-11-09T22:03:02.38962765Z   -> /api/PurchaseSystem/_getOptimalPurchase

2025-11-09T22:03:02.389631671Z   -> /api/PurchaseSystem/_getOrderCost

2025-11-09T22:03:02.389639381Z   -> /api/PurchaseSystem/_getSelectOrderDetails

2025-11-09T22:03:02.389683192Z   -> /api/StoreCatalog/createItem

2025-11-09T22:03:02.389686012Z   -> /api/StoreCatalog/_getItemByName

2025-11-09T22:03:02.389688102Z   -> /api/StoreCatalog/_getItemName

2025-11-09T22:03:02.389690242Z   -> /api/StoreCatalog/_getItemByPurchaseOption

2025-11-09T22:03:02.389696002Z   -> /api/StoreCatalog/_getItemPurchaseOptions

2025-11-09T22:03:02.389700102Z   -> /api/StoreCatalog/_getPurchaseOptionDetails

2025-11-09T22:03:02.389703922Z   -> /api/StoreCatalog/_getAllItems

2025-11-09T22:03:02.389795044Z   -> /api/UserAuthentication/register

2025-11-09T22:03:02.389807454Z   -> /api/UserAuthentication/authenticate

2025-11-09T22:03:02.389810644Z   -> /api/UserAuthentication/_getIsUserAdmin

2025-11-09T22:03:02.389814114Z   -> /api/UserAuthentication/_getListOfUsers

2025-11-09T22:03:02.389817394Z   -> /api/UserAuthentication/_getUsername

2025-11-09T22:03:02.389824224Z   -> /api/WeeklyCart/_getCartDates

2025-11-09T22:03:02.389827635Z   -> /api/WeeklyCart/_getMenusInCart

2025-11-09T22:03:02.389831155Z   -> /api/WeeklyCart/_getCartByDate

2025-11-09T22:03:02.389852225Z   -> /api/WeeklyCart/_getCartWithMenu

2025-11-09T22:03:02.389856305Z 

2025-11-09T22:03:02.389860565Z 🚀 Requesting server listening for POST requests at base path of /api/*

2025-11-09T22:03:02.390693782Z Listening on http://0.0.0.0:10000/ (http://localhost:10000/)

2025-11-09T22:04:42.6682759Z 

2025-11-09T22:04:42.668331701Z UserAuthentication.authenticate { username: 'test', password: 'test' } => { user: '019a2d90-cce4-7f2a-8c74-b394fede66ee' }

2025-11-09T22:04:42.668337831Z 

2025-11-09T22:08:07.062943496Z [Requesting] Received request for path: /CookBook/removeRecipeIngredient

2025-11-09T22:08:07.148728029Z 

2025-11-09T22:08:07.14877411Z Requesting.request {

2025-11-09T22:08:07.14878226Z   recipe: '019a6a62-9ab2-77e6-a576-68c864598ff1',

2025-11-09T22:08:07.14878809Z   name: 'Cilantro',

2025-11-09T22:08:07.14879714Z   path: '/CookBook/removeRecipeIngredient',

2025-11-09T22:08:07.14880197Z   session: '019a2d90-cce4-7f2a-8c74-b394fede66ee'

2025-11-09T22:08:07.14880549Z } => { request: '019a6aa9-8997-7857-a67d-6dbc587b9b40' }

2025-11-09T22:08:07.14880881Z 

2025-11-09T22:08:07.351049983Z 

2025-11-09T22:08:07.351078224Z CookBook.removeRecipeIngredient { recipe: '019a6a62-9ab2-77e6-a576-68c864598ff1', name: 'Cilantro' } => { success: true }

2025-11-09T22:08:07.351083204Z 

2025-11-09T22:08:07.419453681Z 

2025-11-09T22:08:07.419478801Z Requesting.respond { request: '019a6aa9-8997-7857-a67d-6dbc587b9b40', success: true } => { request: '019a6aa9-8997-7857-a67d-6dbc587b9b40' }

2025-11-09T22:08:07.419498742Z 

2025-11-09T22:08:15.614082721Z 

2025-11-09T22:08:15.614108051Z PurchaseSystem.removeSelectOrderFromCompositeOrder {

2025-11-09T22:08:15.614111651Z   compositeOrder: '019a6a62-9b3c-7695-a254-e376ba6f9ef7',

2025-11-09T22:08:15.614114561Z   selectOrder: '019a6264-f39f-75e5-b92d-53c22a05f895'

2025-11-09T22:08:15.614118361Z } => { success: true }

2025-11-09T22:08:15.614121192Z 

2025-11-09T22:08:59.880024589Z [Requesting] Received request for path: /StoreCatalog/addPurchaseOption

2025-11-09T22:08:59.946811924Z 

2025-11-09T22:08:59.946835465Z Requesting.request {

2025-11-09T22:08:59.946840375Z   item: '019a2de8-60a8-7a42-8d90-c82637d86711',

2025-11-09T22:08:59.946844295Z   quantity: 1,

2025-11-09T22:08:59.946848405Z   units: 'lb',

2025-11-09T22:08:59.946852595Z   price: 0.1,

2025-11-09T22:08:59.946856755Z   store: 'Wee',

2025-11-09T22:08:59.946861265Z   path: '/StoreCatalog/addPurchaseOption',

2025-11-09T22:08:59.946866245Z   session: '019a2d90-cce4-7f2a-8c74-b394fede66ee'

2025-11-09T22:08:59.946870645Z } => { request: '019a6aaa-57e8-72f5-bb29-cb42f44bed47' }

2025-11-09T22:08:59.946874306Z 

2025-11-09T22:09:00.337972867Z 

2025-11-09T22:09:00.337996847Z StoreCatalog.addPurchaseOption {

2025-11-09T22:09:00.338002698Z   item: '019a2de8-60a8-7a42-8d90-c82637d86711',

2025-11-09T22:09:00.338007408Z   quantity: 1,

2025-11-09T22:09:00.338011898Z   units: 'lb',

2025-11-09T22:09:00.338014808Z   price: 0.1,

2025-11-09T22:09:00.338017578Z   store: 'Wee'

2025-11-09T22:09:00.338020908Z } => { purchaseOption: '019a6aaa-592c-7d0b-b394-a0edcccdfdef' }

2025-11-09T22:09:00.338023618Z 

2025-11-09T22:09:00.404820353Z 

2025-11-09T22:09:00.404852954Z Requesting.respond {

2025-11-09T22:09:00.404861054Z   request: '019a6aaa-57e8-72f5-bb29-cb42f44bed47',

2025-11-09T22:09:00.404866834Z   purchaseOption: '019a6aaa-592c-7d0b-b394-a0edcccdfdef'

2025-11-09T22:09:00.404872314Z } => { request: '019a6aaa-57e8-72f5-bb29-cb42f44bed47' }

2025-11-09T22:09:00.404875864Z 

2025-11-09T22:09:08.489262818Z 

2025-11-09T22:09:08.489294509Z PurchaseSystem.createAtomicOrder {

2025-11-09T22:09:08.489299759Z   selectOrder: '019a6265-521b-77e9-8338-1a57900bd65c',

2025-11-09T22:09:08.489304119Z   associateID: '019a6aaa-592c-7d0b-b394-a0edcccdfdef',

2025-11-09T22:09:08.489308349Z   quantity: 1,

2025-11-09T22:09:08.489312399Z   units: 'lb',

2025-11-09T22:09:08.489316379Z   price: 0.1

2025-11-09T22:09:08.489320589Z } => { atomicOrder: '019a6aaa-5bf5-714b-b435-f59909cb7cd4' }

2025-11-09T22:09:08.4893246Z 

2025-11-09T22:09:12.46124499Z [Requesting] Received request for path: /StoreCatalog/confirmPurchaseOption

2025-11-09T22:09:12.527827161Z 

2025-11-09T22:09:12.527855882Z Requesting.request {

2025-11-09T22:09:12.527861712Z   purchaseOption: '019a6aaa-592c-7d0b-b394-a0edcccdfdef',

2025-11-09T22:09:12.527866122Z   path: '/StoreCatalog/confirmPurchaseOption',

2025-11-09T22:09:12.527870042Z   session: '019a2d90-cce4-7f2a-8c74-b394fede66ee'

2025-11-09T22:09:12.527873642Z } => { request: '019a6aaa-890d-79e7-a27b-ca4d5383e790' }

2025-11-09T22:09:12.527876992Z 

2025-11-09T22:09:12.722775574Z 

2025-11-09T22:09:12.722811165Z StoreCatalog.confirmPurchaseOption { purchaseOption: '019a6aaa-592c-7d0b-b394-a0edcccdfdef' } => { success: true }

2025-11-09T22:09:12.722817266Z 

2025-11-09T22:09:12.789432956Z 

2025-11-09T22:09:12.789458287Z Requesting.respond { request: '019a6aaa-890d-79e7-a27b-ca4d5383e790', success: true } => { request: '019a6aaa-890d-79e7-a27b-ca4d5383e790' }

2025-11-09T22:09:12.789473027Z 
```
