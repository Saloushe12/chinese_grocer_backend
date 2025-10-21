---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: 9c8ce8fa33b4bec88d2dc5c773c181b095d2d82590a87dc5220425d16da97a28
---

# file: src\concepts\User\UserConcept.test.ts

```typescript
import { assertEquals, assertExists } from "@test";
import { MongoClient, Db } from "mongodb"; // Use the bare specifier from deno.json
import UserConcept from "./UserConcept.ts";
import { ID } from "@utils/types.ts";
import { testDb } from "@utils/database.ts"; // <--- Import testDb from your utils

// --- Test Setup and Teardown ---
let db: Db;
let client: MongoClient;
let userConcept: UserConcept;

// Before all tests, connect to the database and initialize the concept
Deno.test("User Concept - registerUser actions", async (t) => {
  // Establish DB connection for tests using your provided testDb()
  [db, client] = await testDb(); // <--- Use testDb() here
  userConcept = new UserConcept(db);

  // The `testDb()` function already calls `dropAllCollections` before returning the db.
  // So, an explicit `t.beforeEach` for clearing the collection is no longer strictly necessary,
  // as each test run will start with a fresh, empty test database.
  // However, if you want *each individual t.step* to have a completely fresh collection *within the same Deno.test block*,
  // you might still use a `t.beforeEach` to delete the collection specific to UserConcept.
  // For now, let's assume `testDb` provides enough isolation for the whole `Deno.test` run.
  // If `Deno.test` runs steps sequentially, then a single `testDb` at the start would be fine for all steps.

  // NOTE: If `Deno.test` runs steps in parallel (which is not default but can be configured),
  // or if you need absolute isolation between `t.step` calls in a sequential run,
  // you might re-introduce a `t.beforeEach` that clears the *specific* "User.users" collection.
  // For the current simple test requirements, we'll rely on the `testDb()` initial drop.


  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // --- Basic Behavior: Successful Registration --- ////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



  await t.step("should register a new, valid user successfully", async () => {
    // Ensuring clean slate for *this specific test step*
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'successful registration' test ---");

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

  // --- Edge Case 1: Attempt to register with an existing username ---
  await t.step("should return an error when registering with an existing username", async () => {
    // Ensuring clean slate for *this specific test step*
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'existing username' test ---");

    const existingUsername = "duplicate_user";
    const email1 = "dup1@example.com";
    const email2 = "dup2@example.com";
    const password = "Password123!";

    // Register first user successfully
    await userConcept.registerUser({ username: existingUsername, email: email1, password });
    console.log(`Pre-condition: Registered user '${existingUsername}' successfully.`);

    // Attempt to register another user with the same username
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

  // --- Edge Case 2: Attempt to register with a weak password ---
  await t.step("should return an error when registering with a weak password", async () => {
    // Ensuring clean slate for *this specific test step*
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'weak password' test ---");

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



  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // --- Tests for authenticateUser --- /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




  await t.step("authenticateUser: should successfully authenticate a user by username", async () => {
    // --- Setup for this specific test step ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'auth by username' test ---");

    const username = "authuser";
    const email = "auth@example.com";
    const password = "AuthPassword123!";

    // Pre-condition: Register a user
    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    console.log(`Pre-condition: Registered user '${username}' with ID '${(registerResult as { userId: ID }).userId}'`);

    // Action: Authenticate the user by username
    console.log(`Action: authenticateUser(usernameOrEmail: '${username}', password: '***')`);
    const authResult = await userConcept.authenticateUser({ usernameOrEmail: username, password });
    console.log("Output:", authResult);

    // Assertions
    assertExists((authResult as { userId: ID }).userId, "Expected a userId on successful authentication.");
    assertEquals(
      (authResult as { userId: ID }).userId,
      (registerResult as { userId: ID }).userId,
      "Authenticated userId should match registered userId.",
    );
    console.log(`Verification: User '${username}' successfully authenticated by username.`);
  });

  await t.step("authenticateUser: should successfully authenticate a user by email", async () => {
    // --- Setup for this specific test step ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'auth by email' test ---");

    const username = "authemailuser";
    const email = "authemail@example.com";
    const password = "AuthEmailPassword123!";

    // Pre-condition: Register a user
    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    console.log(`Pre-condition: Registered user '${username}' with ID '${(registerResult as { userId: ID }).userId}'`);

    // Action: Authenticate the user by email
    console.log(`Action: authenticateUser(usernameOrEmail: '${email}', password: '***')`);
    const authResult = await userConcept.authenticateUser({ usernameOrEmail: email, password });
    console.log("Output:", authResult);

    // Assertions
    assertExists((authResult as { userId: ID }).userId, "Expected a userId on successful authentication by email.");
    assertEquals(
      (authResult as { userId: ID }).userId,
      (registerResult as { userId: ID }).userId,
      "Authenticated userId should match registered userId when authenticating by email.",
    );
    console.log(`Verification: User '${username}' successfully authenticated by email.`);
  });

  await t.step("authenticateUser: should return an error for incorrect password", async () => {
    // --- Setup for this specific test step ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'incorrect password' test ---");

    const username = "wrongpwduser";
    const email = "wrongpwd@example.com";
    const password = "CorrectPassword123!";
    const incorrectPassword = "WrongPassword!";

    // Pre-condition: Register a user
    await userConcept.registerUser({ username, email, password });
    console.log(`Pre-condition: Registered user '${username}' successfully.`);

    // Action: Attempt to authenticate with an incorrect password
    console.log(`Action: authenticateUser(usernameOrEmail: '${username}', password: '***')`);
    const authResult = await userConcept.authenticateUser({
      usernameOrEmail: username,
      password: incorrectPassword,
    });
    console.log("Output:", authResult);

    // Assertions
    assertExists((authResult as { error: string }).error, "Expected an error for incorrect password.");
    assertEquals(
      (authResult as { error: string }).error,
      "Invalid credentials.",
      "Error message should indicate invalid credentials.",
    );
    console.log(`Verification: Correctly received error for incorrect password.`);
  });

  await t.step("authenticateUser: should return an error for non-existent user", async () => {
    // --- Setup for this specific test step ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'non-existent user' test ---");

    const nonExistentUsername = "nonexistent";
    const password = "AnyPassword123!";

    // Action: Attempt to authenticate a non-existent user
    console.log(`Action: authenticateUser(usernameOrEmail: '${nonExistentUsername}', password: '***')`);
    const authResult = await userConcept.authenticateUser({
      usernameOrEmail: nonExistentUsername,
      password: password,
    });
    console.log("Output:", authResult);

    // Assertions
    assertExists((authResult as { error: string }).error, "Expected an error for non-existent user.");
    assertEquals(
      (authResult as { error: string }).error,
      "Invalid credentials.",
      "Error message should indicate invalid credentials for non-existent user.",
    );
    console.log(`Verification: Correctly received error for non-existent user.`);
  });


  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // --- Tests for getUserById --- //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



  await t.step("getUserById: should successfully retrieve a user's basic profile information", async () => {
    // --- Setup for this specific test step ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'get user by ID success' test ---");

    const username = "profileuser";
    const email = "profile@example.com";
    const password = "ProfilePassword123!";

    // Pre-condition: Register a user
    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    const userId = (registerResult as { userId: ID }).userId;
    console.log(`Pre-condition: Registered user '${username}' with ID '${userId}'`);

    // Action: Retrieve the user's profile by ID
    console.log(`Action: getUserById(userId: '${userId}')`);
    const userProfileResult = await userConcept.getUserById({ userId });
    console.log("Output:", userProfileResult);

    // Assertions
    assertExists((userProfileResult as { username: string }).username, "Expected username in profile result.");
    assertEquals(
      (userProfileResult as { username: string }).username,
      username,
      "Retrieved username should match.",
    );
    assertEquals((userProfileResult as { email: string }).email, email, "Retrieved email should match.");
    assertExists(
      (userProfileResult as { creationDate: Date }).creationDate,
      "Expected creationDate in profile result.",
    );
    console.log(`Verification: User profile for ID '${userId}' successfully retrieved.`);
  });

  await t.step("getUserById: should return an error for a non-existent userId", async () => {
    // --- Setup for this specific test step ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'get user by ID non-existent' test ---");

    const nonExistentUserId = "nonexistent-user-id" as ID; // Cast to ID for type safety

    // Action: Attempt to retrieve a non-existent user's profile
    console.log(`Action: getUserById(userId: '${nonExistentUserId}')`);
    const userProfileResult = await userConcept.getUserById({ userId: nonExistentUserId });
    console.log("Output:", userProfileResult);

    // Assertions
    assertExists((userProfileResult as { error: string }).error, "Expected an error for non-existent userId.");
    assertEquals(
      (userProfileResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log(`Verification: Correctly received error for non-existent userId.`);
  });

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // --- Tests for updateUserEmail --- //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 

  await t.step("updateUserEmail: should successfully update a user's email", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    // This ensures this test starts with a clean slate for the 'User.users' collection.
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'update email success' test ---");

    const username = "emailupdateuser";
    const oldEmail = "old@example.com";
    const newEmail = "new@example.com";
    const password = "Password123!";

    // Pre-condition: Register a user
    const registerResult = await userConcept.registerUser({ username, email: oldEmail, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    const userId = (registerResult as { userId: ID }).userId;
    console.log(`Pre-condition: Registered user '${username}' with ID '${userId}' and email '${oldEmail}'`);

    // Action: Update the user's email
    console.log(`Action: updateUserEmail(userId: '${userId}', newEmail: '${newEmail}')`);
    const updateResult = await userConcept.updateUserEmail({ userId, newEmail });
    console.log("Output:", updateResult);

    // Assertions
    assertEquals(updateResult, {}, "Expected an empty object on successful email update.");

    // Verification: Retrieve user to check the updated email
    const updatedUser = await userConcept.getUserById({ userId });
    assertExists((updatedUser as { email: string }).email, "Expected to retrieve updated user profile.");
    assertEquals((updatedUser as { email: string }).email, newEmail, "User's email should be updated to new email.");
    console.log(`Verification: User ID '${userId}' email successfully changed to '${newEmail}'.`);
  });

  await t.step("updateUserEmail: should return an error for a non-existent userId", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'update email non-existent user' test ---");

    const nonExistentUserId = "nonexistent-user-id" as ID;
    const newEmail = "nonexistent_target@example.com";

    // Action: Attempt to update email for a non-existent user
    console.log(`Action: updateUserEmail(userId: '${nonExistentUserId}', newEmail: '${newEmail}')`);
    const updateResult = await userConcept.updateUserEmail({ userId: nonExistentUserId, newEmail });
    console.log("Output:", updateResult);

    // Assertions
    assertExists((updateResult as { error: string }).error, "Expected an error for non-existent userId.");
    assertEquals(
      (updateResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log(`Verification: Correctly received error for non-existent userId.`);
  });

  await t.step("updateUserEmail: should return an error if new email is already in use by another user", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'update email duplicate' test ---");

    const user1Username = "user1";
    const user1Email = "user1@example.com";
    const user2Username = "user2";
    const user2Email = "user2@example.com";
    const password = "Password123!";

    // Pre-condition: Register two users
    const registerResult1 = await userConcept.registerUser({ username: user1Username, email: user1Email, password });
    assertExists((registerResult1 as { userId: ID }).userId, "Pre-condition: User 1 registration must succeed.");
    const userId1 = (registerResult1 as { userId: ID }).userId;
    console.log(`Pre-condition: Registered user '${user1Username}' with ID '${userId1}' and email '${user1Email}'`);

    await userConcept.registerUser({ username: user2Username, email: user2Email, password });
    console.log(`Pre-condition: Registered user '${user2Username}' with email '${user2Email}'`);

    // Action: Attempt to update user1's email to user2's email
    console.log(`Action: updateUserEmail(userId: '${userId1}', newEmail: '${user2Email}')`);
    const updateResult = await userConcept.updateUserEmail({ userId: userId1, newEmail: user2Email });
    console.log("Output:", updateResult);

    // Assertions
    assertExists((updateResult as { error: string }).error, "Expected an error for duplicate email.");
    assertEquals(
      (updateResult as { error: string }).error,
      `Email '${user2Email}' is already in use by another user.`,
      "Error message should indicate email already in use.",
    );
    console.log(`Verification: Correctly received error for duplicate email.`);
  });

  await t.step("updateUserEmail: should succeed without changing email if new email is the same as current", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'update email same as current' test ---");

    const username = "sameemailuser";
    const email = "same@example.com";
    const password = "Password123!";

    // Pre-condition: Register a user
    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    const userId = (registerResult as { userId: ID }).userId;
    console.log(`Pre-condition: Registered user '${username}' with ID '${userId}' and email '${email}'`);

    // Action: Attempt to update the user's email to the *same* current email
    console.log(`Action: updateUserEmail(userId: '${userId}', newEmail: '${email}')`);
    const updateResult = await userConcept.updateUserEmail({ userId, newEmail: email });
    console.log("Output:", updateResult);

    // Assertions
    assertEquals(updateResult, {}, "Expected an empty object on successful (no-change) email update.");

    // Verification: Retrieve user to ensure email is still the same
    const userAfterUpdate = await userConcept.getUserById({ userId });
    assertEquals((userAfterUpdate as { email: string }).email, email, "User's email should remain unchanged.");
    console.log(`Verification: User ID '${userId}' email remained '${email}' as it was already the same.`);
  });

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // --- Tests for deleteUser --- ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  await t.step("deleteUser: should successfully delete an existing user", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'delete user success' test ---");

    const username = "deletemeuser";
    const email = "delete@example.com";
    const password = "DeletePassword123!";

    // Pre-condition: Register a user
    const registerResult = await userConcept.registerUser({ username, email, password });
    assertExists((registerResult as { userId: ID }).userId, "Pre-condition: User registration must succeed.");
    const userId = (registerResult as { userId: ID }).userId;
    console.log(`Pre-condition: Registered user '${username}' with ID '${userId}'`);

    // Action: Delete the user
    console.log(`Action: deleteUser(userId: '${userId}')`);
    const deleteResult = await userConcept.deleteUser({ userId });
    console.log("Output:", deleteResult);

    // Assertions
    assertEquals(deleteResult, {}, "Expected an empty object on successful user deletion.");

    // Verification: Try to retrieve the user by ID - it should no longer exist
    const userAfterDelete = await userConcept.getUserById({ userId });
    assertExists((userAfterDelete as { error: string }).error, "Expected an error when getting deleted user.");
    assertEquals(
      (userAfterDelete as { error: string }).error,
      `User with ID '${userId}' not found.`,
      "Error message should indicate user not found after deletion.",
    );
    console.log(`Verification: User ID '${userId}' successfully deleted and confirmed absent.`);
  });

  await t.step("deleteUser: should return an error for a non-existent userId", async () => {
    // --- Setup for this specific test step: Clear the collection ---
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for 'delete user non-existent' test ---");

    const nonExistentUserId = "nonexistent-user-id-to-delete" as ID;

    // Action: Attempt to delete a non-existent user
    console.log(`Action: deleteUser(userId: '${nonExistentUserId}')`);
    const deleteResult = await userConcept.deleteUser({ userId: nonExistentUserId });
    console.log("Output:", deleteResult);

    // Assertions
    assertExists((deleteResult as { error: string }).error, "Expected an error for non-existent userId.");
    assertEquals(
      (deleteResult as { error: string }).error,
      `User with ID '${nonExistentUserId}' not found.`,
      "Error message should indicate user not found.",
    );
    console.log(`Verification: Correctly received error for non-existent userId.`);
  });

  // After all tests, close the database connection
  // --- Cleanup ---
  await t.step("cleanup database connection", async () => {
    await client.close();
    console.log("--- Closed MongoDB client after User tests ---");
  });
});
```
