[@UserAuthenticationConcept](../../../src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts)

[@testing-concepts](../../background/testing-concepts.md)

Create "UserAuthentication - Case 1 (Enforce User Differentiation)" with steps:
1. Create first admin user Pedro.
2. Attempt to create a new user Pedro, but with different password (should fail).

# create test case above

# response:

To create the "UserAuthentication - Case 1 (Enforce User Differentiation)" test case, we'll add a new `Deno.test` block to the existing file. This test will focus on ensuring that usernames are unique and that a second registration attempt with the same username (even with a different password) correctly fails.

```typescript
// file: src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication - Operating Principle", async (t) => {
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackUsername = "jack";
  const jackPassword = "password123";
  const jillUsername = "jill";
  const jillPassword = "password456";

  let jackUser: ID;
  let jillUser: ID;

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
    assertEquals(
      "user" in authJackResult,
      true,
      "Jack should be able to authenticate",
    );
    assertEquals(
      (authJackResult as { user: ID }).user,
      jackUser,
      "Authenticated user should be Jack",
    );

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

  await t.step(
    "2. Create second user (Jill) - should not be admin",
    async () => {
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
      assertEquals(
        "user" in authJillResult,
        true,
        "Jill should be able to authenticate",
      );
      assertEquals(
        (authJillResult as { user: ID }).user,
        jillUser,
        "Authenticated user should be Jill",
      );

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
    },
  );

  await t.step("3. Jack (admin) grants admin to Jill", async () => {
    // Note: The concept doesn't enforce "calling user is admin", external syncs handle this.
    const grantAdminResult = await userAuth.grantAdmin({
      targetUser: jillUser,
    });
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
    assertEquals(
      "error" in authJackAttempt,
      true,
      "Jack should no longer be able to authenticate",
    );
    assertEquals(
      (authJackAttempt as { error: string }).error,
      "Invalid username or password.",
      "Authentication for deleted user should fail with correct error",
    );
  });

  await client.close();
});

// # trace:
// This trace demonstrates the enforcement of unique usernames in UserAuthentication.
// It verifies that after an initial user is registered, attempting to register another user
// with the exact same username but a different password correctly results in an error,
// indicating that usernames must be unique identifiers within the system.

Deno.test("UserAuthentication - Case 1 (Enforce User Differentiation)", async (t) => {
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const pedroUsername = "pedro";
  const pedroPassword1 = "securepassword1";
  const pedroPassword2 = "anotherpassword2"; // Different password for the second attempt

  let pedroUser: ID;

  await t.step("1. Create first admin user Pedro", async () => {
    const registerPedroResult = await userAuth.register({
      username: pedroUsername,
      password: pedroPassword1,
    });

    assertEquals(
      "user" in registerPedroResult,
      true,
      "Pedro's initial registration should succeed",
    );
    pedroUser = (registerPedroResult as { user: ID }).user;

    // Optional: Verify Pedro is admin (as the first user)
    const pedroIsAdmin = await userAuth._getIsUserAdmin({ user: pedroUser });
    assertEquals(
      (pedroIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Pedro should be an admin as the first user",
    );
  });

  await t.step(
    "2. Attempt to create a new user Pedro, but with different password (should fail)",
    async () => {
      const registerPedroAgainResult = await userAuth.register({
        username: pedroUsername, // Same username
        password: pedroPassword2, // Different password
      });

      assertEquals(
        "error" in registerPedroAgainResult,
        true,
        "Registering with an existing username should return an error",
      );
      assertEquals(
        (registerPedroAgainResult as { error: string }).error,
        "User with this username already exists.",
        "Error message should indicate that the username is taken",
      );

      // Verify that no new user was created
      const currentUsers = await userAuth._getListOfUsers();
      assertEquals(
        (currentUsers as { users: ID[] }).users.length,
        1,
        "Only one user (Pedro) should exist in the system",
      );
      assertEquals(
        (currentUsers as { users: ID[] }).users[0],
        pedroUser,
        "The existing user should still be the original Pedro",
      );
    },
  );

  await client.close();
});
```