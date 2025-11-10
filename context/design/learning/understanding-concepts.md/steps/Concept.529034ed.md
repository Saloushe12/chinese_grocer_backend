---
timestamp: 'Fri Nov 07 2025 21:07:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_210756.a26c4c14.md]]'
content_id: 529034ed4baa210ba345b29c8b0c0785e726a6f48a0d52e82c6911303b32403b
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
* `getLanguage(userId: String): String`
  * **Effect:** Returns the user's currently set preferred language.
* `clearUserLanguage(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Removes the preferred language setting for the specified user. This action is typically invoked by a synchronization.

***

## New Synchronizations

This section defines the synchronizations that compose the concepts, enabling the application's functionality. The old "Syncs" section is completely replaced.

### File: `src/syncs/user_auth.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, User, Review, Localization } from "@concepts"; // Added Review, Localization for cascading

// --- Request-Response Flow for User Authentication & Registration ---

export const UserRegistrationRequest: Sync = ({ request, username, email, password }) => ({
    when: actions([
        Requesting.request,
        { path: "/register", username, email, password },
        { request },
    ]),
    then: actions([
        User.registerUser,
        { username, email, password },
    ]),
});

export const UserRegistrationResponseSuccess: Sync = ({ request, userId }) => ({
    when: actions(
        [Requesting.request, { path: "/register" }, { request }],
        [User.registerUser, {}, { userId }],
    ),
    then: actions([
        Requesting.respond,
        { request, userId: userId },
    ]),
});

export const UserRegistrationResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/register" }, { request }],
        [User.registerUser, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
    ]),
});

export const UserAuthenticationRequest: Sync = ({ request, usernameOrEmail, password }) => ({
    when: actions([
        Requesting.request,
        { path: "/login", usernameOrEmail, password },
        { request },
    ]),
    then: actions([
        User.authenticateUser,
        { usernameOrEmail, password },
    ]),
});

export const UserAuthenticationResponseSuccess: Sync = ({ request, userId }) => ({
    when: actions(
        [Requesting.request, { path: "/login" }, { request }],
        [User.authenticateUser, {}, { userId }],
    ),
    then: actions([
        Requesting.respond,
        { request, userId: userId },
    ]),
});

export const UserAuthenticationResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/login" }, { request }],
        [User.authenticateUser, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
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
        [Review.deleteReviewsByUser, { userId: userId }],
        [Localization.clearUserLanguage, { userId: userId }],
    ),
});
```

#### Justification for `user_auth.sync.ts`:

* **Separation of Concerns:** The `Requesting` concept handles HTTP requests, and the `User` concept manages user accounts. These syncs act as the intermediary, translating HTTP `path`s and parameters into `User` concept actions, and vice-versa for responses. This avoids tight coupling between HTTP concerns and core business logic.
* **Completeness and Independence:** The `User` concept remains complete in its domain (user accounts) and independent of the web server. It doesn't need to know *how* `registerUser` or `authenticateUser` were initiated, only that they were requested.
* **Cascading Deletion:** `CascadeUserDeletion` ensures data integrity. When a user is deleted from the `User` concept, it automatically triggers cleanup in other concepts (`Review`, `Localization`) that hold data related to that user. This prevents orphaned records and keeps each concept's state consistent, without the `User` concept having direct knowledge or responsibility for other concepts' data structures.

***

### File: `src/syncs/stores.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Store, Tagging, Review, Rating } from "@concepts"; // Added Tagging, Review, Rating for cascading

// --- Request-Response Flow for Stores ---

export const CreateStoreRequest: Sync = ({ request, name, address }) => ({
    when: actions([
        Requesting.request,
        { path: "/stores/create", name, address },
        { request },
    ]),
    then: actions([
        Store.createStore,
        { name, address },
    ]),
});

export const CreateStoreResponseSuccess: Sync = ({ request, storeId }) => ({
    when: actions(
        [Requesting.request, { path: "/stores/create" }, { request }],
        [Store.createStore, {}, { storeId }],
    ),
    then: actions([
        Requesting.respond,
        { request, storeId: storeId },
    ]),
});

