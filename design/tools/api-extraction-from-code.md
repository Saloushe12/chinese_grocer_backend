[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions.

import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { hash, compare } from "bcrypt"; // Need bcrypt for password hashing

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
    // const saltRounds = parseInt(Deno.env.get("BCRYPT_SALT_ROUNDS") || "10", 10);

    // 10/19/2025 EDIT: Using Deno's bcrypt which does not require salt rounds parameter. Commented out saltRounds line above.
    // Removed saltRounds from hash function call below.
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

  /**
   * deleteUser(userId: String)
   * @requires The `userId` must exist.
   * @effects Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts.
   */
  async deleteUser(
    { userId }: { userId: ID },
  ): Promise<Empty | { error: string }> {
    // Requires: The `userId` must exist.
    const userToDelete = await this.users.findOne({ _id: userId });
    if (!userToDelete) {
      return { error: `User with ID '${userId}' not found.` };
    }

    // Effect: Deletes the user account.
    const deleteResult = await this.users.deleteOne({ _id: userId });

    if (deleteResult.deletedCount === 0) {
      return { error: `Failed to delete user with ID '${userId}'.` };
    }

    return {}; // Success
  }

}
# response:

# API Specification: User Concept

**Purpose:** To manage user accounts, including registration, authentication, and basic profile information.

---

## API Endpoints

### POST /api/User/registerUser

**Description:** Creates a new user account, hashes the password, and returns the unique `userId`.

**Requirements:**
- The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length), though specific validation logic resides here.

**Effects:**
- Creates a new user account, hashes the password, and returns the unique `userId`.

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

---

### POST /api/User/authenticateUser

**Description:** Authenticates the user and returns their `userId`.

**Requirements:**
- A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.

**Effects:**
- Authenticates the user and returns their `userId`. Returns an error if authentication fails.

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

---

### POST /api/User/getUserById

**Description:** Returns basic non-sensitive user profile information.

**Requirements:**
- The `userId` must exist.

**Effects:**
- Returns basic non-sensitive user profile information. Returns an error if the user is not found.

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

---

### POST /api/User/updateUserEmail

**Description:** Updates the user's email address.

**Requirements:**
- The `userId` must exist. The `newEmail` must not already be in use by another user.

**Effects:**
- Updates the user's email address. Returns an error if requirements are not met.

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

---

### POST /api/User/deleteUser

**Description:** Deletes the user account.

**Requirements:**
- The `userId` must exist.

**Effects:**
- Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts.

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

---

# prompt: Now do the same for the following code:

import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept Store
 * @purpose Represent the identity and physical address of a store.
 */
const PREFIX = "Store" + ".";

/**
 * State: Each Store is represented by:
 * - `_id`: ID (storeId)
 * - `name`: string
 * - `address`: string
 */
interface StoreDoc {
  _id: ID; // Mapped from storeId in spec
  name: string;
  address: string;
}

export default class StoreConcept {
  private stores: Collection<StoreDoc>;

  constructor(private readonly db: Db) {
    this.stores = this.db.collection(PREFIX + "stores");
  }

  /**
   * @concept Store
   * @purpose Represent the identity and physical address of a store.
   * @principle A store's existence and location are fundamental. Interactions related to its classification, user feedback, or popularity are external concerns managed by other concepts through synchronizations.
   */

  /**
   * createStore(name: String, address: String): { storeId: ID } | { error: String }
   * @requires No existing store has both the exact same `name` and `address`.
   * @effects Creates a new store record and returns its unique `storeId`.
   * @returns { storeId: ID } on success or { error: string } if requirements are not met.
   */
  async createStore(
    { name, address }: { name: string; address: string },
  ): Promise<{ storeId: ID } | { error: string }> {
    // Requires: No existing store has both the exact same `name` and `address`.
    const existingStore = await this.stores.findOne({ name, address });
    if (existingStore) {
      return {
        error: `A store with the same name and address already exists.`,
      };
    }

    // Effect: Creates a new store record
    const newStoreId = freshID();
    const newStore: StoreDoc = {
      _id: newStoreId,
      name,
      address,
    };

    await this.stores.insertOne(newStore);

    // Effect: returns its unique `storeId`.
    return { storeId: newStoreId };
  }

