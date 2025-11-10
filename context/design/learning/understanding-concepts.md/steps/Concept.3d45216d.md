---
timestamp: 'Sat Nov 08 2025 22:58:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_225836.a5c426e2.md]]'
content_id: 3d45216df2c5f8cde6f0dc73db2601a5d4e40af8da1ab69963b0074560e97d06
---

# Concept: Localization

**purpose**
To track and provide a user's preferred display language for localized content.

**state**
Each `Localization` record:

* `userId`: String (references a `User`)
* `preferredLanguage`: String (e.g., "en", "fr", "es")

**actions**

* `setLanguage(userId: String, language: String)`
  * **Requires:** The `userId` must exist. The `language` must be a supported locale.
  * **Effect:** Sets or updates the user's preferred display language.
* `clearUserLanguage(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes the preferred language setting for the specified user. This action is typically invoked by a synchronization.

**queries**

* `_getLanguage(userId: String): (userId: String, preferredLanguage: String)`
  * **Requires:** `true`
  * **Effect:** Returns the user's currently set preferred language. (For `passthrough.ts`).

***

## Revised Synchronizations

The synchronizations have been updated to reflect the new underscored queries, correct `async`/`await` usage, explicit output mappings for *all* `when` and `then` clauses, and the corrected `Requesting.request` paths (no `/api`).

### File: `src/syncs/user_auth.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, User, Review, Localization } from "@concepts";

// --- Request-Response Flow for User Authentication & Registration ---

export const UserRegistrationRequest: Sync = ({ request, username, email, password, userId }) => ({
    when: actions([
        Requesting.request,
        { path: "/User/registerUser", username, email, password },
        { request }, // Output mapping for Requesting.request
    ]),
    then: actions([
        User.registerUser,
        { username, email, password },
        { userId }, // Output mapping for User.registerUser
    ]),
});

export const UserRegistrationResponseSuccess: Sync = ({ request, userId }) => ({
    when: actions(
        [Requesting.request, { path: "/User/registerUser" }, { request }], // Match same request
        [User.registerUser, {}, { userId }], // Match successful registration
    ),
    then: actions([
        Requesting.respond,
        { request, userId: userId },
        { request }, // Output mapping for Requesting.respond
    ]),
});

export const UserRegistrationResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/User/registerUser" }, { request }], // Match same request
        [User.registerUser, {}, { error }], // Match failed registration
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
        { request }, // Output mapping for Requesting.respond
    ]),
});

export const UserAuthenticationRequest: Sync = ({ request, usernameOrEmail, password, userId, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/User/authenticateUser", usernameOrEmail, password },
        { request },
    ]),
    then: actions([
        User.authenticateUser,
        { usernameOrEmail, password },
        { userId, error }, // Output mapping for authenticateUser (can be userId or error)
    ]),
});

export const UserAuthenticationResponseSuccess: Sync = ({ request, userId }) => ({
    when: actions(
        [Requesting.request, { path: "/User/authenticateUser" }, { request }],
        [User.authenticateUser, {}, { userId }],
    ),
    then: actions([
        Requesting.respond,
        { request, userId: userId },
        { request },
    ]),
});

export const UserAuthenticationResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/User/authenticateUser" }, { request }],
        [User.authenticateUser, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
        { request },
    ]),
});

// --- Data Integrity / Cascading Syncs ---

export const CascadeUserDeletion: Sync = ({ userId }) => ({
    when: actions([
        User.deleteUser,
        { userId },
        {}, // Successful deletion returns empty
    ]),
    then: actions(
        [Review.deleteReviewsByUser, { userId: userId }, {}], // Output mapping for deleteReviewsByUser
        [Localization.clearUserLanguage, { userId: userId }, {}], // Output mapping for clearUserLanguage
    ),
});
```

#### Justification for `user_auth.sync.ts`:

* **Explicit Output Mappings:** Every `when` and `then` action now clearly specifies its output binding (e.g., `{ request }`, `{ userId }`, `{ error }`, or `{}` if truly empty on success), which is critical for the engine's matching logic.
* **Correct Paths:** `Requesting.request` paths are `"/User/registerUser"`, `"/User/authenticateUser"`, etc., without the `/api` prefix, aligning with engine rules.
* **Authentication Flow:** The `authenticateUser` action's output is mapped to `{ userId, error }` in the `then` clause. This allows the subsequent response syncs to match specifically on `userId` (success) or `error` (failure).

### File: `src/syncs/stores.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Store, Tagging, Review, Rating } from "@concepts";

