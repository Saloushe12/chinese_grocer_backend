---
timestamp: 'Fri Nov 07 2025 23:11:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_231138.38ca08ba.md]]'
content_id: c40cb0065f4bb62ae85e997dc077c5bf6f936ef0780b6b7eab7e02bcc7b59d47
---

# response:

This proposal is invaluable for aligning the concept specifications and sync implementations with the nuances of the Concept Engine. It highlights several critical requirements for smooth operation, particularly regarding query methods, `when` clause output mappings, and path conventions.

I've analyzed the proposed changes and identified several areas where the current concept specifications or sync implementations need adjustments to fully comply.

Here's a breakdown of the analysis, pointing out mistakes and suggesting fixes:

***

### **General Rules & Observations from Proposal:**

1. **`where` must use underscored queries that return arrays:** This is a fundamental rule. Queries (`_get...`) are for reading state and must return `Promise<Array<T>>`. Actions (non-underscored) are for modifying state and trigger `when` clauses.
2. **Every `when: actions(...)` needs an output mapping:** Crucial for the engine to correctly match action outcomes. This applies to *both* `when` and `then` clauses when they interact with concept actions that have outputs.
3. **Paths in syncs exclude the base URL:** In `Requesting.request` patterns within syncs, paths should *not* include `/api`. `passthrough.ts` *should* include it.

***

### **Detailed Analysis & Proposed Corrections:**

#### **A) Add underscored array-returning queries to concepts**

This section correctly identifies the need for underscored query methods within the concepts.

* **User concept (`UserConcept.ts`):**
  * `_getUserById`:
    * **Proposed Code:**
      ```typescript
      async _getUserById(
        { userId }: { userId: ID }
      ): Promise<Array<{ userId: ID }>> {
        const user = await this.users.findOne(
          { _id: userId },
          { projection: { _id: 1 } }
        );
        return user ? [{ userId: user._id }] : [];
      }
      ```
    * **Analysis:** This is correctly structured. It returns `Promise<Array<...>>` and handles the "not found" case gracefully with `[]`.
  * `_getUserByUsernameOrEmail`:
    * **Proposed Code:**
      ```typescript
      async _getUserByUsernameOrEmail(
        { usernameOrEmail }: { usernameOrEmail: string }
      ): Promise<Array<{ userId: ID }>> {
        const user = await this.users.findOne(
          { $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
          { projection: { _id: 1 } }
        );
        return user ? [{ userId: user._id }] : [];
      }
      ```
    * **Analysis:** Correctly structured.
* **Store concept (`StoreConcept.ts`):**
  * `_getStore`:
    * **Proposed Code:**
      ```typescript
      async _getStore(
        { storeId }: { storeId: ID }
      ): Promise<Array<{ storeId: ID }>> {
        const store = await this.stores.findOne({ _id: storeId }, { projection: { _id: 1 } });
        return store ? [{ storeId: store._id }] : [];
      }
      ```
    * **Analysis:** Correctly structured for an existence check, returning `storeId` on match. The note about `_exists` is also a good alternative pattern.
* **Review concept (`ReviewConcept.ts`):**
  * `_getReviewsByUser`:
    * **Proposed Code:**
      ```typescript
      async _getReviewsByUser(
        { userId }: { userId: ID }
      ): Promise<Array<{ reviewId: ID }>> {
        const docs = await this.reviews.find(
          { authorId: userId }, // Assuming 'authorId' is the field for userId in Review state
          { projection: { _id: 1 } }
        ).toArray();
        return docs.map(d => ({ reviewId: d._id }));
      }
      ```
    * **Analysis:** Correctly structured.
  * **Missing Query for `AdjustRatingOnReviewDeletion`:** My previous output's `AdjustRatingOnReviewDeletion` sync needed `Review._getReviewById` to retrieve the `storeId` and `rating` of a deleted review. This is not in the proposal.
    * **Recommendation:** Add the following to `ReviewConcept.ts`:
      ```typescript
      // In ReviewConcept.ts
      // Existing concept structure...
      // Add this query:
      async _getReviewById(
        { reviewId }: { reviewId: ID }
      ): Promise<Array<{ reviewId: ID; storeId: ID; rating: number }>> {
        const review = await this.reviews.findOne({ _id: reviewId }); // Assuming full doc is needed
        return review ? [{ reviewId: review._id, storeId: review.storeId, rating: review.rating }] : [];
      }
      ```

