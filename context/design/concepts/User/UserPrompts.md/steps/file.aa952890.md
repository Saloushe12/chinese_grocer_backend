---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: aa9528906c440f60ddf44832bdc0bc5c520206d1d7e7b7e5b0c2941c7338e16b
---

# file: src/User/UserConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { hash, compare } from "npm:bcrypt"; // Need bcrypt for password hashing

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
    // Using Deno.env.get for salt rounds, defaulting to 10 if not set.
    const saltRounds = parseInt(Deno.env.get("BCRYPT_SALT_ROUNDS") || "10", 10);
    const passwordHash = await hash(password, saltRounds);

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
}
```