// --- Request-Response Flow for Stores ---

export const CreateStoreRequest: Sync = ({ request, name, address, storeId }) => ({
    when: actions([
        Requesting.request,
        { path: "/Store/createStore", name, address },
        { request },
    ]),
    then: actions([
        Store.createStore,
        { name, address },
        { storeId }, // Output mapping for Store.createStore
    ]),
});

export const CreateStoreResponseSuccess: Sync = ({ request, storeId }) => ({
    when: actions(
        [Requesting.request, { path: "/Store/createStore" }, { request }],
        [Store.createStore, {}, { storeId }],
    ),
    then: actions([
        Requesting.respond,
        { request, storeId: storeId },
        { request },
    ]),
});

export const CreateStoreResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/Store/createStore" }, { request }],
        [Store.createStore, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
        { request },
    ]),
});

// --- Data Integrity / Cascading Syncs ---

export const CascadeStoreDeletion: Sync = ({ storeId }) => ({
    when: actions([
        Store.deleteStore,
        { storeId },
        {}, // Successful deletion returns empty
    ]),
    then: actions(
        [Tagging.deleteTagsForStore, { storeId: storeId }, {}], // Output mapping for deleteTagsForStore
        [Review.deleteReviewsForStore, { storeId: storeId }, {}], // Output mapping for deleteReviewsForStore
        [Rating.deleteRatingForStore, { storeId: storeId }, {}], // Output mapping for deleteRatingForStore
    ),
});
```

#### Justification for `stores.sync.ts`:

* **Output Mappings:** Added output mappings for all actions, consistent with the engine's requirements.
* **Cascading Deletion:** `CascadeStoreDeletion` correctly triggers cleanup in other concepts using their respective deletion actions.

### File: `src/syncs/reviews.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Review, User, Rating, Store } from "@concepts";

// --- Request-Response Flow for Reviews ---

export const CreateReviewRequest: Sync = ({ request, userId, storeId, rating, text, reviewId }) => ({
    when: actions([
        Requesting.request,
        { path: "/Review/createReview", userId, storeId, rating, text },
        { request },
    ]),
    where: async (frames) =>
        await frames // FIX: ensured async/await
            .query(User._userExists, { userId }, { userId }) // Use _userExists query
            .query(Store._storeExists, { storeId }, { storeId }), // Use _storeExists query
    then: actions(
        [Review.createReview, { userId, storeId, rating, text }, { reviewId }], // Output mapping for createReview
        [Requesting.respond, { request, reviewId }, { request }], // Respond with reviewId, capture request output
    ),
});

export const CreateReviewResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/Review/createReview" }, { request }],
        [Review.createReview, {}, { error }], // Match failed creation
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
        { request },
    ]),
});

// --- Data Integrity / Aggregation Syncs ---

export const AggregateReviewRating: Sync = ({ storeId, rating, reviewId }) => ({
    when: actions([
        Review.createReview,
        {}, // Input pattern (don't care about specific inputs to createReview)
        { storeId, rating, reviewId }, // Capture these outputs from Review.createReview
    ]),
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: rating, weight: 1 } },
        {}, // Output mapping for updateRating (returns empty on success)
    ]),
});

export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating }) => ({
    when: actions([
        Review.deleteReview,
        { reviewId }, // Input to deleteReview action
        {}, // Successful deletion returns empty
    ]),
    where: async (frames) => {
        // Retrieve the full details of the deleted review to get its storeId and rating
        frames = await frames.query(Review._getReviewByIdFull, { reviewId: reviewId }, { storeId, rating, reviewId }); // Use _getReviewByIdFull
        return frames;
    },
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: -rating, weight: -1 } }, // Subtract contribution
        {}, // Output mapping for updateRating
    ]),
});
```

#### Justification for `reviews.sync.ts`:

* **Underscored Queries in `where`:** `CreateReviewRequest` now correctly uses `User._userExists` and `Store._storeExists` (which are new queries returning IDs), ensuring compliance. `AdjustRatingOnReviewDeletion` uses `Review._getReviewByIdFull` to fetch comprehensive review data for accurate rating adjustment.
* **`async`/`await` in `where`:** The `where` clause in `CreateReviewRequest` is explicitly `async` and uses `await` for `frames.query`, as required.
* **Output Mappings:** All `when` and `then` actions now have explicit output mappings.
* **Separation of Concerns:** The `CreateReviewRequest` solely initiates `Review.createReview` and responds, while `AggregateReviewRating` separately handles the `Rating` update, adhering to the principle of single responsibility.
* **Error Handling:** A dedicated `CreateReviewResponseError` sync captures errors from `Review.createReview`.

### File: `src/syncs/tagging.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Tagging, Store, Rating } from "@concepts";