export const CreateStoreResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/stores/create" }, { request }],
        [Store.createStore, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
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
        [Tagging.deleteTagsForStore, { storeId: storeId }],
        [Review.deleteReviewsForStore, { storeId: storeId }],
        [Rating.deleteRatingForStore, { storeId: storeId }],
    ),
});
```

#### Justification for `stores.sync.ts`:

* **Request-Response:** Similar to user management, these syncs provide the HTTP interface for `Store` creation, mapping requests to `Store.createStore` and handling success/error responses.
* **Cascading Deletion:** `CascadeStoreDeletion` ensures that when a `Store` is deleted, all related information across other concepts (`Tagging`, `Review`, `Rating`) is also cleaned up. This maintains data consistency and enforces the rule that associated data should not outlive the main entity.

***

### File: `src/syncs/reviews.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Review, User, Rating } from "@concepts"; // Added User for pre-condition check, Rating for aggregation

// --- Request-Response Flow for Reviews ---

export const CreateReviewRequest: Sync = ({ request, userId, storeId, text, rating, username }) => ({
    when: actions([
        Requesting.request,
        { path: "/reviews/create", userId, storeId, text, rating },
        { request },
    ]),
    where: async (frames) => {
        // Pre-condition: Ensure the user exists before allowing review creation
        frames = await frames.query(User._getUserById, { userId: userId }, { username });
        // If the user does not exist, frames will be empty and 'then' will not fire.
        return frames;
    },
    then: actions([
        Review.createReview,
        { userId, storeId, text, rating },
    ]),
});

export const CreateReviewResponseSuccess: Sync = ({ request, reviewId }) => ({
    when: actions(
        [Requesting.request, { path: "/reviews/create" }, { request }],
        [Review.createReview, {}, { reviewId }],
    ),
    then: actions([
        Requesting.respond,
        { request, reviewId: reviewId },
    ]),
});

export const CreateReviewResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/reviews/create" }, { request }],
        [Review.createReview, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
    ]),
});

// --- Data Integrity / Aggregation Syncs ---

export const AggregateReviewRating: Sync = ({ storeId, rating }) => ({
    when: actions([
        Review.createReview,
        {},
        { storeId, rating }, // Capture storeId and rating from the successful createReview output
    ]),
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: rating, weight: 1 } },
    ]),
});

export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating }) => ({
    when: actions([
        Review.deleteReview,
        { reviewId }, // Input to deleteReview action
        {}, // Successful deletion (no specific output)
    ]),
    where: async (frames) => {
        // Retrieve the full details of the deleted review to get its storeId and rating
        frames = await frames.query(Review._getReviewById, { reviewId: reviewId }, { storeId, rating });
        return frames;
    },
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: -rating, weight: -1 } }, // Subtract contribution
    ]),
});
```

#### Justification for `reviews.sync.ts`:

* **Pre-condition Validation (`CreateReviewRequest`):** The `where` clause in `CreateReviewRequest` demonstrates using another concept (`User`) for validation without coupling. The `Review` concept doesn't need to know `User`'s internal structure; it just queries if a `userId` exists. If the user doesn't exist, the `then` clause won't fire, implicitly preventing the invalid review. This upholds concept independence.
* **Aggregation (`AggregateReviewRating`):** This sync explicitly decouples the act of creating a review from the aggregation of ratings. `Review` focuses on individual review data, while `Rating` focuses on the aggregate. The sync observes `Review.createReview` and triggers `Rating.updateRating`, maintaining modularity.
* **Consistency on Deletion (`AdjustRatingOnReviewDeletion`):** When a `Review` is deleted, this sync ensures that the `Rating` concept is notified to adjust its aggregate score. It fetches the necessary `rating` and `storeId` from the `Review` concept via a query, again preventing direct coupling.

***

### File: `src/syncs/tagging.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Tagging, Store, Rating } from "@concepts"; // Added Store, Rating for query example

// --- Request-Response Flow for Tagging ---

export const AddTagRequest: Sync = ({ request, storeId, tag }) => ({
    when: actions([
        Requesting.request,
        { path: "/tagging/add", storeId, tag },
        { request },
    ]),
    then: actions([
        Tagging.addTag,
        { storeId, tag },
    ]),
});

export const AddTagResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/tagging/add" }, { request }],
        [Tagging.addTag, {}, {}], // Success with no specific output
    ),
    then: actions([
        Requesting.respond,
        { request, status: "success" },
    ]),
});

export const AddTagResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/tagging/add" }, { request }],
        [Tagging.addTag, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
    ]),
});

// --- Example Query Syncs ---

