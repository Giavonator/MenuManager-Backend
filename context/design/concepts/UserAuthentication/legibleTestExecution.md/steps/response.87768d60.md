---
timestamp: 'Wed Oct 15 2025 09:12:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_091248.03f557f3.md]]'
content_id: 87768d601a265b752548e532cec81e4f5e82a4ba1e6077e521ca136410f8c533
---

# response:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication - Operating Principle", async (t) => {
  console.log("\n### Deno Test Case: UserAuthentication - Operating Principle\n");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackUsername = "jack";
  const jackPassword = "password123";
  const jillUsername = "jill";
  const jillPassword = "password456";

  let jackUser: ID;
  let jillUser: ID;

  await t.step("1. Create first user (Jack) - should be admin", async () => {
    console.log("  Step 1: Create first user (Jack) - should be admin");
    const registerJackResult = await userAuth.register({
      username: jackUsername,
      password: jackPassword,
    });
    console.log("    - Asserting: Jack's registration should succeed");
    assertEquals(
      "user" in registerJackResult,
      true,
      "Jack's registration should succeed",
    );
    console.log("    ✅ Jack's registration succeeded.");
    jackUser = (registerJackResult as { user: ID }).user;

    const authJackResult = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    console.log("    - Asserting: Jack should be able to authenticate");
    assertEquals(
      "user" in authJackResult,
      true,
      "Jack should be able to authenticate",
    );
    console.log("    ✅ Jack is able to authenticate.");
    console.log("    - Asserting: Authenticated user should be Jack");
    assertEquals(
      (authJackResult as { user: ID }).user,
      jackUser,
      "Authenticated user should be Jack",
    );
    console.log("    ✅ Authenticated user is Jack.");

    const jackIsAdmin = await userAuth._getIsUserAdmin({ user: jackUser });
    console.log("    - Asserting: Query for Jack's admin status should succeed");
    assertEquals(
      "isAdmin" in jackIsAdmin,
      true,
      "Query for Jack's admin status should succeed",
    );
    console.log("    ✅ Query for Jack's admin status succeeded.");
    console.log("    - Asserting: Jack should be an admin (first user)");
    assertEquals(
      (jackIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Jack should be an admin (first user)",
    );
    console.log("    ✅ Jack is an admin.");

    const adminCount = await userAuth._getNumberOfAdmins();
    console.log("    - Asserting: Should be 1 admin after Jack registers");
    assertEquals(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after Jack registers",
    );
    console.log("    ✅ There is 1 admin after Jack registers.");
  });

  await t.step(
    "2. Create second user (Jill) - should not be admin",
    async () => {
      console.log("  Step 2: Create second user (Jill) - should not be admin");
      const registerJillResult = await userAuth.register({
        username: jillUsername,
        password: jillPassword,
      });
      console.log("    - Asserting: Jill's registration should succeed");
      assertEquals(
        "user" in registerJillResult,
        true,
        "Jill's registration should succeed",
      );
      console.log("    ✅ Jill's registration succeeded.");
      jillUser = (registerJillResult as { user: ID }).user;

      const authJillResult = await userAuth.authenticate({
        username: jillUsername,
        password: jillPassword,
      });
      console.log("    - Asserting: Jill should be able to authenticate");
      assertEquals(
        "user" in authJillResult,
        true,
        "Jill should be able to authenticate",
      );
      console.log("    ✅ Jill is able to authenticate.");
      console.log("    - Asserting: Authenticated user should be Jill");
      assertEquals(
        (authJillResult as { user: ID }).user,
        jillUser,
        "Authenticated user should be Jill",
      );
      console.log("    ✅ Authenticated user is Jill.");

      const jillIsAdmin = await userAuth._getIsUserAdmin({ user: jillUser });
      console.log("    - Asserting: Query for Jill's admin status should succeed");
      assertEquals(
        "isAdmin" in jillIsAdmin,
        true,
        "Query for Jill's admin status should succeed",
      );
    console.log("    ✅ Query for Jill's admin status succeeded.");
      console.log("    - Asserting: Jill should not be an admin (not the first user)");
      assertEquals(
        (jillIsAdmin as { isAdmin: boolean }).isAdmin,
        false,
        "Jill should not be an admin (not the first user)",
      );
      console.log("    ✅ Jill is not an admin (as expected).");

      const adminCount = await userAuth._getNumberOfAdmins();
      console.log("    - Asserting: Should still be 1 admin after Jill registers");
      assertEquals(
        (adminCount as { count: number }).count,
        1,
        "Should still be 1 admin after Jill registers",
      );
      console.log("    ✅ Still 1 admin after Jill registers.");
    },
  );

  await t.step("3. Jack (admin) grants admin to Jill", async () => {
    console.log("  Step 3: Jack (admin) grants admin to Jill");
    // Note: The concept doesn't enforce "calling user is admin", external syncs handle this.
    const grantAdminResult = await userAuth.grantAdmin({
      targetUser: jillUser,
    });
    console.log("    - Asserting: Granting admin to Jill should succeed");
    assertEquals(
      "success" in grantAdminResult,
      true,
      "Granting admin to Jill should succeed",
    );
    console.log("    ✅ Granting admin to Jill succeeded.");
    console.log("    - Asserting: Grant admin operation should return success");
    assertEquals(
      (grantAdminResult as { success: true }).success,
      true,
      "Grant admin operation should return success",
    );
    console.log("    ✅ Grant admin operation returned success.");

    const jillIsAdminAfterGrant = await userAuth._getIsUserAdmin({
      user: jillUser,
    });
    console.log("    - Asserting: Jill should now be an admin");
    assertEquals(
      (jillIsAdminAfterGrant as { isAdmin: boolean }).isAdmin,
      true,
      "Jill should now be an admin",
    );
    console.log("    ✅ Jill is now an admin.");

    const adminCount = await userAuth._getNumberOfAdmins();
    console.log("    - Asserting: Should be 2 admins after Jill is granted admin");
    assertEquals(
      (adminCount as { count: number }).count,
      2,
      "Should be 2 admins after Jill is granted admin",
    );
    console.log("    ✅ There are 2 admins after Jill is granted admin.");
  });

  await t.step("4. Jack (original admin) deletes his own account", async () => {
    console.log("  Step 4: Jack (original admin) deletes his own account");
    // Jack can delete his account because Jill is now also an admin, so there will be > 1 admin remaining.
    // Note: The concept doesn't enforce "calling user is userToDelete or is an admin", external syncs handle this.
    const deleteJackResult = await userAuth.deleteUser({
      userToDelete: jackUser,
    });
    console.log("    - Asserting: Jack's account deletion should succeed");
    assertEquals(
      "success" in deleteJackResult,
      true,
      "Jack's account deletion should succeed",
    );
    console.log("    ✅ Jack's account deletion succeeded.");
    console.log("    - Asserting: Jack's deletion operation should return success");
    assertEquals(
      (deleteJackResult as { success: true }).success,
      true,
      "Jack's deletion operation should return success",
    );
    console.log("    ✅ Jack's deletion operation returned success.");

    const currentUsers = await userAuth._getListOfUsers();
    console.log("    - Asserting: Only 1 user should remain in the system");
    assertEquals(
      (currentUsers as { users: ID[] }).users.length,
      1,
      "Only 1 user should remain in the system",
    );
    console.log("    ✅ Only 1 user remains in the system.");
    console.log("    - Asserting: The remaining user should be Jill");
    assertEquals(
      (currentUsers as { users: ID[] }).users[0],
      jillUser,
      "The remaining user should be Jill",
    );
    console.log("    ✅ The remaining user is Jill.");

    const adminCount = await userAuth._getNumberOfAdmins();
    console.log("    - Asserting: Should be 1 admin after Jack's deletion (Jill)");
    assertEquals(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after Jack's deletion (Jill)",
    );
    console.log("    ✅ There is 1 admin after Jack's deletion (Jill).");

    const authJackAttempt = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    console.log("    - Asserting: Jack should no longer be able to authenticate");
    assertEquals(
      "error" in authJackAttempt,
      true,
      "Jack should no longer be able to authenticate",
    );
    console.log("    ✅ Jack can no longer authenticate.");
    console.log("    - Asserting: Authentication for deleted user should fail with correct error");
    assertEquals(
      (authJackAttempt as { error: string }).error,
      "Invalid username or password.",
      "Authentication for deleted user should fail with correct error",
    );
    console.log("    ✅ Authentication for deleted user failed with correct error.");
  });

  await client.close();
});

