## Which routes should be passthrough vs excluded (and why)

### ✅ INCLUDE (direct passthrough)
These should remain as ordinary API endpoints because they are *public reads* or *safe creation*.

They do **not** need orchestration, and they do **not** leak privileged info:

- `/api/Store/listStores` — anyone can browse stores
- `/api/Store/getStoreById` — same rationale
- `/api/Store/_getStoresByName` — read-only filter
- `/api/Store/_getStoresByAddress` — read-only filter

- `/api/Review/getReviewsForStore` — store public review listing
- `/api/Review/getReviewsByUser` — this is similar to public profile browsing (if you want privacy restrictions, you can later exclude this one — but by default public reads are fine)

- `/api/Rating/getRating` — harmless single-value read

- `/api/Tagging/_getStoresByTag` — public tag browsing
- `/api/Tagging/listTagsForStore` — public tag browsing

- `/api/User/registerUser` — creating a new account is a public action (no pre-auth required)

*(optional — if your `getUserById` returns **redacted** non-PII)*
- `/api/User/getUserById` — ONLY IF it returns limited safe public profile data  
(If it returns full email / sensitive fields, it should be EXCLUDED instead.)

---

### ❌ EXCLUDE (use syncs)
These should NOT be directly callable from the frontend — they require *authorization* or *multi-concept reactions*.

- `/api/User/authenticateUser` — needs sync to create session token properly, not expose bare credential comparison
- `/api/User/updateUserEmail` — must require being logged in as the same user
- `/api/User/deleteUser` — privileged action only

- `/api/Store/createStore` — likely admin-only
- `/api/Store/deleteStore` — admin-only, possibly triggers cascade cleanup

- `/api/Review/createReview` — MUST override userId based on current session, can't trust user-supplied IDs
- `/api/Review/deleteReview` — must validate authorship / admin
- `/api/Rating/updateRating` — **internal-only** — should be invoked by review create/delete syncs, never directly used by frontend

- `/api/Tagging/addTag` — probably admin/mod only
- `/api/Tagging/removeTag` — probably admin/mod only

---

### Summary rule of thumb

| Type of Route | Should Be | Why |
|---|---|---|
| Pure reads | INCLUDE | harmless / no orchestration needed |
| Anything that requires auth check / identity | EXCLUDE | session must be enforced in sync |
| Anything that needs side effects on other concepts | EXCLUDE | e.g. review impacts rating |
| Internal maintenance actions | EXCLUDE | e.g. Rating.updateRating |

This matches both:  
**(1)** assignment’s purpose: “move syncs to backend to enforce security”  
**(2)** clean concept architecture: cross-concept triggers in syncs, not frontend.

# Backend Concept Requirements

## Analysis of Backend Concept Implementation

Based on the example `ReviewConcept` class, here are the key patterns and requirements:

### Return Type Patterns

1. **Actions (create, delete, update)**:
   - Success: `{ reviewId: ID }` or `{}` (empty object)
   - Error: `{ error: string }`
   - Never throws exceptions; errors are returned as objects

2. **Queries (get, list)**:
   - Success: `{ reviewIds: Set<ID> }` or similar structured return
   - Error: Returns empty/default values (e.g., `{ reviewIds: new Set<ID>() }`)

### Required Methods for Syncs

#### Review Concept - Missing Methods Needed

1. **`deleteReviewsForStore(storeId: Store): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a store is deleted
   - **Used by**: `CascadeStoreDeletion` sync
   - **Implementation**: Delete all reviews where `storeId` matches

2. **`deleteReviewsByUser(userId: User): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a user is deleted
   - **Used by**: `CascadeUserDeletion` sync
   - **Implementation**: Delete all reviews where `userId` matches

3. **`_getReviewById(reviewId: ID): Promise<ReviewDoc | null>`**
   - **Purpose**: Query to get review details (for sync `where` clauses)
   - **Used by**: `AdjustRatingOnReviewDeletion` sync
   - **Implementation**: Find review by `_id`, return full document or null

4. **`_getReviewsForStore(storeId: Store): Promise<Set<ID>>`**
   - **Purpose**: Query version for sync `where` clauses
   - **Used by**: Sync queries that need review IDs
   - **Implementation**: Similar to `getReviewsForStore` but returns `Set<ID>` directly

5. **`_getReviewsByUser(userId: User): Promise<Set<ID>>`**
   - **Purpose**: Query version for sync `where` clauses
   - **Used by**: Sync queries that need review IDs
   - **Implementation**: Similar to `getReviewsByUser` but returns `Set<ID>` directly

### Similar Patterns Needed for Other Concepts

#### User Concept - Missing Methods

1. **`_getUserById(userId: ID): Promise<{ username: string, email: string, creationDate: Date } | null>`**
   - **Purpose**: Query for sync validation
   - **Used by**: `CreateReviewRequest` sync, `SetLanguageRequest` sync
   - **Implementation**: Find user by `_id`, return non-sensitive data or null

#### Store Concept - Missing Methods

1. **`_getStore(storeId: ID): Promise<{ name: string, address: string } | null>`**
   - **Purpose**: Query for sync queries
   - **Used by**: `GetStoresByTagResponse` sync
   - **Implementation**: Find store by `_id`, return name and address or null

#### Rating Concept - Missing Methods

1. **`deleteRatingForStore(storeId: Store): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a store is deleted
   - **Used by**: `CascadeStoreDeletion` sync
   - **Implementation**: Delete rating record where `storeId` matches

2. **`_getRating(storeId: Store): Promise<{ aggregatedRating: number, reviewCount: number } | null>`**
   - **Purpose**: Query for sync queries
   - **Used by**: `GetStoresByTagResponse` sync
   - **Implementation**: Find rating by `storeId`, return rating data or null

#### Tagging Concept - Missing Methods

1. **`deleteTagsForStore(storeId: Store): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a store is deleted
   - **Used by**: `CascadeStoreDeletion` sync
   - **Implementation**: Delete all tagging records where `storeId` matches

2. **`_getStoresByTag(tag: string): Promise<Set<ID>>`**
   - **Purpose**: Query for sync queries
   - **Used by**: `GetStoresByTagRequest` and `GetStoresByTagResponse` syncs
   - **Implementation**: Find all stores with the given tag, return Set<ID>

#### Localization Concept - Missing Methods

1. **`clearUserLanguage(userId: User): Promise<Empty | { error: string }>`**
   - **Purpose**: Cascading deletion when a user is deleted
   - **Used by**: `CascadeUserDeletion` sync
   - **Implementation**: Delete localization record where `userId` matches

## Implementation Guide

### Pattern for Cascading Deletion Methods

