# UserAuthentication Design Changes

1. Transitioned from [User, Administrator] state to just [User], where users have an admin flag.
   - Made it easier to have everything under the same User and simply check if that User is an admin.
2. Included new lifecycle management actions deleteUser, grantAdmin, and updatePassword.
   - Necessary for ensuring application succeeds with different uses that the users may need.
3. Added queries that I had previously not included: _getIsUserAdmin, _getListOfUsers, _getNumberOfAdmins.
   - Trivial why queries are necessary.
4. Not a design change but ran into trouble with synchronizations. I was trying ensure a user couldn't delete or updatePassword for a different user (unless it was an admin), but realized that access would be granted synchronously. Like a user can only delete their account if they had previously been authenticated as that user, which follows the flow of syncs.
