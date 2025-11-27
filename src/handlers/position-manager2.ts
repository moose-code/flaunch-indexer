/**
 * Position Manager 2 Handlers
 */

import { PositionManager2 } from "generated";
import { CONFIG_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";
import {
  createPoolEntities,
  processPoolSwap,
  processPoolFeesReceived,
  processPoolFeesDistributed,
} from "./position-manager-common";

// =============================================================================
// POSITION MANAGER 2 HANDLERS
// =============================================================================

PositionManager2.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

PositionManager2.PoolCreated.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const flaunchFee = event.params._flaunchFee;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);

  // PM2 params: [name, symbol, tokenURI, initialSupply, maxSupply, ?, creator, ...]
  const paramsData = event.params._params;
  const name = paramsData[0] || "Unknown";
  const symbol = paramsData[1] || "UNKNOWN";
  const creator = normalizeAddress(paramsData[6]); // Different index for PM2

  await createPoolEntities(
    context,
    poolId,
    memecoin,
    memecoinTreasury,
    tokenId,
    flipped,
    flaunchFee,
    timestamp,
    positionManager,
    name,
    symbol,
    creator
  );
});

PositionManager2.PoolSwap.handler(async ({ event, context }) => {
  await processPoolSwap(context, event, event.params.poolId);
});

PositionManager2.PoolStateUpdated.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  context.Pool.set({
    ...pool,
    sqrtPriceX96: event.params._sqrtPriceX96,
    liquidity: event.params._liquidity,
    tick: Number(event.params._tick),
  });

  if (!pool.fairLaunchedEnded) {
    const fairLaunch = await context.FairLaunch.get(poolId);
    if (fairLaunch) {
      context.FairLaunch.set({
        ...fairLaunch,
        tick: Number(event.params._tick),
      });
    }
  }
});

PositionManager2.PoolFeesReceived.handler(async ({ event, context }) => {
  await processPoolFeesReceived(context, event, event.params._poolId);
});

PositionManager2.PoolFeesDistributed.handler(async ({ event, context }) => {
  await processPoolFeesDistributed(context, event, event.params._poolId);
});

PositionManager2.PoolFeesSwapped.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const amount0 = event.params._amount0;
  const amount1 = event.params._amount1;
  const zeroForOne = event.params.zeroForOne;

  const poolFees = await context.PoolFees.get(poolId);
  if (poolFees) {
    if (zeroForOne) {
      context.PoolFees.set({
        ...poolFees,
        ethAvailable: poolFees.ethAvailable - amount0,
        tokenAvailable: poolFees.tokenAvailable + amount1,
      });
    } else {
      context.PoolFees.set({
        ...poolFees,
        ethAvailable: poolFees.ethAvailable + amount0,
        tokenAvailable: poolFees.tokenAvailable - amount1,
      });
    }
  }
});

PositionManager2.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {}
);

PositionManager2.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  if (!(await context.User.get(recipient)))
    context.User.set({ id: recipient });
});

PositionManager2.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const referralEscrow = normalizeAddress(event.params._referralEscrow);
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({ ...config, latestReferralEscrow: referralEscrow });
  }
});

PositionManager2.ReferralEscrowUpdated.contractRegister(
  ({ event, context }) => {
    context.addReferralEscrow(event.params._referralEscrow);
  }
);

PositionManager2.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
  }
});

PositionManager2.FeeDistributionUpdated.handler(
  async ({ event, context }) => {}
);

PositionManager2.FairLaunchFeeCalculatorUpdated.handler(
  async ({ event, context }) => {}
);

PositionManager2.PoolPremine.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const premineAmount = event.params._premineAmount;
  const txHash = event.transaction.hash || "";

  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  const collectionToken = await context.CollectionToken.get(
    pool.collectionToken_id
  );
  if (!collectionToken) return;

  context.PoolPremine.set({
    id: `${txHash}-${event.logIndex}`,
    pool_id: poolId,
    receiver_id: collectionToken.creator_id,
    amount: premineAmount,
  });
});

PositionManager2.PoolScheduled.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const flaunchesAt = event.params._flaunchesAt;

  const pool = await context.Pool.get(poolId);
  if (pool) {
    context.Pool.set({ ...pool, liveAtTimestamp: flaunchesAt });
  }
});