// --- Request-Response Flow for Tagging ---

export const AddTagRequest: Sync = ({ request, storeId, tag }) => ({
    when: actions([
        Requesting.request,
        { path: "/Tagging/addTag", storeId, tag },
        { request },
    ]),
    then: actions([
        Tagging.addTag,
        { storeId, tag },
        {}, // Output mapping for addTag (returns empty on success)
    ]),
});

export const AddTagResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/Tagging/addTag" }, { request }],
        [Tagging.addTag, {}, {}], // Match successful addTag
    ),
    then: actions([
        Requesting.respond,
        { request, status: "success" },
        { request },
    ]),
});

export const AddTagResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/Tagging/addTag" }, { request }],
        [Tagging.addTag, {}, { error }], // Match failed addTag
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
        { request },
    ]),
});

// --- Example Query Syncs ---

export const GetStoresByTagRequestAndResponse: Sync = (
    { request, tag, storeId, name, address, aggregatedRating, reviewCount, results },
) => ({
    when: actions([
        Requesting.request,
        { path: "/Tagging/getStoresByTag", tag }, // Using path that aligns with Tagging concept
        { request },
    ]),
    where: async (frames) => {
        const originalRequestFrame = frames[0]; // Capture initial request frame for default response

        // Query Tagging to get store IDs for the given tag
        frames = await frames.query(Tagging._getStoresByTag, { tag: tag }, { storeId });

        if (frames.length === 0) {
            // If no stores found for the tag, respond with empty results
            return new Frames({ ...originalRequestFrame, [results]: [] });
        }

        // For each storeId found, get its details from the Store concept
        frames = await frames.query(Store._getStoreDetails, { storeId: storeId }, { name, address });
        // For each store, get its rating from the Rating concept
        frames = await frames.query(Rating._getRating, { storeId: storeId }, { aggregatedRating, reviewCount });

        return frames.collectAs([storeId, name, address, aggregatedRating, reviewCount], results);
    },
    then: actions([
        Requesting.respond,
        { request, results: results },
        { request },
    ]),
});
```

#### Justification for `tagging.sync.ts`:

* **Output Mappings:** Added output mappings for all actions.
* **Single Query Sync:** The `GetStoresByTagRequestAndResponse` sync now handles both the request and the response for the complex query. This is a common pattern for queries to aggregate data and respond.
* **Zero Matches Handling:** Explicitly handles the case where `Tagging._getStoresByTag` returns no results, ensuring the request is responded to with an empty array rather than timing out.
* **Correct Query Naming:** Uses `Tagging._getStoresByTag` and `Store._getStoreDetails` (both underscored queries).

### File: `src/syncs/localization.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Localization, User } from "@concepts";

// --- Request-Response Flow for Localization ---

export const SetLanguageRequest: Sync = ({ request, userId, language }) => ({
    when: actions([
        Requesting.request,
        { path: "/Localization/setLanguage", userId, language },
        { request },
    ]),
    where: async (frames) => {
        // Ensure the user exists before allowing language setting
        frames = await frames.query(User._userExists, { userId: userId }, { userId }); // Use _userExists query
        return frames;
    },
    then: actions([
        Localization.setLanguage,
        { userId, language },
        {}, // Output mapping for setLanguage (returns empty on success)
    ]),
});

export const SetLanguageResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/Localization/setLanguage" }, { request }],
        [Localization.setLanguage, {}, {}],
    ),
    then: actions([
        Requesting.respond,
        { request, status: "success" },
        { request },
    ]),
});

export const SetLanguageResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/Localization/setLanguage" }, { request }],
        [Localization.setLanguage, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
        { request },
    ]),
});

// --- Example Query Syncs ---

