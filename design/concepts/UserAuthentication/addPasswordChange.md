[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@UserAuthentication](./UserAuthentication.md)

[@UserAuthenticationConcept.ts](../../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)

The original concept is forgetting that users may want to change their passwords.

Please create new action to updatePassword.

Update both the concept and the implementation.

# new action: updatePassword

# response:

# Why Concept Design?

Concept design is a new approach to software development that attempts to find greater modularity in the structuring of the functionality of applications. The key idea is to break the functionality down into separable, modular services called *concepts*, each of which can be specified, implemented and understood separately -- by users and by developers.

The advantages of concept design include:

*   Improved separation of concerns resulting in simpler and more robust design and implementation;
*   Greater recognition of reusable behaviors, so reduced work for designers and developers and more familiar interactions for users;
*   Improved focus on the purposes and motivations of the functionality, since each concept is closely targeted at delivering a particular function of value in the context of the larger app.

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

*   When a user comments on another user's post, the second user is notified
*   When a user exhibits some good behavior, karma is awarded to them
*   When a user checks out a shopping cart, their credit card is charged.

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

*   **concept**: a descriptive name balancing generality of use and appropriate specificity
*   **purpose**: the reason for why this concept exists, and what it enables
*   **principle**: a motivating scenario that establishes how the concept achieves its purpose in the typical case
*   **state**: a description of the state stored by the concept, which comprises what the executing concept remembers about the actions that have occurred
*   **actions**: a set of actions specified in traditional pre/post style that correspond to steps that are taken in the execution of the concept.

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

As introduced by Apple for the Lisa in the 1980s and now widely used in many apps, the purpose of the trash is not to support deletion of items but rather to allow *undeletion*, since the whole point of the trash is that a deleted item can be restored.

Sometimes the purpose is subtle. For example, here is the purpose of the *ParagraphStyle* concept (as found in many document processing tools, such as Microsoft Word):

**purpose** make consistent changes to formatting of a document easy

This purpose is fulfilled by maintaining an association between paragraphs and their styles in the state, so that a change to a paragraph style causes an update to the format of every associated paragraph. You might have thought that the purpose is to allow you to apply a predefined format to a paragraph, and indeed this purpose is fulfilled too. But it is not the defining purpose, because that simpler purpose is fulfilled by a more basic concept that just holds a set of styles with their formats and does not maintain any association between paragraphs and styles.

A good purpose should satisfy these criteria:

*   **Need-focused**. The purpose should be stated in terms of the needs of the user. For example, the purpose of the *Upvote* concept should not be to “express your approval of an item” since that has no tangible benefit; a better purpose might be to “use crowd-sourced approval to rank items.”
*   **Specific**. The purpose should be specific to the design of the concept at hand. For example, even though an *Autocomplete* concept in Gmail may make the app more attractive to consumers, it wouldn’t be useful to say that its purpose is to “increase the Gmail user base” since presumably all concepts have that goal. A better purpose might be “to save the user typing effort.”
*   **Evaluable**. A purpose should be a yardstick against which to measure a concept design. For example, a good purpose for the *Trash* concept is “to allow undeletion.” The apparently similar purpose “to prevent accidental deletion” is not good because evaluating the concept design against that goal would require all kinds of assumptions about user behavior.

## Concept principle

The *operational principle* (or *principle*) is an archetypal scenario that explains how the concept fulfills its purpose.

A compelling way to explain how something works is to tell a story. Not any story, but a kind of defining story that shows, through a typical scenario, why the thing is useful and fulfills its purpose.

*   The Minuteman Library Network, for example, offers a wonderful service. If I request a book, then when it becomes available at my local library, I get an email notifying me that it’s ready to be picked up.

Note the form this scenario takes: *if* you perform some actions, *then* some result occurs that fulfills a useful purpose. Many kinds of mechanism can be described in this way:

*   If you make social security payments every month while you work, then you will receive a basic income from the government after you retire.
*   If you insert a slice of bread into the toaster and press down the lever, then a few minutes later the lever will pop up and your bread will be toast.
*   If you become someone’s friend and they then publish an item, you will be able to view it.

Here are some examples of principles:

