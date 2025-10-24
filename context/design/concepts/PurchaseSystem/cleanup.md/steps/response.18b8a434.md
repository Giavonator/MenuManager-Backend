---
timestamp: 'Thu Oct 23 2025 14:50:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251023_145015.efcd586d.md]]'
content_id: 18b8a4346246198dcf2bc89b74f3c64ef3a30af723fb364e52ccb240a4652ef1
---

# response:

```md
# Why Concept Design?

Concept design is a new approach to software development that attempts to find greater modularity in the structuring of the functionality of applications. The key idea is to break the functionality down into separable, modular services called *concepts*, each of which can be specified, implemented and understood separately -- by users and by developers.

The advantages of concept design include:

* Improved separation of concerns resulting in simpler and more robust design and implementation;
* Greater recognition of reusable behaviors, so reduced work for designers and developers and more familiar interactions for users;
* Improved focus on the purposes and motivations of the functionality, since each concept is closely targeted at delivering a particular function of value in the context of the larger app.

## What is a concept?

A concept is a reusable unit of user-facing functionality that serves a well-defined and intelligible purpose. Each concept maintains its own state, and interacts with the user (and with other concepts) through atomic actions. Some actions are performed by users; others are output actions that occur spontaneously under the control of the concept.

A concept typically involves objects of several different kinds, holding relationships between them in its state. For example, the *Upvote* concept, whose purpose is to rank items by popularity, maintains a relationship between the items and the users who have approved or disapproved of them. The state of a concept must be sufficiently rich to support the concept’s behavior; if *Upvote* lacked information about users, for example, it would not be able to prevent double voting. But the concept state should be no richer than it need be: *Upvote* would *not* include anything about a user beyond the user’s identity, since the user’s name (for example) plays no role in the concept’s behavior.

A concept will generally be implemented as a backend service, with its state made persistent using a database. The behavior of the concept is thus captured by an API specification that is similar in many respects to that of conventional backend services. At the same time, because all concepts are user facing, the behavior of a concept is also generally a human behavioral protocol. For example, the *RestaurantReservation* concept whose actions are *reserve*, *cancel*, *seat*, etc., can be viewed by a developer as a backend API with functions/endpoints corresponding to the actions, and to a human user as the pattern of behavior that one engages in for restaurant reservations: reserving, perhaps canceling, being seated on arrival, etc.

## Compared to Concepts in Conceptual Modeling

In contrast to the way the word is sometimes used in other settings, a concept is not an element in an ontology. In the field of conceptual modeling, a “conceptual model” is often a data model in which the concepts are entities. Richer kinds of conceptual model have been defined that incorporate be- havior, for example, by defining the concepts as objects (or more accurately classes) with their own internal behavior. These approaches do not allow a modular treatment of concepts, however. The behavior associated with a concept typically involves multiple classes of objects, and modifications that involve their relationships to one another. For example, the behavior of the *Upvote* concept is to associate votes with both particular items and with the users who issued the votes (in order to prevent double voting).

## Concept Reuse and Familiarity

Most concepts are reusable across applications; thus the same *Upvote* concept appears for upvoting comments in the New York Times and for upvoting answers on Stack Overflow. A concept can also be instantiated multiple times within the same application to play different roles.

This archetypal nature of concepts is essential. From the user’s perspective, it gives the familiarity that makes concepts easy to understand: a user encountering the same context in a new setting brings their understanding of that concept from their experience in previous settings.

From a designer’s perspective, it allows concepts to be repositories of design knowledge and experience. When a developer implements *Upvote*, even if they can’t reuse the code of a prior implementation, they can rely on all the discoveries and refinements previously made. Many of these are apparent in the behavior of the concept itself, but others are associated with the implementation, or are subtle enough to need explicit description. The community of designers could develop “concept catalogs” that capture all this knowledge, along with relationships between concepts (for example, that *Upvote* often relies on the *Session* concept for identifying users, which itself is associated with the *UserAuthentication* concept for authenticating users).

## Concept Independence

Perhaps the most significant distinguishing feature of concepts, in comparison to other modularity schemes, is their mutual independence. Each concept is defined without reference to any other concepts, and can be understood in isolation.

Early work on mental models established the principle that, in a robust model, the different elements must be independently understandable. The same holds in software: the reason a user can make sense of a new social media app, for example, is that each of the concepts (*Post*, *Comment*, *Upvote*, *Friend*, etc) are not only familiar but also separable, so that understanding one doesn’t require understanding another.

Concept independence lets design scale, because individual concepts can be worked on by different designers or design teams, and brought together later. Reuse requires independence too, because coupling between concepts would prevent a concept from being adopted without also including the concepts it depends on.

Polymorphism is key to independence: the designer of a concept should strive to make the concept as free as possible of any assumptions about the content and interpretation of objects passed as action arguments. Even if a *Comment* concept is used within an app only for comments on posts, it should be described as applying comments to arbitrary targets, defined only by their identity.

## Separation of concerns

One of the key advances of concept design is a more effective *separation of concerns* than is typical in software designs. This means that each concept addresses only a single, coherent aspect of the functionality of the application, and does not conflate aspects of functionality that could easily be separated.

In a traditional design, in contrast, concerns are often conflated, especially around objects (or classes). For example, it is common for a *User* class to handle all kinds of functions associated with users: authentication, profiles, naming, choice of communication channels for notification, and more. In a concept design, these would be separated into different concepts: one for authentication, one for profiles, one for naming, one for notification, and so on. The state declaration form makes it easy to associate the appropriate properties or fields with user objects in each concept. For example, the *UserAuthentication* concept may have a state that maps user identifiers to usernames and passwords; the *Profile* concept may map user identifiers to bios and thumbnail images; the *Notification* concept may map user identifiers to phone numbers and email addresses to be used as notification channels.

## Completeness of functionality

Another key distinction between concept design and traditional design is that concepts are *complete* with respect to their functionality and don't rely on functionality from other concepts. For example, a *Notification* concept that has an action to notify a user cannot "make a call" to an action of an emailing or text messaging context to actually deliver a notification. Instead that functionality would be part of the *Notification* concept itself. It is always possible to separate out some functionality into another concept (and to sync the concepts together to achieve some combined functionality) so long as the concept that remains is still coherent and fulfills all of its functionality without dependencies.

## Composition by synchronization

Because concepts are fully independent of one another, they cannot refer to each other or use each other's services. Concepts are therefore composed using *synchronizations* (or *syncs*). A sync is a rule that says that *when* an action happens in one concept, *where* the state of some concept has some property, *then* some action happens in another concept. For example, a sync may say that *when* a post p is deleted (in the *Post* concept, through the occurrence of an action), and *where* c is a comment on the post p (in the *Comment* concept), then comment c is deleted (in the *Comment* concept). This can be written

```