Deno.test("UserAuthentication - Case 1 (Enforce User Differentiation)", async (t) => {
  console.log("\n### Deno Test Case: UserAuthentication - Case 1 (Enforce User Differentiation)\n");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const pedroUsername = "pedro";
  const pedroPassword1 = "securepassword1";
  const pedroPassword2 = "anotherpassword2"; // Different password for the second attempt

  let pedroUser: ID;

  await t.step("1. Create first admin user Pedro", async () => {
    console.log("  Step 1: Create first admin user Pedro");
    const registerPedroResult = await userAuth.register({
      username: pedroUsername,
      password: pedroPassword1,
    });

    console.log("    - Asserting: Pedro's initial registration should succeed");
    assertEquals(
      "user" in registerPedroResult,
      true,
      "Pedro's initial registration should succeed",
    );
    console.log("    ✅ Pedro's initial registration succeeded.");
    pedroUser = (registerPedroResult as { user: ID }).user;

    // Optional: Verify Pedro is admin (as the first user)
    const pedroIsAdmin = await userAuth._getIsUserAdmin({ user: pedroUser });
    console.log("    - Asserting: Pedro should be an admin as the first user");
    assertEquals(
      (pedroIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Pedro should be an admin as the first user",
    );
    console.log("    ✅ Pedro is an admin as the first user.");
  });

  await t.step(
    "2. Attempt to create a new user Pedro, but with different password (should fail)",
    async () => {
      console.log("  Step 2: Attempt to create a new user Pedro, but with different password (should fail)");
      const registerPedroAgainResult = await userAuth.register({
        username: pedroUsername, // Same username
        password: pedroPassword2, // Different password
      });

      console.log("    - Asserting: Registering with an existing username should return an error");
      assertEquals(
        "error" in registerPedroAgainResult,
        true,
        "Registering with an existing username should return an error",
      );
      console.log("    ✅ Registering with an existing username returned an error.");
      console.log("    - Asserting: Error message should indicate that the username is taken");
      assertEquals(
        (registerPedroAgainResult as { error: string }).error,
        `User with username '${pedroUsername}' already exists.`,
        "Error message should indicate that the username is taken",
      );
      console.log("    ✅ Error message indicates username is taken.");

      // Verify that no new user was created
      const currentUsers = await userAuth._getListOfUsers();
      console.log("    - Asserting: Only one user (Pedro) should exist in the system");
      assertEquals(
        (currentUsers as { users: ID[] }).users.length,
        1,
        "Only one user (Pedro) should exist in the system",
      );
      console.log("    ✅ Only one user (Pedro) exists in the system.");
      console.log("    - Asserting: The existing user should still be the original Pedro");
      assertEquals(
        (currentUsers as { users: ID[] }).users[0],
        pedroUser,
        "The existing user should still be the original Pedro",
      );
      console.log("    ✅ The existing user is the original Pedro.");
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 2 (Verify Password Changing)", async (t) => {
  console.log("\n### Deno Test Case: UserAuthentication - Case 2 (Verify Password Changing)\n");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackyUsername = "jacky";
  const jackyOldPassword = "oldSecurePassword";
  const jackyNewPassword = "newStrongPassword";

  let jackyUser: ID;

  await t.step("1. Create first admin user Jacky", async () => {
    console.log("  Step 1: Create first admin user Jacky");
    const registerJackyResult = await userAuth.register({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    console.log("    - Asserting: Jacky's registration should succeed");
    assertEquals(
      "user" in registerJackyResult,
      true,
      "Jacky's registration should succeed",
    );
    console.log("    ✅ Jacky's registration succeeded.");
    jackyUser = (registerJackyResult as { user: ID }).user;

    // Verify Jacky can authenticate with the old password
    const authJackyOldPassResult = await userAuth.authenticate({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    console.log("    - Asserting: Jacky should be able to authenticate with old password initially");
    assertEquals(
      "user" in authJackyOldPassResult,
      true,
      "Jacky should be able to authenticate with old password initially",
    );
    console.log("    ✅ Jacky is able to authenticate with old password initially.");
    console.log("    - Asserting: Authenticated user should be Jacky");
    assertEquals(
      (authJackyOldPassResult as { user: ID }).user,
      jackyUser,
      "Authenticated user should be Jacky",
    );
    console.log("    ✅ Authenticated user is Jacky.");

    // Optional: Verify Jacky is admin (as the first user)
    const jackyIsAdmin = await userAuth._getIsUserAdmin({ user: jackyUser });
    console.log("    - Asserting: Jacky should be an admin as the first user");
    assertEquals(
      (jackyIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Jacky should be an admin as the first user",
    );
    console.log("    ✅ Jacky is an admin as the first user.");
  });

  await t.step(
    "2. Verify Jacky is able to change Jacky's password",
    async () => {
      console.log("  Step 2: Verify Jacky is able to change Jacky's password");
      // Attempt to change password
      const updatePasswordResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword,
        newPassword: jackyNewPassword,
      });
      console.log("    - Asserting: Password change operation should succeed");
      assertEquals(
        "success" in updatePasswordResult,
        true,
        "Password change operation should succeed",
      );
      console.log("    ✅ Password change operation succeeded.");
      console.log("    - Asserting: Password change should return success");
      assertEquals(
        (updatePasswordResult as { success: true }).success,
        true,
        "Password change should return success",
      );
      console.log("    ✅ Password change returned success.");

      // Try to authenticate with the OLD password (should fail)
      const authJackyWithOldPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyOldPassword,
      });
      console.log("    - Asserting: Jacky should NOT be able to authenticate with old password after change");
      assertEquals(
        "error" in authJackyWithOldPassAfterChange,
        true,
        "Jacky should NOT be able to authenticate with old password after change",
      );
      console.log("    ✅ Jacky is NOT able to authenticate with old password after change.");
      console.log("    - Asserting: Authentication with old password should fail with correct error message");
      assertEquals(
        (authJackyWithOldPassAfterChange as { error: string }).error,
        "Invalid username or password.",
        "Authentication with old password should fail with correct error message",
      );
      console.log("    ✅ Authentication with old password failed with correct error message.");

      // Try to authenticate with the NEW password (should succeed)
      const authJackyWithNewPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyNewPassword,
      });
      console.log("    - Asserting: Jacky SHOULD be able to authenticate with new password after change");
      assertEquals(
        "user" in authJackyWithNewPassAfterChange,
        true,
        "Jacky SHOULD be able to authenticate with new password after change",
      );
      console.log("    ✅ Jacky is able to authenticate with new password after change.");
      console.log("    - Asserting: Authenticated user should be Jacky with new password");
      assertEquals(
        (authJackyWithNewPassAfterChange as { user: ID }).user,
        jackyUser,
        "Authenticated user should be Jacky with new password",
      );
      console.log("    ✅ Authenticated user is Jacky with new password.");

      // Verify trying to change password with incorrect old password fails
      const updatePasswordFailResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword, // Incorrect old password now
        newPassword: "evenNewerPassword",
      });
      console.log("    - Asserting: Password change with incorrect old password should fail");
      assertEquals(
        "error" in updatePasswordFailResult,
        true,
        "Password change with incorrect old password should fail",
      );
      console.log("    ✅ Password change with incorrect old password failed.");
      console.log("    - Asserting: Error message should indicate old password mismatch");
      assertEquals(
        (updatePasswordFailResult as { error: string }).error,
        "Old password does not match.",
        "Error message should indicate old password mismatch",
      );
      console.log("    ✅ Error message indicates old password mismatch.");
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 3 (Admin Management)", async (t) => {
  console.log("\n### Deno Test Case: UserAuthentication - Case 3 (Admin Management)\n");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const johnUsername = "john";
  const johnPassword = "johnsSecretPassword";

  let johnUser: ID;

  await t.step("1. Create John - should be admin", async () => {
    console.log("  Step 1: Create John - should be admin");
    const registerJohnResult = await userAuth.register({
      username: johnUsername,
      password: johnPassword,
    });
    console.log("    - Asserting: John's registration should succeed");
    assertEquals(
      "user" in registerJohnResult,
      true,
      "John's registration should succeed",
    );
    console.log("    ✅ John's registration succeeded.");
    johnUser = (registerJohnResult as { user: ID }).user;

    const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
    console.log("    - Asserting: Query for John's admin status should succeed");
    assertEquals(
      "isAdmin" in johnIsAdmin,
      true,
      "Query for John's admin status should succeed",
    );
    console.log("    ✅ Query for John's admin status succeeded.");
    console.log("    - Asserting: John should be an admin (first user)");
    assertEquals(
      (johnIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "John should be an admin (first user)",
    );
    console.log("    ✅ John is an admin (first user).");

    const adminCount = await userAuth._getNumberOfAdmins();
    console.log("    - Asserting: Should be 1 admin after John registers");
    assertEquals(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after John registers",
    );
    console.log("    ✅ There is 1 admin after John registers.");

    const usersList = await userAuth._getListOfUsers();
    console.log("    - Asserting: Only 1 user should exist in the system");
    assertEquals(
      (usersList as { users: ID[] }).users.length,
      1,
      "Only 1 user should exist in the system",
    );
    console.log("    ✅ Only 1 user exists in the system.");
  });

  await t.step(
    "2. Attempt to delete John - should fail as last admin",
    async () => {
      console.log("  Step 2: Attempt to delete John - should fail as last admin");
      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      console.log("    - Asserting: Deleting John should fail");
      assertEquals(
        "error" in deleteJohnResult,
        true,
        "Deleting John should fail",
      );
      console.log("    ✅ Deleting John failed as expected.");
      console.log("    - Asserting: Error message should indicate inability to delete last admin");
      assertEquals(
        (deleteJohnResult as { error: string }).error,
        "Cannot delete the last administrator.",
        "Error message should indicate inability to delete last admin",
      );
      console.log("    ✅ Error message indicates inability to delete last admin.");

      const adminCount = await userAuth._getNumberOfAdmins();
      console.log("    - Asserting: Admin count should still be 1 after failed deletion");
      assertEquals(
        (adminCount as { count: number }).count,
        1,
        "Admin count should still be 1 after failed deletion",
      );
      console.log("    ✅ Admin count is still 1 after failed deletion.");
      const usersList = await userAuth._getListOfUsers();
      console.log("    - Asserting: User count should still be 1 after failed deletion");
      assertEquals(
        (usersList as { users: ID[] }).users.length,
        1,
        "User count should still be 1 after failed deletion",
      );
      console.log("    ✅ User count is still 1 after failed deletion.");
    },
  );

  await t.step(
    "3. Attempt to grant admin to John - should fail as he is already admin",
    async () => {
      console.log("  Step 3: Attempt to grant admin to John - should fail as he is already admin");
      const grantAdminToJohnResult = await userAuth.grantAdmin({
        targetUser: johnUser,
      });
      console.log("    - Asserting: Granting admin to John should fail as he's already admin");
      assertEquals(
        "error" in grantAdminToJohnResult,
        true,
        "Granting admin to John should fail as he's already admin",
      );
      console.log("    ✅ Granting admin to John failed as expected.");
      console.log("    - Asserting: Error message should indicate user is already admin");
      assertEquals(
        (grantAdminToJohnResult as { error: string }).error,
        `User '${johnUser}' is already an admin.`,
        "Error message should indicate user is already admin",
      );
      console.log("    ✅ Error message indicates user is already an admin.");

      const adminCount = await userAuth._getNumberOfAdmins();
      console.log("    - Asserting: Admin count should remain 1 after failed grant attempt");
      assertEquals(
        (adminCount as { count: number }).count,
        1,
        "Admin count should remain 1 after failed grant attempt",
      );
      console.log("    ✅ Admin count remains 1.");
      const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
      console.log("    - Asserting: John should still be an admin");
      assertEquals(
        (johnIsAdmin as { isAdmin: boolean }).isAdmin,
        true,
        "John should still be an admin",
      );
      console.log("    ✅ John is still an admin.");
    },
  );

  await t.step(
    "4. Attempt to delete John again - verify that failure still occurs",
    async () => {
      console.log("  Step 4: Attempt to delete John again - verify that failure still occurs");
      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      console.log("    - Asserting: Deleting John should still fail");
      assertEquals(
        "error" in deleteJohnResult,
        true,
        "Deleting John should still fail",
      );
      console.log("    ✅ Deleting John still failed as expected.");
      console.log("    - Asserting: Error message should still indicate inability to delete last admin");
      assertEquals(
        (deleteJohnResult as { error: string }).error,
        "Cannot delete the last administrator.",
        "Error message should still indicate inability to delete last admin",
      );
      console.log("    ✅ Error message still indicates inability to delete last admin.");

      const adminCount = await userAuth._getNumberOfAdmins();
      console.log("    - Asserting: Admin count should remain 1");
      assertEquals(
        (adminCount as { count: number }).count,
        1,
        "Admin count should remain 1",
      );
      console.log("    ✅ Admin count remains 1.");
      const usersList = await userAuth._getListOfUsers();
      console.log("    - Asserting: User count should remain 1");
      assertEquals(
        (usersList as { users: ID[] }).users.length,
        1,
        "User count should remain 1",
      );
      console.log("    ✅ User count remains 1.");
    },
  );

  await client.close();
});
```
