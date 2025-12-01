/**
 * Staking Manager Handlers
 * Handles StakingManager (dynamic) contract events
 */

import { StakingManager } from "generated";
import { BUNDLE_ID } from "../utils/constants";
import { normalizeAddress, generateCollectionId } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";
import { fetchAllTokenMetadata } from "../effects/token-metadata";

// =============================================================================
// STAKING MANAGER HANDLERS
// =============================================================================

StakingManager.CreatorUpdated.handler(async ({ event, context }) => {
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

StakingManager.ManagerInitialized.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const ownerAddr = normalizeAddress(event.params.owner);
  const params = event.params.params;

  if (!(await context.User.get(ownerAddr))) context.User.set({ id: ownerAddr });

  const manager = await context.StakingManager.get(managerAddress);
  if (manager) {
    const stakingTokenAddr = normalizeAddress(params[0]);

    // Create Token entity for staking token with real metadata via Effect API
    let token = await context.Token.get(stakingTokenAddr);
    if (!token) {
      // Fetch actual token metadata from chain
      const metadata = await context.effect(fetchAllTokenMetadata, { address: stakingTokenAddr });
      context.Token.set({
        id: stakingTokenAddr,
        name: metadata.name || "Unknown",
        symbol: metadata.symbol || "UNKNOWN",
        decimals: metadata.decimals || 18,
        totalSupply: metadata.totalSupply || 0n,
      });
    }

    context.StakingManager.set({
      ...manager,
      owner_id: ownerAddr,
      stakingToken_id: stakingTokenAddr,
      minEscrowDuration: params[1],
      minStakeDuration: params[2],
      creatorShare: params[3],
      ownerShare: params[4],
    });
  }
});

StakingManager.ManagerOwnershipTransferred.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const previousOwner = normalizeAddress(event.params.previousOwner);
    const newOwner = normalizeAddress(event.params.newOwner);

    // Ensure both users exist
    if (!(await context.User.get(previousOwner))) context.User.set({ id: previousOwner });
    if (!(await context.User.get(newOwner))) context.User.set({ id: newOwner });

    const manager = await context.StakingManager.get(managerAddress);
    if (manager) {
      context.StakingManager.set({ ...manager, owner_id: newOwner });
    }
  }
);

StakingManager.TreasuryEscrowed.handler(async ({ event, context }) => {
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
      stakingManager_id: managerAddress,
      managerType: "StakingManager",
      managerUpdatedAt: timestamp,
    });
  }
});

StakingManager.TreasuryReclaimed.handler(async ({ event, context }) => {
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
      stakingManager_id: undefined,
      managerType: undefined,
      managerUpdatedAt: timestamp,
    });

    // Remove escrow if exists
    const escrow = await context.StakingManagerEscrow.get(collectionId);
    if (escrow) {
      context.StakingManagerEscrow.deleteUnsafe(collectionId);
    }
  }
});

StakingManager.Claim.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const senderAddr = normalizeAddress(event.params.sender);
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(senderAddr)))
    context.User.set({ id: senderAddr });

  const bundle = await context.Bundle.get(BUNDLE_ID);

  context.StakingManagerClaim.set({
    id: `${managerAddress}-${txHash}-${event.logIndex}`,
    manager_id: managerAddress,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    recipient_id: senderAddr,
    createdAt: timestamp,
    txHash,
  });
});

StakingManager.EscrowDurationExtended.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const flaunchAddr = normalizeAddress(event.params.flaunch);
  const tokenId = event.params.tokenId;
  const newDuration = event.params.newDuration;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Use subgraph-compatible ID format
  const collectionId = generateCollectionId(flaunchAddr, tokenId);
  const collection = await context.Collection.get(collectionId);
  if (!collection) return;

  let escrow = await context.StakingManagerEscrow.get(collectionId);

  if (escrow) {
    context.StakingManagerEscrow.set({
      ...escrow,
      timelockedUntil: newDuration,
      updatedAt: timestamp,
      txHash,
    });
  } else {
    context.StakingManagerEscrow.set({
      id: collectionId,
      manager_id: managerAddress,
      collection_id: collectionId,
      timelockedUntil: newDuration,
      createdAt: timestamp,
      updatedAt: timestamp,
      txHash,
    });
  }
});