*   **Password**. If you register with a user name and password, and then you login with that same user name and password, you will be authenticated as the user who registered.
*   **Personal access token**. If you create an access token for a resource and pass it to another user, then that user can enter the token string and obtain access, but if you revoke the token, they will not be able to obtain access after that.

Note that a principle is not always the simplest scenario. For the *PersonalAccessToken* case, for example, it's important to include what happens when the token is revoked because being able to revoke a token is essential to the concept and what distinguishes it from the *Password* concept. If you used a regular password to grant another user access to your account, for example, then having shared it, your only way of stopping them from accessing it would be to change the password, which would inconvenience you (and anyone else you shared the password with).

Another example: here is a principle for the *ParagraphStyle* concept:

**principle** after a style is defined and applied to multiple paragraphs, updating the style will cause the format of all those paragraphs to be updated in concert

A good principle should satisfy these criteria:

*   **Goal focused**. The principle should demonstrate how the purpose is fulfilled. For example, since the purpose of the *Trash* concept is to allow deleted items to be restored, the principle cannot just involve a deletion without a subsequent restore.
*   **Differentiating**. The principle should distinguish the functionality of the concept from other concepts, especially simpler ones. For example, the principle of *PersonalAccessToken* must include revocation of a token since that is the motivator of its design and what distinguishes it from the simpler *Password* concept. The principle of the *ParagraphStyle* concept must include more than one paragraph being styled with a single style, since otherwise the ability to update the format of multiple paragraphs at once is not demonstrated.
*   **Archetypal**. The principle should not include corner cases that are not essential to demonstrating how the concept fulfills its purpose. For example, the principle of a *RestaurantReservation* concept should include reserving a table and eventually being seated, but it does not need to include the possibility that the reservation is canceled, even though the concept will include an action to support this. The reason such cases are not needed is that the states and actions sections fully define the behavior of the concept and thus define all possible scenarios implicitly; the role of the principle is to identify the essential scenario that motivates the design and shows how the purpose is fulfilled.

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

*   For a *UserAuthentication* concept: register, login, logout
*   For a *RestaurantReservation* concept: reserve, cancel, seat, noShow
*   For a *Trash* concept: delete, restore, empty
*   For a *Labeling* concept: addLabel, removeLabel
*   For a *Folder* concept: createFolder, delete, rename, move

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

*   Most of the preconditions are true: that means the action can always happen.
*   The postconditions are written as assignments, but they could also be written informally. For example, the postcondition of increment might say "add one to the count". It is also possible to adopt a more declarative style and write "the count after is one more than the count before".

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

Queries are reads of the concept state. Explicit query specifications are often not required since the concept state is assumed to be visible, so that straightforward queries of the state do not need to be defined in advance. It can be useful, though, to define queries for particularly significant and non-trivial observations of the state. For example, for a *UserProfile* concept with this state

```
a set of Users with
  a bio String
  a thumbnail Image
```

one would not define a query to extract the bio of a user. But for a *Friend* concept with this state

```
a set of Users with
  a friends set of Users
```

one might define a query that tells you, given two users, how many mutual friends they have:

  \_countMutualFriends (u1: User, u2: User): (count: Number)
  **effects** return number of mutual friends of users u1 and u2

## Concepts are not objects

A common misconception is that concepts are the same as objects in object-oriented programming. Here are the key differences:

*   A concept holds in its state the set of all objects that are involved in the behavioral concern that it embodies, rather than the properties of a single object.
*   The specification of a concept therefore has no constructor, and objects are allocated with actions instead.
*   A concept must embody all the functionality associated with a behavioral concern, unlike objects which often depend on other objects for their functioning.
*   Concepts separate concerns, unlike objects in object oriented programming which tend to aggregate all properties and methods associated with a class of object.

To illustrate these differences, consider the functionality of associating labels with items and then retrieving the items that match a given label. This functionality is used in Gmail for organizing email messages for example. In an object-oriented design, one might have an *EmailMessage* class that has an instance variable holding an array of labels; a Label *class* that has an instance variable holding the string name of the label; and a *Mailbox* class that has an instance variable holding an array of *EmailMessage* objects.

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