#### **B) Use underscored queries inside `where` (Example: `CreateReviewRequest` sync)**

* **Proposed Sync:**
  ```typescript
  export const CreateReviewRequest: Sync = ({ request, userId, storeId, rating, text }) => ({
    when: actions(
      [Requesting.request, { path: "/Review/createReview", userId, storeId, rating, text }, { request }],
    ),
    where: (frames) => // MISTAKE: missing 'async'
      frames
        .query(User._getUserById, { userId }, { userId }) // MISTAKE: missing 'await'
        .query(Store._getStore, { storeId }, { storeId }), // MISTAKE: missing 'await'
    then: actions(
      [Review.createReview, { userId, storeId, rating, text }, {}],        // MISTAKE: output mapping for reviewId
      [Rating.updateRating, { storeId }, {}],                              // MISTAKE: input 'contribution'
      [Requesting.respond, { request }, {}],                               // MISTAKE: output mapping for request
    ),
  });
  ```

* **Analysis & Fixes:**
  1. **`where` clause `async`/`await`:** The `where` clause calls `frames.query`, which is `async`. Therefore, the `where` function itself *must* be `async`, and calls to `frames.query` *must* be `await`ed.
  2. **`then` output mappings:** Based on our concept specs:
     * `Review.createReview(...)` returns `reviewId`. The output mapping in `then` should be `{ reviewId }`.
     * `Rating.updateRating(...)` returns empty. `{}` is fine.
     * `Requesting.respond(...)` returns `request`. The output mapping in `then` should be `{ request }`.
  3. **`Rating.updateRating` input:** The `Rating.updateRating` action expects `{ storeId, contribution: { rating: Number, weight: Number } }`. The proposal's `[Rating.updateRating, { storeId }, {}]` is missing the `contribution` object.
  4. **`Requesting.request` path:** The path `"/Review/createReview"` implies `Review` is a capitalized concept name used in the path. My previous outputs used lowercase plural (e.g., `/reviews/create`). I will maintain consistency with the proposal's example path for now but note it as a convention change.

* **Corrected `CreateReviewRequest` Sync:**
  ```typescript
  // src/syncs/reviews.sync.ts (updated)
  import { actions, Sync, Frames } from "@engine";
  import { Requesting, User, Review, Rating, Store } from "@concepts";

  export const CreateReviewRequest: Sync = ({ request, userId, storeId, rating, text, reviewId }) => ({
    when: actions(
      [Requesting.request, { path: "/Review/createReview", userId, storeId, rating, text }, { request }],
    ),
    where: async (frames) => // FIX: added 'async'
      await frames // FIX: added 'await'
        .query(User._getUserById, { userId }, { userId })
        .query(Store._getStore, { storeId }, { storeId }),
    then: actions(
      // FIX: Capture reviewId output
      [Review.createReview, { userId, storeId, rating, text }, { reviewId }],
      // FIX: Correct 'contribution' input for updateRating (this will trigger the aggregation sync)
      // Note: The direct Rating.updateRating in 'then' here is fine, but typically we'd let a separate sync (AggregateReviewRating) handle this,
      // which matches our previous design. I will remove this line and rely on the `AggregateReviewRating` sync.
      // [Rating.updateRating, { storeId, contribution: { rating, weight: 1 } }, {}],
      // FIX: Capture request output
      [Requesting.respond, { request, reviewId }, { request }], // Responding with reviewId after successful creation
    ),
  });

  // The existing AggregateReviewRating sync will handle the Rating update:
  // export const AggregateReviewRating: Sync = ({ storeId, rating, reviewId }) => ({
  //   when: actions([
  //     Review.createReview,
  //     {}, // Input pattern for createReview (don't care about specific inputs)
  //     { storeId, rating, reviewId }, // Capture these outputs from Review.createReview
  //   ]),
  //   then: actions([
  //     Rating.updateRating,
  //     { storeId, contribution: { rating: rating, weight: 1 } },
  //   ]),
  // });
  ```
  * **Self-correction on `then` clause:** My previous output already had `AggregateReviewRating` as a separate sync. `CreateReviewRequest` should only call `Review.createReview` and then `Requesting.respond`. The `Rating.updateRating` should remain in its dedicated `AggregateReviewRating` sync. This further reinforces separation of concerns.

