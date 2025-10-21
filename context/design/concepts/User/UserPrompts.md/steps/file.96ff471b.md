---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: 96ff471b4f7c8bbf4a17b0c5cda9e7f7990aac45c9775e7f5b90c9bd6a5b787c
---

# file: src/concepts/User/UserConcept.test.ts (partial update)

```typescript
// ... (previous imports and global variables db, client, userConcept) ...

// Main test suite for User Concept actions
// This Deno.test block will encapsulate all tests for UserConcept actions.
Deno.test("User Concept Actions (updateUserEmail)", async (t) => {
  // --- Setup for the entire test suite execution ---
  // This runs once before any 't.step' within this Deno.test block.
  [db, client] = await testDb(); // Connects to test DB and drops all collections initially
  userConcept = new UserConcept(db);
  console.log("--- Initialized DB and UserConcept for the 'updateUserEmail' test suite ---");

  // --- Tests for updateUserEmail ---

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

  // --- Teardown for the entire test suite ---
  // This runs once after all `t.step` tests in this Deno.test block are complete.
  await client.close();
  console.log("--- Closed MongoDB client after User Concept Actions (updateUserEmail) tests ---");
});
```