sync CascadePostDeletion
when
Post.delete (p)
where
in Comment: target of c is p
then
Comment.delete (c)

```

Not that the syncs is not only causing an action to happen but also providing input arguments to actions (in this case the comment to be deleted).

A sync can have multiple actions in its when and then clauses, and can refer to the state of multiple concepts in the where clause.

Some other examples of how syncs are used:

* When a user comments on another user's post, the second user is notified
* When a user exhibits some good behavior, karma is awarded to them
* When a user checks out a shopping cart, their credit card is charged.

Syncs can be used for authentication and authorization. In these case, it is common to represent requests made by a user as actions of a kind of pseudo concept (which is usually called *Request*). For example, a sync might say that if a user requests to delete a post, and the user is the author of the post, then the deletion can go ahead:

```

sync DeletePost
when
Request.deletePost (p, s)
where
in Session: user of session s is u
in Post: author of p is u
then
Post.delete (p)

```

# Structure of a concept specification

A concept is specified with the following structure:

* **concept**: a descriptive name balancing generality of use and appropriate specificity
* **purpose**: the reason for why this concept exists, and what it enables
* **principle**: a motivating scenario that establishes how the concept achieves its purpose in the typical case
* **state**: a description of the state stored by the concept, which comprises what the executing concept remembers about the actions that have occurred
* **actions**: a set of actions specified in traditional pre/post style that correspond to steps that are taken in the execution of the concept.

## Concept name and type parameters

The concept section gives the *name* of the concept, and a list of *type* *parameters*. These type parameters are for the types of objects that are created externally to the concept, and must be treated completely polymorphically by the concept (that is, the concept can't assume that they have any properties at all and can only be compared to determine if two instances of the type are the same identifier/reference and thus represent the same object).

For example, this concept section

**concept** Comment \[User, Target]

gives the name *Comment* to the concept, and says that its state and actions will refer to values of two externally defined generic types, *User* which will turn out be used to reference the authors of comments, and *Target* which will turn out be used to reference the target of each comment. Depending on the context in which the concept is used, the values of type *User* will likely be the identities of registered users generated by a user authentication or user profile concept; the values of type *Target* may be the identities of posts or comments or whatever is being commented on.

## Concept purpose

The *purpose* defines in a brief phrase or sentence what the motivation is for the concept's existence, and the need that it serves. Often the purpose will be obvious, such as the purpose of a *Comment* concept:

**purpose** associate some text with another artifact (usually itself textual) that remarks on, augments or explains it

Sometimes the purpose may seem obvious but will actually be more subtle than many users realize at first. For example, here is the purpose of the *Trash* concept:

**purpose** support deletion of items with possibility of restoring

As introduced by Apple for the Lisa in the 1980s and now widely used in many apps, the purpose of the trash is not to support deletion of items but rather to allow *undeletion*,  since the whole point of the trash is that a deleted item can be restored.

Sometimes the purpose is subtle. For example, here is the purpose of the *ParagraphStyle* concept (as found in many document processing tools, such as Microsoft Word):

**purpose** make consistent changes to formatting of a document easy

This purpose is fulfilled by maintaining an association between paragraphs and their styles in the state, so that a change to a paragraph style causes an update to the format of every associated paragraph. You might have thought that the purpose is to allow you to apply a predefined format to a paragraph, and indeed this purpose is fulfilled too. But it is not the defining purpose, because that simpler purpose is fulfilled by a more basic concept that just holds a set of styles with their formats and does not maintain any association between paragraphs and styles.

A good purpose should satisfy these criteria:

* **Need-focused**. The purpose should be stated in terms of the needs of the user. For example, the purpose of the *Upvote* concept should not be to “express your approval of an item” since that has no tangible benefit; a better purpose might be to “use crowd-sourced approval to rank items.”
* **Specific**. The purpose should be specific to the design of the concept at hand. For example, even though an *Autocomplete* concept in Gmail may make the app more attractive to consumers, it wouldn’t be useful to say that its purpose is to “increase the Gmail user base” since presumably all concepts have that goal. A better purpose might be “to save the user typing effort.”
* **Evaluable**. A purpose should be a yardstick against which to measure a concept design. For example, a good purpose for the *Trash* concept is “to allow undeletion.” The apparently similar purpose “to prevent accidental deletion” is not good because evaluating the concept design against that goal would require all kinds of assumptions about user behavior.

## Concept principle

The *operational principle* (or *principle*) is an archetypal scenario that explains how the concept fulfills its purpose.

A compelling way to explain how something works is to tell a story. Not any story, but a kind of defining story that shows, through a typical scenario, why the thing is useful and fulfills its purpose.

* The Minuteman Library Network, for example, offers a wonderful service. If I request a book, then when it becomes available at my local library, I get an email notifying me that it’s ready to be picked up.

Note the form this scenario takes: *if* you perform some actions, *then* some result occurs that fulfills a useful purpose. Many kinds of mechanism can be described in this way:

* If you make social security payments every month while you work, then you will receive a basic income from the government after you retire.
* If you insert a slice of bread into the toaster and press down the lever, then a few minutes later the lever will pop up and your bread will be toast.
* If you become someone’s friend and they then publish an item, you will be able to view it.

Here are some examples of principles:

* **Password**. If you register with a user name and password, and then you login with that same user name and password, you will be authenticated as the user who registered.
* **Personal access token**. If you create an access token for a resource and pass it to another user, then that user can enter the token string and obtain access, but if you revoke the token, they will not be able to obtain access after that.

Note that a principle is not always the simplest scenario. For the *PersonalAccessToken* case, for example, it's important to include what happens when the token is revoked because being able to revoke a token is essential to the concept and what distinguishes it from the *Password* concept. If you used a regular password to grant another user access to your account, for example, then having shared it, your only way of stopping them from accessing it would be to change the password, which would inconvenience you (and anyone else you shared the password with).

Another example: here is a principle for the *ParagraphStyle* concept:

**principle** after a style is defined and applied to multiple paragraphs, updating the style will cause the format of all those paragraphs to be updated in concert

A good principle should satisfy these criteria:

* **Goal focused**. The principle should demonstrate how the purpose is fulfilled. For example, since the purpose of the *Trash* concept is to allow deleted items to be restored, the principle cannot just involve a deletion without a subsequent restore.
* **Differentiating**. The principle should distinguish the functionality of the concept from other concepts, especially simpler ones. For example, the  principle of *PersonalAccessToken* must include revocation of a token since that is the motivator of its design and what distinguishes it from the simpler *Password* concept. The principle of the *ParagraphStyle* concept must include more than one paragraph being styled with a single style, since otherwise the ability to update the format of multiple paragraphs at once is not demonstrated.
* **Archetypal**. The principle should not include corner cases that are not essential to demonstrating how the concept fulfills its purpose. For example, the principle of a *RestaurantReservation* concept should include reserving a table and eventually being seated, but it does not need to include the possibility that the reservation is canceled, even though the concept will include an action to support this. The reason such cases are not needed is that the states and actions sections fully define the behavior of the concept and thus define all possible scenarios implicitly; the role of the principle is to identify the essential scenario that motivates the design and shows how the purpose is fulfilled.

## Concept state

The concept state is a data model that represents the set of possible states of the executing concept. For example, a concept for authenticating users might have a state declared like this:

```