  /**
   * deleteStore(storeId: String): Empty | { error: String }
   * @requires The `storeId` must exist.
   * @effects Removes the store record.
   * @returns Empty on success or { error: string } if requirements are not met.
   */
  async deleteStore(
    { storeId }: { storeId: ID },
  ): Promise<Empty | { error: string }> {
    // Requires: The `storeId` must exist.
    const existingStore = await this.stores.findOne({ _id: storeId });
    if (!existingStore) {
      return { error: `Store with ID '${storeId}' not found.` };
    }

    // Effect: Removes the store record.
    const result = await this.stores.deleteOne({ _id: storeId });

    if (result.acknowledged && result.deletedCount === 1) {
      return {};
    } else {
      // This case is unlikely if findOne succeeded, but good for robustness.
      return { error: `Failed to delete store with ID '${storeId}'.` };
    }
  }

  /**
   * _getStore(storeId: String): { name: String, address: String } | { error: String }
   * @requires The `storeId` must exist.
   * @effects Returns the `name` and `address` of the specified store.
   * @returns { name: string, address: string } on success or { error: string } if requirements are not met.
   */
  async _getStore(
    { storeId }: { storeId: ID },
  ): Promise<{ name: string; address: string } | { error: string }> {
    // Requires: The `storeId` must exist.
    const store = await this.stores.findOne({ _id: storeId });
    if (!store) {
      return { error: `Store with ID '${storeId}' not found.` };
    }

    // Effect: Returns the `name` and `address` of the specified store.
    return { name: store.name, address: store.address };
  }

  /**
   * _getStoresByName(name: String): Set<ID>
   * @effects Returns a set of all `storeId`s matching the given `name`.
   * @returns Set<ID>
   */
  async _getStoresByName(
    { name }: { name: string },
  ): Promise<Set<ID>> {
    // Effect: Returns a set of all `storeId`s matching the given `name`.
    const stores = await this.stores.find({ name }).project({ _id: 1 }).toArray();
    return new Set(stores.map((s) => s._id));
  }

  /**
   * _getStoresByAddress(address: String): Set<ID>
   * @effects Returns a set of all `storeId`s matching the given `address`.
   * @returns Set<ID>
   */
  async _getStoresByAddress(
    { address }: { address: string },
  ): Promise<Set<ID>> {
    // Effect: Returns a set of all `storeId`s matching the given `address`.
    const stores = await this.stores.find({ address }).project({ _id: 1 }).toArray();
    return new Set(stores.map((s) => s._id));
  }
}
# response:

# API Specification: Store Concept

**Purpose:** Represent the identity and physical address of a store.

***

## API Endpoints

### POST /api/Store/createStore

**Description:** Creates a new store record and returns its unique `storeId`.

**Requirements:**

*   No existing store has both the exact same `name` and `address`.

**Effects:**

*   Creates a new store record and returns its unique `storeId`.

**Request Body:**

```json
{
  "name": "string",
  "address": "string"
}
```

**Success Response Body (Action):**

