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
  // Add these optional fields:
  description?: string;
  phone?: string;
  hours?: string;
  specialties?: string[];
  image?: string;
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
    {
      name,
      address,
      description,
      phone,
      hours,
      specialties,
      image,
    }: {
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    },
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
      description,
      phone,
      hours,
      specialties,
      image,
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

  // 10/thirty/25: Dcprecated method, rplacd by getStoreById
  // /**
  //  * _getStore(storeId: String): { name: String, address: String } | { error: String }
  //  * @requires The `storeId` must exist.
  //  * @effects Returns the `name` and `address` of the specified store.
  //  * @returns { name: string, address: string } on success or { error: string } if requirements are not met.
  //  */
  // async _getStore(
  //   { storeId }: { storeId: ID },
  // ): Promise<{ name: string; address: string } | { error: string }> {
  //   // Requires: The `storeId` must exist.
  //   const store = await this.stores.findOne({ _id: storeId });
  //   if (!store) {
  //     return { error: `Store with ID '${storeId}' not found.` };
  //   }

  //   // Effect: Returns the `name` and `address` of the specified store.
  //   return { name: store.name, address: store.address };
  // }

  /**
   * _getStoresByName(name: String): Array<{ storeId: ID }>
   * @effects Returns all matching store IDs for the given name.
   */
  async _getStoresByName(
    { name }: { name: string },
  ): Promise<Array<{ storeId: ID }>> {
    const stores = await this.stores.find({ name }).project({ _id: 1 })
      .toArray();
    return stores.map((s) => ({ storeId: s._id }));
  }

  /**
   * _getStoresByAddress(address: String): Set<ID>
   * @effects Returns a set of all `storeId`s matching the given `address`.
   * @returns Set<ID>
   */
  // _getStoresByAddress(address: String): [{ storeId: ID }]
  async _getStoresByAddress(
    { address }: { address: string },
  ): Promise<Array<{ storeId: ID }>> {
    const stores = await this.stores.find({ address }).project({ _id: 1 })
      .toArray();
    return stores.map((s) => ({ storeId: s._id }));
  }

  /**
   * getStoreById(storeId: String): StoreSummary | { error: String }
   * @requires The `storeId` must exist.
   * @effects Returns the full store object.
   * @returns Full store object on success or { error: string } if requirements are not met.
   */
  async getStoreById(
    { storeId }: { storeId: ID },
  ): Promise<
    {
      storeId: ID;
      name: string;
      address: string;
      description?: string;
      phone?: string;
      hours?: string;
      specialties?: string[];
      image?: string;
    } | { error: string }
  > {
    const store = await this.stores.findOne({ _id: storeId });

    if (!store) {
      return { error: `Store with ID '${storeId}' not found.` };
    }

    return {
      storeId: store._id,
      name: store.name,
      address: store.address,
      description: store.description,
      phone: store.phone,
      hours: store.hours,
      specialties: store.specialties,
      image: store.image,
    };
  }

  /**
   * listStores(): { items: Array<StoreSummary> } | { error: String }
   * @effects Returns an array of all stores with full details (except ratings/reviews/tags).
   * @returns { items: Array<{ storeId, name, address, description, phone, hours, specialties, image }> }
   */
  async listStores(): Promise<
    {
      items: Array<{
        storeId: ID;
        name: string;
        address: string;
        description?: string;
        phone?: string;
        hours?: string;
        specialties?: string[];
        image?: string;
      }>;
    } | { error: string }
  > {
    try {
      const stores = await this.stores.find({}).toArray();

      return {
        items: stores.map((store) => ({
          storeId: store._id,
          name: store.name,
          address: store.address,
          description: store.description,
          phone: store.phone,
          hours: store.hours,
          specialties: store.specialties,
          image: store.image,
        })),
      };
    } catch (error) {
      return { error: `Failed to list stores: ${error}` };
    }
  }
}