a set of Users with
a username String
a password String

```

This says that the state includes a set of users and associates with each user a username and a password, each of which is a string. Mathematically, this says that there is a set of users and two relations, one called username and one called password, both from users to strings. Every value in a state is either a primitive (like a number, boolean or string) or an entity value (like a user). Entity values should be viewed as identities or references.

### Separation of concerns and different views

Although it is possible to think of a declaration such as this as defining a collection of composite objects (users with username and password fields), this view is not a completely reliable one because it does not account for the way concept states can represent different aspects of an object. For example, a separate *UserProfile* concept could have a state that includes this declaration

```

a set of Users with
a bio String
a thumbnail Image

```

associating a bio and thumbnail with each user. These two declarations describe different properties of users, and are best thought of as different views of a user, or as a partitioning of the data model. This kind of separation of concerns is a central feature of concept design and is not easily explained using traditional object-oriented notions that require an object to have a single global definition.

## Concept actions

When a concept executes, its observable behavior comprises an interleaved sequence of events and queries. The events are instances of *actions*, and usually mutators of the state. A concept specification always includes definitions of its actions. Queries, by contrast, are often defined implicitly by the state and do not need to be explicitly specified. See section below.

Some examples of actions:

* For a *UserAuthentication* concept: register, login, logout
* For a *RestaurantReservation* concept: reserve, cancel, seat, noShow
* For a *Trash* concept: delete, restore, empty
* For a *Labeling* concept: addLabel, removeLabel
* For a *Folder* concept: createFolder, delete, rename, move

If the state is to be initialized in a domain-specific way, actions will be needed to do that. For example, if the *RestaurantReservation* concept just uses fixed time blocks (for example, allowing any reservations between 6pm and 10pm on any day) then such an assumption can be hardwired into the behavior of the concept. But if the the *RestaurantReservation* concept only allows reservations to be made in times that have been preset by the restaurant owner, it will be necessary to include actions to setup the periods in which reservations will be allowed.

### Action arguments and results

An action can have input arguments and results. For example, for the *register* action of the *UserAuthentication* concept we might have

```