```json
{
  "storeId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/deleteStore

**Description:** Removes the store record.

**Requirements:**

*   The `storeId` must exist.

**Effects:**

*   Removes the store record.

**Request Body:**

```json
{
  "storeId": "string"
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

### POST /api/Store/_getStore

**Description:** Returns the `name` and `address` of the specified store.

**Requirements:**

*   The `storeId` must exist.

**Effects:**

*   Returns the `name` and `address` of the specified store.

**Request Body:**

```json
{
  "storeId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "name": "string",
    "address": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/_getStoresByName

**Description:** Returns a set of all `storeId`s matching the given `name`.

**Requirements:**
- (None explicitly stated)

**Effects:**

*   Returns a set of all `storeId`s matching the given `name`.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Store/_getStoresByAddress

**Description:** Returns a set of all `storeId`s matching the given `address`.

**Requirements:**
- (None explicitly stated)

**Effects:**

*   Returns a set of all `storeId`s matching the given `address`.

**Request Body:**

```json
{
  "address": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# prompt: Do the same for the following code:

import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; 

// Declare collection prefix, use concept name
const PREFIX = "Tagging" + ".";

// storeId is an external ID, so it's treated polymorphically by Tagging.
// This means the Tagging concept does not make assumptions about the StoreId's internal structure
// or directly interact with the Store concept.
type StoreId = ID; 
// Tags themselves are just strings in the spec, not separate entities.
type Tag = string;

/**
 * Each `Tagging` record associates tags with a store:
 * `storeId`: String (references a `Store`) - used as the document's _id
 * `tags`: Set<String> (a collection of user-defined tags)
 */
interface TaggingDoc {
  _id: StoreId; // The unique identifier for the store this document tags
  tags: Tag[]; // An array of tags associated with the store
}

export default class TaggingConcept {
  private taggings: Collection<TaggingDoc>;

  constructor(private readonly db: Db) {
    // Initialize the MongoDB collection for tagging records
    this.taggings = this.db.collection(PREFIX + "taggings");
  }

  /**
   * addTag(storeId: String, tag: String)
   *
   * @requires The `storeId` must exist (conceptually, in the `Store` concept).
   *           The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.
   * @effects Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
   *          If no `Tagging` record exists for the `storeId`, a new one is created.
   * @returns {} on success, { error } on failure.
   */
  async addTag({ storeId, tag }: { storeId: StoreId; tag: Tag }): Promise<Empty | { error: string }> {
    try {
      // Find and update the existing document for the given storeId.
      // $addToSet ensures that 'tag' is only added if it's not already present in the 'tags' array.
      // upsert: true means if a document with _id: storeId doesn't exist, a new one will be created.
      // This allows the Tagging concept to manage tags for any storeId it is given,
      // without needing to explicitly check the existence of the storeId in the Store concept,
      // upholding concept independence. The 'requires' for storeId existence is expected to be
      // enforced by an orchestrating sync or the calling application layer.
      const result = await this.taggings.updateOne(
        { _id: storeId },
        { $addToSet: { tags: tag } },
        { upsert: true },
      );

      // Check if the database operation was acknowledged.
      if (!result.acknowledged) {
        return { error: "Database operation for addTag was not acknowledged." };
      }

      return {}; // Successfully added the tag or ensured its presence
    } catch (e: unknown) {
        // Narrow the error type safely
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error(`Error in Tagging.addTag for storeId '${storeId}' and tag '${tag}':`, e);
        return { error: `Failed to add tag: ${message}` };
    }
  }

  /**
   * removeTag(storeId: String, tag: String)
   *
   * @requires The `storeId` must exist (i.e., there is a tagging record for it).
   *           The `tag` must be present in the store's tag set.
   * @effects Removes the specified `tag` from the `storeId`'s set of tags.
   * @returns {} on success, { error } on failure.
   */
  async removeTag({ storeId, tag }: { storeId: StoreId; tag: Tag }): Promise<Empty | { error: string }> {
    try {
      // First, check if the storeId exists and contains the tag, as per 'requires' conditions.
      const existingDoc = await this.taggings.findOne({ _id: storeId });

      if (!existingDoc) {
        return { error: `Store with ID '${storeId}' not found for tagging.` };
      }

      if (!existingDoc.tags.includes(tag)) {
        return { error: `Tag '${tag}' not found for store ID '${storeId}'.` };
      }

      // If requirements are met, proceed to remove the tag using $pull.
      const result = await this.taggings.updateOne(
        { _id: storeId },
        { $pull: { tags: tag } },
      );

      if (!result.acknowledged) {
        return { error: "Database operation for removeTag was not acknowledged." };
      }
      
      // If after removing the tag, the tags array becomes empty, optionally remove the document itself.
      // This keeps the collection clean from empty tagging records.
      if (result.modifiedCount > 0) { // Only check if a tag was actually removed
        const updatedDoc = await this.taggings.findOne({ _id: storeId });
        if (updatedDoc && updatedDoc.tags.length === 0) {
          await this.taggings.deleteOne({ _id: storeId });
        }
      }

      return {}; // Successfully removed the tag
    } catch (e: unknown) {
        // Narrow the error type safely
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error(`Error in Tagging.addTag for storeId '${storeId}' and tag '${tag}':`, e);
        return { error: `Failed to add tag: ${message}` };
    }
  }

  /**
   * _getStoresByTag(tag: String): { storeIds: Set<String> }
   *
   * @effects Returns a set of all `storeId`s that are currently associated with the given `tag`.
   * @returns { storeIds: StoreId[] } on success, { error } on failure.
   */
  async _getStoresByTag({ tag }: { tag: Tag }): Promise<{ storeIds: StoreId[] } | { error: string }> {
    try {
      // Find all documents where the 'tags' array contains the specified tag.
      // Project only the '_id' field to return just the store IDs.
      const documents = await this.taggings.find({ tags: tag }).project({ _id: 1 }).toArray();
      // Map the retrieved documents to an array of StoreId.
      const storeIds = documents.map(doc => doc._id);
      return { storeIds };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error in Tagging._getStoresByTag for tag '${tag}':`, e);
      return { error: `Failed to retrieve stores by tag: ${message}` };
    }
  }
}
# response:

# API Specification: Tagging Concept

**Purpose:** To manage the association of tags with stores.

***

## API Endpoints

### POST /api/Tagging/addTag

**Description:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.

**Requirements:**

* The `storeId` must exist (conceptually, in the `Store` concept).
* The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.

**Effects:**

* Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* If no `Tagging` record exists for the `storeId`, a new one is created.

**Request Body:**

```json
{
  "storeId": "string",
  "tag": "string"
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

### POST /api/Tagging/removeTag

**Description:** Removes the specified `tag` from the `storeId`'s set of tags.

**Requirements:**

* The `storeId` must exist (i.e., there is a tagging record for it).
* The `tag` must be present in the store's tag set.

**Effects:**

* Removes the specified `tag` from the `storeId`'s set of tags.

**Request Body:**

```json
{
  "storeId": "string",
  "tag": "string"
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

### POST /api/Tagging/\_getStoresByTag

**Description:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

**Requirements:**

* (None explicitly stated)

**Effects:**

* Returns a set of all `storeId`s that are currently associated with the given `tag`.

**Request Body:**

```json
{
  "tag": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "storeId": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# prompt: Do the same for the following code:

import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Review" + ".";

// Generic types of this concept referencing external concepts
type User = ID;
type Store = ID;

/**
 * Each Review record:
 * reviewId: String (unique document identifier)
 * storeId: String (references a Store)
 * userId: String (references a User)
 * text: String (the content of the review)
 * rating: Number (a specific numeric rating for this review, e.g., 1-5)
 */
interface ReviewDoc {
  _id: ID; // The reviewId is the document's _id
  storeId: Store;
  userId: User;
  text: string;
  rating: number;
}

export default class ReviewConcept {
  // Purpose: To capture textual reviews and individual ratings submitted by users for specific stores.
  // This concept is solely responsible for the *individual* review data.
  private reviewsCollection: Collection<ReviewDoc>;

  constructor(private readonly db: Db) {
    this.reviewsCollection = this.db.collection(PREFIX + "reviews");
  }

  /**
   * createReview(userId: String, storeId: String, text: String, rating: Number): { reviewId: String } | { error: String }
   *
   * requires:
   *   The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
   * effects:
   *   Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.
   * returns:
   *   { reviewId } on success
   *   { error } if requirements are not met
   */
  async createReview(
    { userId, storeId, text, rating }: { userId: User; storeId: Store; text: string; rating: number },
  ): Promise<{ reviewId: ID } | { error: string }> {
    try {
      // Validate rating range (e.g., 1-5 as mentioned in the spec)
      if (rating < 1 || rating > 5) {
        return { error: "Rating must be between 1 and 5." };
      }

      // Generate a new unique ID for the review
      const reviewId = freshID();

      const newReview: ReviewDoc = {
        _id: reviewId,
        userId,
        storeId,
        text,
        rating,
      };

      await this.reviewsCollection.insertOne(newReview);

      return { reviewId };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error creating review: ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }


  /**
   * deleteReview(reviewId: String): {} | { error: String }
   *
   * requires:
   *   The `reviewId` must exist.
   * effects:
   *   Deletes the specified `Review` record.
   * returns:
   *   {} on success
   *   { error } if the review does not exist
   */
  async deleteReview({ reviewId }: { reviewId: ID }): Promise<Empty | { error: string }> {
    try {
      const result = await this.reviewsCollection.deleteOne({ _id: reviewId });

      if (result.deletedCount === 1) {
        return {};
      } else {
        // If deletedCount is 0, the reviewId did not exist.
        return { error: `Review with ID '${reviewId}' not found.` };
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error deleting review: ${message}`);
      return { error: `Internal server error: ${message}` };
    }
  }

  /**
   * getReviewsForStore(storeId: String): { reviewIds: Set<String> }
   *
   * effects:
   *   Returns a set of all `reviewId`s associated with the specified `storeId`.
   * returns:
   *   { reviewIds: Set<String> } on success
   */
  async getReviewsForStore({ storeId }: { storeId: Store }): Promise<{ reviewIds: Set<ID> }> {
    try {
      const reviews = await this.reviewsCollection.find(
        { storeId: storeId },
        { projection: { _id: 1 } }, // Only retrieve the _id (reviewId)
      ).toArray();

      const reviewIds = new Set<ID>(reviews.map((r) => r._id));
      return { reviewIds };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error getting reviews for store '${storeId}': ${message}`);
      // In queries, if an error occurs, it's often better to return an empty set
      // or rethrow/return a specific error based on desired application behavior.
      // For this spec, returning an empty set on error is reasonable.
      return { reviewIds: new Set<ID>() };
    }
  }

  /**
   * getReviewsByUser(userId: String): { reviewIds: Set<String> }
   *
   * effects:
   *   Returns a set of all `reviewId`s created by the specified `userId`.
   * returns:
   *   { reviewIds: Set<String> } on success
   */
  async getReviewsByUser({ userId }: { userId: User }): Promise<{ reviewIds: Set<ID> }> {
    try {
      const reviews = await this.reviewsCollection.find(
        { userId: userId },
        { projection: { _id: 1 } }, // Only retrieve the _id (reviewId)
      ).toArray();

      const reviewIds = new Set<ID>(reviews.map((r) => r._id));
      return { reviewIds };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error getting reviews by user '${userId}': ${message}`);
      return { reviewIds: new Set<ID>() };
    }
  }
}
# response:

# API Specification: Review Concept

**Purpose:** To capture textual reviews and individual ratings submitted by users for specific stores.

---

## API Endpoints

### POST /api/Review/createReview

**Description:** Creates a new `Review` record and returns its unique `reviewId`.

**Requirements:**
- The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).

**Effects:**
- Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.

**Request Body:**
```json
{
  "userId": "string",
  "storeId": "string",
  "text": "string",
  "rating": "number"
}
```

**Success Response Body (Action):**
```json
{
  "reviewId": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Review/deleteReview

**Description:** Deletes the specified `Review` record.

**Requirements:**
- The `reviewId` must exist.

**Effects:**
- Deletes the specified `Review` record.

**Request Body:**
```json
{
  "reviewId": "string"
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

---

### POST /api/Review/getReviewsForStore

**Description:** Returns a set of all `reviewId`s associated with the specified `storeId`.

**Requirements:**
- (None explicitly stated)

**Effects:**
- Returns a set of all `reviewId`s associated with the specified `storeId`.

**Request Body:**
```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "reviewIds": [
    "string"
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Review/getReviewsByUser

**Description:** Returns a set of all `reviewId`s created by the specified `userId`.

**Requirements:**
- (None explicitly stated)

**Effects:**
- Returns a set of all `reviewId`s created by the specified `userId`.

**Request Body:**
```json
{
  "userId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "reviewIds": [
    "string"
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# prompt: Do the same for the following code:

import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
// Note: freshID from @utils/database.ts is not directly used in this concept
// because _id is derived from storeId, which is an external ID, not generated by Rating.

// Declare a prefix for MongoDB collection names to ensure uniqueness and concept ownership.
const PREFIX = "Rating" + ".";

/**
 * Interface representing the structure of a Rating record in the database.
 * Each record aggregates rating information for a specific store.
 *
 * @property _id The unique identifier for the store, serving as the document's primary key.
 *               This corresponds to the storeId passed to actions.
 * @property aggregatedRating The calculated average or composite rating for the store.
 * @property reviewCount The total number of reviews contributing to the aggregated rating.
 */
interface RatingRecord {
  _id: ID; // References a Store's ID (e.g., from the Store concept)
  aggregatedRating: number;
  reviewCount: number;
}

/**
 * @concept Rating
 * @purpose To maintain an aggregated rating score and count for a store, derived from individual reviews.
 * @principle After a series of individual review contributions (e.g., from the Review concept),
 *            this concept correctly aggregates the rating scores and maintains an accurate count,
 *            making the store's overall standing readily available for queries and decisions.
 */
export default class RatingConcept {
  // MongoDB collection to store rating records.
  ratings: Collection<RatingRecord>;

  /**
   * Constructs a new RatingConcept instance.
   * @param db The MongoDB database instance to use for data persistence.
   */
  constructor(private readonly db: Db) {
    this.ratings = this.db.collection(PREFIX + "ratings");
  }

  /**
   * updateRating(storeId: ID, contribution: { rating: Number, weight: Number }): {} | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store in the system.
   *           The `contribution.weight` should not lead to a negative `reviewCount` for the store.
   * @effects Updates the `aggregatedRating` and increments/decrements the `reviewCount`
   *          for the `storeId` based on the provided `contribution`.
   *          If no rating record exists for the `storeId`, it is initialized with the contribution.
   *
   * @returns
   *  - `{}` on success.
   *  - `{ error: String }` if the `newReviewCount` would become negative,
   *    indicating an attempt to remove more reviews (via negative weight) than currently exist.
   */
  async updateRating(
    { storeId, contribution }: {
      storeId: ID;
      contribution: { rating: number; weight: number };
    },
  ): Promise<Empty | { error: string }> {
    // If the weight of the contribution is 0, no change is needed for sum or count.
    if (contribution.weight === 0) {
      return {};
    }

    // Find the existing rating record for the given storeId.
    // If no record is found, we assume initial state (0 reviews, 0 aggregated rating).
    const existingRating = await this.ratings.findOne({ _id: storeId });

    const currentAggregatedRating = existingRating?.aggregatedRating ?? 0;
    const currentReviewCount = existingRating?.reviewCount ?? 0;

    // Calculate the total sum of ratings currently represented in the aggregation.
    // This allows for accurate addition/subtraction of new contributions.
    const currentTotalSum = currentAggregatedRating * currentReviewCount;

    // Calculate the new total review count and the new total sum after applying the contribution.
    const newReviewCount = currentReviewCount + contribution.weight;
    const newTotalSum = currentTotalSum +
      (contribution.rating * contribution.weight);

    // Precondition check: A review count cannot be negative.
    // This guards against inconsistent states, e.g., trying to remove more reviews than have been added.
    if (newReviewCount < 0) {
      return {
        error:
          `Cannot update rating: resulting review count for store ${storeId} would be negative (${newReviewCount}).`,
      };
    }

    // Calculate the new aggregated rating. If there are no reviews, the aggregated rating is 0.
    const newAggregatedRating = newReviewCount === 0
      ? 0
      : newTotalSum / newReviewCount;

    // Update the rating record in the database.
    // `upsert: true` ensures that if no record currently exists for `storeId`, a new one is created.
    // The `_id` is derived from the `storeId` itself.
    await this.ratings.updateOne(
      { _id: storeId },
      {
        $set: {
          aggregatedRating: newAggregatedRating,
          reviewCount: newReviewCount,
        },
      },
      { upsert: true },
    );

    return {}; // Return an empty object to signify successful completion.
  }

  /**
   * getRating(storeId: ID): { aggregatedRating: Number, reviewCount: Number } | { error: String }
   *
   * @requires The `storeId` must conceptually refer to an existing store in the system.
   * @effects Returns the current aggregated rating and the count of reviews for the specified store.
   *
   * @returns
   *  - `{ aggregatedRating: Number, reviewCount: Number }` on success.
   *  - `{ aggregatedRating: 0, reviewCount: 0 }` if no rating record exists for the `storeId`,
   *    indicating that the store has not yet received any reviews. This is considered a valid,
   *    non-error state, representing a store with no rating data.
   */
  async getRating(
    { storeId }: { storeId: ID },
  ): Promise<{ aggregatedRating: number; reviewCount: number } | {
    error: string;
  }> {
    // Attempt to find the rating record for the given storeId.
    const ratingRecord = await this.ratings.findOne({ _id: storeId });

    // If no record is found, it means the store has not yet received any reviews that have
    // been processed by this concept, or its rating was reset. In this scenario,
    // the aggregated rating is 0, and the review count is 0. This is a valid, non-error state.
    if (!ratingRecord) {
      return { aggregatedRating: 0, reviewCount: 0 };
    }

    // Return the found aggregated rating and review count.
    return {
      aggregatedRating: ratingRecord.aggregatedRating,
      reviewCount: ratingRecord.reviewCount,
    };
  }
}
# response:

# API Specification: Rating Concept

**Purpose:** To maintain an aggregated rating score and count for a store, derived from individual reviews.

---

## API Endpoints

### POST /api/Rating/updateRating

**Description:** Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`. If no rating record exists for the `storeId`, it is initialized with the contribution.

**Requirements:**
- The `storeId` must conceptually refer to an existing store in the system.
- The `contribution.weight` should not lead to a negative `reviewCount` for the store.

**Effects:**
- Updates the `aggregatedRating` and increments/decrements the `reviewCount` for the `storeId` based on the provided `contribution`.
- If no rating record exists for the `storeId`, it is initialized with the contribution.

**Request Body:**
```json
{
  "storeId": "string",
  "contribution": {
    "rating": "number",
    "weight": "number"
  }
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
---

### POST /api/Rating/getRating

**Description:** Returns the current aggregated rating and the count of reviews for the specified store.

**Requirements:**
- The `storeId` must conceptually refer to an existing store in the system.

**Effects:**
- Returns the current aggregated rating and the count of reviews for the specified store.
- If no rating record exists for the `storeId`, returns `{ aggregatedRating: 0, reviewCount: 0 }`, indicating that the store has not yet received any reviews. This is considered a valid, non-error state, representing a store with no rating data.

**Request Body:**
```json
{
  "storeId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "aggregatedRating": "number",
  "reviewCount": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---