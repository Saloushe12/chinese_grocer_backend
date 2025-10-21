---
timestamp: 'Mon Oct 20 2025 15:15:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_151522.471df7f3.md]]'
content_id: 5c11c57df07f02421e647525f651fc46036d96e7245c97ae7751581ed69069ad
---

# response:

Okay, let's proceed by adding the `getUserById` action to your `UserConcept.ts` file and then creating its simplified test cases.

## Update `src/concepts/User/UserConcept.ts` with `getUserById`

```typescript
// src/concepts/User/UserConcept.ts
import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { hash, compare } from "bcrypt";

// Declare collection prefix, use concept name
const PREFIX = "User" + ".";

// The state of the User concept:
/**
 * Each User is represented by:
 * - `_id`: ID (userId)
 * - `username`: string
 * - `email`: string
 * - `passwordHash`: string
 * - `creationDate`: Date
 */
interface UserDoc {
  _id: ID; // Mapped from userId in spec
  username: string;
  email: string;
  passwordHash: string;
  creationDate: Date;
}

export default class UserConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * @concept User
   * @purpose To manage user accounts, including registration, authentication, and basic profile information.
   * @principle User accounts are fundamental for personalized interactions like leaving reviews or setting language preferences.
   *            Other concepts interact with `User` primarily to identify who is performing an action or whose preferences are being queried.
   */

  /**
   * registerUser(username: String, email: String, password: String): userId
   * @requires The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length), though specific validation logic resides here.
   * @effects Creates a new user account, hashes the password, and returns the unique `userId`.
   */
  async registerUser(
    { username, email, password }: {
      username: string;
      email: string;
      password: string;
    },
  ): Promise<{ userId: ID } | { error: string }> {
    // Requires: username and email must not already exist
    const existingUserByUsername = await this.users.findOne({ username });
    if (existingUserByUsername) {
      return { error: `Username '${username}' already exists.` };
    }

    const existingUserByEmail = await this.users.findOne({ email });
    if (existingUserByEmail) {
      return { error: `Email '${email}' already exists.` };
    }

    // Password complexity check (placeholder, can be expanded)
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    // Effect: Hash the password
    const passwordHash = await hash(password);

    // Effect: Creates a new user account
    const newUserId = freshID();
    const newUser: UserDoc = {
      _id: newUserId,
      username,
      email,
      passwordHash,
      creationDate: new Date(),
    };

    await this.users.insertOne(newUser);

    // Effect: returns the unique `userId`
    return { userId: newUserId };
  }

  /**
   * authenticateUser(usernameOrEmail: String, password: String): userId
   * @requires A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
   * @effects Authenticates the user and returns their `userId`. Returns null or throws an error if authentication fails.
   */
  async authenticateUser(
    { usernameOrEmail, password }: {
      usernameOrEmail: string;
      password: string;
    },
  ): Promise<{ userId: ID } | { error: string }> {
    // Requires: A user with the provided `usernameOrEmail` must exist.
    // Try to find user by username or email
    const user = await this.users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      return { error: "Invalid username or email." };
    }

    // Requires: The provided `password` must match the stored `passwordHash`.
    const passwordMatch = await compare(password, user.passwordHash);

    if (!passwordMatch) {
      return { error: "Invalid password." };
    }

    // Effect: Authenticates the user and returns their `userId`.
    return { userId: user._id };
  }

  /**
   * getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }
   * @requires The `userId` must exist.
   * @effects Returns basic non-sensitive user profile information.
   */
  async getUserById(
    { userId }: { userId: ID },
  ): Promise<
    { username: string; email: string; creationDate: Date } | { error: string }
  > {
    // Requires: The `userId` must exist.
    const user = await this.users.findOne({ _id: userId });

    if (!user) {
      return { error: `User with ID '${userId}' not found.` };
    }

    // Effect: Returns basic non-sensitive user profile information.
    return {
      username: user.username,
      email: user.email,
      creationDate: user.creationDate,
    };
  }
}
```

## Update `src/concepts/User/UserConcept.test.ts` with `getUserById` tests

```typescript
// src/concepts/User/UserConcept.test.ts
import { Deno } from "@deno/test/mod.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MongoClient, Db } from "mongodb";
import UserConcept from "./UserConcept.ts";
import { ID } from "@utils/types.ts";
import { getDb } from "@utils/database.ts";

// --- Test Setup and Teardown ---
let db: Db;
let client: MongoClient;
let userConcept: UserConcept;

// Before all tests, connect to the database and initialize the concept
Deno.test("User Concept Tests", async (t) => {
  // Establish DB connection for tests
  [db, client] = await getDb();
  userConcept = new UserConcept(db);

  // Before each test, clear the users collection to ensure a clean state
  t.beforeEach(async () => {
    await db.collection("User.users").deleteMany({});
    console.log("--- Cleared 'User.users' collection for fresh test ---");
  });

  // After all tests, close the database connection
  t.afterAll(async () => {
    await client.close();
    console.log("--- Closed MongoDB client after User tests ---");
  });

  await t.step("registerUser actions", async (t_register) => {
    // --- Basic Behavior: Successful Registration ---
    await t_register.step("should register a new, valid user successfully", async () => {
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
    await t_register.step("should return an error when registering with an existing username", async () => {
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
    await t_register.step("should return an error when registering with a weak password", async () => {
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
  });

  await t.step("authenticateUser actions", async (t_authenticate) => {
    const testUsername = "auth_test_user";
    const testEmail = "auth@example.com";
    const testPassword = "AuthPassword123!";
    let registeredUserId: ID;

    // Pre-register a user for authentication tests
    t_authenticate.beforeAll(async () => {
      await db.collection("User.users").deleteMany({}); // Clear specifically for this test block
      console.log(`Pre-condition: Registering user '${testUsername}' for authentication tests...
```