StakingManager.Stake.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const stakerAddr = normalizeAddress(event.params.sender);
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(stakerAddr)))
    context.User.set({ id: stakerAddr });

  const manager = await context.StakingManager.get(managerAddress);
  if (!manager) return;

  const stakeId = `${managerAddress}-${stakerAddr}`;
  let stake = await context.StakingManagerStake.get(stakeId);

  if (!stake) {
    stake = {
      id: stakeId,
      manager_id: managerAddress,
      user_id: stakerAddr,
      amount: 0n,
      unlocksAt: timestamp + manager.minStakeDuration,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  // Increment stakers if new stake
  if (stake.amount === 0n) {
    context.StakingManager.set({
      ...manager,
      totalStakers: manager.totalStakers + 1n,
      totalStaked: manager.totalStaked + amount,
    });
  } else {
    context.StakingManager.set({
      ...manager,
      totalStaked: manager.totalStaked + amount,
    });
  }

  context.StakingManagerStake.set({
    ...stake,
    amount: stake.amount + amount,
    updatedAt: timestamp,
  });

  // Create stake delta
  context.StakingManagerStakeDelta.set({
    id: `${stakeId}-${txHash}-${event.logIndex}`,
    manager_id: managerAddress,
    user_id: stakerAddr,
    stake_id: stakeId,
    amount,
    createdAt: timestamp,
    txHash,
  });
});

StakingManager.Unstake.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const stakerAddr = normalizeAddress(event.params.sender);
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  if (!(await context.User.get(stakerAddr)))
    context.User.set({ id: stakerAddr });

  const stakeId = `${managerAddress}-${stakerAddr}`;
  const stake = await context.StakingManagerStake.get(stakeId);
  if (!stake) return;

  const newAmount = stake.amount - amount;

  context.StakingManagerStake.set({
    ...stake,
    amount: newAmount,
    updatedAt: timestamp,
  });

  // Create stake delta (negative)
  context.StakingManagerStakeDelta.set({
    id: `${stakeId}-${txHash}-${event.logIndex}`,
    manager_id: managerAddress,
    user_id: stakerAddr,
    stake_id: stakeId,
    amount: -amount,
    createdAt: timestamp,
    txHash,
  });

  // Update manager totals
  const manager = await context.StakingManager.get(managerAddress);
  if (manager) {
    if (newAmount === 0n) {
      context.StakingManager.set({
        ...manager,
        totalStakers: manager.totalStakers - 1n,
        totalStaked: manager.totalStaked - amount,
      });
    } else {
      context.StakingManager.set({
        ...manager,
        totalStaked: manager.totalStaked - amount,
      });
    }
  }
});

StakingManager.PermissionsUpdated.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.srcAddress);
  const permissions = normalizeAddress(event.params.permissions);

  const manager = await context.StakingManager.get(managerAddress);
  if (manager) {
    context.StakingManager.set({ ...manager, permissions });
  }
});

StakingManager.ETHReceivedFromUnknownSource.handler(
  async ({ event, context }) => {
    const managerAddress = normalizeAddress(event.srcAddress);
    const senderAddr = normalizeAddress(event.params.sender);
    const amount = event.params.amount;
    const timestamp = BigInt(event.block.timestamp);
    const txHash = event.transaction.hash || "";

    if (!(await context.User.get(senderAddr)))
      context.User.set({ id: senderAddr });

    const bundle = await context.Bundle.get(BUNDLE_ID);

    context.StakingManagerExternalETH.set({
      id: `${managerAddress}-${txHash}-${event.logIndex}`,
      manager_id: managerAddress,
      user_id: senderAddr,
      amount,
      amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
      createdAt: timestamp,
      txHash,
    });

    const manager = await context.StakingManager.get(managerAddress);
    if (manager) {
      context.StakingManager.set({
        ...manager,
        externalManagerETHTotal: manager.externalManagerETHTotal + amount,
      });
    }
  }
);






