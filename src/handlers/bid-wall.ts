/**
 * Bid Wall Handlers
 * Handles BidWall1 and BidWall2 contract events
 */

import { BidWall1, BidWall2 } from "generated";
import { ZERO_BI, CONFIG_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// BID WALL 1 HANDLERS
// =============================================================================

BidWall1.BidWallClosed.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);
  const ethAmount = event.params.amount;

  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      closed: true,
      balance: ZERO_BI,
    });
  }

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

  // Create BidWallRepositioned record
  const id = `${poolId}-${event.transaction.hash}`;
  context.BidWallRepositioned.set({
    id,
    pool_id: poolId,
    _eth: event.params.liquidity,
    _tickLower: Number(event.params.tickLower),
    _tickUpper: Number(event.params.tickUpper),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
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

  // Create BidWallDistribution entity
  context.BidWallDistribution.set({
    id: `${poolId}-${txHash}`,
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
  // BidWallDeposit has amount0 and amount1, use amount0 as ETH
  const ethAmount = event.params.amount0;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      balance: bidWall.balance + ethAmount,
      amount: bidWall.amount + ethAmount,
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
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);
  const ethAmount = event.params.amount;

  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      closed: true,
      balance: ZERO_BI,
    });
  }

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

  // Create BidWallDistribution entity
  context.BidWallDistribution.set({
    id: `${poolId}-${txHash}`,
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
  const ethAmount = event.params.amount0;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      balance: bidWall.balance + ethAmount,
      amount: bidWall.amount + ethAmount,
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




