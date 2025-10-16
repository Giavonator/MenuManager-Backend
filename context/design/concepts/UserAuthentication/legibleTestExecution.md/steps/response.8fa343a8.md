---
timestamp: 'Wed Oct 15 2025 09:15:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_091553.7b1a7908.md]]'
content_id: 8fa343a83a6251b599181e01bb8dd78c300125d5daf9529bc3118ae1527b62e5
---

# response:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";
// Import all output types for robust type assertions within logCheck
import {
  RegisterOutput,
  AuthenticateOutput,
  DeleteUserOutput,
  GrantAdminOutput,
  UpdatePasswordOutput,
  GetIsUserAdminOutput,
  GetListOfUsersOutput,
  GetNumberOfAdminsOutput,
} from "./UserAuthenticationConcept.ts";

// Helper function for consistent logging and assertion checking
async function logCheck(
  description: string,
  assertion: () => void,
  indentLevel: number = 2, // Default to 2 for checks within steps
): Promise<boolean> {
  const indent = "  ".repeat(indentLevel);
  try {
    assertion();
    console.log(`${indent}✅ ${description}`);
    return true;
  } catch (e) {
    console.log(`${indent}❌ ${description} (Failed: ${e.message})`);
    return false;
  }
}

Deno.test("UserAuthentication - Operating Principle", async (t) => {
  console.log("# UserAuthentication - Operating Principle");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackUsername = "jack";
  const jackPassword = "password123";
  const jillUsername = "jill";
  const jillPassword = "password456";

  let jackUser: ID;
  let jillUser: ID;

  await t.step("1. Create first user (Jack) - should be admin", async () => {
    console.log("  ## 1. Create first user (Jack) - should be admin");

    const registerJackResult = await userAuth.register({
      username: jackUsername,
      password: jackPassword,
    });
    await logCheck(
      "Jack's registration should succeed",
      () => assertEquals("user" in registerJackResult, true),
      2, // indentLevel for checks
    );
    jackUser = (registerJackResult as RegisterOutput & { user: ID }).user;

    const authJackResult = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    await logCheck(
      "Jack should be able to authenticate",
      () => assertEquals("user" in authJackResult, true),
      2,
    );
    await logCheck(
      "Authenticated user should be Jack",
      () => assertEquals((authJackResult as AuthenticateOutput & { user: ID }).user, jackUser),
      2,
    );

    const jackIsAdmin = await userAuth._getIsUserAdmin({ user: jackUser });
    await logCheck(
      "Query for Jack's admin status should succeed",
      () => assertEquals("isAdmin" in jackIsAdmin, true),
      2,
    );
    await logCheck(
      "Jack should be an admin (first user)",
      () => assertEquals((jackIsAdmin as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, true),
      2,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    await logCheck(
      "Should be 1 admin after Jack registers",
      () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
      2,
    );
  });

  await t.step(
    "2. Create second user (Jill) - should not be admin",
    async () => {
      console.log("  ## 2. Create second user (Jill) - should not be admin");
      const registerJillResult = await userAuth.register({
        username: jillUsername,
        password: jillPassword,
      });
      await logCheck(
        "Jill's registration should succeed",
        () => assertEquals("user" in registerJillResult, true),
        2,
      );
      jillUser = (registerJillResult as RegisterOutput & { user: ID }).user;

      const authJillResult = await userAuth.authenticate({
        username: jillUsername,
        password: jillPassword,
      });
      await logCheck(
        "Jill should be able to authenticate",
        () => assertEquals("user" in authJillResult, true),
        2,
      );
      await logCheck(
        "Authenticated user should be Jill",
        () => assertEquals((authJillResult as AuthenticateOutput & { user: ID }).user, jillUser),
        2,
      );

      const jillIsAdmin = await userAuth._getIsUserAdmin({ user: jillUser });
      await logCheck(
        "Query for Jill's admin status should succeed",
        () => assertEquals("isAdmin" in jillIsAdmin, true),
        2,
      );
      await logCheck(
        "Jill should not be an admin (not the first user)",
        () => assertEquals((jillIsAdmin as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, false),
        2,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      await logCheck(
        "Should still be 1 admin after Jill registers",
        () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
        2,
      );
    },
  );

  await t.step("3. Jack (admin) grants admin to Jill", async () => {
    console.log("  ## 3. Jack (admin) grants admin to Jill");
    // Note: The concept doesn't enforce "calling user is admin", external syncs handle this.
    const grantAdminResult = await userAuth.grantAdmin({
      targetUser: jillUser,
    });
    await logCheck(
      "Granting admin to Jill should succeed",
      () => assertEquals("success" in grantAdminResult, true),
      2,
    );
    await logCheck(
      "Grant admin operation should return success",
      () => assertEquals((grantAdminResult as GrantAdminOutput & { success: true }).success, true),
      2,
    );

    const jillIsAdminAfterGrant = await userAuth._getIsUserAdmin({
      user: jillUser,
    });
    await logCheck(
      "Jill should now be an admin",
      () => assertEquals((jillIsAdminAfterGrant as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, true),
      2,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    await logCheck(
      "Should be 2 admins after Jill is granted admin",
      () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 2),
      2,
    );
  });

  await t.step("4. Jack (original admin) deletes his own account", async () => {
    console.log("  ## 4. Jack (original admin) deletes his own account");
    // Jack can delete his account because Jill is now also an admin, so there will be > 1 admin remaining.
    // Note: The concept doesn't enforce "calling user is userToDelete or is an admin", external syncs handle this.
    const deleteJackResult = await userAuth.deleteUser({
      userToDelete: jackUser,
    });
    await logCheck(
      "Jack's account deletion should succeed",
      () => assertEquals("success" in deleteJackResult, true),
      2,
    );
    await logCheck(
      "Jack's deletion operation should return success",
      () => assertEquals((deleteJackResult as DeleteUserOutput & { success: true }).success, true),
      2,
    );

    const currentUsers = await userAuth._getListOfUsers();
    await logCheck(
      "Only 1 user should remain in the system",
      () => assertEquals((currentUsers as GetListOfUsersOutput & { users: ID[] }).users.length, 1),
      2,
    );
    await logCheck(
      "The remaining user should be Jill",
      () => assertEquals((currentUsers as GetListOfUsersOutput & { users: ID[] }).users[0], jillUser),
      2,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    await logCheck(
      "Should be 1 admin after Jack's deletion (Jill)",
      () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
      2,
    );

    const authJackAttempt = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    await logCheck(
      "Jack should no longer be able to authenticate",
      () => assertEquals("error" in authJackAttempt, true),
      2,
    );
    await logCheck(
      "Authentication for deleted user should fail with correct error",
      () => assertEquals((authJackAttempt as AuthenticateOutput & { error: string }).error, "Invalid username or password."),
      2,
    );
  });

  await client.close();
});

Deno.test("UserAuthentication - Case 1 (Enforce User Differentiation)", async (t) => {
  console.log("# UserAuthentication - Case 1 (Enforce User Differentiation)");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const pedroUsername = "pedro";
  const pedroPassword1 = "securepassword1";
  const pedroPassword2 = "anotherpassword2"; // Different password for the second attempt

  let pedroUser: ID;

  await t.step("1. Create first admin user Pedro", async () => {
    console.log("  ## 1. Create first admin user Pedro");
    const registerPedroResult = await userAuth.register({
      username: pedroUsername,
      password: pedroPassword1,
    });

    await logCheck(
      "Pedro's initial registration should succeed",
      () => assertEquals("user" in registerPedroResult, true),
      2,
    );
    pedroUser = (registerPedroResult as RegisterOutput & { user: ID }).user;

    // Optional: Verify Pedro is admin (as the first user)
    const pedroIsAdmin = await userAuth._getIsUserAdmin({ user: pedroUser });
    await logCheck(
      "Pedro should be an admin as the first user",
      () => assertEquals((pedroIsAdmin as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, true),
      2,
    );
  });

  await t.step(
    "2. Attempt to create a new user Pedro, but with different password (should fail)",
    async () => {
      console.log("  ## 2. Attempt to create a new user Pedro, but with different password (should fail)");
      const registerPedroAgainResult = await userAuth.register({
        username: pedroUsername, // Same username
        password: pedroPassword2, // Different password
      });

      await logCheck(
        "Registering with an existing username should return an error",
        () => assertEquals("error" in registerPedroAgainResult, true),
        2,
      );
      await logCheck(
        "Error message should indicate that the username is taken",
        () => assertEquals((registerPedroAgainResult as RegisterOutput & { error: string }).error, `User with username '${pedroUsername}' already exists.`),
        2,
      );

      // Verify that no new user was created
      const currentUsers = await userAuth._getListOfUsers();
      await logCheck(
        "Only one user (Pedro) should exist in the system",
        () => assertEquals((currentUsers as GetListOfUsersOutput & { users: ID[] }).users.length, 1),
        2,
      );
      await logCheck(
        "The existing user should still be the original Pedro",
        () => assertEquals((currentUsers as GetListOfUsersOutput & { users: ID[] }).users[0], pedroUser),
        2,
      );
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 2 (Verify Password Changing)", async (t) => {
  console.log("# UserAuthentication - Case 2 (Verify Password Changing)");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackyUsername = "jacky";
  const jackyOldPassword = "oldSecurePassword";
  const jackyNewPassword = "newStrongPassword";

  let jackyUser: ID;

  await t.step("1. Create first admin user Jacky", async () => {
    console.log("  ## 1. Create first admin user Jacky");
    const registerJackyResult = await userAuth.register({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    await logCheck(
      "Jacky's registration should succeed",
      () => assertEquals("user" in registerJackyResult, true),
      2,
    );
    jackyUser = (registerJackyResult as RegisterOutput & { user: ID }).user;

    // Verify Jacky can authenticate with the old password
    const authJackyOldPassResult = await userAuth.authenticate({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    await logCheck(
      "Jacky should be able to authenticate with old password initially",
      () => assertEquals("user" in authJackyOldPassResult, true),
      2,
    );
    await logCheck(
      "Authenticated user should be Jacky",
      () => assertEquals((authJackyOldPassResult as AuthenticateOutput & { user: ID }).user, jackyUser),
      2,
    );

    // Optional: Verify Jacky is admin (as the first user)
    const jackyIsAdmin = await userAuth._getIsUserAdmin({ user: jackyUser });
    await logCheck(
      "Jacky should be an admin as the first user",
      () => assertEquals((jackyIsAdmin as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, true),
      2,
    );
  });

  await t.step(
    "2. Verify Jacky is able to change Jacky's password",
    async () => {
      console.log("  ## 2. Verify Jacky is able to change Jacky's password");
      // Attempt to change password
      const updatePasswordResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword,
        newPassword: jackyNewPassword,
      });
      await logCheck(
        "Password change operation should succeed",
        () => assertEquals("success" in updatePasswordResult, true),
        2,
      );
      await logCheck(
        "Password change should return success",
        () => assertEquals((updatePasswordResult as UpdatePasswordOutput & { success: true }).success, true),
        2,
      );

      // Try to authenticate with the OLD password (should fail)
      const authJackyWithOldPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyOldPassword,
      });
      await logCheck(
        "Jacky should NOT be able to authenticate with old password after change",
        () => assertEquals("error" in authJackyWithOldPassAfterChange, true),
        2,
      );
      await logCheck(
        "Authentication with old password should fail with correct error message",
        () => assertEquals((authJackyWithOldPassAfterChange as AuthenticateOutput & { error: string }).error, "Invalid username or password."),
        2,
      );

      // Try to authenticate with the NEW password (should succeed)
      const authJackyWithNewPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyNewPassword,
      });
      await logCheck(
        "Jacky SHOULD be able to authenticate with new password after change",
        () => assertEquals("user" in authJackyWithNewPassAfterChange, true),
        2,
      );
      await logCheck(
        "Authenticated user should be Jacky with new password",
        () => assertEquals((authJackyWithNewPassAfterChange as AuthenticateOutput & { user: ID }).user, jackyUser),
        2,
      );

      // Verify trying to change password with incorrect old password fails
      const updatePasswordFailResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword, // Incorrect old password now
        newPassword: "evenNewerPassword",
      });
      await logCheck(
        "Password change with incorrect old password should fail",
        () => assertEquals("error" in updatePasswordFailResult, true),
        2,
      );
      await logCheck(
        "Error message should indicate old password mismatch",
        () => assertEquals((updatePasswordFailResult as UpdatePasswordOutput & { error: string }).error, "Old password does not match."),
        2,
      );
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 3 (Admin Management)", async (t) => {
  console.log("# UserAuthentication - Case 3 (Admin Management)");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const johnUsername = "john";
  const johnPassword = "johnsSecretPassword";

  let johnUser: ID;

  await t.step("1. Create John - should be admin", async () => {
    console.log("  ## 1. Create John - should be admin");
    const registerJohnResult = await userAuth.register({
      username: johnUsername,
      password: johnPassword,
    });
    await logCheck(
      "John's registration should succeed",
      () => assertEquals("user" in registerJohnResult, true),
      2,
    );
    johnUser = (registerJohnResult as RegisterOutput & { user: ID }).user;

    const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
    await logCheck(
      "Query for John's admin status should succeed",
      () => assertEquals("isAdmin" in johnIsAdmin, true),
      2,
    );
    await logCheck(
      "John should be an admin (first user)",
      () => assertEquals((johnIsAdmin as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, true),
      2,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    await logCheck(
      "Should be 1 admin after John registers",
      () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
      2,
    );

    const usersList = await userAuth._getListOfUsers();
    await logCheck(
      "Only 1 user should exist in the system",
      () => assertEquals((usersList as GetListOfUsersOutput & { users: ID[] }).users.length, 1),
      2,
    );
  });

  await t.step(
    "2. Attempt to delete John - should fail as last admin",
    async () => {
      console.log("  ## 2. Attempt to delete John - should fail as last admin");
      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      await logCheck(
        "Deleting John should fail",
        () => assertEquals("error" in deleteJohnResult, true),
        2,
      );
      await logCheck(
        "Error message should indicate inability to delete last admin",
        () => assertEquals((deleteJohnResult as DeleteUserOutput & { error: string }).error, "Cannot delete the last administrator."),
        2,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      await logCheck(
        "Admin count should still be 1 after failed deletion",
        () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
        2,
      );
      const usersList = await userAuth._getListOfUsers();
      await logCheck(
        "User count should still be 1 after failed deletion",
        () => assertEquals((usersList as GetListOfUsersOutput & { users: ID[] }).users.length, 1),
        2,
      );
    },
  );

  await t.step(
    "3. Attempt to grant admin to John - should fail as he is already admin",
    async () => {
      console.log("  ## 3. Attempt to grant admin to John - should fail as he is already admin");
      const grantAdminToJohnResult = await userAuth.grantAdmin({
        targetUser: johnUser,
      });
      await logCheck(
        "Granting admin to John should fail as he's already admin",
        () => assertEquals("error" in grantAdminToJohnResult, true),
        2,
      );
      await logCheck(
        "Error message should indicate user is already admin",
        () => assertEquals((grantAdminToJohnResult as GrantAdminOutput & { error: string }).error, `User '${johnUser}' is already an admin.`),
        2,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      await logCheck(
        "Admin count should remain 1 after failed grant attempt",
        () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
        2,
      );
      const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
      await logCheck(
        "John should still be an admin",
        () => assertEquals((johnIsAdmin as GetIsUserAdminOutput & { isAdmin: boolean }).isAdmin, true),
        2,
      );
    },
  );

  await t.step(
    "4. Attempt to delete John again - verify that failure still occurs",
    async () => {
      console.log("  ## 4. Attempt to delete John again - verify that failure still occurs");
      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      await logCheck(
        "Deleting John should still fail",
        () => assertEquals("error" in deleteJohnResult, true),
        2,
      );
      await logCheck(
        "Error message should still indicate inability to delete last admin",
        () => assertEquals((deleteJohnResult as DeleteUserOutput & { error: string }).error, "Cannot delete the last administrator."),
        2,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      await logCheck(
        "Admin count should remain 1",
        () => assertEquals((adminCount as GetNumberOfAdminsOutput & { count: number }).count, 1),
        2,
      );
      const usersList = await userAuth._getListOfUsers();
      await logCheck(
        "User count should remain 1",
        () => assertEquals((usersList as GetListOfUsersOutput & { users: ID[] }).users.length, 1),
        2,
      );
    },
  );

  await client.close();
});
```
