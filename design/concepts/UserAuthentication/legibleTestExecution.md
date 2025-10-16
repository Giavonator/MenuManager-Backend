[@UserAuthenticationConcept.test.ts](../../../src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts)

[@UserAuthenticationConcept.ts](../../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)

[@testing-concepts](../../background/testing-concepts.md)

All of the tests are working appropriately, we just need to have legible test execution printed out to the console. For the concept please output:
1. Each Deno Test Case
2. Indented Each step of the test case
3. Indented each check of each step
4. Include green check or red X for success or failure
5. Keep it succinct but understandable
6. Format prints to be easily viewed when pasted into markdown file.
7. Use a helper function for assertsEquals to simplify.

# Add above console prints

# response:

```typescript
// Helper function for consistent logging and assertions
function assertAndLog<T>(
  actual: T,
  expected: T,
  message: string,
  stepMessage: string,
  checkIndex: number,
) {
  try {
    assertEquals(actual, expected, message);
    console.log(`    ✅ Check ${checkIndex}: ${message}`);
  } catch (e) {
    console.log(`    ❌ Check ${checkIndex}: ${message}`);
    console.error(`      Error in "${stepMessage}": ${e.message}`);
    throw e; // Re-throw the error so Deno.test still registers it as a failure
  }
}

// Helper function to print a Deno test header
function printTestHeader(testName: string) {
  console.log(`\n🧪 Deno Test: ${testName}`);
}

// Helper function to print a test step header
function printStepHeader(stepMessage: string) {
  console.log(`  ➡️ Step: ${stepMessage}`);
}

// file: src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication - Operating Principle", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackUsername = "jack";
  const jackPassword = "password123";
  const jillUsername = "jill";
  const jillPassword = "password456";

  let jackUser: ID;
  let jillUser: ID;

  await t.step("1. Create first user (Jack) - should be admin", async () => {
    const stepMessage = "1. Create first user (Jack) - should be admin";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const registerJackResult = await userAuth.register({
      username: jackUsername,
      password: jackPassword,
    });
    assertAndLog(
      "user" in registerJackResult,
      true,
      "Jack's registration should succeed",
      stepMessage,
      ++checkIndex,
    );
    jackUser = (registerJackResult as { user: ID }).user;

    const authJackResult = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    assertAndLog(
      "user" in authJackResult,
      true,
      "Jack should be able to authenticate",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (authJackResult as { user: ID }).user,
      jackUser,
      "Authenticated user should be Jack",
      stepMessage,
      ++checkIndex,
    );

    const jackIsAdmin = await userAuth._getIsUserAdmin({ user: jackUser });
    assertAndLog(
      "isAdmin" in jackIsAdmin,
      true,
      "Query for Jack's admin status should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (jackIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Jack should be an admin (first user)",
      stepMessage,
      ++checkIndex,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertAndLog(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after Jack registers",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Create second user (Jill) - should not be admin",
    async () => {
      const stepMessage = "2. Create second user (Jill) - should not be admin";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const registerJillResult = await userAuth.register({
        username: jillUsername,
        password: jillPassword,
      });
      assertAndLog(
        "user" in registerJillResult,
        true,
        "Jill's registration should succeed",
        stepMessage,
        ++checkIndex,
      );
      jillUser = (registerJillResult as { user: ID }).user;

      const authJillResult = await userAuth.authenticate({
        username: jillUsername,
        password: jillPassword,
      });
      assertAndLog(
        "user" in authJillResult,
        true,
        "Jill should be able to authenticate",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (authJillResult as { user: ID }).user,
        jillUser,
        "Authenticated user should be Jill",
        stepMessage,
        ++checkIndex,
      );

      const jillIsAdmin = await userAuth._getIsUserAdmin({ user: jillUser });
      assertAndLog(
        "isAdmin" in jillIsAdmin,
        true,
        "Query for Jill's admin status should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (jillIsAdmin as { isAdmin: boolean }).isAdmin,
        false,
        "Jill should not be an admin (not the first user)",
        stepMessage,
        ++checkIndex,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      assertAndLog(
        (adminCount as { count: number }).count,
        1,
        "Should still be 1 admin after Jill registers",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step("3. Jack (admin) grants admin to Jill", async () => {
    const stepMessage = "3. Jack (admin) grants admin to Jill";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // Note: The concept doesn't enforce "calling user is admin", external syncs handle this.
    const grantAdminResult = await userAuth.grantAdmin({
      targetUser: jillUser,
    });
    assertAndLog(
      "success" in grantAdminResult,
      true,
      "Granting admin to Jill should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (grantAdminResult as { success: true }).success,
      true,
      "Grant admin operation should return success",
      stepMessage,
      ++checkIndex,
    );

    const jillIsAdminAfterGrant = await userAuth._getIsUserAdmin({
      user: jillUser,
    });
    assertAndLog(
      (jillIsAdminAfterGrant as { isAdmin: boolean }).isAdmin,
      true,
      "Jill should now be an admin",
      stepMessage,
      ++checkIndex,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertAndLog(
      (adminCount as { count: number }).count,
      2,
      "Should be 2 admins after Jill is granted admin",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("4. Jack (original admin) deletes his own account", async () => {
    const stepMessage = "4. Jack (original admin) deletes his own account";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    // Jack can delete his account because Jill is now also an admin, so there will be > 1 admin remaining.
    // Note: The concept doesn't enforce "calling user is userToDelete or is an admin", external syncs handle this.
    const deleteJackResult = await userAuth.deleteUser({
      userToDelete: jackUser,
    });
    assertAndLog(
      "success" in deleteJackResult,
      true,
      "Jack's account deletion should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (deleteJackResult as { success: true }).success,
      true,
      "Jack's deletion operation should return success",
      stepMessage,
      ++checkIndex,
    );

    const currentUsers = await userAuth._getListOfUsers();
    assertAndLog(
      (currentUsers as { users: ID[] }).users.length,
      1,
      "Only 1 user should remain in the system",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (currentUsers as { users: ID[] }).users[0],
      jillUser,
      "The remaining user should be Jill",
      stepMessage,
      ++checkIndex,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertAndLog(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after Jack's deletion (Jill)",
      stepMessage,
      ++checkIndex,
    );

    const authJackAttempt = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    assertAndLog(
      "error" in authJackAttempt,
      true,
      "Jack should no longer be able to authenticate",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (authJackAttempt as { error: string }).error,
      "Invalid username or password.",
      "Authentication for deleted user should fail with correct error",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});

Deno.test("UserAuthentication - Case 1 (Enforce User Differentiation)", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const pedroUsername = "pedro";
  const pedroPassword1 = "securepassword1";
  const pedroPassword2 = "anotherpassword2"; // Different password for the second attempt

  let pedroUser: ID;

  await t.step("1. Create first admin user Pedro", async () => {
    const stepMessage = "1. Create first admin user Pedro";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const registerPedroResult = await userAuth.register({
      username: pedroUsername,
      password: pedroPassword1,
    });

    assertAndLog(
      "user" in registerPedroResult,
      true,
      "Pedro's initial registration should succeed",
      stepMessage,
      ++checkIndex,
    );
    pedroUser = (registerPedroResult as { user: ID }).user;

    // Optional: Verify Pedro is admin (as the first user)
    const pedroIsAdmin = await userAuth._getIsUserAdmin({ user: pedroUser });
    assertAndLog(
      (pedroIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Pedro should be an admin as the first user",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Attempt to create a new user Pedro, but with different password (should fail)",
    async () => {
      const stepMessage =
        "2. Attempt to create a new user Pedro, but with different password (should fail)";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const registerPedroAgainResult = await userAuth.register({
        username: pedroUsername, // Same username
        password: pedroPassword2, // Different password
      });

      assertAndLog(
        "error" in registerPedroAgainResult,
        true,
        "Registering with an existing username should return an error",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (registerPedroAgainResult as { error: string }).error,
        `User with username '${pedroUsername}' already exists.`,
        "Error message should indicate that the username is taken",
        stepMessage,
        ++checkIndex,
      );

      // Verify that no new user was created
      const currentUsers = await userAuth._getListOfUsers();
      assertAndLog(
        (currentUsers as { users: ID[] }).users.length,
        1,
        "Only one user (Pedro) should exist in the system",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (currentUsers as { users: ID[] }).users[0],
        pedroUser,
        "The existing user should still be the original Pedro",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 2 (Verify Password Changing)", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackyUsername = "jacky";
  const jackyOldPassword = "oldSecurePassword";
  const jackyNewPassword = "newStrongPassword";

  let jackyUser: ID;

  await t.step("1. Create first admin user Jacky", async () => {
    const stepMessage = "1. Create first admin user Jacky";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const registerJackyResult = await userAuth.register({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    assertAndLog(
      "user" in registerJackyResult,
      true,
      "Jacky's registration should succeed",
      stepMessage,
      ++checkIndex,
    );
    jackyUser = (registerJackyResult as { user: ID }).user;

    // Verify Jacky can authenticate with the old password
    const authJackyOldPassResult = await userAuth.authenticate({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    assertAndLog(
      "user" in authJackyOldPassResult,
      true,
      "Jacky should be able to authenticate with old password initially",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (authJackyOldPassResult as { user: ID }).user,
      jackyUser,
      "Authenticated user should be Jacky",
      stepMessage,
      ++checkIndex,
    );

    // Optional: Verify Jacky is admin (as the first user)
    const jackyIsAdmin = await userAuth._getIsUserAdmin({ user: jackyUser });
    assertAndLog(
      (jackyIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "Jacky should be an admin as the first user",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Verify Jacky is able to change Jacky's password",
    async () => {
      const stepMessage = "2. Verify Jacky is able to change Jacky's password";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      // Attempt to change password
      const updatePasswordResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword,
        newPassword: jackyNewPassword,
      });
      assertAndLog(
        "success" in updatePasswordResult,
        true,
        "Password change operation should succeed",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (updatePasswordResult as { success: true }).success,
        true,
        "Password change should return success",
        stepMessage,
        ++checkIndex,
      );

      // Try to authenticate with the OLD password (should fail)
      const authJackyWithOldPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyOldPassword,
      });
      assertAndLog(
        "error" in authJackyWithOldPassAfterChange,
        true,
        "Jacky should NOT be able to authenticate with old password after change",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (authJackyWithOldPassAfterChange as { error: string }).error,
        "Invalid username or password.",
        "Authentication with old password should fail with correct error message",
        stepMessage,
        ++checkIndex,
      );

      // Try to authenticate with the NEW password (should succeed)
      const authJackyWithNewPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyNewPassword,
      });
      assertAndLog(
        "user" in authJackyWithNewPassAfterChange,
        true,
        "Jacky SHOULD be able to authenticate with new password after change",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (authJackyWithNewPassAfterChange as { user: ID }).user,
        jackyUser,
        "Authenticated user should be Jacky with new password",
        stepMessage,
        ++checkIndex,
      );

      // Verify trying to change password with incorrect old password fails
      const updatePasswordFailResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword, // Incorrect old password now
        newPassword: "evenNewerPassword",
      });
      assertAndLog(
        "error" in updatePasswordFailResult,
        true,
        "Password change with incorrect old password should fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (updatePasswordFailResult as { error: string }).error,
        "Old password does not match.",
        "Error message should indicate old password mismatch",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 3 (Admin Management)", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const johnUsername = "john";
  const johnPassword = "johnsSecretPassword";

  let johnUser: ID;

  await t.step("1. Create John - should be admin", async () => {
    const stepMessage = "1. Create John - should be admin";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const registerJohnResult = await userAuth.register({
      username: johnUsername,
      password: johnPassword,
    });
    assertAndLog(
      "user" in registerJohnResult,
      true,
      "John's registration should succeed",
      stepMessage,
      ++checkIndex,
    );
    johnUser = (registerJohnResult as { user: ID }).user;

    const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
    assertAndLog(
      "isAdmin" in johnIsAdmin,
      true,
      "Query for John's admin status should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (johnIsAdmin as { isAdmin: boolean }).isAdmin,
      true,
      "John should be an admin (first user)",
      stepMessage,
      ++checkIndex,
    );

    const adminCount = await userAuth._getNumberOfAdmins();
    assertAndLog(
      (adminCount as { count: number }).count,
      1,
      "Should be 1 admin after John registers",
      stepMessage,
      ++checkIndex,
    );

    const usersList = await userAuth._getListOfUsers();
    assertAndLog(
      (usersList as { users: ID[] }).users.length,
      1,
      "Only 1 user should exist in the system",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step(
    "2. Attempt to delete John - should fail as last admin",
    async () => {
      const stepMessage = "2. Attempt to delete John - should fail as last admin";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      assertAndLog(
        "error" in deleteJohnResult,
        true,
        "Deleting John should fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (deleteJohnResult as { error: string }).error,
        "Cannot delete the last administrator.",
        "Error message should indicate inability to delete last admin",
        stepMessage,
        ++checkIndex,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      assertAndLog(
        (adminCount as { count: number }).count,
        1,
        "Admin count should still be 1 after failed deletion",
        stepMessage,
        ++checkIndex,
      );
      const usersList = await userAuth._getListOfUsers();
      assertAndLog(
        (usersList as { users: ID[] }).users.length,
        1,
        "User count should still be 1 after failed deletion",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "3. Attempt to grant admin to John - should fail as he is already admin",
    async () => {
      const stepMessage = "3. Attempt to grant admin to John - should fail as he is already admin";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const grantAdminToJohnResult = await userAuth.grantAdmin({
        targetUser: johnUser,
      });
      assertAndLog(
        "error" in grantAdminToJohnResult,
        true,
        "Granting admin to John should fail as he's already admin",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (grantAdminToJohnResult as { error: string }).error,
        `User '${johnUser}' is already an admin.`,
        "Error message should indicate user is already admin",
        stepMessage,
        ++checkIndex,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      assertAndLog(
        (adminCount as { count: number }).count,
        1,
        "Admin count should remain 1 after failed grant attempt",
        stepMessage,
        ++checkIndex,
      );
      const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
      assertAndLog(
        (johnIsAdmin as { isAdmin: boolean }).isAdmin,
        true,
        "John should still be an admin",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await t.step(
    "4. Attempt to delete John again - verify that failure still occurs",
    async () => {
      const stepMessage = "4. Attempt to delete John again - verify that failure still occurs";
      printStepHeader(stepMessage);
      let checkIndex = 0;

      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      assertAndLog(
        "error" in deleteJohnResult,
        true,
        "Deleting John should still fail",
        stepMessage,
        ++checkIndex,
      );
      assertAndLog(
        (deleteJohnResult as { error: string }).error,
        "Cannot delete the last administrator.",
        "Error message should still indicate inability to delete last admin",
        stepMessage,
        ++checkIndex,
      );

      const adminCount = await userAuth._getNumberOfAdmins();
      assertAndLog(
        (adminCount as { count: number }).count,
        1,
        "Admin count should remain 1",
        stepMessage,
        ++checkIndex,
      );
      const usersList = await userAuth._getListOfUsers();
      assertAndLog(
        (usersList as { users: ID[] }).users.length,
        1,
        "User count should remain 1",
        stepMessage,
        ++checkIndex,
      );
    },
  );

  await client.close();
});

```

