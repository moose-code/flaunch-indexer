/**
 * Revenue Manager Handlers
 * Handles RevenueManager (dynamic) contract events
 */

import { RevenueManager } from "generated";
import { BUNDLE_ID } from "../utils/constants";
import { normalizeAddress, generateCollectionId } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";

// =============================================================================
// REVENUE MANAGER HANDLERS
// =============================================================================

RevenueManager.CreatorUpdated.handler(async ({ event, context }) => {
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const creatorAddr = normalizeAddress(event.params.creator);

  // Ensure creator user exists
  if (!(await context.User.get(creatorAddr)))
    context.User.set({ id: creatorAddr });

  // Update collection owner - use subgraph-compatible ID format
  const collectionId = generateCollectionId(flaunchAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: creatorAddr });
  }
});

RevenueManager.ManagerInitialized.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const ownerAddr = normalizeAddress(event.params.owner);
  const params = event.params.params;

  // Ensure owner user exists
  if (!(await context.User.get(ownerAddr))) context.User.set({ id: ownerAddr });

  const manager = await context.RevenueManager.get(managerAddress);
  if (manager) {
    const protocolRecipient = normalizeAddress(params[0]);
    if (!(await context.User.get(protocolRecipient)))
      context.User.set({ id: protocolRecipient });

    context.RevenueManager.set({
      ...manager,
      owner_id: ownerAddr,
      protocolFee: params[1],
      protocolFeeRecipient_id: protocolRecipient,
    });
  }
});

RevenueManager.ManagerOwnershipTransferred.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const previousOwner = normalizeAddress(event.params.previousOwner);
    const newOwner = normalizeAddress(event.params.newOwner);

    // Ensure both users exist
    if (!(await context.User.get(previousOwner))) context.User.set({ id: previousOwner });
    if (!(await context.User.get(newOwner))) context.User.set({ id: newOwner });

    const manager = await context.RevenueManager.get(managerAddress);
    if (manager) {
      context.RevenueManager.set({ ...manager, owner_id: newOwner });
    }
  }
);

RevenueManager.ProtocolRecipientUpdated.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const protocolRecipient = normalizeAddress(event.params.protocolRecipient);

  if (!(await context.User.get(protocolRecipient)))
    context.User.set({ id: protocolRecipient });

  const manager = await context.RevenueManager.get(managerAddress);
  if (manager) {
    context.RevenueManager.set({
      ...manager,
      protocolFeeRecipient_id: protocolRecipient,
    });
  }
});

RevenueManager.TreasuryEscrowed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const ownerAddr = normalizeAddress(event.params.owner);
  const timestamp = BigInt(event.block.timestamp);

  if (!(await context.User.get(ownerAddr))) context.User.set({ id: ownerAddr });

  // Use subgraph-compatible ID format
  const collectionId = generateCollectionId(flaunchAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({
      ...collection,
      owner_id: ownerAddr,
      revenueManager_id: managerAddress,
      managerType: "RevenueManager",
      managerUpdatedAt: timestamp,
    });
  }
});

RevenueManager.TreasuryReclaimed.handler(async ({ event, context }) => {
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const recipientAddr = normalizeAddress(event.params.recipient);
  const timestamp = BigInt(event.block.timestamp);

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  // Use subgraph-compatible ID format
  const collectionId = generateCollectionId(flaunchAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({
      ...collection,
      owner_id: recipientAddr,
      revenueManager_id: undefined,
      managerType: undefined,
      managerUpdatedAt: timestamp,
    });
  }
});

RevenueManager.RevenueClaimed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const recipientAddr = normalizeAddress(event.params.recipient);
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  // Use subgraph-compatible ID format
  const collectionId = generateCollectionId(flaunchAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  const bundle = await context.Bundle.get(BUNDLE_ID);

  context.RevenueManagerClaim.set({
    id: `${managerAddress}-${txHash}-${event.logIndex}`,
    revenueManager_id: managerAddress,
    isProtocol: false,
    collection_id: collection ? collectionId : undefined,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    recipient_id: recipientAddr,
    timestamp,
    txHash,
  });
});

RevenueManager.ProtocolRevenueClaimed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const recipientAddr = normalizeAddress(event.params.recipient);
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  const bundle = await context.Bundle.get(BUNDLE_ID);

  context.RevenueManagerClaim.set({
    id: `${managerAddress}-${txHash}-${event.logIndex}`,
    revenueManager_id: managerAddress,
    isProtocol: true,
    collection_id: undefined,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    recipient_id: recipientAddr,
    timestamp,
    txHash,
  });
});

RevenueManager.PermissionsUpdated.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const permissions = normalizeAddress(event.params.permissions);

  const manager = await context.RevenueManager.get(managerAddress);
  if (manager) {
    context.RevenueManager.set({ ...manager, permissions });
  }
});


