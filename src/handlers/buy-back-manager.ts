/**
 * Buy Back Manager Handlers
 * Handles BuyBackManager (dynamic) contract events
 */

import { BuyBackManager } from "generated";
import { ZERO_BD, BUNDLE_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";

// =============================================================================
// BUYBACK MANAGER HANDLERS
// =============================================================================

BuyBackManager.CreatorUpdated.handler(async ({ event, context }) => {
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const creatorAddr = normalizeAddress(event.params.creator);

  if (!(await context.User.get(creatorAddr)))
    context.User.set({ id: creatorAddr });

  const collectionId = `${flaunchAddr}-${tokenId}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: creatorAddr });
  }
});

BuyBackManager.ManagerInitialized.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const ownerAddr = normalizeAddress(event.params.owner);
  const params = event.params.params;

  if (!(await context.User.get(ownerAddr))) context.User.set({ id: ownerAddr });

  const manager = await context.BuyBackManager.get(managerAddress);
  if (manager) {
    // params is ((currency0, currency1, fee, tickSpacing, hooks), creatorShare, ownerShare)
    const poolKey = params[0];
    context.BuyBackManager.set({
      ...manager,
      owner_id: ownerAddr,
      buyBackCurrency0: normalizeAddress(poolKey[0]),
      buyBackCurrency1: normalizeAddress(poolKey[1]),
      creatorShare: params[1],
      ownerShare: params[2],
    });
  }
});

BuyBackManager.ManagerOwnershipTransferred.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const newOwner = normalizeAddress(event.params.newOwner);

    if (!(await context.User.get(newOwner))) context.User.set({ id: newOwner });

    const manager = await context.BuyBackManager.get(managerAddress);
    if (manager) {
      context.BuyBackManager.set({ ...manager, owner_id: newOwner });
    }
  }
);

BuyBackManager.TreasuryEscrowed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const ownerAddr = normalizeAddress(event.params.owner);
  const timestamp = BigInt(event.block.timestamp);

  if (!(await context.User.get(ownerAddr))) context.User.set({ id: ownerAddr });

  const collectionId = `${flaunchAddr}-${tokenId}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({
      ...collection,
      owner_id: ownerAddr,
      buyBackManager_id: managerAddress,
      managerType: "BuyBackManager",
      managerUpdatedAt: timestamp,
    });
  }
});

BuyBackManager.TreasuryReclaimed.handler(async ({ event, context }) => {
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const recipientAddr = normalizeAddress(event.params.recipient);
  const timestamp = BigInt(event.block.timestamp);

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  const collectionId = `${flaunchAddr}-${tokenId}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({
      ...collection,
      owner_id: recipientAddr,
      buyBackManager_id: undefined,
      managerType: undefined,
      managerUpdatedAt: timestamp,
    });
  }
});

BuyBackManager.RevenueClaimed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const recipientAddr = normalizeAddress(event.params.recipient);
  const amount = event.params.amountClaimed;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(recipientAddr)))
    context.User.set({ id: recipientAddr });

  const bundle = await context.Bundle.get(BUNDLE_ID);

  context.BuyBackManagerClaim.set({
    id: `${managerAddress}-${txHash}-${event.logIndex}`,
    manager_id: managerAddress,
    collection_id: undefined,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    recipient_id: recipientAddr,
    createdAt: timestamp,
    txHash,
  });
});

BuyBackManager.BidWallDeposit.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const amount = event.params.ethAmount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  const bundle = await context.Bundle.get(BUNDLE_ID);
  const amountUSDC = convertETHtoUSDCWithBundle(amount, bundle);

  const manager = await context.BuyBackManager.get(managerAddress);
  if (manager) {
    context.BuyBackManager.set({
      ...manager,
      totalDeposits: manager.totalDeposits + amount,
      totalDepositsUSDC: manager.totalDepositsUSDC.plus(amountUSDC),
    });
  }

  context.BuyBackManagerDeposit.set({
    id: `${managerAddress}-${txHash}-${event.logIndex}`,
    manager_id: managerAddress,
    amount,
    amountUSDC,
    createdAt: timestamp,
    txHash,
  });
});

BuyBackManager.PermissionsUpdated.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const permissions = normalizeAddress(event.params.permissions);

  const manager = await context.BuyBackManager.get(managerAddress);
  if (manager) {
    context.BuyBackManager.set({ ...manager, permissions });
  }
});

BuyBackManager.ETHReceivedFromUnknownSource.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const senderAddr = normalizeAddress(event.params.sender);
    const amount = event.params.amount;
    const timestamp = BigInt(event.block.timestamp);
    const txHash = event.transaction.hash || "";

    if (!(await context.User.get(senderAddr)))
      context.User.set({ id: senderAddr });

    const bundle = await context.Bundle.get(BUNDLE_ID);

    context.BuyBackManagerExternalETH.set({
      id: `${managerAddress}-${txHash}-${event.logIndex}`,
      manager_id: managerAddress,
      user_id: senderAddr,
      amount,
      amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
      createdAt: timestamp,
      txHash,
    });

    const manager = await context.BuyBackManager.get(managerAddress);
    if (manager) {
      context.BuyBackManager.set({
        ...manager,
        externalManagerETHTotal: manager.externalManagerETHTotal + amount,
      });
    }
  }
);