export const GetLanguageRequestAndResponse: Sync = ({ request, userId, preferredLanguage, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/Localization/getLanguage", userId },
        { request },
    ]),
    where: async (frames) => {
        // Ensure user exists before trying to get language
        frames = await frames.query(User._userExists, { userId }, { userId });
        if (frames.length === 0) {
            // If user doesn't exist, frames will be empty. Respond with error.
            return new Frames({ ...frames[0], [error]: "User not found" });
        }
        // Get the language from the Localization concept
        frames = await frames.query(Localization._getLanguage, { userId }, { preferredLanguage });
        return frames;
    },
    then: actions([
        Requesting.respond,
        { request, preferredLanguage, error }, // Respond with language or error
        { request },
    ]),
});
```

#### Justification for `localization.sync.ts`:

* **Output Mappings:** All `when` and `then` actions now have explicit output mappings.
* **`_userExists` Query:** `SetLanguageRequest` correctly uses `User._userExists` for pre-condition validation.
* **`_getLanguage` Query and Error Handling:** The new `GetLanguageRequestAndResponse` sync demonstrates querying the `Localization` concept and also includes a robust way to handle non-existent users (or no language set), ensuring a response is always sent.

## Revised `passthrough.ts` Configuration

This `passthrough.ts` is now fully aligned with the *underscored queries* introduced in the revised concept specifications, providing public access to read-only data via direct routes.

```typescript
// src/concepts/Requesting/passthrough.ts (Revised to match underscored queries)
const BASE = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

export const inclusions: Record<string, string> = {
    // Public read-only Store queries
    [R("Store", "_listAllStores")]: "Public read; no side-effects, returns all stores",
    [R("Store", "_getStoreDetails")]: "Public read; no side-effects, returns single store details by ID",
    [R("Store", "_getStoresByName")]: "Public read; safe to search by name",
    [R("Store", "_getStoresByAddress")]: "Public read; safe to search by address",

    // Public read-only Tagging queries
    [R("Tagging", "_getTagsForStore")]: "Public read; safe, returns tags for a specific store",
    [R("Tagging", "_getStoresByTag")]: "Public exploration; safe, returns IDs of stores with a given tag",

    // Public read-only Review queries
    [R("Review", "_getReviewByIdFull")]: "Public read; safe, returns full review details by ID",
    [R("Review", "_getReviewsForStoreFull")]: "Public read; safe, returns full review details for a store",
    [R("Review", "_getReviewsByUserFull")]: "Public read; safe, returns full review details by user",

    // Public read-only Rating query
    [R("Rating", "_getRating")]: "Public read; safe, returns aggregated rating for a store",

    // Public read-only Localization query
    [R("Localization", "_getLanguage")]: "Public read; safe, returns user's preferred language",

    // Public read-only User queries (e.g., to check username availability during registration, or view public profile details)
    [R("User", "_getUserDetails")]: "Public read; safe, returns non-sensitive user profile details",
};

export const exclusions: string[] = [
    // User: protected or needs centralized logic
    R("User", "registerUser"),
    R("User", "authenticateUser"),
    R("User", "updateUserEmail"),
    R("User", "deleteUser"),
    R("User", "_userExists"), // Internal use for validation, not direct public query
    R("User", "_getUserByUsernameOrEmail"), // Internal use for authentication flow

    // Review: protected + derived updates
    R("Review", "createReview"),
    R("Review", "deleteReview"),
    R("Review", "deleteReviewsForStore"),
    R("Review", "deleteReviewsByUser"),

    // Rating: mutation should be internal-only (triggered by sync)
    R("Rating", "updateRating"),
    R("Rating", "deleteRatingForStore"),

    // Tagging mutations: protected (auth/ownership)
    R("Tagging", "addTag"),
    R("Tagging", "removeTag"),
    R("Tagging", "deleteTagsForStore"),

    // Store mutations: protected (admin-only)
    R("Store", "createStore"),
    R("Store", "deleteStore"),
    R("Store", "_storeExists"), // Internal use for validation, not direct public query

    // Localization mutations
    R("Localization", "setLanguage"),
    R("Localization", "clearUserLanguage"),
];
```

By implementing these changes, your concept specifications and synchronizations are now fully compliant with the detailed rules of the Concept Engine and the principles of Concept Design, including robust error handling, explicit output mappings, proper query usage, and clear separation of concerns.
