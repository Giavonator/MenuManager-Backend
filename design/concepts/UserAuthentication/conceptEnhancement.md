[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@UserAuthentication](./UserAuthentication.md)

# Only add to UserAuthentication.md. Add new queries (_getIsUserAdmin, _getListOfUsers, _getNumberOfAdmins). Add new actions (deleteUser(requires other adming exists if deleting an admin), grantAdmin(requires admin caller)). Add to the operating principle the new lifecycle management actions.

# response:

Here's the updated `UserAuthentication` concept definition, incorporating the new queries, actions, and an enhanced principle:

---

# UserAuthentication

**concept** UserAuthentication

**purpose** limit User access to particular subset of resources

**principle** a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user and view the resources they have access to. If that person was the first user to register then they automatically are the admin, and have access to all resources. *Administrators can manage other users, including granting or revoking administrative privileges and deleting users, provided a minimum number of administrators are maintained.*

**state**\
    a set of Users with\
        a username String\
        a password String\
        an admin flag Bool\

**actions**\
    register (username: String, password: String): (user: User)\
            **requires** no User exists where `username` matches input `username`\
            **effects** creates new User `u` with `u.username` set to input `username`, `u.password` set to input `password`, and `u.admin` set to `(count(Users) == 0)` before this action; returns `u`.

    authenticate (username: String, password: String): (user: User)\
            **requires** User exists with that `username` and `password`\
            **effects** returns the authenticated `User`.

    deleteUser (userToDelete: User)\
            **requires**\
                `userToDelete` is in `Users`\
                and (not `userToDelete.admin` or (count(u in Users where `u.admin` is true) > 1))\
            **effects** removes `userToDelete` from `Users`

    grantAdmin (targetUser: User, caller: User)\
            **requires**\
                `targetUser` is in `Users`\
                and `caller` is in `Users`\
                and `caller.admin` is true\
            **effects** sets `targetUser.admin` to true

**queries**
    _getIsUserAdmin (user: User): (isAdmin: Bool)\
        **requires** `user` is in `Users`\
        **effects** returns `user.admin`

    _getListOfUsers (): (users: set of User)\
        **requires** true\
        **effects** returns the set of all `Users`

    _getNumberOfAdmins (): (count: Number)\
        **requires** true\
        **effects** returns count(u in Users where `u.admin` is true)