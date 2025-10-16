---
timestamp: 'Wed Oct 15 2025 08:01:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_080102.e30ad111.md]]'
content_id: a012234cbf381d4c0b4ed3507d8a146ad533690a240de5d175010b4474f4bd7c
---

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
 * principle: a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user and view the resources they have access to. If that person was the first user to register then they automatically are the admin, and have access to all resources. Administrators can manage other users, including granting or revoking administrative privileges and deleting users, provided a minimum number of administrators are maintained.
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

The original concept is forgetting that users may want to change their passwords.

Please create new action to updatePassword.

Update both the concept and the implementation.
