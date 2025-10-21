---
timestamp: 'Tue Oct 21 2025 00:09:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_000949.9b6e8ae4.md]]'
content_id: bcbbcfa1b115e21cb1e17f4477f8e7a4dd8894f37d4c0a3ca1c74cfc6806ce93
---

# file: src/concepts/User/UserConcept.ts

```typescript
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
   * @effects Authenticates the user and returns their `userId`. Returns an error if authentication fails.
   */
  async authenticateUser(
    { usernameOrEmail, password }: {
      usernameOrEmail: string;
      password: string;
    },
  ): Promise<{ userId: ID } | { error: string }> {
    // Requires: A user with the provided usernameOrEmail must exist.
    const user = await this.users.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      return { error: "Invalid credentials." };
    }

    // Requires: The provided password must match the stored passwordHash.
    const passwordMatches = await compare(password, user.passwordHash);

    if (!passwordMatches) {
      return { error: "Invalid credentials." };
    }

    // Effect: Authenticates the user and returns their `userId`.
    return { userId: user._id };
  }

  /**
   * getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }
   * @requires The `userId` must exist.
   * @effects Returns basic non-sensitive user profile information. Returns an error if the user is not found.
   */
  async getUserById(
    { userId }: { userId: ID },
  ): Promise<{ username: string; email: string; creationDate: Date } | {
    error: string;
  }> {
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

  /**
   * updateUserEmail(userId: String, newEmail: String)
   * @requires The `userId` must exist. The `newEmail` must not already be in use by another user.
   * @effects Updates the user's email address. Returns an error if requirements are not met.
   */
  async updateUserEmail(
    { userId, newEmail }: { userId: ID; newEmail: string },
  ): Promise<Empty | { error: string }> {
    // Requires: The `userId` must exist.
    const userToUpdate = await this.users.findOne({ _id: userId });
    if (!userToUpdate) {
      return { error: `User with ID '${userId}' not found.` };
    }

    // Requires: The `newEmail` must not already be in use by another user.
    const existingUserWithNewEmail = await this.users.findOne({
      email: newEmail,
      _id: { $ne: userId }, // Exclude the current user
    });
    if (existingUserWithNewEmail) {
      return { error: `Email '${newEmail}' is already in use by another user.` };
    }
    
    // If the new email is the same as the current email, do nothing and succeed.
    if (userToUpdate.email === newEmail) {
        return {};
    }

    // Effect: Updates the user's email address.
    const updateResult = await this.users.updateOne(
      { _id: userId },
      { $set: { email: newEmail } },
    );

    if (updateResult.modifiedCount === 0) {
      // This case should ideally not be reached if previous checks pass and email is different,
      // but good for robustness if the email was somehow already the same after all.
      return { error: "Failed to update email or email was already the same." };
    }

    return {}; // Success
  }
}
```
