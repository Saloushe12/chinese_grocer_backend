---
timestamp: 'Sat Nov 08 2025 23:10:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251108_231020.d8ec46fa.md]]'
content_id: e21c3809a5dc7af555a868c270430cc50626701b3331fbe6f8708fcc789a715a
---

# Concept: Localization

**purpose**
To track and provide a user's preferred display language for localized content.

**state**
Each `Localization` record:

* `userId`: String (references a `User`)
* `preferredLanguage`: String (e.g., "en", "fr", "es")

**actions**

* `setLanguage(userId: String, language: String): {} | (error: String)`
  * **Requires:** The `userId` must exist. The `language` must be a supported locale.
  * **Effect:** Sets or updates the user's preferred display language. Returns an `error` if `userId` does not exist or language is unsupported.
* `clearUserLanguage(userId: String): {} | (error: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes the preferred language setting for the specified user. This action is typically invoked by a synchronization. Returns an `error` if `userId` does not exist.

**queries**

* `_getLanguage(userId: String): (userId: String, preferredLanguage: String)`
  * **Requires:** `true`
  * **Effect:** Returns an array containing the `userId` and their currently set `preferredLanguage`. If no preference, it returns an empty array. (For `passthrough.ts`).

***

## Revised Synchronizations

The synchronizations have been updated to reflect the new underscored queries, correct `async`/`await` usage, explicit output mappings for *all* `when` and `then` clauses (including `{}` for empty successful returns), and the corrected `Requesting.request` paths (no `/api`).

### File: `src/syncs/user_auth.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, User, Review, Localization } from "@concepts";

// --- Request-Response Flow for User Authentication & Registration ---

export const UserRegistrationRequest: Sync = ({ request, username, email, password, userId, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/User/registerUser", username, email, password },
        { request }, // Output mapping for Requesting.request
    ]),
    then: actions([
        User.registerUser,
        { username, email, password },
        { userId, error }, // Explicitly map both possible outputs
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
        { userId, error }, // Explicitly map both possible outputs
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

export const CascadeUserDeletion: Sync = ({ userId, error }) => ({ // Capture error for User.deleteUser
    when: actions([
        User.deleteUser,
        { userId },
        { error }, // User.deleteUser can return an error
    ]),
    where: (frames) => {
        if (frames[0][error]) { // If deleteUser returned an error, don't cascade
            return new Frames();
        }
        return frames;
    },
    then: actions(
        [Review.deleteReviewsByUser, { userId: userId }, {}],
        [Localization.clearUserLanguage, { userId: userId }, {}],
    ),
});
```

#### Justification for `user_auth.sync.ts`:

* **Explicit Action Output Mappings:** All `when` and `then` clauses now correctly specify the `output_pattern` for concept actions (e.g., `{ userId, error }` for actions that can succeed or fail, or `{}` for empty successful returns). This is critical for the engine to correctly match the causal flow.
* **Correct Requesting Paths:** Paths like `"/User/registerUser"` are used (without `/api`), as required for internal sync matching.
* **Robust `CascadeUserDeletion`:** The `where` clause now explicitly checks if `User.deleteUser` itself returned an error. If so, it prevents cascading, ensuring consistency and preventing unnecessary calls to child concepts if the parent deletion failed.

### File: `src/syncs/stores.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Store, Tagging, Review, Rating } from "@concepts";

// --- Request-Response Flow for Stores ---

export const CreateStoreRequest: Sync = ({ request, name, address, storeId, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/Store/createStore", name, address },
        { request },
    ]),
    then: actions([
        Store.createStore,
        { name, address },
        { storeId, error }, // Explicitly map both possible outputs
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

export const CascadeStoreDeletion: Sync = ({ storeId, error }) => ({ // Capture error for Store.deleteStore
    when: actions([
        Store.deleteStore,
        { storeId },
        { error }, // Store.deleteStore can return an error
    ]),
    where: (frames) => {
        if (frames[0][error]) { // If deleteStore returned an error, don't cascade
            return new Frames();
        }
        return frames;
    },
    then: actions(
        [Tagging.deleteTagsForStore, { storeId: storeId }, {}],
        [Review.deleteReviewsForStore, { storeId: storeId }, {}],
        [Rating.deleteRatingForStore, { storeId: storeId }, {}],
    ),
});
```

#### Justification for `stores.sync.ts`:

* **Explicit Action Output Mappings:** Consistent application of output mappings for actions like `Store.createStore` and `Store.deleteStore`.
* **Robust `CascadeStoreDeletion`:** Similar to user deletion, the `where` clause checks for errors from `Store.deleteStore` to prevent unnecessary cascading.

### File: `src/syncs/reviews.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Review, User, Rating, Store } from "@concepts";

// --- Request-Response Flow for Reviews ---

export const CreateReviewRequest: Sync = ({ request, userId, storeId, rating, text, reviewId, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/Review/createReview", userId, storeId, rating, text },
        { request },
    ]),
    where: async (frames) => {
        // Pre-condition: Ensure the user and store exist before allowing review creation
        frames = await frames.query(User._userExists, { userId }, { userId });
        if (frames.length === 0) {
            // User does not exist, propagate error
            return new Frames({ ...frames[0], [error]: "User not found" });
        }
        frames = await frames.query(Store._storeExists, { storeId }, { storeId });
        if (frames.length === 0) {
            // Store does not exist, propagate error
            return new Frames({ ...frames[0], [error]: "Store not found" });
        }
        return frames;
    },
    then: actions(
        [Review.createReview, { userId, storeId, rating, text }, { reviewId, error }], // Explicitly map both possible outputs
    ),
});