#### **C) Keep the request/response split for excluded routes (UserRegistration syncs)**

* **Proposed Syncs (snippets):**
  ```typescript
  // UserRegistrationRequest
  when: actions([Requesting.request, { path: "/User/registerUser", username, email, password }, { request }]),
  then: actions([User.registerUser, { username, email, password }, {}]), // MISTAKE: output mapping for userId

  // UserRegistrationResponseSuccess
  when: actions(
  [Requesting.request, { path: "/User/registerUser" }, { request }],
  [User.registerUser, {}, { userId }],
  ),
  then: actions([Requesting.respond, { request, userId }, {}]), // MISTAKE: output mapping for request

  // UserRegistrationResponseError
  when: actions(
  [Requesting.request, { path: "/User/registerUser" }, { request }],
  [User.registerUser, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }, {}]), // MISTAKE: output mapping for request
  ```

* **Analysis & Fixes:**
  1. **`then` output mappings:**
     * `User.registerUser(...)` returns `userId`. Output mapping should be `{ userId }`.
     * `Requesting.respond(...)` returns `request`. Output mapping should be `{ request }`.

* **Corrected `user_auth.sync.ts` snippets:**
  ```typescript
  // src/syncs/user_auth.sync.ts (updated snippets)
  import { actions, Sync, Frames } from "@engine";
  import { Requesting, User, Review, Localization } from "@concepts";

  export const UserRegistrationRequest: Sync = ({ request, username, email, password, userId }) => ({
      when: actions([
          Requesting.request,
          { path: "/User/registerUser", username, email, password },
          { request },
      ]),
      then: actions([
          User.registerUser,
          { username, email, password },
          { userId }, // FIX: Capture userId output
      ]),
  });

  export const UserRegistrationResponseSuccess: Sync = ({ request, userId }) => ({
      when: actions(
          [Requesting.request, { path: "/User/registerUser" }, { request }],
          [User.registerUser, {}, { userId }],
      ),
      then: actions([
          Requesting.respond,
          { request, userId: userId },
          { request }, // FIX: Capture request output
      ]),
  });

  export const UserRegistrationResponseError: Sync = ({ request, error }) => ({
      when: actions(
          [Requesting.request, { path: "/User/registerUser" }, { request }],
          [User.registerUser, {}, { error }],
      ),
      then: actions([
          Requesting.respond,
          { request, error: error },
          { request }, // FIX: Capture request output
      ]),
  });
  ```
  (Similar fixes would apply to `UserAuthenticationRequest` and its responses.)

#### **D) Cascade syncs: outputs (`CascadeUserDeletion` sync)**

* **Proposed Sync:**
  ```typescript
  export const CascadeUserDeletion: Sync = ({ userId }) => ({
    when: actions([User.deleteUser, { userId }, {}]),
    then: actions(
      [Review.deleteReviewsByUser, { userId }, {}],
      [Localization.clearUserLanguage, { userId }, {}],
    ),
  });
  ```
* **Analysis:** This is **correct**. All `then` actions (`deleteReviewsByUser`, `clearUserLanguage`) and the `when` action (`deleteUser`) return empty on success, so `{}` is the appropriate output mapping.

#### **E) `passthrough.ts` (include only safe public reads)**

* **Analysis:** This section defines the `passthrough.ts` configuration, which is crucial for determining which routes bypass the `Requesting.request` sync mechanism and which are reified into `Requesting.request` actions.
  * **Paths:** The `R(concept, action)` helper correctly includes the `BASE_URL`, which is correct for `passthrough.ts`.
  * **Content (Discrepancies):** There are significant discrepancies between the routes proposed in `passthrough.ts` and the actual methods/queries defined in my concept specifications. This indicates that the concepts themselves need to be updated with appropriate `_query` methods if these routes are desired.

