---
timestamp: 'Sat Nov 08 2025 22:58:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_225836.a5c426e2.md]]'
content_id: 8efa7ee0711f42c711591c561536fa9cedfde93e7417f3d4d8e7377e6bfdcdcd
---

# Concept: User

**purpose**
To manage user accounts, including registration, authentication, and basic profile information.

**principle**
User accounts are fundamental for personalized interactions like leaving reviews or setting language preferences. Other concepts interact with `User` primarily to identify who is performing an action or whose preferences are being queried.

**state**
Each `User` is represented by:

* `userId`: String (unique document identifier)
* `username`: String (unique identifier for login)
* `email`: String (unique identifier for login and communication)
* `passwordHash`: String (hashed password for security)
* `creationDate`: Timestamp

**actions**

* `registerUser(username: String, email: String, password: String): userId`
  * **Requires:** The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length).
  * **Effect:** Creates a new user account, hashes the password, and returns the unique `userId`.
* `authenticateUser(usernameOrEmail: String, password: String): (userId: userId) | (error: String)`
  * **Requires:** A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
  * **Effect:** Authenticates the user and returns their `userId`. Returns an `error` string if authentication fails.
* `updateUserEmail(userId: String, newEmail: String)`
  * **Requires:** The `userId` must exist. The `newEmail` must not already be in use by another user.
  * **Effect:** Updates the user's email address.
* `deleteUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Deletes the user account. Associated data in other concepts (reviews, localization) is removed by synchronizations.

**queries**

* `_userExists(userId: String): (userId: String)`
  * **Requires:** `true`
  * **Effect:** Returns the `userId` if it exists, otherwise an empty array. (For `where` clause existence checks).
* `_getUserDetails(userId: String): (username: String, email: String, creationDate: Timestamp)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Returns basic non-sensitive user profile information (username, email, creationDate). (For `passthrough.ts` for full data).
* `_getUserByUsernameOrEmail(usernameOrEmail: String): (userId: String)`
  * **Requires:** `true`
  * **Effect:** Returns the `userId` if a user matches the `usernameOrEmail`, otherwise an empty array. (For `where` clause lookup during authentication).

***