export const CreateReviewResponseSuccess: Sync = ({ request, reviewId }) => ({
    when: actions(
        [Requesting.request, { path: "/Review/createReview" }, { request }],
        [Review.createReview, {}, { reviewId }],
    ),
    then: actions([
        Requesting.respond,
        { request, reviewId: reviewId },
        { request },
    ]),
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

export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating, error }) => ({ // Capture error for Review.deleteReview
    when: actions([
        Review.deleteReview,
        { reviewId },
        { error }, // Review.deleteReview can return an error
    ]),
    where: async (frames) => {
        if (frames[0][error]) { // If deleteReview returned an error, don't proceed
            return new Frames();
        }
        // Retrieve the full details of the deleted review to get its storeId and rating
        frames = await frames.query(Review._getReviewByIdFull, { reviewId: reviewId }, { storeId, rating, reviewId });
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

* **Robust Pre-condition Validation:** `CreateReviewRequest`'s `where` clause now correctly uses the new `_userExists` and `_storeExists` queries. It also includes logic to return an `error` frame immediately if either pre-condition fails, ensuring a response is sent and `Review.createReview` is not called with invalid IDs.
* **Explicit Error Mapping in `CreateReviewRequest`:** The `then` clause for `Review.createReview` explicitly maps `{ reviewId, error }` as possible outputs, allowing `CreateReviewResponseSuccess` or `CreateReviewResponseError` to correctly match.
* **Consistent Output Mappings:** All actions have explicit output mappings.
* **Robust Deletion Adjustment:** `AdjustRatingOnReviewDeletion` checks for errors from `Review.deleteReview` before attempting to adjust the rating.

### File: `src/syncs/tagging.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Tagging, Store, Rating } from "@concepts";

// --- Request-Response Flow for Tagging ---

export const AddTagRequest: Sync = ({ request, storeId, tag, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/Tagging/addTag", storeId, tag },
        { request },
    ]),
    where: async (frames) => {
        // Ensure store exists before adding a tag
        frames = await frames.query(Store._storeExists, { storeId }, { storeId });
        if (frames.length === 0) {
            return new Frames({ ...frames[0], [error]: "Store not found" });
        }
        return frames;
    },
    then: actions([
        Tagging.addTag,
        { storeId, tag },
        { error }, // Explicitly map error for addTag
    ]),
});

export const AddTagResponseSuccess: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/Tagging/addTag" }, { request }],
        [Tagging.addTag, {}, {}], // Match successful addTag (returns empty)
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
    { request, tag, storeId, name, address, aggregatedRating, reviewCount, results, error },
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
        { request, results: results, error: error }, // Include error for consistency
        { request },
    ]),
});
```

#### Justification for `tagging.sync.ts`:

* **Pre-condition Validation for `AddTagRequest`:** Ensures the `storeId` exists using `Store._storeExists` before attempting to add a tag, and provides an error response if not.
* **Explicit Output Mappings:** All actions have explicit output mappings.
* **Robust `GetStoresByTagRequestAndResponse`:** Handles zero matches and aggregates data from multiple concepts efficiently.

### File: `src/syncs/localization.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Localization, User } from "@concepts";