register (username: String, password: String): (user: User)

```

which says that each occurrence of the register action presents as an input a username string and a password string, and returns as an output (the identifier of) a user.

In concept specifications, all arguments and results are named, and we allow multiple results. Errors and exceptions are treated as if they were normal results. Thus to represent the possibility that the register action might fail, we could declare an overloaded version of the action that returns an error string:

```

register (username: String, password: String): (error: String)

```

As with the pattern matching syntax of functional languages like ML, a concept specification can declare multiple forms for a single action name so long as they have distinct argument/result names. For design work, error cases are not normally specified, but they are included when specifying concepts for implementation.

When actions are implemented in TypeScript code, each action is represented by a method that takes a dictionary object as input and returns a dictionary object as output. The fields of the dictionary objects are the input argument and result names.

### Empty results

Note that in the implementation, a successful execution *must* return a dictionary (but it can be empty). An empty dictionary can be used to represent successful completion, but if there is also an overloaded version of the action that returns an error, the successful case must return a dictionary that is non-empty. So this is valid

```

register (username: String, password: String): (user: User)
register (username: String, password: String): (error: String)

```

but this is not valid

```

register (username: String, password: String)
register (username: String, password: String): (error: String)

```

because the non-error case (implicitly) returns an empty dictionary. Since syncs support partial matches in which the argument name is not specified, a partial pattern that does not specify the result name will match on both cases, and it will not be possible to distinguish the successful, non-error case.

### Pre and post conditions

The detailed behavior of each action is specified in classical pre/post form. The precondition, labeled with the keyword *requires*, specifies the conditions under which execution is allowed, as a constraint on the state and the input arguments. The postcondition, labeled with the keyword *effects*, specifies the outcome (the results and the new state) as a constraint on the inputs, state before, state after and the outputs.

For example, here is a specification of a *Counter* concept:

**concept** Counter

**purpose** count the number of occurrences of something

**principle** after a series of increments, the counter reflects the number of increments that occurred

**state**
  count: Number = 0
    
**actions**
  increment ()
    **requires** true
    **effects** count := count + 1

  decrement ()
    **requires** count > 0
    **effects** count := count - 1
  
  reset ()
    **requires** true
    **effects** count := 0

Notes:

* Most of the preconditions are true: that means the action can always happen.
* The postconditions are written as assignments, but they could also be written informally. For example, the postcondition of increment might say "add one to the count". It is also possible to adopt a more declarative style and write "the count after is one more than the count before".

In general, action specifications are written informally and assume frame conditions (that any state component not mentioned is not updated).

### User and system actions

An action can be performed either by the user (or as a consequence of a user request via a synchronization), or autonomously by the system. All the actions mentioned so far as user actions, and that is the default. To mark an action as a system action, mark it with the *system* keyword like this:

**system** notifyExpiry ()
**requires** the current time is after *expiryTime* and *notified* is false
**effects** set *notified* to true

Note that the precondition allows the action to happen any time after the timer expires, but in practice the implementation should make such actions occur as soon as possible.

### Preconditions are firing conditions

The pre/post specification idiom is conventional and is the same one that is used in many specification languages. Note however that in most of those languages the precondition is an *obligation* on the caller. That means that the action *can* be executed when the precondition is false, but that the outcome will be uncertain.

In concept specs, in contrast, *preconditions are firing conditions*. This means that an action can never occur when its precondition is false. For system actions, the precondition indicates when they should occur.

## Concept queries

Queries are reads of the concept state. Explicit query specifications are often not used at the design level, but in specifications of concepts for code all queries that are likely to be needed should be specified.
For example, for a *UserProfile* concept with this state

```

