---
timestamp: 'Tue Oct 21 2025 20:28:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_202835.e9f7f1bc.md]]'
content_id: 19dcc29e19b068e330a717ee4c1db9095ba15a6d9aeba4ab852993b74e8c95a3
---

# API Specification: User Concept

**Purpose:** To manage user accounts, including registration, authentication, and basic profile information.

***

## API Endpoints

### POST /api/User/registerUser

**Description:** Creates a new user account, hashes the password, and returns the unique `userId`.

**Requirements:**

* The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length), though specific validation logic resides here.

**Effects:**

* Creates a new user account, hashes the password, and returns the unique `userId`.

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "userId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/authenticateUser

**Description:** Authenticates the user and returns their `userId`.

**Requirements:**

* A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.

**Effects:**

* Authenticates the user and returns their `userId`. Returns an error if authentication fails.

**Request Body:**

```json
{
  "usernameOrEmail": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "userId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/getUserById

**Description:** Returns basic non-sensitive user profile information.

**Requirements:**

* The `userId` must exist.

**Effects:**

* Returns basic non-sensitive user profile information. Returns an error if the user is not found.

**Request Body:**

```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**

```json
{
  "username": "string",
  "email": "string",
  "creationDate": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/updateUserEmail

**Description:** Updates the user's email address.

**Requirements:**

* The `userId` must exist. The `newEmail` must not already be in use by another user.

**Effects:**

* Updates the user's email address. Returns an error if requirements are not met.

**Request Body:**

```json
{
  "userId": "string",
  "newEmail": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/deleteUser

**Description:** Deletes the user account.

**Requirements:**

* The `userId` must exist.

**Effects:**

* Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts.

**Request Body:**

```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