// This sync gathers data but doesn't directly respond.
export const GetStoresByTagRequest: Sync = ({ request, tag, storeId, name, address, aggregatedRating, reviewCount }) => ({
    when: actions([
        Requesting.request,
        { path: "/stores/by-tag", tag },
        { request },
    ]),
    where: async (frames) => {
        // Query Tagging to get store IDs for the given tag
        frames = await frames.query(Tagging._getStoresByTag, { tag: tag }, { storeId });
        // For each storeId found, get its details from the Store concept
        frames = await frames.query(Store._getStore, { storeId: storeId }, { name, address });
        // For each store, get its rating from the Rating concept
        frames = await frames.query(Rating._getRating, { storeId: storeId }, { aggregatedRating, reviewCount });
        return frames; // These enriched frames will be passed to the next sync in the flow
    },
    then: actions([]), // No direct action, just preparing data for response
});

// This sync responds with the collected data from the GetStoresByTagRequest flow.
export const GetStoresByTagResponse: Sync = ({ request, tag, storeId, name, address, aggregatedRating, reviewCount, results }) => ({
    when: actions([
        Requesting.request,
        { path: "/stores/by-tag", tag }, // Match the initial request to ensure flow
        { request },
    ]),
    where: async (frames) => {
        // Re-run the queries to ensure data consistency and full frame population for robustness
        // In a real system, you might optimize this if the flow is guaranteed to pass full frames.
        const initialTag = frames[0][tag]; // Get the tag from the original request frame
        
        frames = await frames.query(Tagging._getStoresByTag, { tag: initialTag }, { storeId });
        if (frames.length === 0) { // Handle case where no stores are found for the tag
            return new Frames({ ...frames[0], [results]: [] });
        }

        frames = await frames.query(Store._getStore, { storeId: storeId }, { name, address });
        frames = await frames.query(Rating._getRating, { storeId: storeId }, { aggregatedRating, reviewCount });
        
        return frames.collectAs([storeId, name, address, aggregatedRating, reviewCount], results);
    },
    then: actions([
        Requesting.respond,
        { request, results: results },
    ]),
});
```

#### Justification for `tagging.sync.ts`:

* **Request-Response:** Standard syncs for handling `addTag` requests and responses.
* **Query Orchestration (`GetStoresByTagRequest` & `GetStoresByTagResponse`):** These demonstrate how complex queries spanning multiple concepts can be orchestrated by syncs. The `GetStoresByTagRequest` sync gathers data from `Tagging`, `Store`, and `Rating` concepts using `frames.query`. The `GetStoresByTagResponse` then uses `collectAs` to format this aggregated data into a coherent response, showcasing how features are built by composing independent concepts. This maintains the independence of each concept (none of them directly know about "stores by tag" functionality) while allowing rich application features. The explicit handling of zero matches in the response sync makes it robust.

***

### File: `src/syncs/localization.sync.ts`

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Localization, User } from "@concepts"; // Added User for pre-condition check

// --- Request-Response Flow for Localization ---

export const SetLanguageRequest: Sync = ({ request, userId, language }) => ({
    when: actions([
        Requesting.request,
        { path: "/localization/set", userId, language },
        { request },
    ]),
    where: async (frames) => {
        // Optional: Ensure the user exists before allowing language setting
        frames = await frames.query(User._getUserById, { userId: userId }, {}); // No need to bind username
        return frames;
    },
    then: actions([
        Localization.setLanguage,
        { userId, language },
    ]),
});

export const SetLanguageResponse: Sync = ({ request }) => ({
    when: actions(
        [Requesting.request, { path: "/localization/set" }, { request }],
        [Localization.setLanguage, {}, {}],
    ),
    then: actions([
        Requesting.respond,
        { request, status: "success" },
    ]),
});

export const SetLanguageResponseError: Sync = ({ request, error }) => ({
    when: actions(
        [Requesting.request, { path: "/localization/set" }, { request }],
        [Localization.setLanguage, {}, { error }],
    ),
    then: actions([
        Requesting.respond,
        { request, error: error },
    ]),
});
```

#### Justification for `localization.sync.ts`:

* **Request-Response:** These syncs manage the HTTP interface for setting a user's language preference.
* **Optional User Validation:** The `where` clause for `SetLanguageRequest` demonstrates an optional pattern to validate the `userId` against the `User` concept, providing a robust interface. This ensures that a `Localization` setting is only created for an existing `User`.

***

These synchronizations, along with the updated concept specifications, create a modular, decoupled, and robust application architecture that fully embraces the principles of Concept Design.