a set of Users with
a username String
a password String

```

one could define queries to extract the username and password of a user:

**queries**
\_getUsername (user: User) : (username: String)
    **requires** user exists
    **effects** returns username of user

```

\_getPassword (user: User) : (password: String)

```

    **requires** user exists
    **effects** returns password of user

Some queries return multiple objects. For example, groups contain sets of users

```

a set of Groups with
a users set of User

```

then a query could take a group and return the set of users in it:

**queries**
\_getUsers (group: Group) : (user: User)
    **requires** group exists
    **effects** returns set of all users in the group

Note that queries, unlike actions, can return structured objects. For example, given the definitions of users and groups above, we could define a query

```

\_getUsersWithUsernamesAndPasswords (group: Group) : (user: {username: String, password: String})

```

    **requires** group exists
    **effects** returns set of all users in the group each with its username and password

that returns a set of users, each with a username and password property.

## Concepts are not objects

A common misconception is that concepts are the same as objects in object-oriented programming. Here are the key differences:

* A concept holds in its state the set of all objects that are involved in the behavioral concern that it embodies, rather than the properties of a single object.
* The specification of a concept therefore has no constructor, and objects are allocated with actions instead.
* A concept must embody all the functionality associated with a behavioral concern, unlike objects which often depend on other objects for their functioning.
* Concepts separate concerns, unlike objects in object oriented programming which tend to aggregate all properties and methods associated with a class of object.

To illustrate these differences, consider the functionality of associating labels with items and then retrieving the items that match a given label. This functionality is used in Gmail for organizing email messages for example. In an object-oriented design, one might have an *EmailMessage* class that has an instance variable holding an array of labels; a Label *class* that has an instance variable holding the string name of the label; and a *Mailbox* class  that has an instance variable holding an array of *EmailMessage* objects.

In contrast, in concept design, we would have a single concept called *Labeling* for example whose state is a mapping from generic items to sets of labels:

**concept** Labeling \[Item]
**state**
  a set of Items with
    a labels set of Label
  a set of Labels with
    a name String
**actions**
createLabel (name: String)
  addLabel (item: Item, label: Label)
  deleteLabel (item: Item, label: Label)

Note:

* The *Labeling* concept includes in its state the entire collection of items that are labeled (the state component is in fact just a relation from items to labels)
* The *Item* type is generic, and can be instantiated at runtime with any type (such as an email message)
* Unlike in the object-oriented case, there is no conflation of concerns. This concept handles only labeling, unlike in the OO case where the *EmailMessage* class has a label instance variable and thus conflates labeling with other email message functions.
* This concept is behaviorally complete, unlike the *Label* class in the OO case, which would not be usable alone. In particular, this concept allows the addition, deletion and querying of labels; in the OO design, addition and deletion would belong to the *EmailMessage* class, and querying on a label would involve both the *Mailbox* and *EmailMessage* classes.

Despite these caveats, concepts are usually implemented as object oriented classes. There is usually just one instance of the concept at runtime that handles all the relevant objects. This instance is created by calling the constructor of the class that implements the concept.

## PurchaseSystem

**concept** PurchaseSystem \[Item, PurchaseOption, EntityID]

**purpose** To manage the hierarchical aggregation of desired items, find the most cost-effective way to purchase them from available options, and track their purchase status.

**principle** When a user defines a new recipe in their `CookBook` (e.g., "Apple Pie") with specific ingredients (e.g., 2 lbs of Apples, 1 bag of Flour), a `CompositeOrder` (for the Recipe) is created, containing `SelectOrder`s for each ingredient. For each `SelectOrder`, multiple `AtomicOrder` options are available (e.g., 'Organic Apples 1lb Bag' vs. 'Conventional Apples 5lb Bag' from `StoreCatalog`). If this recipe is then added to a `Menu` (in `MenuCollection`), a sync automatically calls `addSubOrderToComposite` on the Menu's `CompositeOrder`, linking the Recipe's `CompositeOrder` with a scaling factor (e.g., 2.0 for a double batch). When the Menu is added to a `ShoppingCart` (another `CompositeOrder`), the Cart's order similarly `addSubOrderToComposite` of the Menu's order. The user can then `calculateOptimalPurchase` for the `ShoppingCart`'s `CompositeOrder` to determine the cheapest combination of `AtomicOrder`s to fulfill all nested `SelectOrder`s. Finally, once shopping is complete, the `purchaseOrder` action marks the `ShoppingCart`'s `CompositeOrder` as purchased. If the recipe changes (e.g., requires 3 lbs of apples), `updateSelectOrderDesireds` on the recipe's `SelectOrder` for apples, causing the change to propagate and be reflected in the Menu and Shopping Cart's optimal purchase calculations.

**state**
a set of AtomicOrders with
  a id ID // Unique identifier for this AtomicOrder
  a quantity Float // Amount of the item provided by this purchase option (e.g., 1.0)
  a units String // Units for the quantity (e.g., "lb", "count")
  a price Float // Price for this specific quantity/units (e.g., 2.99)
  a purchaseOptionID PurchaseOption // Reference to a specific PurchaseOption from StoreCatalog
  a parentSelectOrder ID // ID of the SelectOrder this AtomicOrder belongs to

a set of SelectOrders with
  a id ID // Unique identifier for this SelectOrder
  a targetItemID Item // The abstract item this SelectOrder aims to fulfill (e.g., 'Apple')
  a desiredQuantity Float // Desired amount of the item (e.g., 2.0)
  a desiredUnits String // Units for the desired quantity (e.g., "lb")
  a availableAtomicOrders Set of ID // IDs of AtomicOrders that can fulfill this SelectOrder
  a parentCompositeOrders Set of ID // IDs of CompositeOrders that include this SelectOrder

a set of CompositeOrders with
  a id ID // Unique identifier for this CompositeOrder
  a subOrders Map of ID to Float // Map of Order ID (can be SelectOrder or CompositeOrder) to scaleFactor
  a parentCompositeOrders Set of ID // IDs of CompositeOrders that include this CompositeOrder
  a associatedEntityID EntityID // Opaque ID (e.g., RecipeID, MenuID, CartID) representing what this CompositeOrder directly stands for
  a purchased Bool // Flag indicating if this top-level CompositeOrder has been finalized (only for root CompositeOrders)

**actions**
createAtomicOrder (purchaseOption: PurchaseOption, quantity: Float, units: String, price: Float, parentSelectOrder: ID): (atomicOrder: ID)
  **requires** `purchaseOption` exists (in StoreCatalog). `quantity` > 0. `price` >= 0. `parentSelectOrder` exists (is a `SelectOrder`).
  **effects** Creates a new `AtomicOrder` with a unique `id`, `quantity`, `units`, `price`, `purchaseOptionID`, and `parentSelectOrder`. Adds the new `AtomicOrder`'s ID to `parentSelectOrder.availableAtomicOrders`. Returns the new `AtomicOrder` ID.

createSelectOrder (targetItem: Item, desiredQuantity: Float, desiredUnits: String): (selectOrder: ID)
  **requires** `targetItem` exists (in StoreCatalog). `desiredQuantity` > 0.
  **effects** Creates a new `SelectOrder` with a unique `id`, `targetItemID`, `desiredQuantity`, `desiredUnits`. Returns the new `SelectOrder` ID.

createCompositeOrder (associatedEntityID: EntityID): (compositeOrder: ID)
  **requires** `associatedEntityID` is a valid opaque ID (e.g., RecipeID, MenuID, CartID).
  **effects** Creates a new `CompositeOrder` with a unique `id`, `associatedEntityID`, `purchased` set to `false`. Returns the new `CompositeOrder` ID.

updateAtomicOrderDetails (atomicOrder: ID, newQuantity: Float, newUnits: String, newPrice: Float)
  **requires** `atomicOrder` exists (is an `AtomicOrder`). `newQuantity` > 0. `newPrice` >= 0.
  **effects** Updates `atomicOrder.quantity`, `atomicOrder.units`, and `atomicOrder.price` to the new values. This change may indirectly affect optimal purchase calculations in parent `CompositeOrder`s (via syncs).

updateSelectOrderDesireds (selectOrder: ID, newDesiredQuantity: Float, newDesiredUnits: String)
  **requires** `selectOrder` exists (is a `SelectOrder`). `newDesiredQuantity` > 0.
  **effects** Updates `selectOrder.desiredQuantity` and `selectOrder.desiredUnits` to the new values. This change propagates up to parent `CompositeOrder`s (via syncs) potentially recalculating their needs.

addAtomicOptionToSelectOrder (selectOrder: ID, atomicOrder: ID)
  **requires** `selectOrder` exists (is a `SelectOrder`). `atomicOrder` exists (is an `AtomicOrder`). `atomicOrder` is not already in `selectOrder.availableAtomicOrders`. `atomicOrder.parentSelectOrder` is `selectOrder`.
  **effects** Adds `atomicOrder` ID to `selectOrder.availableAtomicOrders`.

removeAtomicOptionFromSelectOrder (selectOrder: ID, atomicOrder: ID)
  **requires** `selectOrder` exists (is a `SelectOrder`). `atomicOrder` is in `selectOrder.availableAtomicOrders`.
  **effects** Removes `atomicOrder` ID from `selectOrder.availableAtomicOrders`.

addSubOrderToComposite (parentCompositeOrder: ID, subOrder: ID, scaleFactor: Float)
  **requires** `parentCompositeOrder` exists (is a `CompositeOrder`). `subOrder` exists (is a `SelectOrder` or `CompositeOrder`). `subOrder` is not already a sub-order of `parentCompositeOrder`. `scaleFactor` > 0.
  **effects** Adds `subOrder` ID to `parentCompositeOrder.subOrders` with the given `scaleFactor`. If `subOrder` is a `SelectOrder`, adds `parentCompositeOrder` ID to `subOrder.parentCompositeOrders`. If `subOrder` is a `CompositeOrder`, adds `parentCompositeOrder` ID to `subOrder.parentCompositeOrders`.

removeSubOrderFromComposite (parentCompositeOrder: ID, subOrder: ID)
  **requires** `parentCompositeOrder` exists (is a `CompositeOrder`). `subOrder` is a sub-order of `parentCompositeOrder`.
  **effects** Removes `subOrder` ID from `parentCompositeOrder.subOrders`. If `subOrder` is a `SelectOrder`, removes `parentCompositeOrder` ID from `subOrder.parentCompositeOrders`. If `subOrder` is a `CompositeOrder`, removes `parentCompositeOrder` ID from `subOrder.parentCompositeOrders`.

updateSubOrderScaleFactor (parentCompositeOrder: ID, subOrder: ID, newScaleFactor: Float)
  **requires** `parentCompositeOrder` exists (is a `CompositeOrder`). `subOrder` is a sub-order of `parentCompositeOrder`. `newScaleFactor` > 0.
  **effects** Updates the `scaleFactor` for `subOrder` within `parentCompositeOrder.subOrders`.

purchaseOrder (compositeOrder: ID)
  **requires** `compositeOrder` exists (is a `CompositeOrder`). `compositeOrder.purchased` is `false`. `compositeOrder.parentCompositeOrders` is empty.
  **effects** Sets `compositeOrder.purchased` to `true`.

deleteOrder (order: ID)
  **requires** `order` exists.
  **effects**
    If `order` is an `AtomicOrder`:
      Removes `order` ID from its `parentSelectOrder.availableAtomicOrders`.
      Deletes the `AtomicOrder` entity identified by `order`.
    If `order` is a `SelectOrder`:
      Removes `order` ID from all `parentCompositeOrders.subOrders` where it is referenced.
      Deletes all `AtomicOrder`s whose `parentSelectOrder` is `order`.
      Deletes the `SelectOrder` entity identified by `order`.
    If `order` is a `CompositeOrder`:
      Removes `order` ID from all `parentCompositeOrders.subOrders` where it is referenced.
      Deletes the `CompositeOrder` entity identified by `order`.

calculateOptimalPurchase (compositeOrder: ID): (optimalPlan: Map of ID to Float, totalCost: Float)
  **requires** `compositeOrder` exists (is a `CompositeOrder`).
  **effects** Recursively traverses the `compositeOrder` and its sub-orders (applying scale factors) to determine the scaled desired quantities for all leaf `SelectOrder`s. For each `SelectOrder`, it computes the minimum cost combination of its `availableAtomicOrders` to fulfill the scaled `desiredQuantity`. Returns a map indicating which `AtomicOrder` IDs to purchase and in what quantities, along with the `totalCost`. This action is purely a computational query and does not alter the state. (The internal logic for optimal calculation needs a unit conversion system between `desiredUnits` and `AtomicOrder.units` and `StoreCatalog` prices.)

**queries**
_getAtomicOrderDetails (atomicOrder: ID): (quantity: Float, units: String, price: Float, purchaseOptionID: PurchaseOption, parentSelectOrder: ID)
  **requires** `atomicOrder` exists (is an `AtomicOrder`).
  **effects** Returns the details of the `atomicOrder`.

_getSelectOrderDetails (selectOrder: ID): (targetItemID: Item, desiredQuantity: Float, desiredUnits: String, availableAtomicOrders: Set of ID, parentCompositeOrders: Set of ID)
  **requires** `selectOrder` exists (is a `SelectOrder`).
  **effects** Returns the details of the `selectOrder`.

_getCompositeOrderDetails (compositeOrder: ID): (subOrders: Map of ID to Float, associatedEntityID: EntityID, purchased: Bool, parentCompositeOrders: Set of ID)
  **requires** `compositeOrder` exists (is a `CompositeOrder`).
  **effects** Returns the details of the `compositeOrder`.

_getAvailableAtomicOptionsForSelectOrder (selectOrder: ID): (atomicOrders: Set of ID)
  **requires** `selectOrder` exists (is a `SelectOrder`).
  **effects** Returns the set of `AtomicOrder` IDs available to fulfill the `selectOrder`.

_getImmediateSubOrders (compositeOrder: ID): (subOrdersWithScale: Map of ID to Float)
  **requires** `compositeOrder` exists (is a `CompositeOrder`).
  **effects** Returns the map of immediate sub-orders and their scale factors.

_getRootCompositeOrders (): (compositeOrders: Set of ID)
  **requires** true.
  **effects** Returns all `CompositeOrder` IDs that have no `parentCompositeOrders`.

_isOrderPurchased (compositeOrder: ID): (purchased: Bool)
  **requires** `compositeOrder` exists (is a `CompositeOrder`).
  **effects** Returns the purchased status of the `compositeOrder`.
```
