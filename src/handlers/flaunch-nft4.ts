/**
 * Flaunch NFT4 Handlers
 * Handles FlaunchNFT4 Transfer events
 */

import { FlaunchNFT4 } from "generated";
import { normalizeAddress, generateCollectionId } from "../utils/helpers";

// =============================================================================
// FLAUNCH NFT 4 HANDLERS
// =============================================================================

FlaunchNFT4.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  // Ensure users exist
  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  // Update Collection and CollectionToken owner - use subgraph-compatible ID format
  const collectionId = generateCollectionId(contractAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });

    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken) {
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
      }
    }
  }
});


