# 6.104 Assignment 4: Implementing Concepts

In this assignment, you'll begin creating your backend by implementing your concepts in TypeScript. You'll learn to use Context, a simple CLI tool and a new way to both collaborate with LLMs and drive your implementation through design.

# Setup (Prep)

## 0. Fork this repository

First, [fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo#forking-a-repository) this repository, and **rename** it to your desired project name, and give a description of your project.

## 1. Install Deno

[Install from Deno's website](https://deno.com)

Deno is a successor to Node.js (by the same creator, Ryan Dahl) that greatly simplifies tooling, is more secure by default, and is backwards-compatible with the larger ecosystem. Check out Deno's [extensive documentation](https://docs.deno.com/runtime/) for various helpful guides on a wide variety of common application needs and [integrations](https://docs.deno.com/examples/).

**Note:** when importing from `npm` packages, prefix with `npm:` as in: 
```typescript
import { MongoClient } from "npm:mongo"
```

For VSCode users, consider also installing the Deno [extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) and referring to the [docs](https://docs.deno.com/runtime/reference/vscode/) if you'd like to configure behavior.
## 2. Compile Context

To create a convenient binary, run the following command from the root of the directory:
```shell
deno compile -A --output ctx .ctx/context.ts
```

## 3. Setup Gemini

Copy or change `.env.template` to the environment file: `.env` and insert your Gemini API key:

```env
GEMINI_API_KEY=YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
```
You can choose any [models](https://ai.google.dev/gemini-api/docs/models) using `GEMINI_MODEL`, such as `gemini-2.5-flash-lite` for faster responses, or `gemini-2.5-pro` for higher quality.

You may also edit the `./geminiConfig.json` file to change the parameters according to any of the [GenerationConfig](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig) options, including turning on/off thinking, limiting tokens, etc.

## 4. Setup your MongoDB Atlas Cluster (free)

For this project, we'll be using MongoDB as the database. To get started, use either the slides or the instructions:
### Slides
[MongoDB Setup](https://docs.google.com/presentation/d/1DBOWIQ2AAGQPDRgmnad8wN9S9M955LcHYZQlnbu-QCs/edit?usp=sharing)
### Instructions
1. Create your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account.
2. When selecting a template, choose the __free__ option, M0.
4. At the Security Quickstart page, select how you want to authenticate your connection and keep the rest of the defaults. Make sure to allow access to all IPs as shown in [this slide](https://docs.google.com/presentation/d/1DBOWIQ2AAGQPDRgmnad8wN9S9M955LcHYZQlnbu-QCs/edit?usp=sharing).
5. Once created, click the __CONNECT__ button, select __driver__, and copy the srv connection string. If using username and password, the url should look something like this: `mongodb+srv://<username>:<password>@cluster0.p82ijqd.mongodb.net/?retryWrites=true&w=majority`. Make sure to replace username and password with your actual values.
6. Add your connection url (without `<` and `>`) to `MONGODB_URL=<connection url>` to your `.env` file. 
7. Give your database a name under `DB_NAME=<your database name>`.

## 5. Install Obsidian

[Obsidian](https://obsidian.md)

Obsidian is an open-source Markdown editor and personal knowledge management solution. The Context tool **does not** require use of Obsidian, and you may use any preferred editor, but we highly recommend using Obsidian to navigate your assignment and the generated context to write, view, and structure your prompts and design documents. 

### Link settings

This should be correctly set already, but under Obsidian -> Settings -> Files and links, make sure that:
1. `New link format` is set to `Relative path to file`
2. `Use [[Wikilinks]]` is disabled
3. `Detect all file extensions` is enabled (so you can easily view code and drop links to code files)

![](media/obsidian_settings.png)

# Exercise 0 

Context is a simple Markdown-based framework for building design knowledge and collaborating with an LLM. There is no additional syntax: any text-based repository with code of any language with documentation written as Markdown is compatible.

## 0. Note

**Important:** do not delete or modify anything from the `context` directory. Content is hashed by ID, meaning that corruption can be detected, but not recovered from automatically. This pairs nicely with git in case you mess up, so don't forget to commit once in a while!

## 1. Getting started with Context

Context allows you to treat any Markdown document as a conversation with an LLM: everything in the document is exactly what both you and the LLM sees. Each step is broken up by `# Heading 1` sections, and you should begin every new prompt or chunk of interesting information using a new section 1 heading. 

### Task:

In `design/brainstorming/questioning.md`, complete the `# prompt: Why ... ?` with your burning question for the universe. Then, from the root of the repository, run this command in the terminal (if you're using Obsidian, you should be able to copy the command by clicking on `Shell` in the top right):

```shell
./ctx prompt design/brainstorming/questioning.md
```

You should see any thinking appear in the terminal, with the rest of the completion streamed into the file. In general, you can `prompt` a LLM to chime in with 

```shell
./ctx prompt <path_to_file>.md
```

where `<path_to_file>` is also a link **relative to the root** of the repository.

## 2. Including context

You can **include** other documents to embed their contents, allowing you to compose exactly the context that you want. In Obsidian's file explorer on the left, expand the `design/background` and `design/learning` folders, then click on `understanding-concepts`. This should open a blank document.

### Task:

Drag and drop `concept-design-overview` into the body of `understanding-concepts`. This should show up as a normal link. Then, to make it a link that Context will include, simply add the `@` sign to the beginning of the link text (the part in the brackets), like so:

![](media/linking.png)

**Important:** includes should be on their own paragraph - make sure that there's an empty line between them and other content. 

Next, type `# question: ...` and fill in any question you have about concepts, then prompt through Context. 

**Tip:** you can easily get the relative link you need to paste into a terminal after `./ctx prompt` by right/ctrl clicking the file in the explorer directly:

![](media/relative_linking.png)

## 3. Viewing context

The `context` directory is an immutable and complete history of every file that the tool interacts with - this means that you shouldn't be afraid of editing or deleting files! This directory is a mirror of the rest of the repository, just nested one layer deeper. In addition, files such as `understanding-concepts.md` become a directory, as in `understanding-concepts.md/` and contain a timestamped version of its entire history. 

### Context folders

Each Markdown file within these directories have the format `timestamp.hash_id.md`, where the `hash_id` is a **content-based hash** that helps you identify, across the entire repository, usages of the same document or content. 

### Individual steps

Inside the `steps` directory one layer deeper are granular files of the form `step.hash_id.md` that contain all the unique steps (`# heading 1` blocks) ever present in the file. This helps identify at-a-glance what the contents of each document are, such as prompts or responses. By default, the `step` in the file name is a `_` character, unless the heading contains a prefix of the form `# prefix: ...`, which can be a useful way to break up a document (that you can follow yourself, or prompt an LLM to do so).

**Important:** this is the reason for the previous warning about not modifying the `context` directory. The content-based hashes means we can detect such edits/deletes, but the more important point is that you keep a legible history of your design choices and explorations (which can be invaluable for prompting!)

### Task:

1. Consider again `design/brainstorming/questioning`, and **find** the version of the document in `context` containing the LLM's response. Note that `ctx prompt` will save both a before and after version. Drag or insert a link to this in `design/learning/exercise-0`
2. Go back to `questioning`, and **edit** the response to put in your own typed answer. **Tip:** you can collapse the entire response heading (hover to the left of the heading, and click the downwards arrow) and select it quickly to delete the entire block.
3. Use `./ctx save <link_to_questioning.md>` to manually **save** the file to `context`, then find the updated version and link to it in the `exercise-0` document.
4. Use Context to save `exercise-0` as well. (Optional): delete any of these files - if you've properly saved/prompted, we'll be able to find it in the context. We encourage you to continue to prompt/save your brainstorming and learning, and they will help with finding interesting moments for your assignment!

**Note:** `ctx save` is only necessary if you manually edit files, such as your second response to `questioning` or your solutions that you copy paste into `exercise-0`. Any time you `ctx prompt`, both the before and after versions are automatically saved.
# Implementing concepts

You're now ready to create the context that you need to implement concepts with (or without) the aid of an LLM! We've provided you with a number of documents/prompts in `design/background`, each its own self-contained bit of knowledge about concept design in general and implementing them in TypeScript. 

- `design/background`: Background knowledge that you should treat as both prompts and documentation for you to read about concept design. Feel free to add any additional background documents that you think are good prompts. Also, if you think you can contribute, you may also edit any existing prompts and point them out!
- `design/brainstorm`: Plan, chat with an LLM, use as a scratch pad - create and synthesize context about your potential ideas.
- `design/concepts`: Place your actual concept spec documents here. Feel free to copy a whole document from `brainstorm` if you started there and trim down, or simply mutate in place (with `ctx prompt` or `ctx save` throughout).
- `design/learning`: When you feel like you've learned something significant, such as important decisions or caveats/challenges you encounter, record them here. **Tip:** you can always copy an entire document from another place (like `brainstorm`), add a `# summarize: extract the important lessons from everything above`, followed by a `ctx prompt`, then simply delete the original parts.

### Task:

Implement your concepts, either using LLM assistance through `ctx prompt`, or implementing by hand and documenting your progress with `ctx save`. The following tips may help:

### Sample concept: LikertSurvey

We've included a sample concept called LikertSurvey. This is a different version than shown in lecture, where the specification itself was also completely generated. You can inspect `design/concepts/LikertSurvey` to see exactly how this was done, and its history in `context`. This concept is saved, so feel free to delete the design or the source code (useful to delete at least the testing file to prevent it from running when you execute all tests). 

**Generated concept:** notice that `LikertSurvey/LikertSurvey.md` is actually a link pointing to the specific **step** of that previous generation in the context! This is also an embedded link, meaning that Obsidian previews it for you automatically. You can upgrade any link to an embedded link by putting an `!` in front of it, and as long as you still have the `@` sign in the link text, Context will treat it as an include all the same.

### Implementation

Look around the background folder and see which might help you implement concepts, depending on how much of an existing design you already have. The `LikertSurvey/implementation` document gives one example of how this was done. The file that contains most of the information about the technical details of concept implementations is `implementing-concepts.md`.
### Testing

You can read about testing in `testing-concepts.md`. In general, we're using all the standard options, and for testing the current prompts use the [Deno testing framework](https://docs.deno.com/runtime/fundamentals/testing/). Tests are defined by any file with the name `filename.test.ts` in your directory. To run all tests, simply run:

```shell
deno test -A
```

where the `-A` flag means to give all permissions. Be careful with this - it's convenient, but Deno's default security model helps you find if a package you import is sneakily trying to do something your program doesn't (like load local files). There's plenty of [documentation](https://docs.deno.com/runtime/fundamentals/security/) about a more scoped approach to this.

**Confirming your setup:** run the command above to make sure that you've configured everything correctly. You should see in your MongoDB Atlas console the created collections in the test database! These are temporary and will be wiped every time you start a new test.
### Tips for including code

Since `.ts` files don't show up in Obsidian, VSCode has a similar option where you can right/ctrl click a code file, and `Copy Relative Path` to get a repo-based link to include in your context. 

Context understands both the relative links generated by default when dragging files in Obsidian, as well as repo-based links. When you copy-paste these kinds of links from outside sources, you'll need to additionally prepend the link with a `/` to tell Context that it should look it up from the repo root:
```md
[@MyConceptImplementation](/src/concepts/MyConcept.ts)
```

This also turns out to be the same convention that Github uses, so you'll be able to navigate your links there too!

# Design Changes (since Assignment 2)

Here is my new spec generated by Context after using the background info links as well as my own opinions, and the feedback I got on assignment 2:

## Concept: User

**purpose**
To manage user accounts, including registration, authentication, and basic profile information.

**principle**
User accounts are fundamental for personalized interactions like leaving reviews or setting language preferences. Other concepts interact with `User` primarily to identify who is performing an action or whose preferences are being queried.

**state**
Each `User` is represented by:

* `userId`: String (unique document identifier)
* `username`: String (unique identifier for login)
* `email`: String (unique identifier for login and communication)
* `passwordHash`: String (hashed password for security)
* `creationDate`: Timestamp

**actions**

* `registerUser(username: String, email: String, password: String): userId`
  * **Requires:** The `username` and `email` must not already exist in the system. The `password` should meet security criteria (e.g., complexity, length), though specific validation logic resides here.
  * **Effect:** Creates a new user account, hashes the password, and returns the unique `userId`.
* `authenticateUser(usernameOrEmail: String, password: String): userId`
  * **Requires:** A user with the provided `usernameOrEmail` must exist. The provided `password` must match the stored `passwordHash`.
  * **Effect:** Authenticates the user and returns their `userId`. Returns null or throws an error if authentication fails.
* `getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }`
  * **Requires:** The `userId` must exist.
  * **Effect:** Returns basic non-sensitive user profile information.
* `updateUserEmail(userId: String, newEmail: String)`
  * **Requires:** The `userId` must exist. The `newEmail` must not already be in use by another user.
  * **Effect:** Updates the user's email address.
* `deleteUser(userId: String)`
  * **Requires:** The `userId` must exist.
  * **Effect:** Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts (e.g., reviews, localization settings).

***

## Concept: Store

**purpose**
Represent the identity and physical address of a store.

**principle**
A store's existence and location are fundamental. Interactions related to its classification, user feedback, or popularity are external concerns managed by other concepts through synchronizations.

**state**
Each `Store` is represented by:

* `storeId`: String (unique document identifier)
* `name`: String
* `address`: String // A string representation is sufficient for basic identification. Complex address parsing or validation is a concern for a dedicated address concept if needed elsewhere.

**actions**

* `createStore(name: String, address: String): storeId`
  * **Requires:** No existing store has both the exact same `name` and `address`.
  * **Effect:** Creates a new store record and returns its unique `storeId`.
* `deleteStore(storeId: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Removes the store record.
* `getStore(storeId: String): (name: String, address: String)`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the `name` and `address` of the specified store.
* `getStoresByName(name: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s matching the given `name`.
* `getStoresByAddress(address: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s matching the given `address`.

***

## Concept: Tagging

**purpose**
To allow arbitrary classification of stores using descriptive tags.

**state**
Each `Tagging` record associates tags with a store:

* `storeId`: String (references a `Store`)
* `tags`: Set<String> (a collection of user-defined tags)

**actions**

* `addTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist. The `tag` should ideally be validated for format/content by a higher-level mechanism or a dedicated `Tag` concept if complexity arises. For now, it's a string.
  * **Effect:** Adds the specified `tag` to the `storeId`'s set of tags. If the tag already exists, the set remains unchanged.
* `removeTag(storeId: String, tag: String)`
  * **Requires:** The `storeId` must exist. The `tag` must be present in the store's tag set.
  * **Effect:** Removes the specified `tag` from the `storeId`'s set of tags.
* `getStoresByTag(tag: String): Set<String>`
  * **Effect:** Returns a set of all `storeId`s that are currently associated with the given `tag`.

***

## Concept: Review

**purpose**
To capture textual reviews and individual ratings submitted by users for specific stores. This concept is solely responsible for the *individual* review data.

**state**
Each `Review` record:

* `reviewId`: String (unique document identifier)
* `storeId`: String (references a `Store`)
* `userId`: String (references a `User`) // Now explicitly references the new User concept
* `text`: String (the content of the review)
* `rating`: Number (a specific numeric rating for this review, e.g., 1-5)

**actions**

* `createReview(userId: String, storeId: String, text: String, rating: Number): reviewId`
  * **Requires:** The `userId` must exist. The `storeId` must exist. The `rating` should be within a valid range (e.g., 1-5).
  * **Effect:** Creates a new `Review` record and returns its unique `reviewId`. This action *does not* update aggregate ratings; that is handled by a `sync`.
* `deleteReview(reviewId: String)`
  * **Requires:** The `reviewId` must exist.
  * **Effect:** Deletes the specified `Review` record.
* `getReviewsForStore(storeId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s associated with the specified `storeId`.
* `getReviewsByUser(userId: String): Set<String>`
  * **Effect:** Returns a set of all `reviewId`s created by the specified `userId`.

***

## Concept: Rating

**purpose**
To maintain an aggregated rating score and count for a store, derived from individual reviews.

**state**
Each `Rating` record:

* `storeId`: String (references a `Store`)
* `aggregatedRating`: Number // Represents the calculated average or composite rating.
* `reviewCount`: Number // The total number of reviews contributing to the aggregated rating.

**actions**

* `updateRating(storeId: String, contribution: { rating: Number, weight: Number })`
  * **Requires:** The `storeId` must exist. The `contribution` object contains the `rating` of a new or updated review and its `weight` (e.g., 1 for a single review).
  * **Effect:** Updates the `aggregatedRating` and increments the `reviewCount` for the `storeId` based on the provided `contribution`. This action is intended to be invoked by a synchronization mechanism.
* `getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }`
  * **Requires:** The `storeId` must exist.
  * **Effect:** Returns the current aggregated rating and the count of reviews for the store.

***

## Concept: Localization

**purpose**
To track and provide a user's preferred display language for localized content.

**state**
Each `Localization` record:

* `userId`: String (references a `User`) // Now explicitly references the new User concept
* `preferredLanguage`: String (e.g., "en", "fr", "es")

**actions**

* `setLanguage(userId: String, language: String)`
  * **Requires:** The `userId` must exist. The `language` must be a supported locale.
  * **Effect:** Sets or updates the user's preferred display language.
* `getLanguage(userId: String): String`
  * **Effect:** Returns the user's currently set preferred language. If no preference is set, a default language (e.g., "en") could be returned or handled by the calling application/sync.

***

## Syncs

### Sync: AggregateReviewRating

```
sync AggregateReviewRating
when Review.createReview(userId, storeId, text, rating)
then Rating.updateRating(storeId, { rating: rating, weight: 1 })
```

**Explanation:** This sync ensures that when a new review is successfully created, the `Rating` concept is updated to reflect the new contribution.

### Sync: CascadeReviewDeletion

```
sync CascadeReviewDeletion
when Review.deleteReview(reviewId)
where in Review: reviewId of r is reviewId
then
  // Need to update the aggregate rating before deleting the review
  Rating.updateRating(r.storeId, { rating: -r.rating, weight: -1 }) // Assuming negative rating to subtract
  // Note: A more robust implementation might involve re-calculating the average from scratch if a more complex aggregation logic is needed.
  // For now, we subtract the contribution.
```

**Explanation:** When a review is deleted, we need to adjust the aggregated rating. This sync subtracts the contribution of the deleted review. Note: Handling the actual recalculation of the average or composite rating might require a more sophisticated `updateRating` or a separate sync if direct subtraction isn't precise enough.

### Sync: CascadeUserDataDeletion

```
sync CascadeUserDataDeletion
when User.deleteUser(userId)
then
  Review.deleteReviewsByUser(userId)
  Localization.clearUserLanguage(userId)
  // Add other syncs here for any other concepts that might store user-specific data
```

**Explanation:** When a user account is deleted, this sync ensures that associated data in other concepts is cleaned up. This is crucial for data integrity and maintaining the independence of concepts by preventing orphaned records.

### Sync: EnsureUserExistsForReview

```
sync EnsureUserExistsForReview
when Review.createReview(userId, storeId, text, rating)
where not User.exists(userId) // Assuming User concept has an 'exists' helper action
then
  // Depending on desired behavior:
  // Option 1: Prevent review creation and notify.
  // Option 2: Automatically create a guest user (less ideal for explicit registration)
  // For this example, we'll assume it prevents creation and a sync error is raised.
  // No 'then' clause, so the Review.createReview action will implicitly fail or be rejected.
  // A more explicit failure could be: throw Error("User does not exist.")
```

**Explanation:** This sync acts as a guard. Before a review can be created, it verifies that the `userId` associated with the review actually exists in the `User` concept. If the user does not exist, the `Review.createReview` action effectively fails. This ensures data integrity by preventing reviews from being associated with non-existent users.

### Sync: UpdateUserEmailInReviews

```
sync UpdateUserEmailInReviews
when User.updateUserEmail(userId, newEmail)
where in Review: r.userId is userId
then
  // This sync updates the review's user information. However, reviews primarily store userId, not email.
  // This might be more relevant if reviews stored user identifiers that needed to be updated when user identifiers change.
  // For now, this is illustrative: if reviews stored user emails directly, this would update them.
  // Since reviews store userId, and userId is immutable once created, this sync is not directly applicable for email changes on userId.
  // A better example would be if a user's display name changed, and you wanted to update it on their past reviews.
  // For the current spec, this sync would be more conceptual if reviews stored more user profile info.
```

**Explanation:** This sync is a placeholder to illustrate how changes to a user's immutable identifier (like `userId` not changing, but potentially other user profile data if it were stored in `Review` directly) could be propagated. As `userId` is immutable, this sync is less directly applicable to email changes. If `Review` stored a `username` or `email` directly, this sync would be vital. Given our current `Review` structure, this sync is more conceptual.

### Sync: TagBasedSearchOrchestration

This is an example of how features are built by orchestrating concepts. It's not a concept itself but illustrates composition.

```
// Example: Feature to find stores with a specific tag and a good rating.
// This would be implemented in the application layer or a dedicated 'Feature' concept if complexity grows.

// Conceptual flow:
// 1. User requests to find stores tagged "Chinese" with a rating >= 4.
// 2. Application (or orchestrating layer) calls: Tagging.getStoresByTag("Chinese")
// 3. For each storeId returned:
//    a. Call Store.getStore(storeId) to get the name and address.
//    b. Call Rating.getRating(storeId) to get the aggregated rating.
//    c. If aggregatedRating >= 4, include the store in the results.
```

**Changes Made and Rationale for Adding the `User` Concept:**

1.  **New `User` Concept:**
    *   **Purpose:** Clearly defines the responsibility for managing user accounts, authentication, and basic profile data.
    *   **Principle:** Establishes its fundamental role in the system for personalized actions.
    *   **State:** Includes essential user attributes like `userId`, `username`, `email`, `passwordHash` (for security), and `creationDate`.
    *   **Actions:** Provides standard actions for `registerUser`, `authenticateUser`, `getUserById`, `updateUserEmail`, and `deleteUser`. These are typical operations for a user management system.

2.  **`Review` Concept Integration:**
    *   **State:** The `userId` field now explicitly references the `User` concept. This is a direct dependency.
    *   **Actions (`createReview`):** The `userId` parameter is now crucial. The `requires` clause now includes `userId must exist` to ensure reviews are linked to valid users.

3.  **`Localization` Concept Integration:**
    *   **State:** The `userId` field now explicitly references the `User` concept.
    *   **Actions (`setLanguage`, `getLanguage`):** These actions now operate on a `userId` from the `User` concept.

4.  **New Syncs for User Management:**
    *   **`CascadeUserDataDeletion`:** This is a critical sync. When a `User.deleteUser` action occurs, this sync ensures that related data in other concepts (like their reviews, localization settings) is also removed. This maintains data consistency and adheres to the principle of concepts being self-contained but orchestrable.
    *   **`EnsureUserExistsForReview`:** This sync acts as a pre-condition checker for `Review.createReview`. It verifies that the `userId` provided for a review actually corresponds to an existing user. If not, it prevents the review from being created, ensuring data integrity.

5.  **`UpdateUserEmailInReviews` Sync (Conceptual):**
    *   I've included a conceptual sync to show how user data changes might propagate. However, since `Review` currently stores `userId` (which is immutable) and not `email` or `username` directly, this sync doesn't have a direct action in the current `Review` spec. It serves as a reminder that if user-facing information (like display name or email) were stored directly in `Review` records, a sync would be needed to update it upon user profile changes. For this specific `Review` structure, the `userId` link is sufficient and immutable.

# Design Changes (since 4b)

## NEW SECTION ADDED (Line 48+)
Added section: "API Specification: Minimal Additions for Frontend Integration"
This adds endpoints needed for the frontend without changing the existing spec.
Store Additions (Lines 52-138)
Added:
### 1. POST /api/Store/listStores (Lines 54-95)
Returns all stores as full objects (not just IDs)
Adds fields: description, phone, hours, specialties, image
### 2. POST /api/Store/getStoreById (Lines 99-138)
Returns a single store with the same new fields
Mirrors listStores for a single storeId
Review Additions (Lines 140-230)
## Added:
### 3. POST /api/Review/listReviewsForStore (Lines 142-184)
Returns full review objects for a store
Original getReviewsForStore returned only reviewIds[]
### 4. POST /api/Review/listReviewsByUser (Lines 188-230)
Returns full review objects by user
Original getReviewsByUser returned only reviewIds[]
Review Field Additions
tags: ["string"]
createdAt: "string"
Previously: reviewId, userId, storeId, text, rating.

## Backend Spec Changes

### Tagging Concept

Return shape of _getStoresByTag turned into an array of objects, as per the api-spec document requested.

### Store Concept

Revised concept isolation, now other concepts only operate with a generic number, storeId, instead of actual store objects.

_getStore has been deprecated, replaced by getStoreById, which uses the new storeId system. 

Query return types for lookups like getStoresByName and getStoresByAddress have been changed, used to return a set, now returns an array as per api-spec documentation requirements

Added more intrinsic fields to Store objects like description, phone number, and other relevant fields that one would expect for a website about stores. 

# Design Changes (final)

### 1.1 Concepts (data & responsibilities)

#### User (new since A2; refined since A4b)

**State**: userId, username, email, passwordHash, creationDate.

**Actions**: registerUser, authenticateUser, getUserById, updateUserEmail, deleteUser.

**Rationale**: Makes identity first-class. Other concepts reference userId (not usernames/emails), enabling clean cascades and privacy.

**Since A4b**: solidified { userId } as the only auth artifact; frontend no longer depends on tokens.

#### Store (refined)

**State**: storeId, name, address, plus intrinsic fields now exposed to the UI: description, phone, hours, specialties, image.

**Actions**: createStore, deleteStore, getStoresByName, getStoresByAddress, getStoreById (supersedes _getStore).

**Since A4b**: standardized array responses; removed set semantics to match API ergonomics and JSON norms.

#### Tagging (refined)

**State**: storeId, tags: Set<String> (internally); API returns arrays.

**Actions**: addTag, removeTag, getStoresByTag.

**Since A4b**: _getStoresByTag returns [{ storeId, … }]-style objects per API spec; consistent with Store list endpoints.

#### Review (refined)

**State**: reviewId, storeId, userId, text, rating, tags[], createdAt.

**Actions**: createReview, deleteReview, getReviewsForStore, getReviewsByUser.

**Since A4b**: added full-object list endpoints (listReviewsForStore, listReviewsByUser) so the UI can render without N+1 fetches.

#### Rating (unchanged core; clarified integration)

**State**: storeId, aggregatedRating, reviewCount.

**Actions**: updateRating, getRating.

**Since A4b**: documented delta updates (±rating, ±weight) and the option to re-compute if business rules evolve.

#### Localization (kept minimal)

**State**: userId, preferredLanguage.

**Actions**: setLanguage, getLanguage.

**Since A4b**: unchanged in logic; clarified its relationship to User for future i18n surface.

### 1.2 Syncs (cross-concept orchestration)

#### AggregateReviewRating
When Review.createReview → Then Rating.updateRating(storeId, { rating, weight: 1 }).
**Since A4b**: affirmed uni-directional responsibility (Review owns events; Rating owns aggregates).

#### CascadeReviewDeletion
When Review.deleteReview → Then Rating.updateRating(storeId, { rating: -r.rating, weight: -1 }).
**Since A4b**: documented the recompute option if ratings move beyond simple averages.

#### CascadeUserDataDeletion
When User.deleteUser → Then Review.deleteReviewsByUser(userId) (and other user-owned data).
**Since A4b**: narrowed to actual stored links (we do not propagate email to Review, so no backfills required).

#### EnsureUserExistsForReview
Guards Review.createReview with User.exists(userId).
**Since A4b**: kept as a hard precondition, prevents orphaned reviews.

**Removed/Not Implemented**: "UpdateUserEmailInReviews" — unnecessary because Review stores only userId (immutable), not email.

### 1.3 API surface (frontend-convenience additions)

To support a Vue client without overfetching:

#### Store
- POST /api/Store/listStores → Store[] (full objects with description, phone, hours, specialties, image).
- POST /api/Store/getStoreById → Store.

#### Review
- POST /api/Review/listReviewsForStore → Review[] (full objects with tags[], createdAt).
- POST /api/Review/listReviewsByUser → Review[].

#### Tagging
- _getStoresByTag returns array of objects (not sets), aligning with Store list responses.

**Why**: These additions keep concepts decoupled while exposing query shapes optimized for UI (reduce round-trips; avoid N+1 lookups).

### 1.4 Authentication & Frontend state (critical stabilization)

**Backend**: Returns only { userId } on register/login (no tokens).

**Frontend (Pinia user store)**:
- Treats presence of `cgf_user_id` as authenticated; no token required.
- Hydrates from userCache/currentUser to eliminate flicker.
- Defensive guards prevent storing "undefined"/"null" IDs; on startup, invalid IDs are purged.
- Axios interceptor never logs out on 401/403 from public endpoints; only protected routes dispatch a forced logout event.

**Result**: Navigating away and back to My Account keeps the session; login state is stable and instant.

---

## 2) Frontend Changes Since A4b

### 2.1 Authentication & State Persistence

#### Centralized Storage Keys
**Added**: `src/utils/storageKeys.ts`
- Centralized all localStorage keys to prevent mismatches
- Keys: `cgf_user_id`, `cgf_auth_token`, `cgf_current_user`, `cgf_user_cache`
- Benefits: Single source of truth, easier maintenance, prevents typos

#### Robust Authentication Persistence
**Changed**: `src/stores/user.ts`, `src/main.ts`, `src/router/index.ts`, `src/api/client.ts`

**Key Improvements**:
- **userId Validation**: Added strict validation to prevent storing `undefined`, `null`, or empty strings as userId
- **Startup Cleanup**: Automatically removes invalid userId values on app initialization
- **Token Handling**: Only stores real auth tokens (rejects "dummy-token" and invalid values)
- **Optimistic Auth**: Sets `isAuthenticated = true` immediately if userId exists in localStorage, preventing UI flicker
- **Cache Hydration**: Hydrates `currentUser` from `userCache` if available, even if profile fetch fails
- **Defensive Guards**: Multiple validation layers prevent invalid state from persisting

**Authentication Flow**:
1. On login: Validates `response.userId` before storing
2. On app start: Checks localStorage for userId, sets authenticated state immediately
3. On navigation: Router guard only checks auth if not already authenticated
4. On error: Network errors retain cached data; only 401/403 on protected endpoints trigger logout

#### API Client Error Handling
**Changed**: `src/api/client.ts`

**Improvements**:
- **Response Validation**: Validates API responses before returning (checks for `userId`, handles errors)
- **Debug Logging**: Added comprehensive logging for authentication requests/responses
- **Error Detection**: Checks for `error` field in responses before processing
- **Protected Endpoints**: Narrowed scope of auto-logout to only truly protected endpoints
- **Event-Based Logout**: Uses custom events instead of direct store imports to avoid circular dependencies

**Protected Endpoints List**:
- `/User/authenticateUser`
- `/User/_getUserDetails`
- `/User/updateUserEmail`
- `/User/deleteUser`
- `/Store/createStore`
- `/Review/createReview`
- `/Review/deleteReview`

#### Interceptor Improvements
**Changed**: `src/api/client.ts`

- **Token Validation**: Only attaches Authorization header if token exists and is not "dummy-token"
- **Public Endpoint Handling**: 401/403 on public endpoints (like listing stores) do not trigger logout
- **Custom Events**: Uses `auth:force-logout` event to decouple interceptor from store lifecycle
- **Error Logging**: Logs which endpoints trigger logout for debugging

### 2.2 Store Image Management

#### Store Image Utilities
**Added**: `src/utils/storeImages.ts`

- **Image Collection**: Centralized collection of Chinese grocery store images from Unsplash
- **Consistent Assignment**: `getStoreImageByStoreId()` ensures same store always gets same image
- **Fallback System**: Provides deterministic fallback images based on storeId hash

#### Store Detail Page Image Display
**Changed**: `src/views/StoreDetail.vue`

**Improvements**:
- **Store-Specific Images**: Each store shows only its assigned image(s), not gallery images
- **Proper Fallback**: Uses store.image if available, otherwise uses utility function
- **Error Handling**: Image load errors fallback to utility function image
- **Width Constraints**: Added proper CSS constraints to prevent images from overflowing
- **Conditional Navigation**: Navigation buttons only show if store has multiple images

**Image Loading Logic**:
1. If `store.image` exists and is valid → use it
2. Otherwise → use `getStoreImageByStoreId(storeId)` for consistent fallback
3. On image error → fallback to utility function image

### 2.3 Review Display Improvements

#### Username Display
**Changed**: `src/views/StoreDetail.vue`

**Features**:
- **Username Fetching**: Fetches usernames for all unique userIds in reviews
- **Caching**: Caches usernames in local state to avoid redundant API calls
- **Fallback**: Falls back to "User X" format if username fetch fails
- **Real-time Updates**: Watches for review changes and reloads usernames

**Implementation**:
- `loadUsernamesForReviews()`: Extracts unique userIds and fetches usernames
- Uses `userStore.fetchUserProfile()` which leverages caching
- Works for all reviews, including old ones created before this feature

#### Review Tag Integration
**Note**: Review tags are displayed on reviews but are separate from store tags. Store tags are added via the Tagging concept, while review tags are part of the Review object.

### 2.4 Tag Management & Filtering

#### Dynamic Tag Filtering
**Changed**: `src/views/ProductsView.vue`

**Replaced**: Hard-coded category filters with dynamic user-made tags

**Old Implementation**:
- Static categories: "Fresh Seafood", "Bakery & Hot Food", "Traditional Chinese", etc.
- Filtered by substring matching in specialties, tags, and descriptions

**New Implementation**:
- **Dynamic Tags**: Collects all unique tags from all stores
- **Filter Options**: "All Stores" + all unique tags sorted alphabetically
- **Exact Matching**: Filters stores by exact tag match (stores must have the selected tag)
- **Real-time Updates**: Filter options update automatically when tags are added/removed

**Benefits**:
- Reflects actual user-created tags in the system
- No hard-coded categories that may not match real data
- Automatically adapts as users add new tags
- More accurate filtering (exact match vs substring)

#### Real-Time Tag Updates
**Changed**: `src/views/ProductsView.vue`

**Features**:
- **Watcher**: Watches `taggingStore.storeTags` for changes
- **Automatic Updates**: Store cards update immediately when tags change
- **Backend Refresh**: Falls back to backend fetch if tags are missing
- **State Sync**: Ensures UI reflects tagging store state in real-time

#### Tag Addition During Store Creation
**Changed**: `src/views/MyAccount.vue`

**Fix**:
- **Before**: Used `storeStore.addTag()` which only called API, didn't update local state
- **After**: Uses `taggingStore.addTag()` which updates both API and local state
- **Refresh**: After adding tags, refreshes tags from backend to ensure consistency

**Impact**: Tags now appear immediately on store cards after creation, without page refresh

### 2.5 State Management Improvements

#### Notification System
**Added**: `src/stores/notification.ts`, `src/components/NotificationToast.vue`

- **Centralized Notifications**: Single store for all UI notifications
- **Toast Component**: Reusable toast notification component
- **Types**: success, error, warning, info
- **Auto-dismiss**: Notifications automatically dismiss after timeout

#### Store State Updates
**Changed**: Various store files

- **Consistent State**: All stores now use consistent patterns for loading, error handling
- **localStorage Persistence**: Improved persistence logic with proper error handling
- **State Validation**: Added validation to prevent invalid state from persisting

### 2.6 API Client Enhancements

#### Response Validation
**Changed**: `src/api/client.ts`

**User Endpoints**:
- `registerUser()`: Validates `userId` in response before returning
- `authenticateUser()`: Validates `userId` and logs full response for debugging
- Error handling: Throws errors if required fields are missing

**Benefits**:
- Prevents storing invalid data (like `undefined` userId)
- Better error messages for debugging
- Catches backend response issues early

#### Debug Logging
**Added**: Comprehensive logging throughout API client

- Logs raw responses for authentication endpoints
- Logs response data and specific fields
- Helps identify backend response structure issues
- Can be removed in production if needed

### 2.7 UI/UX Improvements

#### Store Card Display
**Changed**: `src/views/ProductsView.vue`

- **Tag Display**: Shows both specialties (pink) and user tags (red with star)
- **Real-time Updates**: Tags update immediately when changed
- **Consistent Styling**: Unified tag styling across the app

#### Store Detail Page
**Changed**: `src/views/StoreDetail.vue`

- **Image Constraints**: Fixed width overflow issues
- **Store-Specific Images**: Only shows images for the specific store
- **Username Display**: Shows actual usernames in reviews
- **Tag Integration**: Displays store tags and review tags separately

### 2.8 Data Flow & Reactivity

#### Watchers
**Added**: Multiple watchers for real-time updates

- **Tag Changes**: Watches tagging store for tag updates
- **Review Changes**: Watches review store for review updates
- **Store Changes**: Watches store store for store updates
- **Auth Changes**: Watches user store for authentication state changes

#### Computed Properties
**Enhanced**: Computed properties for derived state

- **Available Tags**: Computed from all stores' tags
- **Filter Options**: Computed from available tags
- **Filtered Stores**: Computed from selected tag and search query
- **Main Image URL**: Computed from store image or fallback

### 2.9 Error Handling & Validation

#### Input Validation
**Enhanced**: Throughout the application

- **UserId Validation**: Prevents storing invalid userIds
- **Tag Validation**: Validates tags before adding
- **Store Validation**: Validates store data before creation
- **Review Validation**: Validates review data before creation

#### Error Recovery
**Improved**: Error handling with fallbacks

- **Network Errors**: Falls back to cached data when possible
- **Image Errors**: Falls back to utility function images
- **Username Errors**: Falls back to "User X" format
- **Tag Errors**: Falls back to empty array

### 2.10 Performance Optimizations

#### Caching
**Enhanced**: Caching strategies throughout

- **User Cache**: Caches user profiles to avoid redundant fetches
- **Store Cache**: Caches store data in localStorage
- **Tag Cache**: Caches tags in tagging store
- **Coordinate Cache**: Caches geocoded coordinates in localStorage

#### Lazy Loading
**Implemented**: Where appropriate

- **Route Components**: Lazy loaded route components
- **Images**: Images load on demand
- **Tags**: Tags fetched only when needed

### 2.11 Alignment with Backend Design

#### API Response Handling
**Aligned**: Frontend now properly handles backend responses

- **Array Responses**: Handles array responses from list endpoints
- **User ID Only**: Works with ID-only authentication (no tokens required)
- **Full Objects**: Uses full-object endpoints to avoid N+1 queries
- **Error Responses**: Properly handles error responses from backend

#### Concept Boundaries
**Respected**: Frontend respects concept boundaries

- **Store Tags**: Added via Tagging concept (not Store concept)
- **Review Tags**: Part of Review concept (displayed but separate)
- **User References**: Uses userId (not username/email) for references
- **Sync Awareness**: Frontend doesn't need to know about syncs

---

## 3) Rationale & Trade-offs

### Concept Isolation vs. Product Needs
We kept concepts minimal (single-purpose state + actions), pushing composition to syncs and API orchestration. The "frontend-friendly" endpoints do not violate concept boundaries—they're thin read combinators that return full documents where appropriate.

### Rating Updates
Delta updates are simple and efficient. We documented the option to re-compute (idempotent rebuild) if we later add edits to reviews or weighted schemes.

### ID-Only Auth
Simpler local persistence, fewer moving parts. If a real token/JWT is introduced later, the store already has hooks (auth header in axios) to support it without UI churn.

### Arrays over Sets in API
JSON and TypeScript ergonomics trump theoretical set semantics. We maintain set behavior internally (e.g., Tagging), but present arrays externally.

### Frontend State Management
Pinia stores provide reactive state management with localStorage persistence. The frontend handles UI state, caching, and optimistic updates while the backend remains the single source of truth for data.

---

## 4) How Final Differs from A2 & A4b (at a glance)

### From A2 → Final
- Added User as a first-class concept; Review/Localization now reference userId.
- Moved cross-entity logic into explicit syncs (aggregation, cascades, guards).
- Clarified Store as identity + address (with richer public fields exposed via API).
- Added frontend state management with Pinia stores and localStorage persistence.
- Implemented real-time UI updates through watchers and computed properties.

### From A4b → Final
- Introduced full-object list endpoints (Stores, Reviews) + consistent array responses.
- Refined auth to be ID-only with robust persistence in the Vue store.
- Finalized Tagging return shapes and Store getStoreById (deprecating _getStore).
- Added comprehensive error handling and validation in frontend.
- Implemented dynamic tag filtering based on user-created tags.
- Added store image management with fallback system.
- Implemented username display in reviews with caching.
- Added real-time tag updates on store cards.

---

## 5) Developer Notes (impl & testing)

### Snapshots
- A2 concept spec: […snapshot…]
- A4b visual/API spec: […snapshot…]
- Final concept spec: […snapshot…]
- Final syncs: […snapshot…]

### Testing Focus

#### Backend Testing
- Auth persistence: refresh, route changes, public 401s should not log out.
- Review cascades: deleting a review updates Rating (reviewCount/avg) deterministically.
- User deletion: removes authored reviews; no orphaned userId references.
- Tag filters: _getStoresByTag integrates with getStoreById/listStores render logic.

#### Frontend Testing
- **Authentication**: Test login persistence across page refreshes and navigation
- **Tag Updates**: Test that tags appear immediately after store creation
- **Username Display**: Test that usernames appear for all reviews, including old ones
- **Image Display**: Test that store images display correctly with fallbacks
- **Tag Filtering**: Test that dynamic tag filters work and update in real-time
- **Error Handling**: Test that errors are handled gracefully with fallbacks

### Frontend File Structure
```
src/
├── api/
│   └── client.ts              # API client with interceptors and error handling
├── components/
│   └── NotificationToast.vue  # Toast notification component
├── stores/
│   ├── user.ts                # User authentication and profile management
│   ├── store.ts               # Store data management
│   ├── review.ts              # Review data management
│   ├── rating.ts              # Rating data management
│   ├── tagging.ts             # Tag management
│   └── notification.ts        # UI notifications
├── utils/
│   ├── storageKeys.ts         # Centralized localStorage keys
│   └── storeImages.ts         # Store image utilities
├── views/
│   ├── MyAccount.vue          # User account and store creation
│   ├── ProductsView.vue       # Stores listing with tag filtering
│   ├── StoreDetail.vue        # Store details with reviews
│   └── HomeView.vue           # Home page
├── router/
│   └── index.ts               # Route definitions with auth guards
└── main.ts                    # App initialization and auth setup
```

---

## 6) Minimal Diagram (current flow)

```
User ──(userId)──▶ Review ──(storeId, rating)──▶ Rating
   │                                   ▲
   └──────────────▶ Localization       │
Store ◀──────────── Tagging ───────────┘

Syncs:
- Review.created  ➜ Rating.update(+)
- Review.deleted  ➜ Rating.update(-)
- User.deleted    ➜ Review.deleteByUser
- Guard: Review.created requires User.exists

Frontend:
- Pinia stores manage local state with localStorage persistence
- Watchers provide real-time UI updates
- API client handles authentication and error handling
- Components display data with proper fallbacks and error recovery
```

---

## 7) Open Extensions (post-MVP)

### Backend
- Review edits → rating re-compute job.
- Moderation & trust scores (weights in updateRating).
- Real tokens (optional): drop-in to axios interceptor; Pinia store already compatible.
- Search/Filters: pagination, geo filters, tag faceting.

### Frontend
- **Service Worker**: Add offline support with service worker
- **WebSocket**: Add real-time updates via WebSocket
- **Pagination**: Add pagination for stores and reviews
- **Advanced Search**: Add full-text search with filters
- **Image Upload**: Add image upload for store images
- **Review Editing**: Add ability to edit reviews
- **Tag Management**: Add UI for managing tags (edit, delete, merge)

---

## 8) Conclusion

We now have a principled, modular concept set with explicit syncs, a frontend-optimized API, and reliable auth persistence. The design stays faithful to concept isolation while meeting the product's usability and performance needs.

The frontend has been significantly improved to align with the backend design, provide better user experience, and ensure reliable authentication and data display. All changes maintain backward compatibility and include proper error handling and fallbacks.

### Key Achievements
- **Reliable Authentication**: Login state persists across page refreshes and navigation
- **Real-time Updates**: Tags, reviews, and store data update in real-time
- **User Experience**: Usernames displayed, store images with fallbacks, dynamic tag filtering
- **Error Resilience**: Comprehensive error handling with fallbacks and caching
- **Performance**: Efficient caching and lazy loading where appropriate
- **Maintainability**: Centralized utilities, consistent patterns, comprehensive logging

The system is now production-ready with a robust frontend that gracefully handles errors, provides real-time updates, and maintains consistent state across navigation and page refreshes.

# API Spec (since Assignment 4b)

## Concept: User

### purpose
To manage user accounts, including registration, authentication, and basic profile information.

### principle
User accounts are fundamental for personalized interactions like leaving reviews or setting language preferences. Other concepts interact with User primarily to identify who is performing an action or whose preferences are being queried.

### state
Each User is represented by:

userId: String (unique document identifier)

username: String (unique identifier for login)

email: String (unique identifier for login and communication)

passwordHash: String (hashed password for security)

creationDate: Timestamp

### actions

registerUser(username: String, email: String, password: String): userId

Requires: The username and email must not already exist in the system. The password should meet security criteria (e.g., length ≥ 8).

Effect: Creates a new user account, hashes the password, and returns the unique userId.

authenticateUser(usernameOrEmail: String, password: String): userId

Requires: A user with the provided usernameOrEmail must exist. The provided password must match the stored passwordHash.

Effect: Authenticates the user and returns their userId. Returns an error if authentication fails.

getUserById(userId: String): { username: String, email: String, creationDate: Timestamp }

Requires: The userId must exist.

Effect: Returns basic non-sensitive user profile information.

updateUserEmail(userId: String, newEmail: String)

Requires: The userId must exist. The newEmail must not already be in use by another user.

Effect: Updates the user's email address.

deleteUser(userId: String)

Requires: The userId must exist.

Effect: Deletes the user account. This action should ideally trigger cascades via syncs to clean up associated data in other concepts (e.g., reviews, localization settings).

Helper queries (for guards / orchestration):
userExists(userId: String): (userId: String); getUserByUsernameOrEmail(usernameOrEmail: String): (userId: String)

## Concept: Store

### purpose
Represent the identity and physical address of a store.

### principle
A store's existence and location are fundamental. Interactions related to its classification, user feedback, or popularity are external concerns managed by other concepts through synchronizations.

### state
Each Store is represented by:

storeId: String (unique document identifier)

name: String

address: String

description?: String

phone?: String

hours?: String

specialties?: Array<String>

image?: String

### actions

createStore(name: String, address: String, description?: String, phone?: String, hours?: String, specialties?: String[], image?: String): storeId

Requires: No existing store has both the exact same name and address.

Effect: Creates a new store record (including optional fields) and returns its unique storeId.

deleteStore(storeId: String)

Requires: The storeId must exist.

Effect: Removes the store record.

getStoreById(storeId: String): { storeId: String, name: String, address: String, description?: String, phone?: String, hours?: String, specialties?: String[], image?: String }

Requires: The storeId must exist.

Effect: Returns the full store object.

listStores(): Array<{ storeId: String, name: String, address: String, description?: String, phone?: String, hours?: String, specialties?: String[], image?: String }>

Effect: Returns all stores with full details.

getStoresByName(name: String): Array<{ storeId: String, name: String, address: String, description?: String, phone?: String, hours?: String, specialties?: String[], image?: String }>

Effect: Returns all matching stores (full details) for the given name.

getStoresByAddress(address: String): Array<{ storeId: String, name: String, address: String, description?: String, phone?: String, hours?: String, specialties?: String[], image?: String }>

Effect: Returns all matching stores (full details) for the given address.

Helper query: storeExists(storeId: String): (storeId: String)

## Concept: Tagging

### purpose
To allow arbitrary classification of stores using descriptive tags.

### state
Each Tagging record associates tags with a store:

storeId: String (references a Store)

tags: Array<String> (a collection of user-defined tags)

### actions

addTag(storeId: String, tag: String)

Requires: The storeId must exist (conceptually).

Effect: Adds the specified tag to the store’s tag set (idempotent).

removeTag(storeId: String, tag: String)

Requires: The storeId must exist and currently have the tag.

Effect: Removes the specified tag from the store’s tag set. If the tag set becomes empty, the record may be removed.

deleteTagsForStore(storeId: String)

Requires: The storeId must exist (conceptually).

Effect: Removes all tags for the store (idempotent).

getStoresByTag(tag: String): Array<{ storeId: String }>

Effect: Returns a list of storeIds that currently have the given tag.

getTagsForStore(storeId: String): { storeId: String, tags: Array<String> }

Effect: Returns all tags associated with the given storeId.

## Concept: Review

### purpose
To capture textual reviews and individual ratings submitted by users for specific stores. This concept is solely responsible for the individual review data.

### state
Each Review record:

reviewId: String (unique document identifier)

storeId: String (references a Store)

userId: String (references a User)

text: String (the content of the review)

rating: Number (a specific numeric rating for this review, e.g., 1–5)

### actions

createReview(userId: String, storeId: String, text: String, rating: Number): reviewId

Requires: The userId must exist. The storeId must exist. The rating ∈ [1,5].

Effect: Creates a new Review record and returns its unique reviewId. This action does not update aggregate ratings; that is handled by a sync.

deleteReview(reviewId: String)

Requires: The reviewId must exist.

Effect: Deletes the specified review.

deleteReviewsForStore(storeId: String)

Requires: The storeId must exist.

Effect: Deletes all reviews associated with the store (idempotent).

deleteReviewsByUser(userId: String)

Requires: The userId must exist.

Effect: Deletes all reviews authored by the user (idempotent).

getReviewById(reviewId: String): { reviewId: String, storeId: String, userId: String, text: String, rating: Number }

Requires: The reviewId must exist.

Effect: Returns full review details.

listReviewsForStore(storeId: String): Array<{ reviewId: String, storeId: String, userId: String, text: String, rating: Number }>

Effect: Returns full review objects for a store.

listReviewsByUser(userId: String): Array<{ reviewId: String, storeId: String, userId: String, text: String, rating: Number }>

Effect: Returns full review objects authored by a user.

## Concept: Rating

### purpose
To maintain an aggregated rating score and count for a store, derived from individual reviews.

### state
Each Rating record:

storeId: String (references a Store)

aggregatedRating: Number // calculated average/composite rating

reviewCount: Number // total number of reviews contributing to the aggregation

### actions

updateRating(storeId: String, contribution: { rating: Number, weight: Number })

Requires: The storeId must conceptually exist. The resulting reviewCount must not become negative.

Effect: Updates aggregatedRating and reviewCount by applying the delta. Initializes the record if it does not exist.

getRating(storeId: String): { aggregatedRating: Number, reviewCount: Number }

Effect: Returns the current aggregated rating and count for the store (returns no record if none exists).

deleteRatingForStore(storeId: String)

Requires: The storeId must exist.

Effect: Removes the Rating record for the store (idempotent).

Implementation note: the query form returns an array result; API/adapters may unwrap to an object.

The Localization concept has been removed since assignment 4b.