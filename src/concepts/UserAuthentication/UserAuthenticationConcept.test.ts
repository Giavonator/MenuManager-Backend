import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

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
    console.error(`      Error in "${stepMessage}": ${message}`);
    throw e; // Re-throw the error so Deno.test still registers it as a failure
  }
}

// Helper function to print a Deno test header
function printTestHeader(testName: string) {
  console.log(`\n## 🧪 Deno Test: ${testName}`);
}

// Helper function to print a test step header
function printStepHeader(stepMessage: string) {
  console.log(`\n### ➡️  Step: ${stepMessage}\n`);
}

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
      const stepMessage =
        "2. Attempt to delete John - should fail as last admin";
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
      const stepMessage =
        "3. Attempt to grant admin to John - should fail as he is already admin";
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
      const stepMessage =
        "4. Attempt to delete John again - verify that failure still occurs";
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

Deno.test("UserAuthentication - Case 4 (Get Username)", async (t) => {
  printTestHeader(t.name);
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const aliceUsername = "alice";
  const alicePassword = "aliceSecretPassword";
  const bobUsername = "bob";
  const bobPassword = "bobSecretPassword";

  let aliceUser: ID;
  let bobUser: ID;

  await t.step("1. Create Alice and Bob users", async () => {
    const stepMessage = "1. Create Alice and Bob users";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const registerAliceResult = await userAuth.register({
      username: aliceUsername,
      password: alicePassword,
    });
    assertAndLog(
      "user" in registerAliceResult,
      true,
      "Alice's registration should succeed",
      stepMessage,
      ++checkIndex,
    );
    aliceUser = (registerAliceResult as { user: ID }).user;

    const registerBobResult = await userAuth.register({
      username: bobUsername,
      password: bobPassword,
    });
    assertAndLog(
      "user" in registerBobResult,
      true,
      "Bob's registration should succeed",
      stepMessage,
      ++checkIndex,
    );
    bobUser = (registerBobResult as { user: ID }).user;
  });

  await t.step("2. Test _getUsername for existing users", async () => {
    const stepMessage = "2. Test _getUsername for existing users";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const aliceUsernameResult = await userAuth._getUsername({
      user: aliceUser,
    });
    assertAndLog(
      "username" in aliceUsernameResult,
      true,
      "Getting Alice's username should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (aliceUsernameResult as { username: string }).username,
      aliceUsername,
      "Alice's username should match the registered username",
      stepMessage,
      ++checkIndex,
    );

    const bobUsernameResult = await userAuth._getUsername({ user: bobUser });
    assertAndLog(
      "username" in bobUsernameResult,
      true,
      "Getting Bob's username should succeed",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (bobUsernameResult as { username: string }).username,
      bobUsername,
      "Bob's username should match the registered username",
      stepMessage,
      ++checkIndex,
    );
  });

  await t.step("3. Test _getUsername for non-existent user", async () => {
    const stepMessage = "3. Test _getUsername for non-existent user";
    printStepHeader(stepMessage);
    let checkIndex = 0;

    const fakeUserId = "fake-user-id" as ID;
    const fakeUsernameResult = await userAuth._getUsername({
      user: fakeUserId,
    });
    assertAndLog(
      "error" in fakeUsernameResult,
      true,
      "Getting username for non-existent user should return error",
      stepMessage,
      ++checkIndex,
    );
    assertAndLog(
      (fakeUsernameResult as { error: string }).error,
      `User with ID '${fakeUserId}' not found.`,
      "Error message should indicate user not found",
      stepMessage,
      ++checkIndex,
    );
  });

  await client.close();
});
