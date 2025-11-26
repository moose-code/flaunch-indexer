/**
 * Flaunch NFT Handlers
 * Handles FlaunchNFT1, FlaunchNFT2, FlaunchNFT3, and AnyFlaunchNFT Transfer events
 */

import { FlaunchNFT1, FlaunchNFT2, FlaunchNFT3, AnyFlaunchNFT } from "generated";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// FLAUNCH NFT 1 HANDLERS
// =============================================================================

FlaunchNFT1.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  // Ensure users exist
  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  // Update Collection and CollectionToken owner
  const collectionId = `${contractAddr}-${tokenId.toString()}`;
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

// =============================================================================
// FLAUNCH NFT 2 HANDLERS
// =============================================================================

FlaunchNFT2.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });
    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken)
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
    }
  }
});

// =============================================================================
// FLAUNCH NFT 3 HANDLERS
// =============================================================================

FlaunchNFT3.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });
    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken)
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
    }
  }
});

// =============================================================================
// ANY FLAUNCH NFT HANDLERS
// =============================================================================

AnyFlaunchNFT.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });
    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken)
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
    }
  }
});

