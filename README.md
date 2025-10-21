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