*   The *Labeling* concept includes in its state the entire collection of items that are labeled (the state component is in fact just a relation from items to labels)
*   The *Item* type is generic, and can be instantiated at runtime with any type (such as an email message)
*   Unlike in the object-oriented case, there is no conflation of concerns. This concept handles only labeling, unlike in the OO case where the *EmailMessage* class has a label instance variable and thus conflates labeling with other email message functions.
*   This concept is behaviorally complete, unlike the *Label* class in the OO case, which would not be usable alone. In particular, this concept allows the addition, deletion and querying of labels; in the OO design, addition and deletion would belong to the *EmailMessage* class, and querying on a label would involve both the *Mailbox* and *EmailMessage* classes.

Despite these caveats, concepts are usually implemented as object oriented classes. There is usually just one instance of the concept at runtime that handles all the relevant objects. This instance is created by calling the constructor of the class that implements the concept.

# Concept Implementation

Concepts can be implemented as a single TypeScript class, and must obey the following properties:

1.  No import statements can reference another concept in any way, including type declarations.
2.  All methods are either actions or queries from the spec: query methods are named beginning with a `_` character.
3.  Every action must take a single argument, and output a single argument: both of these are a dictionary/JSON object with primitive values (no custom objects).

For our specific implementation, we will use MongoDB as the database. Each piece of the concept spec is mapped onto the implementation as follows:

*   **concept**: the name of the class is {name} + Concept
*   **purpose**: the purpose is kept and versioned alongside the code in documentation
*   **principle**: the principle helps establish a canonical test and models out desirable behavior
*   **state**: the state relations can be mapped directly to the MongoDB collections
*   **actions**: each action is a method of the same name, and takes in a dictionary with the keys described by the action parameters in the specification with the specified types
*   **queries**: potential queries are also methods, but must begin with an underscore `_`, and instead return an array of the type specified by their return

## Technology stack details

*   Make sure that each action/method preserves its **requires**, and performs the specified **effects** in terms of its updates on the MongoDB collection.
*   It should be possible to confirm any expectations for what the state looks like when described in **effects** or **principle** using the chosen set of **queries**.
*   Use the Deno runtime to minimize setup, and qualified imports such as `import { Collection, Db } from "npm:mongodb";`

# approach: steps to implementation

The following prefix format for header 1 blocks denote the relevant steps:

*   `# concept: {name}`
    *   A specification of the concept we're looking to implement
*   `# file: src/{name}/{name}Concept.ts`
    *   The implementation of the concept class as a TypeScript code block
*   `# problem:`
    *   Description of any issues that arise with running/operating the implementation
*   `# solution:`
    *   A proposed solution, followed by any updates through a `# file:` block

# Generic Parameters: managing IDs

When using MongoDB, ignore the usage of ObjectId, and instead store all state as strings. To simplify and maintain typing, we provide a helper utility type that is identical to a string, but uses type branding to remain useful as a generic ID type:

```typescript
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

type Item = ID;

// Override _id when inserting into MongoDB
const item = {
	_id: freshID(),
};
```

An `ID` can be otherwise treated as a string for the purposes of insertion. When inserting new documents into MongoDB collections, override the `_id` field with a fresh ID using the provided utility function.

If you need to manually create an ID (e.g. during testing), simply assert that the string is of the same type:

```typescript
import { ID } from "@utils/types.ts";

const userA = "user:Alice" as ID;
```

# Creating concepts and their state

Each top level concept state is a property associated with that collection. For example, for the following Labeling concept:

```concept
concept Labeling [Item]
state

a set of Items with
    a labels set of Label
a set of Labels with
    a name String

actions

createLabel (name: String)
addLabel (item: Item, label: Label)
deleteLabel (item: Item, label: Label)
```

you would have the following class properties and constructor:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Declare collection prefix, use concept name
const PREFIX = "Labeling" + ".";

// Generic types of this concept
type Item = ID;
type Label = ID;

/**
 * a set of Items with
 *   a labels set of Label
 */
interface Items {
  _id: Item;
  labels: Label[];
}

/**
 * a set of Labels with
 *   a name String
 */
interface Labels {
  _id: Label;
  name: string;
}

