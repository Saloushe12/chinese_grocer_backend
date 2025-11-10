---
timestamp: 'Sat Nov 08 2025 23:10:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_231020.d8ec46fa.md]]'
content_id: cb3be3324cf0edd3b08aa6aa35d7a42772064d851cc013b8affd18bdb0bc38a2
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

* `registerUser(username: String, email: String, password: String): (userId: String) | (error: String)`
  * **Requires:** The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length).
  * **Effect:** Creates a new user account, hashes the password, and returns the unique `userId`. Returns an `error` string if registration fails (e.g., due to existing username/email).
* `authenticateUser(usernameOrEmail: String, password: String): (userId: String) | (error: String)`
  * **Requires:** A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
  * **Effect:** Authenticates the user and returns their `userId`. Returns an `error` string if authentication fails.
* `updateUserEmail(userId: String, newEmail: String): {} | (error: String)`
  * **Requires:** The `userId` must exist. The `newEmail` must not already be in use by another user.
  * **Effect:** Updates the user's email address. Returns an `error` if the new email is already in use.
* `deleteUser(userId: String): {} | (error: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Deletes the user account. Associated data in other concepts (reviews, localization) is removed by synchronizations. Returns an `error` if the `userId` does not exist.

**queries**

* `_userExists(userId: String): (userId: String)`
  * **Requires:** `true`
  * **Effect:** Returns `userId` in an array if a user with that `userId` exists, otherwise an empty array. (For `where` clause existence checks).
* `_getUserDetails(userId: String): (userId: String, username: String, email: String, creationDate: Timestamp)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Returns an array containing the `userId`, `username`, `email`, and `creationDate` of the specified user. (For `passthrough.ts` for full data).
* `_getUserByUsernameOrEmail(usernameOrEmail: String): (userId: String)`
  * **Requires:** `true`
  * **Effect:** Returns an array containing the `userId` if a user matches the `usernameOrEmail`, otherwise an empty array. (For `where` clause lookup during authentication).

***
