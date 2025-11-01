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
  async addTag(
    { storeId, tag }: { storeId: StoreId; tag: Tag },
  ): Promise<Empty | { error: string }> {
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
      console.error(
        `Error in Tagging.addTag for storeId '${storeId}' and tag '${tag}':`,
        e,
      );
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
  async removeTag(
    { storeId, tag }: { storeId: StoreId; tag: Tag },
  ): Promise<Empty | { error: string }> {
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
        return {
          error: "Database operation for removeTag was not acknowledged.",
        };
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
      console.error(
        `Error in Tagging.addTag for storeId '${storeId}' and tag '${tag}':`,
        e,
      );
      return { error: `Failed to add tag: ${message}` };
    }
  }

  /**
   * _getStoresByTag(tag: String): { storeIds: Set<String> }
   *
   * @effects Returns a set of all `storeId`s that are currently associated with the given `tag`.
   * @returns { storeIds: StoreId[] } on success, { error } on failure.
   */
  // _getStoresByTag(tag: String): [{ storeId: ID }]
  async _getStoresByTag(
    { tag }: { tag: string },
  ): Promise<Array<{ storeId: ID }> | { error: string }> {
    try {
      const docs = await this.taggings.find({ tags: tag }).project({ _id: 1 })
        .toArray();
      return docs.map((doc) => ({ storeId: doc._id }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return { error: `Failed to retrieve stores by tag: ${message}` };
    }
  }

  /**
   * listTagsForStore(storeId: String): { tags: String[] } | { error: String }
   * @effects Returns the array of tags for the given storeId. If none exist, returns { tags: [] }.
   * @returns { tags: string[] } on success, or { error } on unexpected failure.
   */
  // listTagsForStore(storeId: String): { tags: string[] }
  async listTagsForStore(
    { storeId }: { storeId: ID },
  ): Promise<{ tags: string[] } | { error: string }> {
    try {
      const doc = await this.taggings.findOne({ _id: storeId });
      return { tags: doc?.tags ?? [] };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return { error: `Failed to retrieve tags: ${message}` };
    }
  }
}
