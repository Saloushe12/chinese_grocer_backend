# Project-wide Design Changes

## Separation of Concerns + Concept Independence

Originally, StoreDirectory was overloaded and handled stores, tags, reviews, and ratings all in one concept. Reviews were tied directly to users and implicitly responsible for both review text and rating aggregation.

Now, each concern that used to be in StoreDirectory has been separated and extracted with its own state and actions:

        ** Store: manages Store identity only, with name and address.
        ** Tagging: manages tags for stores as an independent concept, as opposed to within Store.
        ** Review: stores user reviews individually, no rating aggregation
        ** Rating: new concept created specifically for aggregated rating logic
        ** User: new concept extracted for authentification and user management, previously was implicit in StoreDirectory.

## Adding the User Concept

Previously, "User" was just an implicit parameter to Review. Now, it is its own concept with authentification, storage, and identity. It is now a first-class resource enabling personalization, security, and localization. 

## Decoupling Reviews from Ratings

Before, the Review concept created a review and also updated the store's rating via a sync. Rating was a field on the StoreDirectory concept.

Now, Review stored individual, user-submitted text and rating values. Rating is a separate concept that aggregates ratings mathematically. This adheres to event-driven separation of write concerns vs derived state.

The new setup allows better syncing, recalculation, and deletion.

## Tagging Decoupled from StoreDirectory

Before, Tags were a field in StoreDirectory, a static part of a Store's state.

Now, tags are managed independently by the Tagging concept, Stores are no longer aware of their tags. This allows future development like hierarchical tags and user-specific tags.

# Interesting Moments

##  [@concept-spec-rework](./context/design/learning/understanding-concepts.md/20251019_205158.3db9309c.md)

This was the moment when I consulted Context on how to fix my spec from Assignment 2. My Assignment 2 spec suffered from overloading, and non-disjoint concepts, with concepts referencing each other. Context aided me in creating a new spec that does not have these problems, and also follows the guidelines from the assignment and the background documents. It also added a new User registration concept that I did not include before, but was necessary in order for my review system to function.


## [@user-concept-bcrypt](./context/design/concepts/User/User.md/steps/prompt.cfc9465b.md)

I ran into the following error: "Argument of type 'number' is not assignable to parameter of type 'string'." It turns out this is because I installed Deno's native version of bcrypt instead of the npm bcrypt. I chose to use Deno's bcrypt because the npm version was omitted during install, and I did not know why, so I played it safe. Turns out this affects the code as there are functional changes between the two versions. I had to edit Context's implementation of registerUser because Deno's bcrypt takes a different argument type for the hash() function.

## [@rating-concept-deno-test-block](./context/design/concepts/Rating/RatingPrompts.md/steps/response.9e511fc2.md)

There were many times where I ran into an error saying the client closed unexpectedly. I found that usually these problems were solved by only having one "Deno.test" block, and having each test case be a t.step within the Deno.test block, then finally closing the client after all steps were performed. The issue arose from closing the client after each Deno.test block while having multiple of them. However, eith Rating, I ran into the opposite, where the error was a leak. I tried the strategy of putting everything in one Deno.test block, but that did not work. It turns out the issue was because Deno requires all async connections to be closed in the same scope that they were opened in, so I had to use multiple Deno.test blocks in this instance.

## [@test-writing-guidelines](./context/design/concepts/Rating/RatingPrompts.md/steps/prompt.fae06f7a.md)

One difficulty I had was getting Context to write good test cases that fit the requirements. I ended up pasting the test case guidelines from the assignment into Context so that it had a better idea of what I was looking for. However, this did not go well when I was still individually testing actions, because many of the guidelines applied only to entire concepts. I had to adapt the guideline somewhat so that it would work for individual actions of concepts.