```typescript
async deleteReviewsForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.reviewsCollection.deleteMany({ storeId: storeId });
    // Even if no documents were deleted, it's still considered success
    // (the store may not have had any reviews)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting reviews for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Pattern for Query Methods (for sync `where` clauses)

```typescript
async _getReviewById({ reviewId }: { reviewId: ID }): Promise<ReviewDoc | null> {
  try {
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    return review || null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting review '${reviewId}': ${message}`);
    return null; // Return null on error for queries
  }
}
```

### Pattern for Query Methods (returning Set<ID>)

```typescript
async _getReviewsForStore({ storeId }: { storeId: Store }): Promise<Set<ID>> {
  try {
    const reviews = await this.reviewsCollection.find(
      { storeId: storeId },
      { projection: { _id: 1 } }
    ).toArray();
    return new Set<ID>(reviews.map((r) => r._id));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting reviews for store '${storeId}': ${message}`);
    return new Set<ID>(); // Return empty set on error
  }
}
```

## Sync Adjustments Needed

### 1. Error Handling in Syncs

Syncs need to check for `{ error }` in return values:

```typescript
// Instead of assuming success, check for error
const result = await Review.createReview({ userId, storeId, text, rating });
if ('error' in result) {
  // Handle error
  return { error: result.error };
}
// Use result.reviewId
```

### 2. Query Return Types

Sync `where` clauses need to handle query return types correctly:

```typescript
// Query methods return the data directly or null
const review = await frames.query(Review._getReviewById, { reviewId }, {});
if (!review) {
  // Review doesn't exist
  return frames; // Empty frames, sync won't fire
}
// Use review.storeId, review.rating
```

### 3. Set Return Types

When queries return `Set<ID>`, syncs need to handle them:

```typescript
// Query returns Set<ID> directly
const reviewIds = await frames.query(Review._getReviewsForStore, { storeId }, {});
// reviewIds is a Set<ID>
```

## Summary

The backend concept implementation uses:
- **Return objects** for errors (`{ error: string }`) instead of throwing
- **Structured returns** for queries (`{ reviewIds: Set<ID> }`)
- **Query methods** (prefixed with `_`) that return data directly or null

Syncs need to:
- **Check for errors** in action return values
- **Handle null returns** from query methods
- **Use Set<ID>** returns from query methods correctly

Additional methods needed:
- Cascading deletion methods (`deleteReviewsForStore`, `deleteReviewsByUser`, etc.)
- Query methods for sync `where` clauses (`_getReviewById`, etc.)
- Query methods returning `Set<ID>` for sync queries

# Backend Implementation Checklist

## Required Backend Method Implementations

Based on the backend concept pattern and sync requirements, here are all the methods that need to be implemented:

### Review Concept

#### Existing Methods (Already Implemented)
- ✅ `createReview` - Returns `{ reviewId } | { error }`
- ✅ `deleteReview` - **NEEDS MODIFICATION** (see below)
- ✅ `getReviewsForStore` - Returns `{ reviewIds: Set<ID> }`
- ✅ `getReviewsByUser` - Returns `{ reviewIds: Set<ID> }`

#### New Methods Needed
- ❌ `deleteReviewsForStore` - For `CascadeStoreDeletion` sync
- ❌ `deleteReviewsByUser` - For `CascadeUserDeletion` sync
- ❌ `_getReviewById` - Query method for sync `where` clauses
- ❌ `_getReviewsForStore` - Query method (returns `Set<ID>` directly)
- ❌ `_getReviewsByUser` - Query method (returns `Set<ID>` directly)

#### Modification Required
- ⚠️ **`deleteReview`** - Modify to return `{ storeId, rating } | { error }` instead of `{} | { error }`
  - **Reason**: Needed for `AdjustRatingOnReviewDeletion` sync
  - **Implementation**: Get review data before deletion, return it

### User Concept

#### New Methods Needed
- ❌ `_getUserById` - Query method for sync validation
  - Returns: `{ username: string, email: string, creationDate: Date } | null`
  - Used by: `CreateReviewRequest` sync, `SetLanguageRequest` sync

### Store Concept

#### New Methods Needed
- ❌ `_getStore` - Query method for sync queries
  - Returns: `{ name: string, address: string } | null`
  - Used by: `GetStoresByTagResponse` sync

#### Modification Required (if not already exists)
- ⚠️ `deleteStore` - Should return `{} | { error }`
  - Used by: `CascadeStoreDeletion` sync

### Rating Concept

#### New Methods Needed
- ❌ `deleteRatingForStore` - For `CascadeStoreDeletion` sync
  - Returns: `{} | { error }`
- ❌ `_getRating` - Query method for sync queries
  - Returns: `{ aggregatedRating: number, reviewCount: number } | null`
  - Used by: `GetStoresByTagResponse` sync

### Tagging Concept

#### New Methods Needed
- ❌ `deleteTagsForStore` - For `CascadeStoreDeletion` sync
  - Returns: `{} | { error }`
- ❌ `_getStoresByTag` - Query method for sync queries
  - Returns: `Set<ID>` (not wrapped in object)
  - Used by: `GetStoresByTagRequest` and `GetStoresByTagResponse` syncs

### Localization Concept

#### New Methods Needed
- ❌ `clearUserLanguage` - For `CascadeUserDeletion` sync
  - Returns: `{} | { error }`

## Implementation Patterns

### Pattern 1: Cascading Deletion Method

```typescript
async deleteReviewsForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.reviewsCollection.deleteMany({ storeId: storeId });
    // Return {} even if no documents were deleted (valid state)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting reviews for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Pattern 2: Query Method (Returns Data Directly)

