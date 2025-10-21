---
timestamp: 'Sun Oct 19 2025 20:52:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_205209.85371aa0.md]]'
content_id: ae179d5d4598ec08ad2cc9d360fbe6e6b58dcb6cae382cbed4411fd1c5bd9a15
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
  * **Requires:** The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length), though specific validation logic resides here.
  * **Effect:** Creates a new user account, hashes the password, and returns the unique `userId`.
* `authenticateUser(usernameOrEmail: String, password: String): userId`
  * **Requires:** A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
  * **Effect:** Authenticates the user and returns their `userId`. Returns null or throws an error if authentication fails.
* `getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }`
  * **Requires:** The `userId` must exist.
  * **Effect:** Returns basic non-sensitive user profile information.
* `updateUserEmail(userId: String, newEmail: String)`
  * **Requires:** The `userId` must exist. The `newEmail` must not already be in use by another user.
  * **Effect:** Updates the user's email address.
* `deleteUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts (e.g., reviews, localization settings).

***
