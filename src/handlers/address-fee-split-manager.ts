/**
 * Address Fee Split Manager Handlers
 * Handles AddressFeeSplitManager (dynamic) contract events
 */

import { AddressFeeSplitManager } from "generated";
import { BUNDLE_ID } from "../utils/constants";
import { normalizeAddress, generateCollectionId } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";

// =============================================================================
// ADDRESS FEE SPLIT MANAGER HANDLERS
// =============================================================================

AddressFeeSplitManager.CreatorUpdated.handler(async ({ event, context }) => {
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const creatorAddr = normalizeAddress(event.params.creator);

  if (!(await context.User.get(creatorAddr)))
    context.User.set({ id: creatorAddr });

  // Use subgraph-compatible ID format
  const collectionId = generateCollectionId(flaunchAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: creatorAddr });
  }
});

AddressFeeSplitManager.ManagerInitialized.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const ownerAddr = normalizeAddress(event.params.owner);
    // params is (uint256 creatorShare, (address recipient, uint256 share)[] recipientShares)
    const params = event.params.params as unknown as [bigint, readonly [string, bigint][]];
    const creatorShare = params[0];
    const recipientShares = params[1] || [];

    if (!(await context.User.get(ownerAddr)))
      context.User.set({ id: ownerAddr });

    const manager = await context.AddressFeeSplitManager.get(managerAddress);
    if (manager) {
      context.AddressFeeSplitManager.set({
        ...manager,
        owner_id: ownerAddr,
        creatorShare,
      });
    }

    // Create recipient entities from initialization params
    for (const [recipient, share] of recipientShares) {
      const recipientAddr = normalizeAddress(recipient);
      if (!(await context.User.get(recipientAddr)))
        context.User.set({ id: recipientAddr });

      context.AddressFeeSplitManagerRecipient.set({
        id: `${managerAddress}-${recipientAddr}`,
        manager_id: managerAddress,
        recipient: recipientAddr,
        recipientShare: share,
      });
    }
  }
);

AddressFeeSplitManager.RecipientAdded.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const recipientAddr = normalizeAddress(event.params.recipient);
  const share = event.params.share;

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  context.AddressFeeSplitManagerRecipient.set({
    id: `${managerAddress}-${recipientAddr}`,
    manager_id: managerAddress,
    recipient: recipientAddr,
    recipientShare: share,
  });
});

AddressFeeSplitManager.ManagerOwnershipTransferred.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const previousOwner = normalizeAddress(event.params.previousOwner);
    const newOwner = normalizeAddress(event.params.newOwner);

    // Ensure both users exist
    if (!(await context.User.get(previousOwner))) context.User.set({ id: previousOwner });
    if (!(await context.User.get(newOwner))) context.User.set({ id: newOwner });

    const manager = await context.AddressFeeSplitManager.get(managerAddress);
    if (manager) {
      context.AddressFeeSplitManager.set({ ...manager, owner_id: newOwner });
    }
  }
);

AddressFeeSplitManager.RevenueClaimed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const recipientAddr = normalizeAddress(event.params.recipient);
  const amount = event.params.amountClaimed;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  const bundle = await context.Bundle.get(BUNDLE_ID);

  context.AddressFeeSplitManagerClaim.set({
    id: `${managerAddress}-${txHash}-${event.logIndex}`,
    manager_id: managerAddress,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    recipient_id: recipientAddr,
    timestamp,
    txHash,
  });
});

AddressFeeSplitManager.TreasuryEscrowed.handler(async ({ event, context }) => {
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
      addressFeeSplitManager_id: managerAddress,
      managerType: "AddressFeeSplitManager",
      managerUpdatedAt: timestamp,
    });
  }
});

AddressFeeSplitManager.TreasuryReclaimed.handler(async ({ event, context }) => {
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
      addressFeeSplitManager_id: undefined,
      managerType: undefined,
      managerUpdatedAt: timestamp,
    });
  }
});

AddressFeeSplitManager.RecipientShareTransferred.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const oldRecipient = normalizeAddress(event.params.oldRecipient);
    const newRecipient = normalizeAddress(event.params.newRecipient);
    const shareTransferred = event.params.share;

    if (!(await context.User.get(oldRecipient)))
      context.User.set({ id: oldRecipient });
    if (!(await context.User.get(newRecipient)))
      context.User.set({ id: newRecipient });

    // Get old recipient share entity
    const oldRecipientShare = await context.AddressFeeSplitManagerRecipient.get(
      `${managerAddress}-${oldRecipient}`
    );

    // Reset old recipient share
    if (oldRecipientShare) {
      context.AddressFeeSplitManagerRecipient.set({
        ...oldRecipientShare,
        recipientShare: 0n,
      });
    }

    // Update or create new recipient share using the event's share value
    let newRecipientShareEntity = await context.AddressFeeSplitManagerRecipient.get(
      `${managerAddress}-${newRecipient}`
    );
    if (newRecipientShareEntity) {
      context.AddressFeeSplitManagerRecipient.set({
        ...newRecipientShareEntity,
        recipientShare: newRecipientShareEntity.recipientShare + shareTransferred,
      });
    } else {
      context.AddressFeeSplitManagerRecipient.set({
        id: `${managerAddress}-${newRecipient}`,
        manager_id: managerAddress,
        recipient: newRecipient,
        recipientShare: shareTransferred,
      });
    }
  }
);

AddressFeeSplitManager.PermissionsUpdated.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const permissions = normalizeAddress(event.params.permissions);

    const manager = await context.AddressFeeSplitManager.get(managerAddress);
    if (manager) {
      context.AddressFeeSplitManager.set({ ...manager, permissions });
    }
  }
);

AddressFeeSplitManager.ETHReceivedFromUnknownSource.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const senderAddr = normalizeAddress(event.params.sender);
    const amount = event.params.amount;
    const timestamp = BigInt(event.block.timestamp);
    const txHash = event.transaction.hash || "";

    if (!(await context.User.get(senderAddr)))
      context.User.set({ id: senderAddr });

    const bundle = await context.Bundle.get(BUNDLE_ID);

    context.AddressFeeSplitManagerExternalETH.set({
      id: `${managerAddress}-${txHash}-${event.logIndex}`,
      manager_id: managerAddress,
      user_id: senderAddr,
      amount,
      amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
      createdAt: timestamp,
      txHash,
    });

    const manager = await context.AddressFeeSplitManager.get(managerAddress);
    if (manager) {
      context.AddressFeeSplitManager.set({
        ...manager,
        externalManagerETHTotal: manager.externalManagerETHTotal + amount,
      });
    }
  }
);