export default class LabelingConcept {
  items: Collection<Items>;
  labels: Collection<Labels>;
  constructor(private readonly db: Db) {
    this.items = this.db.collection(PREFIX + "items");
    this.labels = this.db.collection(PREFIX + "labels");
  }
  createLabel({ name }: { name: string }): Empty {
    // todo: create label
    return {};
  }
  addLabel({ item, label }: { item: Item; label: Label }): Empty {
    // todo: add label
    return {};
  }
  deleteLabel({ item, label }: { item: Item; label: Label }): Empty {
    // todo: delete label
    return {};
  }
}
```

Note that even for actions that don't want to return anything, you should return an empty record `{}`. To denote the type of this properly, you can use the provided `Empty` type from `@utils/types.ts` which simply specifies the type as `Record<PropertyKey, never>`.

# Initialization

We provide a helper database script in `@utils` that reads the environment variables in your `.env` file and initializes a MongoDB database. For normal app development, use:

```typescript
import {getDb} from "@utils/database.ts";
import SessioningConcept from "@concepts/SessioningConcept.ts"

const [db, client] = await getDb(); // returns [Db, MongoClient]
```

# Error handling

Only throw errors when they are truly exceptional. Otherwise, all normal errors should be caught, and instead return a record `{error: "the error message"}` to allow proper future synchronization with useful errors.

# Documentation

Every concept should have inline documentation and commenting:

*   The concept itself should be paired with its purpose.
*   The state should be described next to any types.
*   Any testing should be guided by the principle.
*   Each action should state the requirements and effects, and tests should check that both work against variations.

# concept: UserAuthentication

**concept** UserAuthentication

**purpose** limit User access to particular subset of resources

**principle** a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user and view the resources they have access to. They can also *update* their password as needed. If that person was the first user to register then they automatically are the admin, and have access to all resources. Administrators can *grantAdmin* to other users if necessary and *deleteUser* their own account as long as there is still another admin.

**state**\
    a set of Users with\
        a username String\
        a password String\
        an admin flag Bool\\

**actions**\
    register (username: String, password: String):\
            **requires** no User exists with username\
            **effects** creates new User w/ username and password, if first user created admin flag set to true\
    authenticate (username: String, password: String): (user: User)\
            **requires** User exists with that username and password\
            **effects** authenticated as returned User and can view other concepts data that User has
    deleteUser (userToDelete: User)\
            **requires**\
                `userToDelete` is in `Users`\
                and calling user is `userToDelete` or is an admin\
                and (not `userToDelete.admin` or (count(u in Users where `u.admin` is true) > 1))\
            **effects** removes `userToDelete` from `Users`

    grantAdmin (targetUser: User)\
            **requires**\
                `targetUser` is in `Users`\
                and function caller is admin\
            **effects** sets `targetUser.admin` to true

    updatePassword (user: User, oldPassword: String, newPassword: String):\
            **requires**\
                `user` is in `Users`\
                and `user.password` matches `oldPassword`\
                and calling user is `user` or is an admin\
            **effects** `user.password` is set to `newPassword`

**queries**
    \_getIsUserAdmin (user: User): (isAdmin: Bool)\
        **requires** `user` is in `Users`\
        **effects** returns `user.admin`

    \_getListOfUsers (): (users: set of User)\
        **requires** true\
        **effects** returns the set of all `Users`

    \_getNumberOfAdmins (): (count: Number)\
        **requires** true\
        **effects** returns count(u in Users where `u.admin` is true)

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix, using concept name
const PREFIX = "UserAuthentication.";

// The `User` type within this concept is an externally defined generic ID.
type User = ID;

/**
 * State declaration for the UserAuthentication concept:
 * a set of Users with
 *   a username String
 *   a password String
 *   an admin flag Bool
 */
interface UsersDoc {
  _id: User;
  username: string;
  password: string; // In a real application, passwords should always be hashed and never stored in plaintext. For this exercise, we follow the specification's explicit type.
  admin: boolean;
}

// --- Action and Query Input/Output Types ---

// register (username: String, password: String): (user: User) | (error: String)
type RegisterInput = { username: string; password: string };
type RegisterOutput = { user: User } | { error: string };

// authenticate (username: String, password: String): (user: User) | (error: String)
type AuthenticateInput = { username: string; password: string };
type AuthenticateOutput = { user: User } | { error: string };

// deleteUser (userToDelete: User): { success: true } | (error: String)
// Per documentation, if an action can return an error, a successful non-empty dictionary is required.
type DeleteUserInput = { userToDelete: User };
type DeleteUserOutput = { success: true } | { error: string };

// grantAdmin (targetUser: User): { success: true } | (error: String)
// Per documentation, if an action can return an error, a successful non-empty dictionary is required.
type GrantAdminInput = { targetUser: User };
type GrantAdminOutput = { success: true } | { error: string };

// updatePassword (user: User, oldPassword: String, newPassword: String): { success: true } | (error: String)
// Per documentation, if an action can return an error, a successful non-empty dictionary is required.
type UpdatePasswordInput = { user: User; oldPassword: string; newPassword: string };
type UpdatePasswordOutput = { success: true } | { error: string };

// _getIsUserAdmin (user: User): (isAdmin: Bool) | (error: String)
// Returns error if user not found.
type GetIsUserAdminInput = { user: User };
type GetIsUserAdminOutput = { isAdmin: boolean } | { error: string };

// _getListOfUsers (): (users: set of User)
// No error specified, returns list of user IDs.
type GetListOfUsersOutput = { users: User[] };

// _getNumberOfAdmins (): (count: Number)
// No error specified, returns count.
type GetNumberOfAdminsOutput = { count: number };

/**
 * concept UserAuthentication
 * purpose: limit User access to particular subset of resources
 * principle: a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user and view the resources they have access to. They can also *update* their password as needed. If that person was the first user to register then they automatically are the admin, and have access to all resources. Administrators can manage other users, including granting or revoking administrative privileges and deleting users, provided a minimum number of administrators are maintained.
 */
export default class UserAuthenticationConcept {
  private users: Collection<UsersDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Helper function to internally count administrators.
   */
  private async _getNumberOfAdminsInternal(): Promise<number> {
    return await this.users.countDocuments({ admin: true });
  }

  /**
   * register (username: String, password: String): (user: User)
   *   requires: no User exists with username
   *   effects: creates new User w/ username and password, if first user created admin flag set to true
   */
  async register(
    input: RegisterInput,
  ): Promise<RegisterOutput> {
    const { username, password } = input;

    // Precondition: no User exists with username
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `User with username '${username}' already exists.` };
    }

    const newUser: UsersDoc = {
      _id: freshID() as User, // Generate a fresh ID for the new user
      username,
      password, // Storing as-is based on spec. In production, this should be hashed.
      admin: false, // Default to non-admin
    };

    // Effect: If this is the very first user, grant them admin privileges
    const userCount = await this.users.countDocuments({});
    if (userCount === 0) {
      newUser.admin = true;
    }

    // Effect: Creates the new user in the database
    await this.users.insertOne(newUser);
    return { user: newUser._id }; // Return the ID of the newly created user
  }

  /**
   * authenticate (username: String, password: String): (user: User)
   *   requires: User exists with that username and password
   *   effects: authenticated as returned User and can view other concepts data that User has
   */
  async authenticate(
    input: AuthenticateInput,
  ): Promise<AuthenticateOutput> {
    const { username, password } = input;

    // Precondition: User exists with that username and password
    const user = await this.users.findOne({ username, password }); // In production, compare hashed passwords
    if (!user) {
      return { error: "Invalid username or password." };
    }

    // Effect: Successfully authenticated, return the user's ID
    return { user: user._id };
  }

  /**
   * deleteUser (userToDelete: User): { success: true }
   *   requires:
   *     `userToDelete` is in `Users`
   *     and (not `userToDelete.admin` or (count(u in Users where `u.admin` is true) > 1))
   *   effects: removes `userToDelete` from `Users`
   *
   *   Note: The precondition "calling user is `userToDelete` or is an admin" is an authorization concern
   *   that is expected to be handled externally by a synchronization rule or an access control layer,
   *   not by the concept itself for independence.
   */
  async deleteUser(
    input: DeleteUserInput,
  ): Promise<DeleteUserOutput> {
    const { userToDelete } = input;

    // Precondition 1: `userToDelete` is in `Users`
    const targetUserDoc = await this.users.findOne({ _id: userToDelete });
    if (!targetUserDoc) {
      return { error: `User with ID '${userToDelete}' not found.` };
    }

    // Precondition 2: Cannot delete an admin if they are the last one
    if (targetUserDoc.admin) {
      const adminCount = await this._getNumberOfAdminsInternal();
      if (adminCount <= 1) {
        return { error: "Cannot delete the last administrator." };
      }
    }

    // Effect: Removes `userToDelete` from `Users` collection
    await this.users.deleteOne({ _id: userToDelete });
    return { success: true };
  }

  /**
   * grantAdmin (targetUser: User): { success: true }
   *   requires: `targetUser` is in `Users`
   *   effects: sets `targetUser.admin` to true
   *
   *   Note: The precondition "function caller is admin" is an authorization concern
   *   that is expected to be handled externally by a synchronization rule or an access control layer,
   *   not by the concept itself for independence.
   */
  async grantAdmin(
    input: GrantAdminInput,
  ): Promise<GrantAdminOutput> {
    const { targetUser } = input;

    // Precondition: `targetUser` is in `Users`
    const targetUserDoc = await this.users.findOne({ _id: targetUser });
    if (!targetUserDoc) {
      return { error: `User with ID '${targetUser}' not found.` };
    }

    // Check if user is already an admin (idempotency)
    if (targetUserDoc.admin) {
      return { error: `User '${targetUser}' is already an admin.` };
    }

    // Effect: Sets `targetUser.admin` flag to true
    await this.users.updateOne(
      { _id: targetUser },
      { $set: { admin: true } },
    );
    return { success: true };
  }

  /**
   * updatePassword (user: User, oldPassword: String, newPassword: String): { success: true }
   *   requires:
   *     `user` is in `Users`
   *     and `user.password` matches `oldPassword`
   *   effects: `user.password` is set to `newPassword`
   *
   *   Note: The precondition "calling user is `user` or is an admin" is an authorization concern
   *   that is expected to be handled externally by a synchronization rule or an access control layer,
   *   not by the concept itself for independence.
   */
  async updatePassword(
    input: UpdatePasswordInput,
  ): Promise<UpdatePasswordOutput> {
    const { user, oldPassword, newPassword } = input;

    // Precondition 1: `user` is in `Users`
    const targetUserDoc = await this.users.findOne({ _id: user });
    if (!targetUserDoc) {
      return { error: `User with ID '${user}' not found.` };
    }

    // Precondition 2: `user.password` matches `oldPassword`
    if (targetUserDoc.password !== oldPassword) {
      return { error: "Old password does not match." };
    }

    // Effect: `user.password` is set to `newPassword`
    await this.users.updateOne(
      { _id: user },
      { $set: { password: newPassword } },
    );
    return { success: true };
  }

  /**
   * _getIsUserAdmin (user: User): (isAdmin: Bool)
   *   requires: `user` is in `Users`
   *   effects: returns `user.admin` status
   */
  async _getIsUserAdmin(
    input: GetIsUserAdminInput,
  ): Promise<GetIsUserAdminOutput> {
    const { user } = input;

    // Precondition: `user` is in `Users`
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User with ID '${user}' not found.` };
    }

    // Effect: Returns the admin status of the user
    return { isAdmin: userDoc.admin };
  }

  /**
   * _getListOfUsers (): (users: set of User)
   *   requires: true (always accessible)
   *   effects: returns the set of all `Users` IDs
   */
  async _getListOfUsers(): Promise<GetListOfUsersOutput> {
    // Effect: Returns IDs of all users
    const userDocs = await this.users.find({}, { projection: { _id: 1 } })
      .toArray();
    return { users: userDocs.map((doc) => doc._id) };
  }

  /**
   * _getNumberOfAdmins (): (count: Number)
   *   requires: true (always accessible)
   *   effects: returns count of users where `u.admin` is true
   */
  async _getNumberOfAdmins(): Promise<GetNumberOfAdminsOutput> {
    // Effect: Returns the count of administrators
    const count = await this._getNumberOfAdminsInternal();
    return { count };
  }
}
```