```typescript
async _getReviewById({ reviewId }: { reviewId: ID }): Promise<ReviewDoc | null> {
  try {
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    return review || null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting review '${reviewId}': ${message}`);
    return null;
  }
}
```

### Pattern 3: Query Method (Returns Set<ID>)

```typescript
async _getStoresByTag({ tag }: { tag: string }): Promise<Set<ID>> {
  try {
    const taggings = await this.taggingsCollection.find(
      { tags: tag },
      { projection: { storeId: 1 } }
    ).toArray();
    return new Set<ID>(taggings.map((t) => t.storeId));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting stores by tag '${tag}': ${message}`);
    return new Set<ID>();
  }
}
```

### Pattern 4: Modified deleteReview (Returns Data Before Deletion)

```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // FIRST: Get the review data (needed for syncs)
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    // Store the data we need for AdjustRatingOnReviewDeletion sync
    const { storeId, rating } = review;
    
    // THEN: Delete the review
    const result = await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    if (result.deletedCount === 1) {
      // Return the data needed for the sync
      return { storeId, rating };
    } else {
      // This shouldn't happen, but handle it
      return { error: `Review with ID '${reviewId}' not found.` };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting review: ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

## Testing Requirements

### Test Each New Method

1. **Cascading Deletion Methods**:
   - Test deletion when records exist
   - Test deletion when no records exist (should return `{}`)
   - Test error handling

2. **Query Methods**:
   - Test query when data exists (returns data)
   - Test query when data doesn't exist (returns `null` or empty `Set`)
   - Test error handling (returns `null` or empty `Set`)

3. **Modified deleteReview**:
   - Test deletion when review exists (returns `{ storeId, rating }`)
   - Test deletion when review doesn't exist (returns `{ error }`)
   - Test error handling

### Test Sync Integration

1. **CascadeStoreDeletion**:
   - Delete a store with reviews, tags, and ratings
   - Verify all cascading deletions occur
   - Verify no orphaned records remain

2. **CascadeUserDeletion**:
   - Delete a user with reviews and localization
   - Verify all cascading deletions occur
   - Verify no orphaned records remain

3. **AggregateReviewRating**:
   - Create a review
   - Verify rating is updated automatically
   - Verify reviewCount is incremented

4. **AdjustRatingOnReviewDeletion**:
   - Delete a review
   - Verify rating is adjusted automatically
   - Verify reviewCount is decremented

## Implementation Order

1. **Implement query methods first** (needed by sync `where` clauses)
   - `_getUserById`
   - `_getReviewById`
   - `_getStore`
   - `_getRating`
   - `_getStoresByTag`
   - `_getReviewsForStore`
   - `_getReviewsByUser`

2. **Implement cascading deletion methods** (needed by cascade syncs)
   - `deleteReviewsForStore`
   - `deleteReviewsByUser`
   - `deleteRatingForStore`
   - `deleteTagsForStore`
   - `clearUserLanguage`

3. **Modify deleteReview** (needed by `AdjustRatingOnReviewDeletion` sync)
   - Get review data before deletion
   - Return `{ storeId, rating }` on success

4. **Test all syncs** with the new methods

## Files to Update

### Backend Repository

1. **Review Concept** (`src/concepts/ReviewConcept.ts`):
   - Add new methods
   - Modify `deleteReview`

2. **User Concept** (`src/concepts/UserConcept.ts`):
   - Add `_getUserById`

3. **Store Concept** (`src/concepts/StoreConcept.ts`):
   - Add `_getStore`
   - Verify `deleteStore` exists and returns correct type

4. **Rating Concept** (`src/concepts/RatingConcept.ts`):
   - Add `deleteRatingForStore`
   - Add `_getRating`

5. **Tagging Concept** (`src/concepts/TaggingConcept.ts`):
   - Add `deleteTagsForStore`
   - Add `_getStoresByTag`

6. **Localization Concept** (`src/concepts/LocalizationConcept.ts`):
   - Add `clearUserLanguage`

7. **Sync Files** (`src/syncs/*.sync.ts`):
   - Copy from frontend repository
   - Test with actual backend

8. **Passthrough Configuration** (`passthrough.ts`):
   - Update with correct inclusions/exclusions
   - Test route configuration

## Verification Steps

1. ✅ All new methods implemented
2. ✅ `deleteReview` modified to return review data
3. ✅ All methods return correct types
4. ✅ Error handling is consistent
5. ✅ Syncs are registered and working
6. ✅ Passthrough configuration is correct
7. ✅ All syncs fire correctly
8. ✅ Cascading deletions work
9. ✅ Aggregation syncs work
10. ✅ Frontend still works with backend

# Required Backend Method Implementations

## Review Concept - Additional Methods Needed

Based on the sync requirements and the backend pattern, here are the methods that need to be added to the `ReviewConcept` class:

### 1. `deleteReviewsForStore`

```typescript
/**
 * deleteReviewsForStore(storeId: String): {} | { error: String }
 *
 * requires:
 *   The `storeId` must exist (conceptually).
 * effects:
 *   Removes all `Review` records associated with the specified `storeId`.
 *   This action is typically invoked by a synchronization (CascadeStoreDeletion).
 * returns:
 *   {} on success (even if no reviews were found to delete)
 *   { error } if an error occurs
 */
async deleteReviewsForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.reviewsCollection.deleteMany({ storeId: storeId });
    // Even if no documents were deleted, it's still considered success
    // (the store may not have had any reviews)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting reviews for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### 2. `deleteReviewsByUser`

```typescript
/**
 * deleteReviewsByUser(userId: String): {} | { error: String }
 *
 * requires:
 *   The `userId` must exist (conceptually).
 * effects:
 *   Removes all `Review` records created by the specified `userId`.
 *   This action is typically invoked by a synchronization (CascadeUserDeletion).
 * returns:
 *   {} on success (even if no reviews were found to delete)
 *   { error } if an error occurs
 */
async deleteReviewsByUser({ userId }: { userId: User }): Promise<Empty | { error: string }> {
  try {
    const result = await this.reviewsCollection.deleteMany({ userId: userId });
    // Even if no documents were deleted, it's still considered success
    // (the user may not have created any reviews)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting reviews by user '${userId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### 3. `_getReviewById` (Query Method)

```typescript
/**
 * _getReviewById(reviewId: String): ReviewDoc | null
 *
 * requires:
 *   None (query method, returns null if not found)
 * effects:
 *   Returns the full review document if found, null otherwise.
 *   This is a query method used by syncs for validation and data retrieval.
 * returns:
 *   ReviewDoc if found
 *   null if not found or on error
 */
async _getReviewById({ reviewId }: { reviewId: ID }): Promise<ReviewDoc | null> {
  try {
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    return review || null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting review '${reviewId}': ${message}`);
    return null; // Return null on error for queries
  }
}
```

### 4. `_getReviewsForStore` (Query Method)

```typescript
/**
 * _getReviewsForStore(storeId: String): Set<ID>
 *
 * effects:
 *   Returns a set of all `reviewId`s associated with the specified `storeId`.
 *   This is a query method used by syncs for data retrieval.
 * returns:
 *   Set<ID> of review IDs (empty set if none found or on error)
 */
async _getReviewsForStore({ storeId }: { storeId: Store }): Promise<Set<ID>> {
  try {
    const reviews = await this.reviewsCollection.find(
      { storeId: storeId },
      { projection: { _id: 1 } } // Only retrieve the _id (reviewId)
    ).toArray();

    return new Set<ID>(reviews.map((r) => r._id));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting reviews for store '${storeId}': ${message}`);
    return new Set<ID>(); // Return empty set on error
  }
}
```

### 5. `_getReviewsByUser` (Query Method)

```typescript
/**
 * _getReviewsByUser(userId: String): Set<ID>
 *
 * effects:
 *   Returns a set of all `reviewId`s created by the specified `userId`.
 *   This is a query method used by syncs for data retrieval.
 * returns:
 *   Set<ID> of review IDs (empty set if none found or on error)
 */
async _getReviewsByUser({ userId }: { userId: User }): Promise<Set<ID>> {
  try {
    const reviews = await this.reviewsCollection.find(
      { userId: userId },
      { projection: { _id: 1 } } // Only retrieve the _id (reviewId)
    ).toArray();

    return new Set<ID>(reviews.map((r) => r._id));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting reviews by user '${userId}': ${message}`);
    return new Set<ID>(); // Return empty set on error
  }
}
```

## Similar Patterns for Other Concepts

### User Concept

```typescript
/**
 * _getUserById(userId: String): { username: String, email: String, creationDate: Date } | null
 *
 * effects:
 *   Returns non-sensitive user information if found, null otherwise.
 *   This is a query method used by syncs for validation.
 * returns:
 *   User data object if found
 *   null if not found or on error
 */
async _getUserById({ userId }: { userId: ID }): Promise<{ username: string, email: string, creationDate: Date } | null> {
  try {
    const user = await this.usersCollection.findOne(
      { _id: userId },
      { projection: { username: 1, email: 1, creationDate: 1 } } // Only non-sensitive fields
    );
    return user ? {
      username: user.username,
      email: user.email,
      creationDate: user.creationDate
    } : null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting user '${userId}': ${message}`);
    return null;
  }
}
```

### Store Concept

```typescript
/**
 * _getStore(storeId: String): { name: String, address: String } | null
 */
async _getStore({ storeId }: { storeId: ID }): Promise<{ name: string, address: string } | null> {
  try {
    const store = await this.storesCollection.findOne(
      { _id: storeId },
      { projection: { name: 1, address: 1 } }
    );
    return store ? { name: store.name, address: store.address } : null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting store '${storeId}': ${message}`);
    return null;
  }
}

/**
 * deleteStore(storeId: String): {} | { error: String }
 */
async deleteStore({ storeId }: { storeId: ID }): Promise<Empty | { error: string }> {
  try {
    const result = await this.storesCollection.deleteOne({ _id: storeId });
    if (result.deletedCount === 1) {
      return {};
    } else {
      return { error: `Store with ID '${storeId}' not found.` };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Rating Concept

```typescript
/**
 * deleteRatingForStore(storeId: String): {} | { error: String }
 */
async deleteRatingForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.ratingsCollection.deleteOne({ storeId: storeId });
    // Even if no document was deleted, it's still considered success
    // (the store may not have had a rating record)
    return {};
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting rating for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}

/**
 * _getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number } | null
 */
async _getRating({ storeId }: { storeId: Store }): Promise<{ aggregatedRating: number, reviewCount: number } | null> {
  try {
    const rating = await this.ratingsCollection.findOne({ storeId: storeId });
    return rating ? {
      aggregatedRating: rating.aggregatedRating,
      reviewCount: rating.reviewCount
    } : null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting rating for store '${storeId}': ${message}`);
    return null;
  }
}
```

### Tagging Concept

```typescript
/**
 * deleteTagsForStore(storeId: String): {} | { error: String }
 */
async deleteTagsForStore({ storeId }: { storeId: Store }): Promise<Empty | { error: string }> {
  try {
    const result = await this.taggingsCollection.deleteMany({ storeId: storeId });
    return {}; // Success even if no tags were found
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting tags for store '${storeId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}

/**
 * _getStoresByTag(tag: String): Set<ID>
 */
async _getStoresByTag({ tag }: { tag: string }): Promise<Set<ID>> {
  try {
    const taggings = await this.taggingsCollection.find(
      { tags: tag }, // Assuming tags is an array field
      { projection: { storeId: 1 } }
    ).toArray();
    return new Set<ID>(taggings.map((t) => t.storeId));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error getting stores by tag '${tag}': ${message}`);
    return new Set<ID>();
  }
}
```

### Localization Concept

```typescript
/**
 * clearUserLanguage(userId: String): {} | { error: String }
 */
