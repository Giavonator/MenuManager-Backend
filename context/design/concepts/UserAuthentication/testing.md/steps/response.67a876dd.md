---
timestamp: 'Wed Oct 15 2025 07:37:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_073726.5d993ee0.md]]'
content_id: 67a876dd6ec93fbcf0204fdfa524a1f0d34cbde834a7ab834f2ce02842f2f33d
---

# response:

## # file: src/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication Concept - Operational Principle and Core Functionality", async (t) => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  // Define some user credentials
  const aliceUsername = "alice";
  const alicePassword = "password123";
  const bobUsername = "bob";
  const bobPassword = "password456";
  const charlieUsername = "charlie";
  const charliePassword = "password789";

  let aliceId: ID;
  let bobId: ID;
  let charlieId: ID;

  await t.step("0. Initial state checks: no users, no admins", async () => {
    const users = await concept._getListOfUsers();
    assertEquals(users.users.length, 0, "Initially, there should be no users.");

    const adminCount = await concept._getNumberOfAdmins();
    assertEquals(adminCount.count, 0, "Initially, there should be no admins.");
  });

  await t.step("1. Register Alice (first user, should be admin automatically)", async () => {
    const registerResult = await concept.register({
      username: aliceUsername,
      password: alicePassword,
    });
    assertNotEquals(registerResult, undefined);
    assertNotEquals((registerResult as { error: string }).error, undefined, "Expected successful registration for Alice.");
    assertObjectMatch(registerResult, { user: /^user:/ }); // Check if user ID is returned

    aliceId = (registerResult as { user: ID }).user;
    console.log(`Alice registered with ID: ${aliceId}`);

    // Verify Alice is now an admin
    const aliceIsAdmin = await concept._getIsUserAdmin({ user: aliceId });
    assertNotEquals(aliceIsAdmin.error, "User with ID 'user:' not found.", "Alice should be found.");
    assertObjectMatch(aliceIsAdmin, { isAdmin: true }, "Alice, as the first user, should be an admin.");

    // Verify admin count is 1
    const adminCount = await concept._getNumberOfAdmins();
    assertEquals(adminCount.count, 1, "There should be 1 admin after Alice registers.");

    // Verify user list contains Alice
    const users = await concept._getListOfUsers();
    assertEquals(users.users.length, 1, "There should be 1 user after Alice registers.");
    assertEquals(users.users[0], aliceId, "Alice's ID should be in the user list.");
  });

  await t.step("2. Authenticate Alice", async () => {
    const authResult = await concept.authenticate({
      username: aliceUsername,
      password: alicePassword,
    });
    assertNotEquals(authResult.error, "Invalid username or password.", "Alice should authenticate successfully.");
    assertObjectMatch(authResult, { user: aliceId }, "Authenticated user should be Alice.");

    const failedAuthResult = await concept.authenticate({
      username: aliceUsername,
      password: "wrongpassword",
    });
    assertObjectMatch(failedAuthResult, { error: "Invalid username or password." }, "Authentication with wrong password should fail.");
  });

  await t.step("3. Register Bob (second user, should NOT be admin by default)", async () => {
    const registerResult = await concept.register({
      username: bobUsername,
      password: bobPassword,
    });
    assertNotEquals(registerResult.error, "User with username 'bob' already exists.", "Expected successful registration for Bob.");
    assertObjectMatch(registerResult, { user: /^user:/ }); // Check if user ID is returned

    bobId = (registerResult as { user: ID }).user;
    console.log(`Bob registered with ID: ${bobId}`);

    // Verify Bob is NOT an admin
    const bobIsAdmin = await concept._getIsUserAdmin({ user: bobId });
    assertNotEquals(bobIsAdmin.error, "User with ID 'user:' not found.", "Bob should be found.");
    assertObjectMatch(bobIsAdmin, { isAdmin: false }, "Bob, as the second user, should not be an admin.");

    // Verify admin count is still 1
    const adminCount = await concept._getNumberOfAdmins();
    assertEquals(adminCount.count, 1, "Admin count should still be 1 after Bob registers.");

    // Verify user list contains Alice and Bob
    const users = await concept._getListOfUsers();
    assertEquals(users.users.length, 2, "There should be 2 users after Bob registers.");
    assertEquals(users.users.includes(aliceId) && users.users.includes(bobId), true, "User list should include Alice and Bob.");
  });

  await t.step("4. Alice (admin) grants admin to Bob", async () => {
    const grantResult = await concept.grantAdmin({ targetUser: bobId });
    assertNotEquals(grantResult.error, "User with ID 'user:' not found.", "Bob should be found.");
    assertObjectMatch(grantResult, { success: true }, "Grant admin to Bob should be successful.");

    // Verify Bob is now an admin
    const bobIsAdmin = await concept._getIsUserAdmin({ user: bobId });
    assertNotEquals(bobIsAdmin.error, "User with ID 'user:' not found.", "Bob should be found.");
    assertObjectMatch(bobIsAdmin, { isAdmin: true }, "Bob should now be an admin.");

    // Verify admin count is 2
    const adminCount = await concept._getNumberOfAdmins();
    assertEquals(adminCount.count, 2, "Admin count should be 2 after Bob is granted admin.");
  });

  await t.step("5. Attempt to delete Alice (should succeed, as there's another admin)", async () => {
    const deleteResult = await concept.deleteUser({ userToDelete: aliceId });
    assertNotEquals(deleteResult.error, "Cannot delete the last administrator.", "Alice's deletion should succeed as Bob is also an admin.");
    assertObjectMatch(deleteResult, { success: true }, "Alice's deletion should be successful.");

    // Verify Alice is no longer in the user list
    const users = await concept._getListOfUsers();
    assertEquals(users.users.length, 1, "There should be 1 user left after Alice's deletion.");
    assertEquals(users.users.includes(aliceId), false, "Alice should no longer be in the user list.");
    assertEquals(users.users.includes(bobId), true, "Bob should still be in the user list.");

    // Verify Bob is still an admin
    const bobIsAdmin = await concept._getIsUserAdmin({ user: bobId });
    assertNotEquals(bobIsAdmin.error, "User with ID 'user:' not found.", "Bob should still be found.");
    assertObjectMatch(bobIsAdmin, { isAdmin: true }, "Bob should remain an admin.");

    // Verify admin count is 1
    const adminCount = await concept._getNumberOfAdmins();
    assertEquals(adminCount.count, 1, "Admin count should be 1 after Alice's deletion.");
  });

  await t.step("6. Register Charlie, then try to delete Bob (the last admin)", async () => {
    // Register Charlie
    const registerCharlieResult = await concept.register({
      username: charlieUsername,
      password: charliePassword,
    });
    assertNotEquals(registerCharlieResult.error, "User with username 'charlie' already exists.", "Expected successful registration for Charlie.");
    assertObjectMatch(registerCharlieResult, { user: /^user:/ });
    charlieId = (registerCharlieResult as { user: ID }).user;
    console.log(`Charlie registered with ID: ${charlieId}`);

    // Verify Charlie is not an admin
    const charlieIsAdmin = await concept._getIsUserAdmin({ user: charlieId });
    assertObjectMatch(charlieIsAdmin, { isAdmin: false }, "Charlie should not be an admin.");

    // Try to delete Bob (who is currently the only admin)
    const deleteBobResult = await concept.deleteUser({ userToDelete: bobId });
    assertObjectMatch(deleteBobResult, { error: "Cannot delete the last administrator." }, "Deletion of the last admin (Bob) should fail.");

    // Verify Bob is still in the user list and still an admin
    const users = await concept._getListOfUsers();
    assertEquals(users.users.length, 2, "There should still be 2 users (Bob, Charlie).");
    assertEquals(users.users.includes(bobId), true, "Bob should still be in the user list.");
    const bobAfterAttemptedDeleteIsAdmin = await concept._getIsUserAdmin({ user: bobId });
    assertObjectMatch(bobAfterAttemptedDeleteIsAdmin, { isAdmin: true }, "Bob should still be an admin.");
    const adminCount = await concept._getNumberOfAdmins();
    assertEquals(adminCount.count, 1, "Admin count should still be 1.");
  });

  await t.step("7. Check for duplicate username registration failure", async () => {
    const duplicateRegisterResult = await concept.register({
      username: bobUsername, // Bob's username already exists
      password: "anotherpassword",
    });
    assertObjectMatch(duplicateRegisterResult, { error: `User with username '${bobUsername}' already exists.` }, "Registering with a duplicate username should fail.");
  });

  await t.step("8. Attempt to grant admin to a non-existent user", async () => {
    const nonExistentId = "user:nonexistent" as ID;
    const grantNonExistentResult = await concept.grantAdmin({ targetUser: nonExistentId });
    assertObjectMatch(grantNonExistentResult, { error: `User with ID '${nonExistentId}' not found.` }, "Granting admin to a non-existent user should fail.");
  });

  await t.step("9. Attempt to delete a non-existent user", async () => {
    const nonExistentId = "user:anothernonexistent" as ID;
    const deleteNonExistentResult = await concept.deleteUser({ userToDelete: nonExistentId });
    assertObjectMatch(deleteNonExistentResult, { error: `User with ID '${nonExistentId}' not found.` }, "Deleting a non-existent user should fail.");
  });

  await client.close();
});
```

## # trace: UserAuthentication Operational Principle

This trace details the sequence of actions that demonstrate the `UserAuthentication` concept's operational principle. It covers user registration, automatic admin assignment for the first user, non-admin registration, admin privilege granting, and safe admin deletion.

1. **Initial State Verification**:
   * **Action**: `_getListOfUsers()`
   * **Expected**: Returns an empty list of users.
   * **Action**: `_getNumberOfAdmins()`
   * **Expected**: Returns 0 admins.

2. **Register Alice (First User)**:
   * **Action**: `register({ username: "alice", password: "password123" })`
   * **Result**: Returns `{ user: aliceId }` (e.g., "user:ABC").
   * **Verification**:
     * `_getIsUserAdmin({ user: aliceId })` returns `{ isAdmin: true }`.
     * `_getNumberOfAdmins()` returns `{ count: 1 }`.
     * `_getListOfUsers()` returns `{ users: [aliceId] }`.

3. **Authenticate Alice**:
   * **Action**: `authenticate({ username: "alice", password: "password123" })`
   * **Result**: Returns `{ user: aliceId }`.
   * **Action**: `authenticate({ username: "alice", password: "wrongpassword" })`
   * **Result**: Returns `{ error: "Invalid username or password." }`.

4. **Register Bob (Second User)**:
   * **Action**: `register({ username: "bob", password: "password456" })`
   * **Result**: Returns `{ user: bobId }` (e.g., "user:DEF").
   * **Verification**:
     * `_getIsUserAdmin({ user: bobId })` returns `{ isAdmin: false }`.
     * `_getNumberOfAdmins()` returns `{ count: 1 }`.
     * `_getListOfUsers()` returns `{ users: [aliceId, bobId] }`.

5. **Alice Grants Admin to Bob**:
   * **Action**: `grantAdmin({ targetUser: bobId })`
   * **Result**: Returns `{ success: true }`. (Assuming an external sync confirmed Alice is an admin).
   * **Verification**:
     * `_getIsUserAdmin({ user: bobId })` returns `{ isAdmin: true }`.
     * `_getNumberOfAdmins()` returns `{ count: 2 }`.

6. **Alice Deletes Her Account**:
   * **Action**: `deleteUser({ userToDelete: aliceId })`
   * **Result**: Returns `{ success: true }`. (This is allowed because Bob is still an admin, preventing deletion of the *last* admin).
   * **Verification**:
     * `_getListOfUsers()` returns `{ users: [bobId] }`.
     * `_getIsUserAdmin({ user: bobId })` returns `{ isAdmin: true }`.
     * `_getNumberOfAdmins()` returns `{ count: 1 }`.

7. **Register Charlie and Attempt to Delete the Last Admin (Bob)**:
   * **Action**: `register({ username: "charlie", password: "password789" })`
   * **Result**: Returns `{ user: charlieId }`. Charlie is not an admin.
   * **Action**: `deleteUser({ userToDelete: bobId })`
   * **Result**: Returns `{ error: "Cannot delete the last administrator." }`. (Deletion fails because Bob is the sole remaining admin).
   * **Verification**:
     * `_getListOfUsers()` returns `{ users: [bobId, charlieId] }`.
     * `_getIsUserAdmin({ user: bobId })` returns `{ isAdmin: true }`.
     * `_getNumberOfAdmins()` returns `{ count: 1 }`.

This trace thoroughly tests the concept's core functionalities and ensures adherence to the specified principle, covering both successful and expected error scenarios.
