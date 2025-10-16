# Testing Execution Console

## 🧪 Deno Test: UserAuthentication - Operating Principle

### ➡️  Step: 1. Create first user (Jack) - should be admin

    ✅ Check 1: Jack's registration should succeed
    ✅ Check 2: Jack should be able to authenticate
    ✅ Check 3: Authenticated user should be Jack
    ✅ Check 4: Query for Jack's admin status should succeed
    ✅ Check 5: Jack should be an admin (first user)
    ✅ Check 6: Should be 1 admin after Jack registers

### ➡️  Step: 2. Create second user (Jill) - should not be admin

    ✅ Check 1: Jill's registration should succeed
    ✅ Check 2: Jill should be able to authenticate
    ✅ Check 3: Authenticated user should be Jill
    ✅ Check 4: Query for Jill's admin status should succeed
    ✅ Check 5: Jill should not be an admin (not the first user)
    ✅ Check 6: Should still be 1 admin after Jill registers

### ➡️  Step: 3. Jack (admin) grants admin to Jill

    ✅ Check 1: Granting admin to Jill should succeed
    ✅ Check 2: Grant admin operation should return success
    ✅ Check 3: Jill should now be an admin
    ✅ Check 4: Should be 2 admins after Jill is granted admin

### ➡️  Step: 4. Jack (original admin) deletes his own account

    ✅ Check 1: Jack's account deletion should succeed
    ✅ Check 2: Jack's deletion operation should return success
    ✅ Check 3: Only 1 user should remain in the system
    ✅ Check 4: The remaining user should be Jill
    ✅ Check 5: Should be 1 admin after Jack's deletion (Jill)
    ✅ Check 6: Jack should no longer be able to authenticate
    ✅ Check 7: Authentication for deleted user should fail with correct error

## 🧪 Deno Test: UserAuthentication - Case 1 (Enforce User Differentiation)

### ➡️  Step: 1. Create first admin user Pedro

    ✅ Check 1: Pedro's initial registration should succeed
    ✅ Check 2: Pedro should be an admin as the first user

### ➡️  Step: 2. Attempt to create a new user Pedro, but with different password (should fail)

    ✅ Check 1: Registering with an existing username should return an error
    ✅ Check 2: Error message should indicate that the username is taken
    ✅ Check 3: Only one user (Pedro) should exist in the system
    ✅ Check 4: The existing user should still be the original Pedro

## 🧪 Deno Test: UserAuthentication - Case 2 (Verify Password Changing)

### ➡️  Step: 1. Create first admin user Jacky

    ✅ Check 1: Jacky's registration should succeed
    ✅ Check 2: Jacky should be able to authenticate with old password initially
    ✅ Check 3: Authenticated user should be Jacky
    ✅ Check 4: Jacky should be an admin as the first user

### ➡️  Step: 2. Verify Jacky is able to change Jacky's password

    ✅ Check 1: Password change operation should succeed
    ✅ Check 2: Password change should return success
    ✅ Check 3: Jacky should NOT be able to authenticate with old password after change
    ✅ Check 4: Authentication with old password should fail with correct error message
    ✅ Check 5: Jacky SHOULD be able to authenticate with new password after change
    ✅ Check 6: Authenticated user should be Jacky with new password
    ✅ Check 7: Password change with incorrect old password should fail
    ✅ Check 8: Error message should indicate old password mismatch

## 🧪 Deno Test: UserAuthentication - Case 3 (Admin Management)

### ➡️  Step: 1. Create John - should be admin

    ✅ Check 1: John's registration should succeed
    ✅ Check 2: Query for John's admin status should succeed
    ✅ Check 3: John should be an admin (first user)
    ✅ Check 4: Should be 1 admin after John registers
    ✅ Check 5: Only 1 user should exist in the system

### ➡️  Step: 2. Attempt to delete John - should fail as last admin

    ✅ Check 1: Deleting John should fail
    ✅ Check 2: Error message should indicate inability to delete last admin
    ✅ Check 3: Admin count should still be 1 after failed deletion
    ✅ Check 4: User count should still be 1 after failed deletion

### ➡️  Step: 3. Attempt to grant admin to John - should fail as he is already admin

    ✅ Check 1: Granting admin to John should fail as he's already admin
    ✅ Check 2: Error message should indicate user is already admin
    ✅ Check 3: Admin count should remain 1 after failed grant attempt
    ✅ Check 4: John should still be an admin

### ➡️  Step: 4. Attempt to delete John again - verify that failure still occurs

    ✅ Check 1: Deleting John should still fail
    ✅ Check 2: Error message should still indicate inability to delete last admin
    ✅ Check 3: Admin count should remain 1
    ✅ Check 4: User count should remain 1
