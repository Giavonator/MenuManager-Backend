---
timestamp: 'Wed Oct 15 2025 07:40:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_074008.1df3741a.md]]'
content_id: 96e735e9ae1cfcdccbe7065e30b9025bc8e8ca91dca6dab8738acb62bf08eda9
---

# response:

## # file: src/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication Concept: Principle Demonstration with Jack and Jill", async (t) => {
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackUsername = "jack";
  const jackPassword = "password123";
  const jillUsername = "jill";
  const jillPassword = "password456";

  let jackUser: ID;
  let jillUser: ID;

  // Principle: A person is *registered* as a User with a username and password,
  // afterwards that person can *authenticate* as their registered user and view the resources they have access to.
  // If that person was the first user to register then they automatically are the admin, and have access to all resources.
  // Administrators can *grantAdmin* to other users if necessary and *deleteUser* their own account
  // as long as there is still another admin.

  await t.step("1. Create first user (Jack) - should be admin", async () => {
    const registerJackResult = await userAuth.register({
      username: jackUsername,
      password: jackPassword,
    });
    assertEquals(
      "user" in registerJackResult,
      true,
      "Jack's registration should succeed",
    );
    jackUser = (registerJackResult as { user: ID }).user;

    const authJackResult = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    assertEquals("user" in authJackResult, true, "Jack should be able to authenticate");
    assertEquals((authJackResult as { user: ID }).user, jackUser, "Authenticated user should be Jack");

    const jackIsAdmin = await userAuth._getIsUserAdmin({ user: jackUser });
    assertEquals(
      "isAdmin" in jackIsAdmin,
      true,
      "Query for Jack's admin status should succeed",
    );
    assertEquals(
      (jackIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Jack should be an admin (first user)",
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertEquals(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after Jack registers",
    );
  });

  await t.step("2. Create second user (Jill) - should not be admin", async () => {
    const registerJillResult = await userAuth.register({
      username: jillUsername,
      password: jillPassword,
    });
    assertEquals(
      "user" in registerJillResult,
      true,
      "Jill's registration should succeed",
    );
    jillUser = (registerJillResult as { user: ID }).user;

    const authJillResult = await userAuth.authenticate({
      username: jillUsername,
      password: jillPassword,
    });
    assertEquals("user" in authJillResult, true, "Jill should be able to authenticate");
    assertEquals((authJillResult as { user: ID }).user, jillUser, "Authenticated user should be Jill");

    const jillIsAdmin = await userAuth._getIsUserAdmin({ user: jillUser });
    assertEquals(
      "isAdmin" in jillIsAdmin,
      true,
      "Query for Jill's admin status should succeed",
    );
    assertEquals(
      (jillIsAdmin as { isAdmin: boolean }).isAdmin,
      false,
      "Jill should not be an admin (not the first user)",
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertEquals(
      (adminCount as { count: number }).count,
      1,
      "Should still be 1 admin after Jill registers",
    );
  });

  await t.step("3. Jack (admin) grants admin to Jill", async () => {
    // Note: The concept doesn't enforce "calling user is admin", external syncs handle this.
    const grantAdminResult = await userAuth.grantAdmin({ targetUser: jillUser });
    assertEquals(
      "success" in grantAdminResult,
      true,
      "Granting admin to Jill should succeed",
    );
    assertEquals(
      (grantAdminResult as { success: true }).success,
      true,
      "Grant admin operation should return success",
    );

    const jillIsAdminAfterGrant = await userAuth._getIsUserAdmin({
      user: jillUser,
    });
    assertEquals(
      (jillIsAdminAfterGrant as { isAdmin: boolean }).isAdmin,
      true,
      "Jill should now be an admin",
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertEquals(
      (adminCount as { count: number }).count,
      2,
      "Should be 2 admins after Jill is granted admin",
    );
  });

  await t.step("4. Jack (original admin) deletes his own account", async () => {
    // Jack can delete his account because Jill is now also an admin, so there will be > 1 admin remaining.
    // Note: The concept doesn't enforce "calling user is userToDelete or is an admin", external syncs handle this.
    const deleteJackResult = await userAuth.deleteUser({
      userToDelete: jackUser,
    });
    assertEquals(
      "success" in deleteJackResult,
      true,
      "Jack's account deletion should succeed",
    );
    assertEquals(
      (deleteJackResult as { success: true }).success,
      true,
      "Jack's deletion operation should return success",
    );

    const currentUsers = await userAuth._getListOfUsers();
    assertEquals(
      (currentUsers as { users: ID[] }).users.length,
      1,
      "Only 1 user should remain in the system",
    );
    assertEquals(
      (currentUsers as { users: ID[] }).users[0],
      jillUser,
      "The remaining user should be Jill",
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertEquals(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after Jack's deletion (Jill)",
    );

    const authJackAttempt = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    assertEquals("error" in authJackAttempt, true, "Jack should no longer be able to authenticate");
    assertEquals(
      (authJackAttempt as { error: string }).error,
      "Invalid username or password.",
      "Authentication for deleted user should fail with correct error",
    );
  });

  await client.close();
});
```

## # trace:

This trace demonstrates the `UserAuthentication` concept's principle through a sequence of actions involving two users, Jack and Jill.

1. **Jack registers as the first user**:
   * **Action**: `UserAuthentication.register({ username: "jack", password: "password123" })`
   * **Expected Output**: `{ user: jackID }` (a new `ID` for Jack)
   * **State Change**: A new `User` record is created for Jack. Since he is the first user, his `admin` flag is automatically set to `true`.
   * **Verification**:
     * `UserAuthentication.authenticate({ username: "jack", password: "password123" })` successfully returns `{ user: jackID }`.
     * `UserAuthentication._getIsUserAdmin({ user: jackID })` returns `{ isAdmin: true }`.
     * `UserAuthentication._getNumberOfAdmins()` returns `{ count: 1 }`.

2. **Jill registers as a second user**:
   * **Action**: `UserAuthentication.register({ username: "jill", password: "password456" })`
   * **Expected Output**: `{ user: jillID }` (a new `ID` for Jill)
   * **State Change**: A new `User` record is created for Jill. As she is not the first user, her `admin` flag defaults to `false`.
   * **Verification**:
     * `UserAuthentication.authenticate({ username: "jill", password: "password456" })` successfully returns `{ user: jillID }`.
     * `UserAuthentication._getIsUserAdmin({ user: jillID })` returns `{ isAdmin: false }`.
     * `UserAuthentication._getNumberOfAdmins()` still returns `{ count: 1 }` (only Jack is an admin).

3. **Jack (admin) grants admin privileges to Jill**:
   * **Action**: `UserAuthentication.grantAdmin({ targetUser: jillID })`
   * **Expected Output**: `{ success: true }`
   * **State Change**: Jill's `admin` flag is updated from `false` to `true`. (The concept assumes external synchronization ensures Jack, as an admin, is authorized to perform this action).
   * **Verification**:
     * `UserAuthentication._getIsUserAdmin({ user: jillID })` now returns `{ isAdmin: true }`.
     * `UserAuthentication._getNumberOfAdmins()` now returns `{ count: 2 }`.

4. **Jack (original admin) deletes his own account**:
   * **Action**: `UserAuthentication.deleteUser({ userToDelete: jackID })`
   * **Expected Output**: `{ success: true }`
   * **State Change**: Jack's `User` record is removed from the system. This action is permitted because, even though Jack is an admin, Jill is also an admin, ensuring that `count(u in Users where u.admin is true) > 1` holds before Jack's deletion. (The concept assumes external synchronization handles the "calling user is `userToDelete` or is an admin" authorization).
   * **Verification**:
     * `UserAuthentication._getListOfUsers()` returns `{ users: [jillID] }`, confirming Jack's removal.
     * `UserAuthentication._getNumberOfAdmins()` returns `{ count: 1 }` (only Jill remains as an admin).
     * Attempting `UserAuthentication.authenticate({ username: "jack", password: "password123" })` returns `{ error: "Invalid username or password." }`, confirming Jack's account no longer exists.
