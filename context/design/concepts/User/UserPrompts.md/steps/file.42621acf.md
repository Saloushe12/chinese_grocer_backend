---
timestamp: 'Tue Oct 21 2025 02:12:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_021240.65596a7d.md]]'
content_id: 42621acf24b72886df3800bfc80f804923e42246d43219d0cf5c26fbf4e809fb
---

# file: src/concepts/Store/StoreConcept.ts

```typescript
import { Collection, Db } from "mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Store" + ".";

// The state of the Store concept:
/**
 * Each Store is represented by:
 * - `_id`: ID (storeId)
 * - `name`: string
 * - `address`: string
 */
interface StoreDoc {
  _id: ID; // Mapped from storeId in spec
  name: string;
  address: string;
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
   * createStore(name: String, address: String): storeId
   * @requires No existing store has both the exact same `name` and `address`.
   * @effects Creates a new store record and returns its unique `storeId`.
   */
  async createStore(
    { name, address }: { name: string; address: string },
  ): Promise<{ storeId: ID } | { error: string }> {
    // Requires: No existing store has both the exact same `name` and `address`.
    const existingStore = await this.stores.findOne({ name, address });
    if (existingStore) {
      return {
        error: `Store with name '${name}' and address '${address}' already exists.`,
      };
    }

    // Effect: Creates a new store record
    const newStoreId = freshID();
    const newStore: StoreDoc = {
      _id: newStoreId,
      name,
      address,
    };

    await this.stores.insertOne(newStore);

    // Effect: returns its unique `storeId`.
    return { storeId: newStoreId };
  }
}
```
