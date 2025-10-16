---
timestamp: 'Wed Oct 15 2025 07:28:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_072833.3c210bb0.md]]'
content_id: dc7a4ba843b6983650dfb94558e34ecfc7e6b142e80caa65b8f11008526af940
---

# response:

To implement the `UserAuthentication` concept, we'll create a TypeScript class that interacts with a MongoDB database. This class will manage user registration, authentication, and administrative privileges, adhering strictly to the concept design principles of modularity, independence, and clear separation of concerns.

Authorization checks for who *can perform* an action (e.g., "calling user is admin") are explicitly stated in the concept design philosophy to be handled by external synchronization rules, not within the concept's internal logic. Therefore, these specific authorization checks will not be implemented in the `UserAuthenticationConcept` class itself, maintaining its independence.

## # file: src/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
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
  password: string; // In a real application, passwords should always be hashed and salted, and never stored in plaintext. For this exercise, we follow the specification's explicit type.
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

    // Check if user is already an admin (idempotency, or specific error if desired)
    if (targetUserDoc.admin) {
        // As per the documentation, returning a non-empty record on success is needed if an error case exists.
        // We'll treat trying to grant admin to an existing admin as a "successful no-op" or a specific error.
        // For this implementation, we return an error to be explicit about the status not changing.
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
    const userDocs = await this.users.find({}, { projection: { _id: 1 } }).toArray();
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

## # file: src/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthenticationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Initialize test users
  let aliceID: ID;
  let bobID: ID;
  let charlieID: ID;

  await t.step("Test 1: Fulfilling the Operating Principle", async (t_principle) => {
    // principle: a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user and view the resources they have access to. If that person was the first user to register then they automatically are the admin, and have access to all resources. Administrators can *grantAdmin* to other users if necessary and *deleteUser* their own account as long as there is still another admin.

    await t_principle.step("1. Register Alice (first user, should be admin)", async () => {
      const result = await concept.register({ username: "alice", password: "passwordA" });
      assertExists((result as { user: ID }).user, "Alice should be registered successfully");
      aliceID = (result as { user: ID }).user;
      const isAdminResult = await concept._getIsUserAdmin({ user: aliceID });
      assertEquals((isAdminResult as { isAdmin: boolean }).isAdmin, true, "Alice should be an admin");
      const adminCount = await concept._getNumberOfAdmins();
      assertEquals(adminCount.count, 1, "There should be exactly one admin (Alice)");
    });

    await t_principle.step("2. Register Bob (second user, shouldn't be admin)", async () => {
      const result = await concept.register({ username: "bob", password: "passwordB" });
      assertExists((result as { user: ID }).user, "Bob should be registered successfully");
      bobID = (result as { user: ID }).user;
      const isAdminResult = await concept._getIsUserAdmin({ user: bobID });
      assertEquals((isAdminResult as { isAdmin: boolean }).isAdmin, false, "Bob should not be an admin");
      const adminCount = await concept._getNumberOfAdmins();
      assertEquals(adminCount.count, 1, "There should still be only one admin (Alice)");
    });

    await t_principle.step("3. Alice (admin) grants admin to Bob", async () => {
      // Note: external sync would verify 'calling user is admin' before this call
      const result = await concept.grantAdmin({ targetUser: bobID });
      assertNotEquals((result as { error: string }).error, "User 'bobID' is already an admin.", "Granting admin to Bob should succeed");
      const isAdminResult = await concept._getIsUserAdmin({ user: bobID });
      assertEquals((isAdminResult as { isAdmin: boolean }).isAdmin, true, "Bob should now be an admin");
      const adminCount = await concept._getNumberOfAdmins();
      assertEquals(adminCount.count, 2, "There should now be two admins (Alice and Bob)");
    });

    await t_principle.step("4. Alice (admin) deletes her own account (now with another admin present)", async () => {
      // Note: external sync would verify 'calling user is userToDelete or is admin'
      const result = await concept.deleteUser({ userToDelete: aliceID });
      assertNotEquals((result as { error: string }).error, "Cannot delete the last administrator.", "Deleting Alice should succeed as Bob is also an admin");

      const usersList = await concept._getListOfUsers();
      assertEquals(usersList.users.includes(aliceID), false, "Alice should no longer be in the users list");
      assertEquals(usersList.users.includes(bobID), true, "Bob should still be in the users list");

      const adminCount = await concept._getNumberOfAdmins();
      assertEquals(adminCount.count, 1, "There should now be only one admin (Bob)");
      const bobIsAdmin = await concept._getIsUserAdmin({ user: bobID });
      assertEquals((bobIsAdmin as { isAdmin: boolean }).isAdmin, true, "Bob should still be an admin");
    });
  });

  await t.step("Unit Tests for Actions and Queries", async (t_unit) => {
    // Reset the database state for unit tests
    await db.dropDatabase();
    await concept.register({ username: "unit_alice", password: "pA" });
    const authResult = await concept.authenticate({ username: "unit_alice", password: "pA" });
    const unitAliceID = (authResult as { user: ID }).user;
    
    await concept.register({ username: "unit_bob", password: "pB" });
    const authResultBob = await concept.authenticate({ username: "unit_bob", password: "pB" });
    const unitBobID = (authResultBob as { user: ID }).user;

    await t_unit.step("register action", async (t_register) => {
      await t_register.step("should register a new user successfully", async () => {
        const result = await concept.register({ username: "charlie", password: "passwordC" });
        assertExists((result as { user: ID }).user, "Charlie should be registered successfully");
        charlieID = (result as { user: ID }).user;
        const users = await concept._getListOfUsers();
        assertEquals(users.users.length, 3, "There should be 3 users");
      });

      await t_register.step("should prevent registering with an existing username", async () => {
        const result = await concept.register({ username: "charlie", password: "anotherpassword" });
        assertEquals((result as { error: string }).error, "User with username 'charlie' already exists.", "Should return an error for duplicate username");
      });
    });

    await t_unit.step("authenticate action", async (t_authenticate) => {
      await t_authenticate.step("should authenticate with correct credentials", async () => {
        const result = await concept.authenticate({ username: "charlie", password: "passwordC" });
        assertExists((result as { user: ID }).user, "Authentication for Charlie should succeed");
        assertEquals((result as { user: ID }).user, charlieID, "Authenticated user ID should match Charlie's ID");
      });

      await t_authenticate.step("should fail with incorrect password", async () => {
        const result = await concept.authenticate({ username: "charlie", password: "wrongpassword" });
        assertEquals((result as { error: string }).error, "Invalid username or password.", "Should return an error for incorrect password");
      });

      await t_authenticate.step("should fail with non-existent username", async () => {
        const result = await concept.authenticate({ username: "diana", password: "passwordD" });
        assertEquals((result as { error: string }).error, "Invalid username or password.", "Should return an error for non-existent username");
      });
    });

    await t_unit.step("deleteUser action", async (t_delete) => {
      await t_delete.step("should delete a non-admin user", async () => {
        // unit_bob is currently not an admin (first user unit_alice is admin)
        const result = await concept.deleteUser({ userToDelete: unitBobID });
        assertEquals((result as { success: true }).success, true, "Deleting unit_bob should succeed");
        const users = await concept._getListOfUsers();
        assertEquals(users.users.includes(unitBobID), false, "unit_bob should be removed from the users list");
      });

      await t_delete.step("should prevent deleting the last admin", async () => {
        // After deleting unit_bob, unit_alice is the only user and the only admin
        const result = await concept.deleteUser({ userToDelete: unitAliceID });
        assertEquals((result as { error: string }).error, "Cannot delete the last administrator.", "Should return an error for deleting the last admin");
      });

      await t_delete.step("should delete an admin if other admins exist (re-register bob, make him admin)", async () => {
        await concept.register({ username: "temp_bob", password: "pB" });
        const tempBobResult = await concept.authenticate({ username: "temp_bob", password: "pB" });
        const tempBobID = (tempBobResult as { user: ID }).user;

        await concept.grantAdmin({ targetUser: tempBobID }); // unit_alice and temp_bob are now admins

        const result = await concept.deleteUser({ userToDelete: unitAliceID });
        assertEquals((result as { success: true }).success, true, "Deleting unit_alice (an admin) should succeed as temp_bob is also admin");
        const users = await concept._getListOfUsers();
        assertEquals(users.users.includes(unitAliceID), false, "unit_alice should be removed");
        const adminCount = await concept._getNumberOfAdmins();
        assertEquals(adminCount.count, 1, "There should now be 1 admin (temp_bob)");
      });

      await t_delete.step("should return error for non-existent user", async () => {
        const nonExistentID = "nonExistent" as ID;
        const result = await concept.deleteUser({ userToDelete: nonExistentID });
        assertEquals((result as { error: string }).error, `User with ID '${nonExistentID}' not found.`, "Should return an error for non-existent user");
      });
    });

    await t_unit.step("grantAdmin action", async (t_grant) => {
      // Re-register unit_alice as non-admin for this test, as she was deleted
      await db.dropDatabase();
      await concept.register({ username: "unit_alice", password: "pA" });
      const authResult = await concept.authenticate({ username: "unit_alice", password: "pA" });
      const aliceNewID = (authResult as { user: ID }).user; // Alice is admin
      
      await concept.register({ username: "unit_bob", password: "pB" });
      const authResultBob = await concept.authenticate({ username: "unit_bob", password: "pB" });
      const bobNewID = (authResultBob as { user: ID }).user; // Bob is not admin

      await t_grant.step("should grant admin privileges to a non-admin user", async () => {
        const result = await concept.grantAdmin({ targetUser: bobNewID });
        assertEquals((result as { success: true }).success, true, "Granting admin to unit_bob should succeed");
        const isAdminResult = await concept._getIsUserAdmin({ user: bobNewID });
        assertEquals((isAdminResult as { isAdmin: boolean }).isAdmin, true, "unit_bob should now be an admin");
      });

      await t_grant.step("should return error if target user is already an admin", async () => {
        const result = await concept.grantAdmin({ targetUser: bobNewID });
        assertEquals((result as { error: string }).error, `User '${bobNewID}' is already an admin.`, "Should return an error for granting admin to an already admin user");
      });

      await t_grant.step("should return error for non-existent user", async () => {
        const nonExistentID = "nonExistent" as ID;
        const result = await concept.grantAdmin({ targetUser: nonExistentID });
        assertEquals((result as { error: string }).error, `User with ID '${nonExistentID}' not found.`, "Should return an error for non-existent user");
      });
    });

    await t_unit.step("queries", async (t_queries) => {
      // Current state: aliceNewID (admin), bobNewID (admin), charlieID (not admin - from prior tests)
      // We'll drop and reset to a clean known state for these tests.
      await db.dropDatabase();
      await concept.register({ username: "query_user1", password: "p1" });
      const u1ID = (await concept.authenticate({ username: "query_user1", password: "p1" }) as { user: ID }).user; // Admin
      
      await concept.register({ username: "query_user2", password: "p2" });
      const u2ID = (await concept.authenticate({ username: "query_user2", password: "p2" }) as { user: ID }).user; // Not admin

      await t_queries.step("_getIsUserAdmin", async () => {
        const u1IsAdmin = await concept._getIsUserAdmin({ user: u1ID });
        assertEquals((u1IsAdmin as { isAdmin: boolean }).isAdmin, true, "u1 should be admin");
        const u2IsAdmin = await concept._getIsUserAdmin({ user: u2ID });
        assertEquals((u2IsAdmin as { isAdmin: boolean }).isAdmin, false, "u2 should not be admin");
        const nonExistentIsAdmin = await concept._getIsUserAdmin({ user: "nonExistent" as ID });
        assertEquals((nonExistentIsAdmin as { error: string }).error, "User with ID 'nonExistent' not found.", "Should return error for non-existent user");
      });

      await t_queries.step("_getListOfUsers", async () => {
        const users = await concept._getListOfUsers();
        assertEquals(users.users.length, 2, "Should return 2 users");
        assertEquals(users.users.includes(u1ID), true, "Should include u1");
        assertEquals(users.users.includes(u2ID), true, "Should include u2");
      });

      await t_queries.step("_getNumberOfAdmins", async () => {
        const adminCount = await concept._getNumberOfAdmins();
        assertEquals(adminCount.count, 1, "Should return 1 admin (u1)");
        
        await concept.grantAdmin({ targetUser: u2ID });
        const updatedAdminCount = await concept._getNumberOfAdmins();
        assertEquals(updatedAdminCount.count, 2, "Should return 2 admins after granting to u2");
      });
    });
  });

  await client.close();
});
```