# trace:

The `UserAuthentication` concept's `Operating Principle` is fully demonstrated through a sequence of actions and state verifications in the test case `UserAuthentication - Operating Principle`.

1.  **First User Registration and Admin Status**:
    *   **Action**: Jack registers (`register`) with a username and password.
    *   **Verification**: The system confirms Jack's registration is successful and he can `authenticate`. Crucially, because he is the first user, his `_getIsUserAdmin` status is `true`, and the `_getNumberOfAdmins` query confirms `1` administrator. This fulfills "a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user... If that person was the first user to register then they automatically are the admin".

2.  **Subsequent User Registration (Non-Admin)**:
    *   **Action**: Jill registers (`register`) with a distinct username and password.
    *   **Verification**: Jill's registration is successful, and she can `authenticate`. However, her `_getIsUserAdmin` status is `false`, confirming she is not automatically an admin. The `_getNumberOfAdmins` count remains `1`. This demonstrates that only the first user gains admin privileges automatically and subsequent users do not.

3.  **Admin Grants Administrative Privileges**:
    *   **Action**: Jack (the existing admin) uses the `grantAdmin` action to elevate Jill's privileges.
    *   **Verification**: The operation succeeds. Jill's `_getIsUserAdmin` status is now `true`, and `_getNumberOfAdmins` is `2`. This fulfills "Administrators can manage other users, including granting or revoking administrative privileges".

4.  **Admin Deletes Account (with Minimum Admin Safeguard)**:
    *   **Action**: Jack attempts to delete his own account (`deleteUser`).
    *   **Verification**: The deletion succeeds. This is because Jill was granted admin privileges in the previous step, ensuring that at least one administrator (Jill) would remain in the system after Jack's deletion. The `_getListOfUsers` confirms only one user (Jill) remains, `_getNumberOfAdmins` returns `1`, and Jack can no longer `authenticate`. This fulfills "deleting users, provided a minimum number of administrators are maintained." and confirms account removal.

This trace demonstrates the core mechanics of user registration, authentication, initial admin assignment, admin privilege management, and the safe deletion of users while upholding the minimum admin count, thereby covering the complete `Operating Principle` of the `UserAuthentication` concept.
```