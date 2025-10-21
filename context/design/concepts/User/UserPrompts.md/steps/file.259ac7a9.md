---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: 259ac7a9ade8395dae8589313b67f65d52e291205316eaed37fe2d7ef7dfa955
---

# file: src/concepts/User/UserConcept.test.ts (partial update)

```typescript
// ... (previous imports and initial setup for db, client, userConcept) ...

// Main test suite for User Concept actions
Deno.test("User Concept Actions (getUserById)", async (t) => {
  // --- Setup for the entire test suite ---
  // Establish DB connection for tests using your provided testDb()
  [db, client] = await testDb();
  userConcept = new UserConcept(db);
  console.log("--- Initialized DB and UserConcept for suite ---");

  // --- Tests for getUserById ---

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

  // --- Teardown for the entire test suite ---
  await client.close();
  console.log("--- Closed MongoDB client after User Concept Actions (getUserById) tests ---");
});

// ... (remaining Deno.test blocks for other actions if they are in the same file) ...
```