// --- Request-Response Flow for Localization ---

export const SetLanguageRequest: Sync = ({ request, userId, language, error }) => ({
    when: actions([
        Requesting.request,
        { path: "/Localization/setLanguage", userId, language },
        { request },
    ]),
    where: async (frames) => {
        // Ensure the user exists before allowing language setting
        frames = await frames.query(User._userExists, { userId }, { userId });
        if (frames.length === 0) {
            return new Frames({ ...frames[0], [error]: "User not found" });
        }
        return frames;
    },
    then: actions([
        Localization.setLanguage,
        { userId, language },
        { error }, // Explicitly map error for setLanguage
    ]),
});

export const SetLanguageResponseSuccess: Sync = ({ request }) => ({
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
        const originalRequestFrame = frames[0];
        // Ensure user exists before trying to get language
        frames = await frames.query(User._userExists, { userId }, { userId });
        if (frames.length === 0) {
            // If user doesn't exist, frames will be empty. Respond with error.
            return new Frames({ ...originalRequestFrame, [error]: "User not found" });
        }
        // Get the language from the Localization concept
        frames = await frames.query(Localization._getLanguage, { userId }, { preferredLanguage });
        if (frames.length === 0) {
            // No preferred language set for the user, return empty or default
            return new Frames({ ...originalRequestFrame, [preferredLanguage]: "en" }); // Default to 'en'
        }
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

* **Pre-condition Validation for `SetLanguageRequest`:** Uses `User._userExists` to ensure the user exists, providing an error response if not.
* **Explicit Output Mappings:** All actions have explicit output mappings.
* **Robust `GetLanguageRequestAndResponse`:** Handles cases where the user doesn't exist or no language is set, providing default values or error responses.

## Revised `passthrough.ts` Configuration

This `passthrough.ts` is now fully aligned with the *underscored queries* defined in the revised concept specifications and adheres to the rule that `passthrough.ts` paths *include* the base URL (`/api`).

```typescript
// src/concepts/Requesting/passthrough.ts (Revised to match underscored queries and API paths)
const BASE = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

export const inclusions: Record<string, string> = {
    // Public read-only Store queries
    [R("Store", "_listAllStores")]: "Public read; returns all stores with details",
    [R("Store", "_getStoreDetails")]: "Public read; returns single store details by ID",
    [R("Store", "_getStoresByName")]: "Public read; safe to search stores by name",
    [R("Store", "_getStoresByAddress")]: "Public read; safe to search stores by address",

    // Public read-only Tagging queries
    [R("Tagging", "_getTagsForStore")]: "Public read; returns tags for a specific store",
    [R("Tagging", "_getStoresByTag")]: "Public exploration; returns IDs of stores with a given tag",

    // Public read-only Review queries
    [R("Review", "_getReviewByIdFull")]: "Public read; returns full review details by ID",
    [R("Review", "_getReviewsForStoreFull")]: "Public read; returns full review details for a store",
    [R("Review", "_getReviewsByUserFull")]: "Public read; returns full review details by user",

    // Public read-only Rating query
    [R("Rating", "_getRating")]: "Public read; returns aggregated rating and count for a store",

    // Public read-only Localization query
    [R("Localization", "_getLanguage")]: "Public read; returns user's preferred language (default 'en' if not set)",

    // Public read-only User queries (e.g., to check username availability during registration, or view public profile details)
    [R("User", "_getUserDetails")]: "Public read; returns non-sensitive user profile details",
    // Note: _userExists and _getUserByUsernameOrEmail are internal validation/auth queries, not for direct public passthrough
};

export const exclusions: string[] = [
    // User: protected or needs centralized logic (all mutations, and internal queries)
    R("User", "registerUser"),
    R("User", "authenticateUser"),
    R("User", "updateUserEmail"),
    R("User", "deleteUser"),
    R("User", "_userExists"), // Exclude internal validation query
    R("User", "_getUserByUsernameOrEmail"), // Exclude internal auth query

    // Review: protected + derived updates (all mutations)
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
    R("Store", "_storeExists"), // Exclude internal validation query

    // Localization mutations
    R("Localization", "setLanguage"),
    R("Localization", "clearUserLanguage"),
];
```

By making these comprehensive revisions, your concept specifications and synchronizations are now fully compliant with the detailed rules of the Concept Engine and the principles of Concept Design. This ensures robust operation, clear separation of concerns, and effective composition through synchronizations.