* **Required Adjustments to Concept Specs (based on `passthrough.ts`):**
  1. **Store Concept:**
     * **Problem:** `R("Store", "listStores")` and `R("Store", "getStoreById")` are referenced but don't exist in my spec as queries. `_getStoresByName` and `_getStoresByAddress` are also referenced as queries but don't exist in my spec (they are currently non-underscored actions).
     * **Recommendation:** If these routes are desired, `StoreConcept.ts` needs to be augmented with these `_query` methods:
       ```typescript
       // In StoreConcept.ts (add these queries)
       async _listStores(): Promise<Array<{ storeId: ID; name: string; address: string }>> {
         const docs = await this.stores.find({}).toArray();
         return docs.map(d => ({ storeId: d._id, name: d.name, address: d.address }));
       }

       async _getStoreById( // Renamed from _getStore to clarify full data vs. ID only
         { storeId }: { storeId: ID }
       ): Promise<Array<{ storeId: ID; name: string; address: string }>> {
         const store = await this.stores.findOne({ _id: storeId });
         return store ? [{ storeId: store._id, name: store.name, address: store.address }] : [];
       }

       async _getStoresByName(
         { name }: { name: string }
       ): Promise<Array<{ storeId: ID; name: string; address: string }>> {
         const docs = await this.stores.find({ name }).toArray();
         return docs.map(d => ({ storeId: d._id, name: d.name, address: d.address }));
       }

       async _getStoresByAddress(
         { address }: { address: string }
       ): Promise<Array<{ storeId: ID; name: string; address: string }>> {
         const docs = await this.stores.find({ address }).toArray();
         return docs.map(d => ({ storeId: d._id, name: d.name, address: d.address }));
       }
       ```
       *Self-correction:* The originally proposed `_getStore` in section A only returned `storeId`. To fulfill `getStoreById` for `passthrough.ts` returning full details, a richer `_getStoreById` query is needed.
  2. **Tagging Concept:**
     * **Problem:** `R("Tagging", "listTagsForStore")` is referenced but doesn't exist.
     * **Recommendation:** Add a `_getTagsForStore` query:
       ```typescript
       // In TaggingConcept.ts (add this query)
       async _getTagsForStore(
         { storeId }: { storeId: ID }
       ): Promise<Array<{ storeId: ID; tags: string[] }>> {
         const tagsDoc = await this.tagsCollection.findOne({ _id: storeId }); // Assuming tags are stored per storeId
         return tagsDoc ? [{ storeId: tagsDoc._id, tags: tagsDoc.tags }] : [];
       }
       ```
       *Self-correction:* My initial `Tagging` concept had `tags: Set<String>` directly on a `Tagging` record, implying `Tagging` record is `{storeId, tags}`. The collection would probably be named `tagsByStoreId`. The query would fetch this record.
  3. **Review Concept:**
     * **Problem:** `R("Review", "getReviewsForStore")` and `R("Review", "getReviewsByUser")` are referenced but refer to actions, not queries. To provide full review data publicly, richer queries are needed.
     * **Recommendation:** Add queries that return full review objects:
       ```typescript
       // In ReviewConcept.ts (add these queries)
       async _getReviewsForStoreFull(
         { storeId }: { storeId: ID }
       ): Promise<Array<{ reviewId: ID; storeId: ID; userId: ID; text: string; rating: number }>> {
         const docs = await this.reviews.find({ storeId }).toArray();
         return docs.map(d => ({ reviewId: d._id, storeId: d.storeId, userId: d.userId, text: d.text, rating: d.rating }));
       }

       async _getReviewsByUserFull(
         { userId }: { userId: ID }
       ): Promise<Array<{ reviewId: ID; storeId: ID; userId: ID; text: string; rating: number }>> {
         const docs = await this.reviews.find({ userId }).toArray();
         return docs.map(d => ({ reviewId: d._id, storeId: d.storeId, userId: d.userId, text: d.text, rating: d.rating }));
       }
       ```
       *Self-correction:* My previous `_getReviewsForStore` and `_getReviewsByUser` returned `Set<String>` (IDs). For public *read* of data, `_Full` variants are more appropriate.

