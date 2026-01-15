/**
 * Bid Wall Handlers
 * Handles BidWall1 and BidWall2 contract events
 */

import { BidWall1, BidWall2 } from "generated";
import { ZERO_BI, CONFIG_ID } from "../utils/constants";
import { normalizeAddress, concatBytes } from "../utils/helpers";

// =============================================================================
// BID WALL 1 HANDLERS
// =============================================================================

BidWall1.BidWallClosed.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params.recipient);
  const ethAmount = event.params.amount;

  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }

  // Subgraph only updates MemecoinTreasury on BidWallClosed, NOT the BidWall entity
  // Update MemecoinTreasury ETH balance (recipient is the treasury address)
  const treasury = await context.MemecoinTreasury.get(recipient);
  if (treasury) {
    context.MemecoinTreasury.set({
      ...treasury,
      totalETH: treasury.totalETH + ethAmount,
    });
  }
});

BidWall1.BidWallRepositioned.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      tickLower: event.params.tickLower,
      tickUpper: event.params.tickUpper,
      deployedETH: event.params.liquidity,
    });
  }

  // Create BidWallRepositioned record (subgraph: id.concat(txHash))
  const txHash = event.transaction.hash || "";
  context.BidWallRepositioned.set({
    id: concatBytes(poolId, txHash),
    pool_id: poolId,
    _eth: event.params.liquidity,
    _tickLower: Number(event.params.tickLower),
    _tickUpper: Number(event.params.tickUpper),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: txHash,
  });
});

BidWall1.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);
  const tokensAmount = event.params.amount;
  const txHash = event.transaction.hash || "";

  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }

  // Get pool to find collection token
  const poolLookup = await context.PoolCollectionLookup.get(poolId);
  if (!poolLookup) return;

  const collectionTokenId = poolLookup.collectionToken_id;

  // Create BidWallDistribution entity (subgraph: id.concat(txHash))
  context.BidWallDistribution.set({
    id: concatBytes(poolId, txHash),
    bidWall_id: poolId,
    collectionToken_id: collectionTokenId,
    amount: tokensAmount,
    recipient_id: recipient,
  });

  // Update MemecoinTreasury token balance (recipient is the treasury address)
  const treasury = await context.MemecoinTreasury.get(recipient);
  if (treasury) {
    context.MemecoinTreasury.set({
      ...treasury,
      totalToken: treasury.totalToken + tokensAmount,
    });
  }
});

BidWall1.BidWallDeposit.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  // Subgraph includes both added AND pending in the balance calculation
  const addedAmount = event.params.added;
  const pendingAmount = event.params.pending;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      balance: bidWall.balance + addedAmount + pendingAmount,
    });
  }
});

BidWall1.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({ ...bidWall, closed: event.params.disabled });
  }
});

// =============================================================================
// BID WALL 2 HANDLERS
// =============================================================================

BidWall2.BidWallClosed.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params.recipient);
  const ethAmount = event.params.amount;

  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }

  // Subgraph only updates MemecoinTreasury on BidWallClosed, NOT the BidWall entity
  // Update MemecoinTreasury ETH balance (recipient is the treasury address)
  const treasury = await context.MemecoinTreasury.get(recipient);
  if (treasury) {
    context.MemecoinTreasury.set({
      ...treasury,
      totalETH: treasury.totalETH + ethAmount,
    });
  }
});

BidWall2.BidWallRepositioned.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      tickLower: event.params.tickLower,
      tickUpper: event.params.tickUpper,
      deployedETH: event.params.liquidity,
    });
  }
});

BidWall2.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);
  const tokensAmount = event.params.amount;
  const txHash = event.transaction.hash || "";

  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }

  // Get pool to find collection token
  const poolLookup = await context.PoolCollectionLookup.get(poolId);
  if (!poolLookup) return;

  const collectionTokenId = poolLookup.collectionToken_id;

  // Create BidWallDistribution entity (subgraph: id.concat(txHash))
  context.BidWallDistribution.set({
    id: concatBytes(poolId, txHash),
    bidWall_id: poolId,
    collectionToken_id: collectionTokenId,
    amount: tokensAmount,
    recipient_id: recipient,
  });

  // Update MemecoinTreasury token balance (recipient is the treasury address)
  const treasury = await context.MemecoinTreasury.get(recipient);
  if (treasury) {
    context.MemecoinTreasury.set({
      ...treasury,
      totalToken: treasury.totalToken + tokensAmount,
    });
  }
});

BidWall2.BidWallDeposit.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  // Subgraph includes both added AND pending in the balance calculation
  const addedAmount = event.params.added;
  const pendingAmount = event.params.pending;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      balance: bidWall.balance + addedAmount + pendingAmount,
    });
  }
});

BidWall2.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({ ...bidWall, closed: event.params.disabled });
  }
});

BidWall2.StaleTimeWindowUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      staleTimeWindow: event.params.staleTimeWindow,
    });
  }
});
