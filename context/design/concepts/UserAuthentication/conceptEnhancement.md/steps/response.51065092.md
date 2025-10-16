---
timestamp: 'Wed Oct 15 2025 06:49:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_064922.04ac4196.md]]'
content_id: 51065092b523e4fe5f620eb16ae98759631e2c79d9681e93bb2c44d7953d0c56
---

# response:

```
# UserAuthentication

**concept** UserAuthentication [User]

**purpose** limit User access to particular subset of resources

**principle** a person is *registered* as a User with a username and password, afterwards that person can *authenticate* as their registered user and view the resources they have access to. If that person was the first user to register then they automatically are the admin, and have access to all resources.

**state**
    a set of Users with
        a username String
        a password String
        an admin flag Bool

**actions**
    register (username: String, password: String): (user: User)
            **requires** no User exists with username
            **effects** creates new User w/ username and password, if first user created admin flag set to true, returns the new User
    authenticate (username: String, password: String): (user: User)
            **requires** User exists with that username and password
            **effects** authenticated as returned User and can view other concepts data that User has
    deleteUser (userToDelete: User, caller: User)
            **requires** userToDelete exists in Users
            **requires** admin flag of caller is true
            **requires** if admin flag of userToDelete is true, then count(u: User where admin flag of u is true) > 1
            **effects** removes userToDelete from the set of Users
    grantAdmin (userToGrantAdmin: User, caller: User)
            **requires** userToGrantAdmin exists in Users
            **requires** admin flag of caller is true
            **effects** sets admin flag of userToGrantAdmin to true

**queries**
    getIsUserAdmin (user: User): (isAdmin: Bool)
            **effects** return admin flag of user
    getListOfUsers (): (users: set of User)
            **effects** return the set of all Users
```
