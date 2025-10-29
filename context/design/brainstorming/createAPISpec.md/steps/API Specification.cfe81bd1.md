---
timestamp: 'Tue Oct 28 2025 20:37:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_203719.baaed448.md]]'
content_id: cfe81bd15b980a51993d644c4184954b6568f9e939c74ae8a783b69f2f9e54c0
---

# API Specification: UserAuthentication Concept

**Purpose:** limit User access to particular subset of resources

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password. The first registered user is automatically an admin.

**Requirements:**

* no User exists with username

**Effects:**

* creates new User w/ username and password, if first user created admin flag set to true

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/authenticate

**Description:** Authenticates a user with the provided username and password.

**Requirements:**

* User exists with that username and password

**Effects:**

* authenticated as returned User and can view other concepts data that User has

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/deleteUser

**Description:** Deletes a specified user from the system.

**Requirements:**

* `userToDelete` is in `Users`
* and (not `userToDelete.admin` or (count(u in Users where `u.admin` is true) > 1))

**Effects:**

* removes `userToDelete` from `Users`

**Request Body:**

```json
{
  "userToDelete": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/grantAdmin

**Description:** Grants administrative privileges to a target user.

**Requirements:**

* `targetUser` is in `Users`

**Effects:**

* sets `targetUser.admin` to true

**Request Body:**

```json
{
  "targetUser": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/updatePassword

**Description:** Updates the password for a specified user.

**Requirements:**

* `user` is in `Users`
* and `user.password` matches `oldPassword`

**Effects:**

* `user.password` is set to `newPassword`

**Request Body:**

```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**

```json
{
  "success": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_getIsUserAdmin

**Description:** Checks if a specified user has administrative privileges.

**Requirements:**

* `user` is in `Users`

**Effects:**

* returns `user.admin`

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "isAdmin": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_getListOfUsers

**Description:** Returns a list of all registered user IDs.

**Requirements:**

* true

**Effects:**

* returns the set of all `Users`

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "users": [
      "string"
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_getNumberOfAdmins

**Description:** Returns the total count of users with administrative privileges.

**Requirements:**

* true

**Effects:**

* returns count(u in Users where `u.admin` is true)

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "count": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