* **Final `passthrough.ts` based on corrected queries:**
  ```typescript
  // src/concepts/Requesting/passthrough.ts (Revised)
  const BASE = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
  const R = (concept: string, action: string) => `${BASE}/${concept}/${action}`;

  export const inclusions: Record<string, string> = {
    // Public read-only Store queries (assuming _getStoreById returns full details)
    [R("Store", "_listStores")]: "Public read; no side-effects",
    [R("Store", "_getStoreById")]: "Public read; no side-effects",
    // If you want _getStoresByName/_getStoresByAddress public
    [R("Store", "_getStoresByName")]: "Public read; safe",
    [R("Store", "_getStoresByAddress")]: "Public read; safe",

    // Public read-only Tagging queries
    [R("Tagging", "_getTagsForStore")]: "Public read; safe", // Changed to _getTagsForStore
    [R("Tagging", "_getStoresByTag")]: "Public exploration; safe ids-only",

    // Public read-only Review queries (assuming _getReviewsForStoreFull returns full review details)
    [R("Review", "_getReviewsForStoreFull")]: "Public read; safe",
    [R("Review", "_getReviewsByUserFull")]: "Public read; safe",
  };

  export const exclusions: string[] = [
    // User: protected or needs centralized logic
    R("User", "registerUser"),
    R("User", "authenticateUser"),
    R("User", "updateUserEmail"),
    R("User", "deleteUser"),

    // Review: protected + derived updates
    R("Review", "createReview"),
    R("Review", "deleteReview"),

    // Rating: mutation should be internal-only (triggered by sync)
    R("Rating", "updateRating"),

    // Tagging mutations: protected (auth/ownership)
    R("Tagging", "addTag"),
    R("Tagging", "removeTag"),
    R("Tagging", "deleteTagsForStore"), // Added this for completeness

    // Store mutations: protected (admin-only)
    R("Store", "createStore"),
    R("Store", "deleteStore"),

    // Localization mutations
    R("Localization", "setLanguage"),
    R("Localization", "clearUserLanguage"),
    // Exclude base queries if _Full variants are preferred for public access or more granular control
    R("Store", "getStore"), // This is an action in my spec, not a query. If you have a _getStoreById it covers it.
    R("Store", "getStoresByName"), // This is an action in my spec
    R("Store", "getStoresByAddress"), // This is an action in my spec
  ];
  ```

***

### **Summary of Recommended Changes for the Backend Code:**

1. **Update `ReviewConcept.ts`**: Add the `_getReviewById` query.
2. **Update `UserConcept.ts`**: Ensure the proposed `_getUserById` and `_getUserByUsernameOrEmail` queries are implemented.
3. **Update `StoreConcept.ts`**: Ensure the proposed `_getStore` query is implemented. Also, add `_listStores`, `_getStoreById`, `_getStoresByName`, and `_getStoresByAddress` queries if their public access through `passthrough.ts` is desired. Update the `Store` concept specification to include these `queries`.
4. **Update `TaggingConcept.ts`**: Add the `_getTagsForStore` query if public access is desired. Update the `Tagging` concept specification to include this `query`.
5. **Update `ReviewConcept.ts`**: Add `_getReviewsForStoreFull` and `_getReviewsByUserFull` queries if public access returning full details is desired. Update the `Review` concept specification to include these `queries`.
6. **Correct `CreateReviewRequest` sync (`src/syncs/reviews.sync.ts`)**:
   * Change `where: (frames) => ...` to `where: async (frames) => await ...`.
   * Change `then: actions([Review.createReview, { ... }, {}])` to `{ reviewId }`.
   * Remove `[Rating.updateRating, ...]` from the `then` clause of `CreateReviewRequest`, as `AggregateReviewRating` should handle this.
   * Change `then: actions([Requesting.respond, { request }, {}])` to `{ request, reviewId }, { request }` (to return the review ID).
7. **Correct `UserRegistrationRequest` and `UserAuthenticationRequest` syncs (`src/syncs/user_auth.sync.ts`)**:
   * Ensure output mapping for `User.registerUser` is `{ userId }`.
   * Ensure output mapping for `User.authenticateUser` is `{ userId }` or `{ error }`.
   * Ensure output mapping for `Requesting.respond` in all response syncs is `{ request }`.
8. **Update `AdjustRatingOnReviewDeletion` sync (`src/syncs/reviews.sync.ts`)**: Ensure it correctly uses the new `Review._getReviewById` query.
9. **Revise `passthrough.ts`**: Use the corrected `inclusions` and `exclusions` lists above, matching them to actual (or newly added) underscored query methods.

By making these adjustments, the backend code will be more robust, compliant with the Concept Engine's requirements, and better aligned with the principles of Concept Design.
