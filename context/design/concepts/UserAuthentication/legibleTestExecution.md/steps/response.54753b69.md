---
timestamp: 'Wed Oct 15 2025 09:18:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_091849.08b2a03c.md]]'
content_id: 54753b69a51673a7037c8d1c4b285970936e2817915f8a5e076fd79795a80432
---

# response:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication - Operating Principle", async (t) => {
  console.log("\n## Deno Test Case: UserAuthentication - Operating Principle");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackUsername = "jack";
  const jackPassword = "password123";
  const jillUsername = "jill";
  const jillPassword = "password456";

  let jackUser: ID;
  let jillUser: ID;

  await t.step("1. Create first user (Jack) - should be admin", async () => {
    console.log("  - Step: 1. Create first user (Jack) - should be admin");
    const registerJackResult = await userAuth.register({
      username: jackUsername,
      password: jackPassword,
    });

    let description = "Jack's registration should succeed (returns 'user')";
    try {
      assertEquals("user" in registerJackResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    jackUser = (registerJackResult as { user: ID }).user;

    const authJackResult = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    description = "Jack should be able to authenticate (returns 'user')";
    try {
      assertEquals("user" in authJackResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "Authenticated user should be Jack";
    try {
      assertEquals((authJackResult as { user: ID }).user, jackUser);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const jackIsAdmin = await userAuth._getIsUserAdmin({ user: jackUser });
    description = "Query for Jack's admin status should succeed (returns 'isAdmin')";
    try {
      assertEquals("isAdmin" in jackIsAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "Jack should be an admin (first user)";
    try {
      assertEquals((jackIsAdmin as { isAdmin: boolean }).isAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const adminCount = await userAuth._getNumberOfAdmins();
    description = "Should be 1 admin after Jack registers";
    try {
      assertEquals((adminCount as { count: number }).count, 1);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
  });

  await t.step(
    "2. Create second user (Jill) - should not be admin",
    async () => {
      console.log("  - Step: 2. Create second user (Jill) - should not be admin");
      const registerJillResult = await userAuth.register({
        username: jillUsername,
        password: jillPassword,
      });
      let description = "Jill's registration should succeed (returns 'user')";
      try {
        assertEquals("user" in registerJillResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      jillUser = (registerJillResult as { user: ID }).user;

      const authJillResult = await userAuth.authenticate({
        username: jillUsername,
        password: jillPassword,
      });
      description = "Jill should be able to authenticate (returns 'user')";
      try {
        assertEquals("user" in authJillResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Authenticated user should be Jill";
      try {
        assertEquals((authJillResult as { user: ID }).user, jillUser);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      const jillIsAdmin = await userAuth._getIsUserAdmin({ user: jillUser });
      description = "Query for Jill's admin status should succeed (returns 'isAdmin')";
      try {
        assertEquals("isAdmin" in jillIsAdmin, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Jill should not be an admin (not the first user)";
      try {
        assertEquals((jillIsAdmin as { isAdmin: boolean }).isAdmin, false);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      const adminCount = await userAuth._getNumberOfAdmins();
      description = "Should still be 1 admin after Jill registers";
      try {
        assertEquals((adminCount as { count: number }).count, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
    },
  );

  await t.step("3. Jack (admin) grants admin to Jill", async () => {
    console.log("  - Step: 3. Jack (admin) grants admin to Jill");
    // Note: The concept doesn't enforce "calling user is admin", external syncs handle this.
    const grantAdminResult = await userAuth.grantAdmin({
      targetUser: jillUser,
    });
    let description = "Granting admin to Jill should succeed (returns 'success')";
    try {
      assertEquals("success" in grantAdminResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "Grant admin operation should return success: true";
    try {
      assertEquals((grantAdminResult as { success: true }).success, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const jillIsAdminAfterGrant = await userAuth._getIsUserAdmin({
      user: jillUser,
    });
    description = "Jill should now be an admin";
    try {
      assertEquals((jillIsAdminAfterGrant as { isAdmin: boolean }).isAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const adminCount = await userAuth._getNumberOfAdmins();
    description = "Should be 2 admins after Jill is granted admin";
    try {
      assertEquals((adminCount as { count: number }).count, 2);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
  });

  await t.step("4. Jack (original admin) deletes his own account", async () => {
    console.log("  - Step: 4. Jack (original admin) deletes his own account");
    // Jack can delete his account because Jill is now also an admin, so there will be > 1 admin remaining.
    // Note: The concept doesn't enforce "calling user is userToDelete or is an admin", external syncs handle this.
    const deleteJackResult = await userAuth.deleteUser({
      userToDelete: jackUser,
    });
    let description = "Jack's account deletion should succeed (returns 'success')";
    try {
      assertEquals("success" in deleteJackResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "Jack's deletion operation should return success: true";
    try {
      assertEquals((deleteJackResult as { success: true }).success, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const currentUsers = await userAuth._getListOfUsers();
    description = "Only 1 user should remain in the system";
    try {
      assertEquals((currentUsers as { users: ID[] }).users.length, 1);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "The remaining user should be Jill";
    try {
      assertEquals((currentUsers as { users: ID[] }).users[0], jillUser);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const adminCount = await userAuth._getNumberOfAdmins();
    description = "Should be 1 admin after Jack's deletion (Jill)";
    try {
      assertEquals((adminCount as { count: number }).count, 1);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const authJackAttempt = await userAuth.authenticate({
      username: jackUsername,
      password: jackPassword,
    });
    description = "Jack should no longer be able to authenticate (returns 'error')";
    try {
      assertEquals("error" in authJackAttempt, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "Authentication for deleted user should fail with correct error message";
    try {
      assertEquals((authJackAttempt as { error: string }).error, "Invalid username or password.");
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
  });

  await client.close();
});

Deno.test("UserAuthentication - Case 1 (Enforce User Differentiation)", async (t) => {
  console.log("\n## Deno Test Case: UserAuthentication - Case 1 (Enforce User Differentiation)");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const pedroUsername = "pedro";
  const pedroPassword1 = "securepassword1";
  const pedroPassword2 = "anotherpassword2"; // Different password for the second attempt

  let pedroUser: ID;

  await t.step("1. Create first admin user Pedro", async () => {
    console.log("  - Step: 1. Create first admin user Pedro");
    const registerPedroResult = await userAuth.register({
      username: pedroUsername,
      password: pedroPassword1,
    });

    let description = "Pedro's initial registration should succeed (returns 'user')";
    try {
      assertEquals("user" in registerPedroResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    pedroUser = (registerPedroResult as { user: ID }).user;

    // Optional: Verify Pedro is admin (as the first user)
    const pedroIsAdmin = await userAuth._getIsUserAdmin({ user: pedroUser });
    description = "Pedro should be an admin as the first user";
    try {
      assertEquals((pedroIsAdmin as { isAdmin: boolean }).isAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
  });

  await t.step(
    "2. Attempt to create a new user Pedro, but with different password (should fail)",
    async () => {
      console.log("  - Step: 2. Attempt to create a new user Pedro, but with different password (should fail)");
      const registerPedroAgainResult = await userAuth.register({
        username: pedroUsername, // Same username
        password: pedroPassword2, // Different password
      });

      let description = "Registering with an existing username should return an error";
      try {
        assertEquals("error" in registerPedroAgainResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Error message should indicate that the username is taken";
      try {
        assertEquals(
          (registerPedroAgainResult as { error: string }).error,
          `User with username '${pedroUsername}' already exists.`,
        );
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      // Verify that no new user was created
      const currentUsers = await userAuth._getListOfUsers();
      description = "Only one user (Pedro) should exist in the system";
      try {
        assertEquals((currentUsers as { users: ID[] }).users.length, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "The existing user should still be the original Pedro";
      try {
        assertEquals((currentUsers as { users: ID[] }).users[0], pedroUser);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 2 (Verify Password Changing)", async (t) => {
  console.log("\n## Deno Test Case: UserAuthentication - Case 2 (Verify Password Changing)");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const jackyUsername = "jacky";
  const jackyOldPassword = "oldSecurePassword";
  const jackyNewPassword = "newStrongPassword";

  let jackyUser: ID;

  await t.step("1. Create first admin user Jacky", async () => {
    console.log("  - Step: 1. Create first admin user Jacky");
    const registerJackyResult = await userAuth.register({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    let description = "Jacky's registration should succeed (returns 'user')";
    try {
      assertEquals("user" in registerJackyResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    jackyUser = (registerJackyResult as { user: ID }).user;

    // Verify Jacky can authenticate with the old password
    const authJackyOldPassResult = await userAuth.authenticate({
      username: jackyUsername,
      password: jackyOldPassword,
    });
    description = "Jacky should be able to authenticate with old password initially";
    try {
      assertEquals("user" in authJackyOldPassResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "Authenticated user should be Jacky with old password";
    try {
      assertEquals((authJackyOldPassResult as { user: ID }).user, jackyUser);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    // Optional: Verify Jacky is admin (as the first user)
    const jackyIsAdmin = await userAuth._getIsUserAdmin({ user: jackyUser });
    description = "Jacky should be an admin as the first user";
    try {
      assertEquals((jackyIsAdmin as { isAdmin: boolean }).isAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
  });

  await t.step(
    "2. Verify Jacky is able to change Jacky's password",
    async () => {
      console.log("  - Step: 2. Verify Jacky is able to change Jacky's password");
      // Attempt to change password
      const updatePasswordResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword,
        newPassword: jackyNewPassword,
      });
      let description = "Password change operation should succeed (returns 'success')";
      try {
        assertEquals("success" in updatePasswordResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Password change should return success: true";
      try {
        assertEquals((updatePasswordResult as { success: true }).success, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      // Try to authenticate with the OLD password (should fail)
      const authJackyWithOldPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyOldPassword,
      });
      description = "Jacky should NOT be able to authenticate with old password after change (returns 'error')";
      try {
        assertEquals("error" in authJackyWithOldPassAfterChange, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Authentication with old password should fail with correct error message";
      try {
        assertEquals(
          (authJackyWithOldPassAfterChange as { error: string }).error,
          "Invalid username or password.",
        );
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      // Try to authenticate with the NEW password (should succeed)
      const authJackyWithNewPassAfterChange = await userAuth.authenticate({
        username: jackyUsername,
        password: jackyNewPassword,
      });
      description = "Jacky SHOULD be able to authenticate with new password after change (returns 'user')";
      try {
        assertEquals("user" in authJackyWithNewPassAfterChange, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Authenticated user should be Jacky with new password";
      try {
        assertEquals((authJackyWithNewPassAfterChange as { user: ID }).user, jackyUser);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      // Verify trying to change password with incorrect old password fails
      const updatePasswordFailResult = await userAuth.updatePassword({
        user: jackyUser,
        oldPassword: jackyOldPassword, // Incorrect old password now
        newPassword: "evenNewerPassword",
      });
      description = "Password change with incorrect old password should fail (returns 'error')";
      try {
        assertEquals("error" in updatePasswordFailResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Error message should indicate old password mismatch";
      try {
        assertEquals(
          (updatePasswordFailResult as { error: string }).error,
          "Old password does not match.",
        );
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
    },
  );

  await client.close();
});

Deno.test("UserAuthentication - Case 3 (Admin Management)", async (t) => {
  console.log("\n## Deno Test Case: UserAuthentication - Case 3 (Admin Management)");
  const [db, client] = await testDb();
  const userAuth = new UserAuthenticationConcept(db);

  const johnUsername = "john";
  const johnPassword = "johnsSecretPassword";

  let johnUser: ID;

  await t.step("1. Create John - should be admin", async () => {
    console.log("  - Step: 1. Create John - should be admin");
    const registerJohnResult = await userAuth.register({
      username: johnUsername,
      password: johnPassword,
    });
    let description = "John's registration should succeed (returns 'user')";
    try {
      assertEquals("user" in registerJohnResult, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    johnUser = (registerJohnResult as { user: ID }).user;

    const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
    description = "Query for John's admin status should succeed (returns 'isAdmin')";
    try {
      assertEquals("isAdmin" in johnIsAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
    description = "John should be an admin (first user)";
    try {
      assertEquals((johnIsAdmin as { isAdmin: boolean }).isAdmin, true);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const adminCount = await userAuth._getNumberOfAdmins();
    description = "Should be 1 admin after John registers";
    try {
      assertEquals((adminCount as { count: number }).count, 1);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }

    const usersList = await userAuth._getListOfUsers();
    description = "Only 1 user should exist in the system";
    try {
      assertEquals((usersList as { users: ID[] }).users.length, 1);
      console.log(`    ✅ ${description}`);
    } catch (e) {
      console.log(`    ❌ ${description} - ${e.message}`);
      throw e;
    }
  });

  await t.step(
    "2. Attempt to delete John - should fail as last admin",
    async () => {
      console.log("  - Step: 2. Attempt to delete John - should fail as last admin");
      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      let description = "Deleting John should fail (returns 'error')";
      try {
        assertEquals("error" in deleteJohnResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Error message should indicate inability to delete last admin";
      try {
        assertEquals(
          (deleteJohnResult as { error: string }).error,
          "Cannot delete the last administrator.",
        );
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      const adminCount = await userAuth._getNumberOfAdmins();
      description = "Admin count should still be 1 after failed deletion";
      try {
        assertEquals((adminCount as { count: number }).count, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      const usersList = await userAuth._getListOfUsers();
      description = "User count should still be 1 after failed deletion";
      try {
        assertEquals((usersList as { users: ID[] }).users.length, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
    },
  );

  await t.step(
    "3. Attempt to grant admin to John - should fail as he is already admin",
    async () => {
      console.log("  - Step: 3. Attempt to grant admin to John - should fail as he is already admin");
      const grantAdminToJohnResult = await userAuth.grantAdmin({
        targetUser: johnUser,
      });
      let description = "Granting admin to John should fail as he's already admin (returns 'error')";
      try {
        assertEquals("error" in grantAdminToJohnResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Error message should indicate user is already admin";
      try {
        assertEquals(
          (grantAdminToJohnResult as { error: string }).error,
          `User '${johnUser}' is already an admin.`,
        );
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      const adminCount = await userAuth._getNumberOfAdmins();
      description = "Admin count should remain 1 after failed grant attempt";
      try {
        assertEquals((adminCount as { count: number }).count, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      const johnIsAdmin = await userAuth._getIsUserAdmin({ user: johnUser });
      description = "John should still be an admin";
      try {
        assertEquals((johnIsAdmin as { isAdmin: boolean }).isAdmin, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
    },
  );

  await t.step(
    "4. Attempt to delete John again - verify that failure still occurs",
    async () => {
      console.log("  - Step: 4. Attempt to delete John again - verify that failure still occurs");
      const deleteJohnResult = await userAuth.deleteUser({
        userToDelete: johnUser,
      });
      let description = "Deleting John should still fail (returns 'error')";
      try {
        assertEquals("error" in deleteJohnResult, true);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      description = "Error message should still indicate inability to delete last admin";
      try {
        assertEquals(
          (deleteJohnResult as { error: string }).error,
          "Cannot delete the last administrator.",
        );
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }

      const adminCount = await userAuth._getNumberOfAdmins();
      description = "Admin count should remain 1";
      try {
        assertEquals((adminCount as { count: number }).count, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
      const usersList = await userAuth._getListOfUsers();
      description = "User count should remain 1";
      try {
        assertEquals((usersList as { users: ID[] }).users.length, 1);
        console.log(`    ✅ ${description}`);
      } catch (e) {
        console.log(`    ❌ ${description} - ${e.message}`);
        throw e;
      }
    },
  );

  await client.close();
});

```
