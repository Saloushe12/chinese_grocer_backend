---
timestamp: 'Mon Oct 20 2025 23:55:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_235505.e170579f.md]]'
content_id: 0dd1d9cd23c73ca18b85cacab4e8ba9be3c7f0ab0dcb87f142bcfd6d528a76d1
---

# file: src/concepts/User/UserConcept.test.ts

```typescript
// src/concepts/User/UserConcept.test.ts
import { Deno } from "@deno/test/mod.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MongoClient, Db } from "mongodb"; // Use the bare specifier from deno.json
import UserConcept from "./UserConcept.ts";
import { ID } from "@utils/types.ts";
import { testDb, freshID } from "@utils/database.ts"; // <--- Import testDb and freshID from your utils

// --- Test Setup and Teardown ---
let db: Db;
let client: MongoClient;
let userConcept: UserConcept;

// Before all tests, connect to the database and initialize the concept
Deno.test("User Concept Actions", async (t) => {
  // Establish DB connection for tests using your provided testDb()
  [db, client] = await testDb();
  userConcept = new UserConcept(db);

  // After all tests, close the database connection
  t.afterAll(async () => {
    await client.close();
    console.log("--- Closed MongoDB client after User tests ---");
  });

  // --- beforeEach hook to clear specific collection for each t.step ---
  t.beforeEach(async () => {
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for fresh test step ---");
  });

  // --- Tests for registerUser ---

  await t.step("registerUser: should register a new, valid user successfully", async () => {
    const username = "testuser";
    const email = "test@example.com";
    const password = "ValidPassword123!";

    console.log(`Action: registerUser(username: '${username}', email: '${email}', password: '***')`);
    const result = await userConcept.registerUser({ username, email, password });
    console.log("Output:", result);

    assertExists((result as { userId: ID }).userId, "Expected a userId on successful registration.");
    const userId = (result as { userId: ID }).userId;

    // Verify user exists in the database
    const user = await (db.collection("User.users")).findOne({ _id: userId });
    assertExists(user, `Expected user with userId '${userId}' to exist.`);
    assertEquals(user?.username, username, "Username should match the registered one.");
    console.log(`Verification: User '${username}' with ID '${userId}' confirmed in DB.`);
  });

  await t.step("registerUser: should return an error when registering with an existing username", async () => {
    const existingUsername = "duplicate_user";
    const email1 = "dup1@example.com";
    const email2 = "dup2@example.com";
    const password = "Password123!";

    await userConcept.registerUser({ username: existingUsername, email: email1, password });
    console.log(`Pre-condition: Registered user '${existingUsername}' successfully.`);

    console.log(`Action: registerUser(username: '${existingUsername}', email: '${email2}', password: '***')`);
    const result = await userConcept.registerUser({ username: existingUsername, email: email2, password });
    console.log("Output:", result);

    assertExists((result as { error: string }).error, "Expected an error for duplicate username.");
    assertEquals(
      (result as { error: string }).error,
      `Username '${existingUsername}' already exists.`,
      "Error message should clearly state duplicate username.",
    );
    console.log(`Verification: Correctly received error for duplicate username.`);
  });

  await t.step("registerUser: should return an error when registering with a weak password", async () => {
    const username = "weak_pwd_user";
    const email = "weak@example.com";
    const weakPassword = "short"; // Less than 8 characters

    console.log(`Action: registerUser(username: '${username}', email: '${email}', password: '***')`);
    const result = await userConcept.registerUser({ username, email, password: weakPassword });
    console.log("Output:", result);

    assertExists((result as { error: string }).error, "Expected an error for a weak password.");
    assertEquals(
      (result as { error: string }).error,
      "Password must be at least 8 characters long.",
      "Error message should indicate weak password.",
    );
    console.log(`Verification: Correctly received error for weak password.`);
  });

  // --- Tests for authenticateUser ---

  await t.step("authenticateUser: should successfully authenticate a user by username", async () => {
    const username = "authuser";
    const email = "auth@example.com";
    const password = "AuthPassword123!";

    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    console.log(`Pre-condition: Registered user '${username}' with ID '${(registerResult as { userId: ID }).userId}'`);

    console.log(`Action: authenticateUser(usernameOrEmail: '${username}', password: '***')`);
    const authResult = await userConcept.authenticateUser({ usernameOrEmail: username, password });
    console.log("Output:", authResult);

    assertExists((authResult as { userId: ID }).userId, "Expected a userId on successful authentication.");
    assertEquals(
      (authResult as { userId: ID }).userId,
      (registerResult as { userId: ID }).userId,
      "Authenticated userId should match registered userId.",
    );
    console.log(`Verification: User '${username}' successfully authenticated by username.`);
  });

  await t.step("authenticateUser: should successfully authenticate a user by email", async () => {
    const username = "authemailuser";
    const email = "authemail@example.com";
    const password = "AuthEmailPassword123!";

    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    console.log(`Pre-condition: Registered user '${username}' with ID '${(registerResult as { userId: ID }).userId}'`);

    console.log(`Action: authenticateUser(usernameOrEmail: '${email}', password: '***')`);
    const authResult = await userConcept.authenticateUser({ usernameOrEmail: email, password });
    console.log("Output:", authResult);

    assertExists((authResult as { userId: ID }).userId, "Expected a userId on successful authentication by email.");
    assertEquals(
      (authResult as { userId: ID }).userId,
      (registerResult as { userId: ID }).userId,
      "Authenticated userId should match registered userId when authenticating by email.",
    );
    console.log(`Verification: User '${username}' successfully authenticated by email.`);
  });

  await t.step("authenticateUser: should return an error for incorrect password", async () => {
    const username = "wrongpwduser";
    const email = "wrongpwd@example.com";
    const password = "CorrectPassword123!";
    const incorrectPassword = "WrongPassword!";

    await userConcept.registerUser({ username, email, password });
    console.log(`Pre-condition: Registered user '${username}' successfully.`);

    console.log(`Action: authenticateUser(usernameOrEmail: '${username}', password: '***')`);
    const authResult = await userConcept.authenticateUser({
      usernameOrEmail: username,
      password: incorrectPassword,
    });
    console.log("Output:", authResult);

    assertExists((authResult as { error: string }).error, "Expected an error for incorrect password.");
    assertEquals(
      (authResult as { error: string }).error,
      "Invalid credentials.",
      "Error message should indicate invalid credentials.",
    );
    console.log(`Verification: Correctly received error for incorrect password.`);
  });

  await t.step("authenticateUser: should return an error for non-existent user", async () => {
    const nonExistentUsername = "nonexistent";
    const password = "AnyPassword123!";

    console.log(`Action: authenticateUser(usernameOrEmail: '${nonExistentUsername}', password: '***')`);
    const authResult = await userConcept.authenticateUser({
      usernameOrEmail: nonExistentUsername,
      password: password,
    });
    console.log("Output:", authResult);

    assertExists((authResult as { error: string }).error, "Expected an error for non-existent user.");
    assertEquals(
      (authResult as { error: string }).error,
      "Invalid credentials.",
      "Error message should indicate invalid credentials for non-existent user.",
    );
    console.log(`Verification: Correctly received error for non-existent user.`);
  });

  // --- Tests for getUserById ---

  await t.step("getUserById: should return user profile for an existing userId", async () => {
    const username = "profileuser";
    const email = "profile@example.com";
    const password = "ProfilePassword123!";
    const creationDateBeforeRegister = new Date(); // Capture approximate time

    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    const userId = (registerResult as { userId: ID }).userId;
    console.log(`Pre-condition: Registered user '${username}' with ID '${userId}'`);

    console.log(`Action: getUserById(userId: '${userId}')`);
    const getResult = await userConcept.getUserById({ userId });
    console.log("Output:", getResult);

    assertExists((getResult as { username: string }).username, "Expected user profile data to be returned.");
    const userProfile = getResult as { username: string; email: string; creationDate: Date };

    assertEquals(userProfile.username, username, "Returned username should match.");
    assertEquals(userProfile.email, email, "Returned email should match.");
    // Check if creationDate is a Date object and is reasonably close to when it was created
    assertExists(userProfile.creationDate, "Creation date should be present.");
    assertEquals(userProfile.creationDate instanceof Date, true, "Creation date should be a Date object.");
    // Allowing a small time difference
    assertEquals(userProfile.creationDate.getTime() >= creationDateBeforeRegister.getTime(), true, "Creation date should not be before registration.");
    console.log(`Verification: User profile for ID '${userId}' retrieved successfully.`);
  });

  await t.step("getUserById: should return an error for a non-existent userId", async () => {
    const nonExistentUserId = freshID(); // Generate a UUID that won't exist

    console.log(`Action: getUserById(userId: '${nonExistentUserId}')`);
    const getResult = await userConcept.getUserById({ userId: nonExistentUserId });
    console.log("Output:", getResult);

    assertExists((getResult as { error: string }).error, "Expected an error for non-existent userId.");
    assertEquals(
      (getResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log(`Verification: Correctly received error for non-existent user ID.`);
  });
});
```