async clearUserLanguage({ userId }: { userId: User }): Promise<Empty | { error: string }> {
  try {
    const result = await this.localizationsCollection.deleteOne({ userId: userId });
    return {}; // Success even if no language setting was found
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error clearing language for user '${userId}': ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

## Key Implementation Patterns

### 1. Action Methods (create, delete, update)
- Return `{ result } | { error: string }`
- Never throw exceptions
- Return `{}` for successful deletions (even if nothing was deleted)

### 2. Query Methods (prefixed with `_`)
- Return data directly or `null`
- Return empty collections (`Set<ID>()`) on error
- Never throw exceptions

### 3. Cascading Deletion Methods
- Return `{}` on success (even if no records were found)
- Use `deleteMany` for bulk deletions
- Handle errors gracefully

### 4. Error Handling
- Always catch errors and return structured error objects
- Log errors for debugging
- Return user-friendly error messages

# Final Sync Implementation Guide

## Overview

This guide provides the complete, final sync implementations adjusted to match the actual backend concept implementation patterns.

## Key Backend Patterns

### Return Types
- **Actions (create/update)**: `{ result: ID } | { error: string }`
- **Actions (delete)**: `{} | { error: string }` OR `{ data } | { error: string }` (for deleteReview)
- **Queries**: Return data directly (`ReviewDoc | null`, `Set<ID>`, etc.)

### Error Handling
- Never throw exceptions
- Always return structured error objects: `{ error: string }`
- Queries return `null` or empty collections on error

## Critical Backend Modifications Required

### 1. Review Concept - Modify deleteReview

**Current Implementation:**
```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<Empty | { error: string }> {
  // ... deletes and returns {}
}
```

**Required Modification:**
```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // FIRST: Get the review data BEFORE deletion
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    const { storeId, rating } = review;
    
    // THEN: Delete the review
    await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    // RETURN: The data needed for AdjustRatingOnReviewDeletion sync
    return { storeId, rating };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { error: `Internal server error: ${message}` };
  }
}
```

**Why**: The `AdjustRatingOnReviewDeletion` sync needs the review's `storeId` and `rating` to adjust the aggregated rating. Once the review is deleted, this data is lost, so we must return it before deletion.

## Passthrough Configuration

Based on the sync requirements, here's the final `passthrough.ts` configuration:

```typescript
export const inclusions: Record<string, string> = {
  // User Concept - Queries and Reads
  "/api/User/_getUserById": "Public query for sync validation",
  "/api/User/getUserById": "Public read operation",
  
  // Store Concept - Queries and Reads
  "/api/Store/_getStore": "Public query for sync queries",
  "/api/Store/_getStoresByName": "Public query",
  "/api/Store/_getStoresByAddress": "Public query",
  "/api/Store/getStore": "Public read operation",
  "/api/Store/listStores": "Public read operation",
  "/api/Store/getStoreById": "Public read operation",
  
  // Review Concept - Queries and Reads
  "/api/Review/_getReviewById": "Public query for sync queries",
  "/api/Review/_getReviewsForStore": "Public query",
  "/api/Review/_getReviewsByUser": "Public query",
  "/api/Review/getReviewsForStore": "Public read operation",
  "/api/Review/listReviewsForStore": "Public read operation",
  "/api/Review/getReviewsByUser": "Public read operation",
  "/api/Review/listReviewsByUser": "Public read operation",
  
  // Rating Concept - Queries and Reads
  "/api/Rating/_getRating": "Public query for sync queries",
  "/api/Rating/getRating": "Public read operation",
  
  // Tagging Concept - Queries and Reads
  "/api/Tagging/_getStoresByTag": "Public query for sync queries",
  "/api/Tagging/getStoresByTag": "Public read operation",
  "/api/Tagging/listTagsForStore": "Public read operation",
  "/api/Tagging/removeTag": "Public action (no validation needed)",
  
  // Localization Concept - Reads
  "/api/Localization/getLanguage": "Public read operation",
  
  // Internal Actions (called by syncs, not directly from HTTP)
  "/api/Review/deleteReviewsForStore": "Internal action for CascadeStoreDeletion sync",
  "/api/Review/deleteReviewsByUser": "Internal action for CascadeUserDeletion sync",
  "/api/Rating/updateRating": "Internal action for aggregation syncs",
  "/api/Rating/deleteRatingForStore": "Internal action for CascadeStoreDeletion sync",
  "/api/Tagging/deleteTagsForStore": "Internal action for CascadeStoreDeletion sync",
  "/api/Localization/clearUserLanguage": "Internal action for CascadeUserDeletion sync",
};

export const exclusions: Array<string> = [
  // User Concept - Handled by syncs
  "/api/User/registerUser",
  "/api/User/authenticateUser",
  "/api/User/updateUserEmail",
  "/api/User/deleteUser",
  
  // Store Concept - Handled by syncs
  "/api/Store/createStore",
  "/api/Store/deleteStore",
  
  // Review Concept - Handled by syncs
  "/api/Review/createReview",
  "/api/Review/deleteReview",
  
  // Tagging Concept - Handled by syncs
  "/api/Tagging/addTag",
  
  // Localization Concept - Handled by syncs
  "/api/Localization/setLanguage",
];
```

## Sync Implementation Summary

### Request-Response Syncs

All request-response syncs follow the same pattern:
1. **Request Sync**: Detects HTTP request, invokes concept action
2. **Response Success Sync**: Matches on success output (`{ result }`), sends response
3. **Response Error Sync**: Matches on error output (`{ error }`), sends error response

### Aggregation Syncs

1. **AggregateReviewRating**: 
   - Triggers on `Review.createReview` success
   - Captures `storeId` and `rating` from input parameters
   - Calls `Rating.updateRating` with contribution

2. **AdjustRatingOnReviewDeletion**:
   - Triggers on `Review.deleteReview` success
   - **REQUIRES**: `deleteReview` returns `{ storeId, rating }` before deletion
   - Calls `Rating.updateRating` with negative contribution

### Cascading Deletion Syncs

1. **CascadeUserDeletion**:
   - Triggers on `User.deleteUser` success
   - Calls `Review.deleteReviewsByUser` and `Localization.clearUserLanguage`

2. **CascadeStoreDeletion**:
   - Triggers on `Store.deleteStore` success
   - Calls `Tagging.deleteTagsForStore`, `Review.deleteReviewsForStore`, `Rating.deleteRatingForStore`

### Validation Syncs

1. **CreateReviewRequest**:
   - Validates user exists before allowing review creation
   - Uses `where` clause with `User._getUserById` query

2. **SetLanguageRequest**:
   - Optionally validates user exists before setting language
   - Uses `where` clause with `User._getUserById` query

## Implementation Checklist

### Backend Implementation

- [ ] Implement all query methods (`_get*`)
- [ ] Implement all cascading deletion methods
- [ ] Modify `deleteReview` to return review data
- [ ] Test all new methods
- [ ] Copy sync files to backend repository
- [ ] Register syncs in backend
- [ ] Configure passthrough.ts
- [ ] Test all syncs

### Frontend Verification

- [ ] Verify error handling works correctly
- [ ] Test user registration/login
- [ ] Test review creation/deletion
- [ ] Test store creation/deletion
- [ ] Test rating aggregation
- [ ] Test cascading deletions
- [ ] Verify data refresh after mutations

## Important Notes

1. **Review Deletion**: The `deleteReview` method MUST be modified to return `{ storeId, rating }` before deletion. This is critical for the `AdjustRatingOnReviewDeletion` sync to work.

2. **Query Return Types**: Query methods return data directly:
   - `_getReviewById` returns `ReviewDoc | null`
   - `_getStoresByTag` returns `Set<ID>`
   - `_getUserById` returns user data object or `null`

3. **Frame Query API**: The exact frame query API may vary based on the sync engine. The syncs are written conceptually and may need adjustment based on actual sync engine capabilities.

4. **Error Handling**: All syncs properly handle error cases by matching on `{ error }` in action outputs.

5. **Passthrough Configuration**: The passthrough configuration is critical - excluded routes go through syncs, included routes are direct pass-through.

## Testing Strategy

1. **Unit Test Each Sync**:
   - Test request syncs fire correctly
   - Test response syncs format correctly
   - Test aggregation syncs update ratings
   - Test cascading deletion syncs clean up data

2. **Integration Test Flows**:
   - User registration → login → create review → delete user
   - Create store → add tag → create review → delete store
   - Create review → verify rating → delete review → verify rating adjusted

3. **Edge Cases**:
   - Create review with non-existent user (should fail)
   - Delete store with no reviews (should succeed)
   - Delete review that doesn't exist (should return error)

## Files Reference

- **Sync Specifications**: `src/syncs/*.sync.ts`
- **Concept Specifications**: `concept-spec.md`
- **Backend Method Implementations**: `BACKEND_METHOD_IMPLEMENTATIONS.md`
- **Passthrough Configuration**: `passthrough.ts.example`
- **Implementation Checklist**: `BACKEND_IMPLEMENTATION_CHECKLIST.md`

All syncs are ready for backend implementation and have been adjusted to match the backend concept patterns.

# Sync Implementation Guide

## Review of LLM Suggestions

The sync suggestions provided are **appropriate and well-structured**. They follow the Concept Design principles:

✅ **Appropriate Patterns**:
- Request-response syncs for HTTP handling
- Cascading deletions for data integrity
- Pre-condition validation using `where` clauses
- Aggregation syncs for derived data
- Query orchestration for complex features

✅ **Well-Organized**:
- Syncs are grouped by concept/feature area
- Clear separation of concerns
- Good documentation and justification

⚠️ **Considerations**:
- The sync syntax assumes a specific backend engine structure
- Some patterns (like `AdjustRatingOnReviewDeletion`) may need adjustment based on actual sync engine capabilities
- The query orchestration pattern may need optimization in production

## Implementation Status

### ✅ Completed

1. **Concept Specifications Updated** (`concept-spec.md`):
   - Added new actions for cascading deletions
   - Added query methods (prefixed with `_`)
   - Updated action descriptions to note sync dependencies

2. **Sync Specifications Created** (`src/syncs/`):
   - `user_auth.sync.ts` - User authentication and registration
   - `stores.sync.ts` - Store management
   - `reviews.sync.ts` - Review management and rating aggregation
   - `tagging.sync.ts` - Tagging and query orchestration
   - `localization.sync.ts` - Localization management

3. **Documentation Created**:
   - `src/syncs/README.md` - Sync system overview
   - `SYNC_IMPLEMENTATION_SUMMARY.md` - Implementation summary
   - This guide

### 🔄 Next Steps (Backend)

1. **Update Backend Repository**:
   ```bash
   # In your backend repository
   # Copy sync files from frontend/src/syncs/ to backend/src/syncs/
   ```

2. **Implement New Concept Actions**:
   - Add query methods (`_getUserById`, `_getStore`, etc.)
   - Add cascading deletion methods (`deleteReviewsByUser`, etc.)
   - Ensure these methods are properly exported

3. **Configure Action Inclusion/Exclusion**:
   - Mark actions as "excluded" that should be handled by syncs
   - Keep query actions and read operations as "included"

4. **Register Syncs**:
   - Import all sync files in your sync registration file
   - Ensure syncs are loaded when the server starts

5. **Test Syncs**:
   - Test each request-response flow
   - Verify cascading deletions
   - Test pre-condition validation
   - Verify aggregation syncs

### 🔄 Frontend Considerations

The frontend should **continue to work** with minimal changes because:
- HTTP endpoints remain the same
- Request/response formats are unchanged
- Error handling patterns are consistent

However, you may want to:
1. Test all endpoints after backend sync implementation
2. Verify error messages are still handled correctly
3. Ensure authentication flows work with sync-based validation

## Action Inclusion/Exclusion Configuration

### Actions to EXCLUDE (handled by syncs)

```typescript
// These should be excluded in backend configuration
excluded: [
  "/User/registerUser",
  "/User/authenticateUser",
  "/Review/createReview",
  "/Store/createStore",
  "/Tagging/addTag",
  "/Localization/setLanguage",
]
```

### Actions to INCLUDE (direct pass-through)

```typescript
// These should remain included
included: [
  // Query actions
  "/User/_getUserById",
  "/Store/_getStore",
  "/Review/_getReviewById",
  "/Review/_getReviewsForStore",
  "/Review/_getReviewsByUser",
  "/Rating/_getRating",
  "/Tagging/_getStoresByTag",
  
  // Read operations
  "/User/getUserById",
  "/Store/getStore",
  "/Store/listStores",
  "/Store/getStoreById",
  "/Review/getReviewsForStore",
  "/Review/getReviewsByUser",
  "/Review/listReviewsForStore",
  "/Review/listReviewsByUser",
  "/Rating/getRating",
  "/Tagging/listTagsForStore",
  
  // Actions only called by syncs (internal)
  "/Review/deleteReviewsForStore",
  "/Review/deleteReviewsByUser",
  "/Rating/updateRating",
  "/Rating/deleteRatingForStore",
  "/Tagging/deleteTagsForStore",
  "/Localization/clearUserLanguage",
]
```

## Testing Strategy

### Unit Tests for Syncs

Test each sync individually:
1. **Request Syncs**: Verify they translate HTTP requests to concept actions
2. **Response Syncs**: Verify they format responses correctly
3. **Cascading Syncs**: Verify they trigger all necessary deletions
4. **Aggregation Syncs**: Verify they update derived data correctly
5. **Validation Syncs**: Verify they prevent invalid actions

### Integration Tests

Test complete flows:
1. User registration → login → create review → delete user
2. Create store → add tag → create review → delete store
3. Create review → verify rating updated → delete review → verify rating adjusted

### Edge Cases

Test edge cases:
1. Create review with non-existent user (should fail)
2. Delete store with reviews (should cascade)
3. Delete user with reviews (should cascade)
4. Create review for non-existent store (should fail)
5. Delete review and verify rating adjustment

## Potential Issues and Solutions

### Issue 1: Review Deletion Rating Adjustment

**Problem**: The `AdjustRatingOnReviewDeletion` sync needs the review's rating before deletion, but deletion removes the data.

**Solution**: 
- Option A: The sync engine may provide access to the action's input/output frames
- Option B: Query the review before deletion in the `where` clause
- Option C: Store rating in the deletion action's output frame

### Issue 2: Query Orchestration Performance

**Problem**: `GetStoresByTagResponse` re-runs all queries, which may be inefficient.

**Solution**:
- Optimize if the sync engine guarantees frame persistence
- Consider caching if queries are expensive
- Use a single query sync if the engine supports it

### Issue 3: Error Handling

**Problem**: Syncs need to handle errors gracefully.

**Solution**:
- Ensure all syncs have error response handlers
- Test error cases thoroughly
- Log sync failures for debugging

## Migration Checklist

- [ ] Copy sync files to backend repository
- [ ] Implement new concept actions (queries, cascading deletions)
- [ ] Configure action inclusion/exclusion
- [ ] Register syncs in backend
- [ ] Test each sync individually
- [ ] Test complete user flows
- [ ] Verify frontend still works
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Update API documentation if needed
- [ ] Deploy and test in production

## Questions to Resolve

1. **Sync Engine Capabilities**: 
   - How does the sync engine handle `where` clauses?
   - Can we access action input/output in syncs?
   - How are frames passed between syncs?

2. **Performance**:
   - Are there performance implications of the query orchestration pattern?
   - Should we optimize certain syncs?

3. **Error Handling**:
   - How are sync errors propagated?
   - What happens if a cascading deletion fails?

## Conclusion

The sync specifications are well-designed and follow Concept Design principles. The main work remaining is:
1. Implementing the new concept actions
2. Configuring the backend to use these syncs
3. Testing thoroughly
4. Deploying and monitoring

The frontend should require minimal changes, making this a relatively low-risk migration.

# Sync Adjustments Summary

## Changes Made Based on Backend Implementation

### 1. Return Type Adjustments

All syncs have been updated to match the backend's return type patterns:

**Actions:**
- Success: `{ reviewId: ID }`, `{ userId: ID }`, `{ storeId: ID }`
- Error: `{ error: string }`
- Deletion Success: `{}` (empty object) or `{ storeId, rating }` (for deleteReview)

**Queries:**
- Success: Returns data directly (e.g., `ReviewDoc | null`, `Set<ID>`)
- Error: Returns `null` or empty collections

### 2. Response Sync Updates

All response syncs now correctly match:
- Success cases: Match when output contains `{ reviewId }`, `{ userId }`, etc.
- Error cases: Match when output contains `{ error }`

### 3. Aggregation Sync Updates

**AggregateReviewRating:**
- Now captures `storeId` and `rating` from input parameters
- These are available in the action input, not output

**AdjustRatingOnReviewDeletion:**
- **CRITICAL CHANGE**: Requires backend modification
- `deleteReview` should return `{ storeId, rating }` before deletion
- This allows the sync to access review data that would be lost after deletion
- Alternative approaches documented in `SYNC_ENGINE_REQUIREMENTS.md`

### 4. Cascading Deletion Updates

All cascading deletion syncs now expect:
- Input actions return `{}` on success
- Cascading actions also return `{}` on success (even if no records found)

## Required Backend Modifications

### Review Concept

1. **Add `deleteReviewsForStore` method** (for CascadeStoreDeletion)
2. **Add `deleteReviewsByUser` method** (for CascadeUserDeletion)
3. **Add `_getReviewById` query method** (for sync where clauses)
4. **Add `_getReviewsForStore` query method** (for sync queries)
5. **Add `_getReviewsByUser` query method** (for sync queries)
6. **Modify `deleteReview` method** (to return `{ storeId, rating }` before deletion)

### Other Concepts

Similar methods needed for:
- User: `_getUserById`
- Store: `_getStore`, `deleteStore` (if not already exists)
- Rating: `deleteRatingForStore`, `_getRating`
- Tagging: `deleteTagsForStore`, `_getStoresByTag`
- Localization: `clearUserLanguage`

## Implementation Files Created

1. **BACKEND_CONCEPT_REQUIREMENTS.md** - Analysis of backend patterns and requirements
2. **BACKEND_METHOD_IMPLEMENTATIONS.md** - Complete method implementations for all concepts
3. **SYNC_ENGINE_REQUIREMENTS.md** - Sync engine capabilities and timing issues
4. **SYNC_ADJUSTMENTS_SUMMARY.md** - This file

## Key Decisions

### Review Deletion Timing

**Decision**: Modify `deleteReview` to return `{ storeId, rating }` before deletion.

**Rationale**:
- Simplest and most reliable solution
- Doesn't depend on sync engine capabilities
- Clear and explicit
- No timing issues

**Alternative**: If sync engine supports querying before action execution, use `where` clause (see `SYNC_ENGINE_REQUIREMENTS.md`).

## Next Steps

1. **Implement backend methods** (see `BACKEND_METHOD_IMPLEMENTATIONS.md`)
2. **Modify `deleteReview`** to return review data before deletion
3. **Test syncs** with the updated backend
4. **Verify timing** for `AdjustRatingOnReviewDeletion` sync
5. **Update passthrough.ts** (already done)

## Testing Checklist

- [ ] Test `deleteReview` returns `{ storeId, rating }` correctly
- [ ] Test `AdjustRatingOnReviewDeletion` sync fires correctly
- [ ] Test rating adjustment works correctly after deletion
- [ ] Test all cascading deletion methods return `{}` correctly
- [ ] Test all query methods return correct types
- [ ] Test error handling in all syncs

# Sync Engine Requirements and Considerations

## Critical Issue: Review Deletion Timing

### Problem

The `AdjustRatingOnReviewDeletion` sync needs the review's `storeId` and `rating` to adjust the aggregated rating. However, once `Review.deleteReview` is called, the review no longer exists, so we can't query it afterward.

### Solution Options

#### Option 1: Query Before Deletion (Recommended if supported)

If the sync engine supports executing `where` clauses **before** the action in the `when` clause, we can query the review before deletion:

```typescript
export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating }) => ({
    when: actions([
        Review.deleteReview,
        { reviewId },
        {}, // Success output
    ]),
    where: async (frames) => {
        // CRITICAL: Query the review BEFORE deletion
        // The sync engine must execute this BEFORE the deleteReview action
        const review = await frames.query(Review._getReviewById, { reviewId }, {});
        if (!review) return frames; // Review doesn't exist
        return frames.bind({ storeId: review.storeId, rating: review.rating });
    },
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: -rating, weight: -1 } },
    ]),
});
```

**Requirement**: Sync engine must execute `where` clause **before** executing the action in `when`.

#### Option 2: Two-Step Sync Pattern

If the sync engine doesn't support querying before deletion, use two syncs:

1. **Sync 1**: Query review when deletion is requested, store data temporarily
2. **Sync 2**: After deletion, use stored data to adjust rating

This requires a temporary storage mechanism (not ideal).

#### Option 3: Modify deleteReview to Return Review Data

Modify the backend `deleteReview` method to return the review data before deletion:

```typescript
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // First, get the review data
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    // Store the data we need
    const { storeId, rating } = review;
    
    // Then delete the review
    await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    // Return the data needed for syncs
    return { storeId, rating };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { error: `Internal server error: ${message}` };
  }
}
```

Then the sync becomes:

```typescript
export const AdjustRatingOnReviewDeletion: Sync = ({ reviewId, storeId, rating }) => ({
    when: actions([
        Review.deleteReview,
        { reviewId },
        { storeId, rating }, // Review data returned from deleteReview
    ]),
    then: actions([
        Rating.updateRating,
        { storeId, contribution: { rating: -rating, weight: -1 } },
    ]),
});
```

**Recommendation**: Use Option 3 if the sync engine doesn't support Option 1. This is the most straightforward and reliable approach.

## Sync Engine Capabilities Needed

### 1. Action Return Type Matching

The sync engine must support matching on action outputs:
- Success: `{ reviewId }`, `{ userId }`, `{ storeId }`, etc.
- Error: `{ error: string }`

### 2. Input Parameter Access

The sync engine must allow access to input parameters in aggregation syncs:
- `AggregateReviewRating` needs `storeId` and `rating` from input
- These are not in the output, so we need input access

### 3. Query Execution in `where` Clauses

The sync engine must support:
- Querying other concepts in `where` clauses
- Returning `null` or empty frames if query fails
- Binding query results to frame variables

### 4. Frame Binding

The sync engine must support:
- Binding variables to frames: `frames.bind({ storeId, rating })`
- Accessing bound variables in `then` clauses
- Passing bound variables between syncs

### 5. Action Execution Order

For `AdjustRatingOnReviewDeletion`:
- If Option 1: Execute `where` clause BEFORE action
- If Option 3: No special ordering needed (data in output)

## Updated Sync Specifications

Based on the backend implementation pattern, I've updated all syncs to:

1. **Match return types correctly**:
   - Success: `{ reviewId }`, `{ userId }`, `{ storeId }`
   - Error: `{ error: string }`
   - Empty: `{}` for successful deletions

2. **Handle input parameters**:
   - `AggregateReviewRating` captures `storeId` and `rating` from input
   - These are available in the action input parameters

3. **Document timing issues**:
   - `AdjustRatingOnReviewDeletion` has a timing issue that needs resolution
   - Recommend Option 3 (modify `deleteReview` to return data)

## Backend Method Requirements

### Review Concept - Modified Method

```typescript
/**
 * deleteReview(reviewId: String): { storeId: String, rating: Number } | { error: String }
 *
 * REQUIRED MODIFICATION: Return review data before deletion for sync use
 *
 * requires:
 *   The `reviewId` must exist.
 * effects:
 *   Deletes the specified `Review` record.
 *   Returns the storeId and rating before deletion (for sync use).
 * returns:
 *   { storeId, rating } on success (data returned before deletion)
 *   { error } if the review does not exist or an error occurs
 */
async deleteReview({ reviewId }: { reviewId: ID }): Promise<{ storeId: Store, rating: number } | { error: string }> {
  try {
    // First, get the review data (needed for syncs)
    const review = await this.reviewsCollection.findOne({ _id: reviewId });
    if (!review) {
      return { error: `Review with ID '${reviewId}' not found.` };
    }
    
    // Store the data we need for syncs
    const { storeId, rating } = review;
    
    // Then delete the review
    const result = await this.reviewsCollection.deleteOne({ _id: reviewId });
    
    if (result.deletedCount === 1) {
      // Return the data needed for AdjustRatingOnReviewDeletion sync
      return { storeId, rating };
    } else {
      // This shouldn't happen since we checked above, but handle it
      return { error: `Review with ID '${reviewId}' not found.` };
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`Error deleting review: ${message}`);
    return { error: `Internal server error: ${message}` };
  }
}
```

### Alternative: Keep Original deleteReview, Use Query in Sync

If you prefer not to modify `deleteReview`, the sync engine must support querying BEFORE the action executes. This requires:

1. Sync engine executes `where` clause before action
2. Query results are available in `then` clause
3. Action still executes normally

This is more complex and depends on sync engine capabilities.

## Recommendation

**Use Option 3**: Modify `deleteReview` to return review data. This is:
- ✅ Simplest to implement
- ✅ Most reliable (no timing issues)
- ✅ Doesn't depend on sync engine capabilities
- ✅ Clear and explicit

The modified `deleteReview` method returns the data needed for the sync, making the sync straightforward and reliable.

# Sync Implementation Summary

## Overview

This document summarizes the synchronization (sync) specifications that have been created for the backend implementation. These syncs define how concepts interact with each other and how HTTP requests are handled through the `Requesting` concept.

## Files Created

### 1. Concept Specifications
- **`concept-spec.md`**: Updated concept specifications with new actions needed for syncs:
  - Added query methods (prefixed with `_`) for sync `where` clauses
  - Added cascading deletion actions (e.g., `deleteReviewsByUser`, `deleteTagsForStore`)
  - Updated action descriptions to note sync dependencies

### 2. Sync Specification Files
All sync files are in `src/syncs/`:

- **`user_auth.sync.ts`**: User registration, authentication, and cascading user deletion
- **`stores.sync.ts`**: Store creation and cascading store deletion
- **`reviews.sync.ts`**: Review creation, rating aggregation, and review deletion handling
- **`tagging.sync.ts`**: Tag management and query orchestration
- **`localization.sync.ts`**: Language preference management

### 3. Documentation
- **`src/syncs/README.md`**: Comprehensive guide to the sync system

## Key Sync Patterns Implemented

### 1. Request-Response Flows
Each action that should be handled by syncs has three syncs:
- `*Request`: Translates HTTP request to concept action
- `*ResponseSuccess`: Handles successful responses
- `*ResponseError`: Handles error responses

**Example**: `UserRegistrationRequest`, `UserRegistrationResponseSuccess`, `UserRegistrationResponseError`

### 2. Cascading Deletions
Maintains data integrity when entities are deleted:
- `CascadeUserDeletion`: Deletes user's reviews and localization settings
- `CascadeStoreDeletion`: Deletes store's tags, reviews, and ratings

### 3. Pre-condition Validation
Uses `where` clauses to validate data before actions execute:
- `CreateReviewRequest`: Validates user exists before allowing review creation
- `SetLanguageRequest`: Validates user exists before setting language preference

### 4. Aggregation Syncs
Maintains derived data when source data changes:
- `AggregateReviewRating`: Updates rating aggregate when review is created
- `AdjustRatingOnReviewDeletion`: Adjusts rating aggregate when review is deleted

### 5. Query Orchestration
Combines data from multiple concepts:
- `GetStoresByTagRequest` & `GetStoresByTagResponse`: Gets stores by tag with ratings and details

## Actions to Exclude in Backend

These actions should be marked as "excluded" in the backend configuration (turned into `Requesting.request` actions):

1. `/User/registerUser` → Handled by `UserRegistrationRequest`
2. `/User/authenticateUser` → Handled by `UserAuthenticationRequest`
3. `/Review/createReview` → Handled by `CreateReviewRequest` (with user validation)
4. `/Store/createStore` → Handled by `CreateStoreRequest`
5. `/Tagging/addTag` → Handled by `AddTagRequest`
6. `/Localization/setLanguage` → Handled by `SetLanguageRequest`

## Actions to Include in Backend

These actions should remain "included" (direct pass-through):
- All query actions (prefixed with `_`)
- Most read operations that don't require special handling
- Actions that are only called by other syncs (not directly from HTTP)

## New Actions Added to Concepts

### User Concept
- `_getUserById`: Query method for sync validation

### Store Concept
- `_getStore`: Query method for sync queries

### Tagging Concept
- `deleteTagsForStore`: Cascading deletion action
- `_getStoresByTag`: Query method for sync queries

### Review Concept
- `deleteReviewsForStore`: Cascading deletion action
- `deleteReviewsByUser`: Cascading deletion action
- `_getReviewById`: Query method for sync queries
- `_getReviewsForStore`: Query method for sync queries
- `_getReviewsByUser`: Query method for sync queries

### Rating Concept
- `deleteRatingForStore`: Cascading deletion action
- `_getRating`: Query method for sync queries

### Localization Concept
- `clearUserLanguage`: Cascading deletion action

## Next Steps

### Backend Implementation
1. Copy sync files from `src/syncs/` to your backend repository
2. Update concept implementations to include new actions:
   - Query methods (prefixed with `_`)
   - Cascading deletion methods
3. Configure action inclusion/exclusion in backend
4. Register syncs in backend sync registration
5. Test each sync individually
6. Verify cascading deletions work correctly

### Frontend Updates
The frontend API client should continue to work as-is since the HTTP endpoints remain the same. However, you may want to:
1. Test that all endpoints still work correctly
2. Verify error handling works with new sync-based error responses
3. Update any direct concept action calls to use the Requesting concept paths

### Testing Checklist
- [ ] User registration flow
- [ ] User authentication flow
- [ ] Store creation flow
- [ ] Review creation (with user validation)
- [ ] Review deletion (rating adjustment)
- [ ] Store deletion (cascading to tags, reviews, ratings)
- [ ] User deletion (cascading to reviews, localization)
- [ ] Tag addition
- [ ] Language preference setting
- [ ] Query orchestration (stores by tag)

## Rationale

Moving syncs to the backend provides:
- **Security**: Sync logic cannot be bypassed by frontend modifications
- **Consistency**: All sync logic is centralized and organized
- **Maintainability**: Clear separation between concept logic and orchestration
- **Reliability**: Syncs are guaranteed to execute in the correct order

## Notes

- All sync files include `@ts-nocheck` because they're specifications that reference backend-only modules
- The sync syntax follows the pattern from the assignment instructions
- Query methods use the `_` prefix to distinguish them from actions
- Cascading deletion actions are typically only invoked by syncs, not directly from HTTP

## References

- Assignment instructions: Concept Design with Synchronizations
- Concept specifications: `concept-spec.md`
- Sync documentation: `src/syncs/README.md`

# The Role of Syncs and Frontend Impact

## What Are Syncs?

**Synchronizations (syncs)** are backend mechanisms that orchestrate how different concepts interact with each other and how HTTP requests are handled. They serve as the "glue" between concepts, ensuring data integrity, security, and proper application flow.

### Key Roles of Syncs

#### 1. **Request-Response Orchestration**
Syncs translate HTTP requests into concept actions and format responses back to the frontend.

**Example Flow:**
```
Frontend: POST /api/User/registerUser { username, email, password }
    ↓
Sync: UserRegistrationRequest detects the request
    ↓
Sync: Calls User.registerUser action
    ↓
Sync: UserRegistrationResponseSuccess formats response
    ↓
Frontend: Receives { userId } or { error }
```

**Why this matters:**
- The frontend sends the same HTTP request, but the backend now has centralized control
- Syncs can add validation, logging, or transformation before calling concept actions
- Error handling is consistent across all requests

#### 2. **Security and Validation**
Syncs enforce business rules that cannot be bypassed by frontend modifications.

**Example:**
- **CreateReviewRequest sync** validates that the user exists before allowing review creation
- Even if a malicious user tries to create a review with a fake `userId`, the sync's `where` clause will prevent it
- This validation happens on the backend, so it's secure

**Frontend Impact:**
- The frontend must handle error responses when validation fails
- Error messages from syncs should be user-friendly
- The frontend should display appropriate error states

#### 3. **Data Integrity (Cascading Deletions)**
Syncs ensure that when an entity is deleted, all related data is also cleaned up.

**Example:**
- When a user is deleted, `CascadeUserDeletion` sync automatically:
  - Deletes all reviews created by that user
  - Clears the user's language preferences
- This happens automatically, without the frontend needing to make multiple API calls

**Frontend Impact:**
- The frontend doesn't need to manually delete related data
- When deleting a user, the frontend only needs to call `deleteUser`
- The sync handles all cascading deletions automatically
- However, the frontend should refresh related data after deletions to reflect changes

#### 4. **Aggregation and Derived Data**
Syncs maintain derived data (like aggregated ratings) when source data changes.

**Example:**
- When a review is created, `AggregateReviewRating` sync automatically updates the store's aggregated rating
- When a review is deleted, `AdjustRatingOnReviewDeletion` sync adjusts the rating
- The frontend doesn't need to manually update ratings

**Frontend Impact:**
- The frontend should refresh rating data after creating or deleting reviews
- The frontend can trust that ratings are always up-to-date
- No need to manually calculate or update aggregated data

#### 5. **Query Orchestration**
Syncs can combine data from multiple concepts to create complex features.

**Example:**
- `GetStoresByTagRequest` and `GetStoresByTagResponse` syncs:
  - Query Tagging concept for stores with a tag
  - Query Store concept for store details
  - Query Rating concept for store ratings
  - Combine all data into a single response

**Frontend Impact:**
- The frontend gets complete data in a single request
- No need to make multiple API calls and combine data on the frontend
- Simpler frontend code and better performance

## How Frontend Code is Affected

### ✅ **What Stays the Same**

1. **HTTP Endpoints**: The frontend continues to call the same endpoints
   - `/api/User/registerUser`
   - `/api/User/authenticateUser`
   - `/api/Review/createReview`
   - `/api/Store/createStore`
   - etc.

2. **Request Formats**: Request bodies remain the same
   ```typescript
   // Frontend still sends:
   {
     username: "user123",
     email: "user@example.com",
     password: "password123"
   }
   ```

3. **Response Formats**: Response formats remain the same
   ```typescript
   // Frontend still receives:
   { userId: "user-id-123" }
   // or
   { error: "Username already exists" }
   ```

### ⚠️ **What Changes**

1. **Error Handling**: Errors may be more specific
   - Syncs can add validation that wasn't there before
   - Error messages may be different (but should be more helpful)
   - The frontend should handle these errors gracefully

2. **Data Consistency**: Data may update automatically
   - After creating a review, ratings update automatically
   - After deleting a user, their reviews are automatically deleted
   - The frontend should refresh data to reflect these changes

3. **Validation**: Some validations now happen on the backend
   - User existence is validated before creating reviews
   - The frontend should handle validation errors appropriately

### 🔧 **Frontend Components That Need Updates**

#### 1. **MyAccount.vue** (User Registration/Login)
**Current State:** ✅ Handles errors correctly
**Sync Impact:**
- User registration/login goes through syncs
- Errors are returned from syncs
- Need to ensure error messages are displayed properly

**Required Updates:**
- ✅ Already handles `userStore.error` correctly
- ✅ Already displays error messages
- ✅ Already handles loading states

#### 2. **StoreDetail.vue** (Review Creation)
**Current State:** ✅ Mostly correct, but needs improvement
**Sync Impact:**
- Review creation goes through `CreateReviewRequest` sync
- Sync validates user exists before creating review
- Rating updates automatically after review creation

**Required Updates:**
- ✅ Already handles errors correctly
- ✅ Already refreshes rating after review creation
- ⚠️ Should refresh rating after review deletion (currently missing)

#### 3. **MyAccount.vue** (Store Creation)
**Current State:** ✅ Handles errors correctly
**Sync Impact:**
- Store creation goes through `CreateStoreRequest` sync
- Cascading deletions handled by syncs

**Required Updates:**
- ✅ Already handles errors correctly
- ✅ Already handles loading states

#### 4. **StoreDetail.vue** (Review Deletion)
**Current State:** ⚠️ Needs update
**Sync Impact:**
- Review deletion triggers `AdjustRatingOnReviewDeletion` sync
- Rating is automatically adjusted
- Frontend should refresh rating after deletion

**Required Updates:**
- ⚠️ Should refresh rating after deleting a review
- ⚠️ Should handle errors from sync-based deletion

## Frontend Best Practices with Syncs

### 1. **Error Handling**
```typescript
try {
  const reviewId = await reviewStore.createReview(reviewData)
  if (reviewId) {
    // Success - refresh related data
    await loadRating()
    await loadReviews()
  }
} catch (err: any) {
  // Handle sync-based errors
  error.value = err.response?.data?.error || 'Failed to create review'
}
```

### 2. **Data Refresh After Mutations**
```typescript
// After creating a review
await reviewStore.createReview(reviewData)
await loadRating() // Refresh rating (updated by sync)
await loadReviews() // Refresh reviews list

// After deleting a review
await reviewStore.deleteReview(reviewId)
await loadRating() // Refresh rating (adjusted by sync)
await loadReviews() // Refresh reviews list
```

### 3. **User Validation Errors**
```typescript
// If user doesn't exist, sync will return error
const reviewId = await reviewStore.createReview(reviewData)
if (!reviewId) {
  // Check if it's a validation error
  if (reviewStore.error?.includes('user')) {
    // Redirect to login or show appropriate message
    router.push('/my-account')
  }
}
```

### 4. **Cascading Deletion Awareness**
```typescript
// When deleting a user, don't manually delete reviews
// The sync handles it automatically
await userStore.deleteUser(userId)
// Reviews are automatically deleted by CascadeUserDeletion sync
// Just refresh the UI
await loadUserData()
```

## Testing Frontend with Syncs

### Test Cases

1. **User Registration**
   - ✅ Test successful registration
   - ✅ Test duplicate username/email errors
   - ✅ Test validation errors

2. **Review Creation**
   - ✅ Test successful review creation
   - ✅ Test user validation (user must exist)
   - ✅ Test rating update after creation
   - ✅ Test error handling

3. **Review Deletion**
   - ✅ Test successful deletion
   - ✅ Test rating adjustment after deletion
   - ✅ Test error handling

4. **Store Deletion**
   - ✅ Test cascading deletion (tags, reviews, ratings)
   - ✅ Test error handling

5. **User Deletion**
   - ✅ Test cascading deletion (reviews, localization)
   - ✅ Test error handling

## Summary

**Syncs run on the backend** and provide:
- ✅ Security (validation cannot be bypassed)
- ✅ Data integrity (cascading deletions, aggregations)
- ✅ Consistency (centralized orchestration)
- ✅ Simplicity (frontend doesn't need complex logic)

**Frontend impact is minimal** because:
- ✅ HTTP endpoints stay the same
- ✅ Request/response formats stay the same
- ✅ Error handling patterns stay the same
- ⚠️ But: Need to refresh data after mutations
- ⚠️ But: Need to handle sync-based validation errors

**Frontend components are mostly ready**, but need:
- ✅ Ensure error messages are displayed
- ✅ Refresh data after mutations (especially ratings)
- ✅ Handle validation errors appropriately







