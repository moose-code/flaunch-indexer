/**
 * Position Manager 1 Handlers
 */

import { PositionManager1 } from "generated";
import { CONFIG_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";
import {
  createPoolEntities,
  processPoolSwap,
  processPoolFeesReceived,
  processPoolFeesDistributed,
} from "./position-manager-common";

// =============================================================================
// POSITION MANAGER 1 HANDLERS
// =============================================================================

PositionManager1.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

PositionManager1.PoolCreated.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const flaunchFee = event.params._flaunchFee;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);

  // PM1 params: [name, symbol, tokenURI, initialSupply, maxSupply, creator, ...]
  const paramsData = event.params._params;
  const name = paramsData[0] || "Unknown";
  const symbol = paramsData[1] || "UNKNOWN";
  const creator = normalizeAddress(paramsData[5]);

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

PositionManager1.PoolSwap.handler(async ({ event, context }) => {
  await processPoolSwap(context, event, event.params.poolId);
});

PositionManager1.PoolStateUpdated.handler(async ({ event, context }) => {
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

PositionManager1.PoolFeesReceived.handler(async ({ event, context }) => {
  await processPoolFeesReceived(context, event, event.params._poolId);
});

PositionManager1.PoolFeesDistributed.handler(async ({ event, context }) => {
  await processPoolFeesDistributed(context, event, event.params._poolId);
});

PositionManager1.PoolFeesSwapped.handler(async ({ event, context }) => {
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

PositionManager1.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {}
);

PositionManager1.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  if (!(await context.User.get(recipient)))
    context.User.set({ id: recipient });
});

PositionManager1.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const referralEscrow = normalizeAddress(event.params._referralEscrow);
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({ ...config, latestReferralEscrow: referralEscrow });
  }
});

PositionManager1.ReferralEscrowUpdated.contractRegister(
  ({ event, context }) => {
    context.addReferralEscrow(event.params._referralEscrow);
  }
);

PositionManager1.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
  }
});

PositionManager1.FeeDistributionUpdated.handler(async ({ event, context }) => {
  const globalFeeId = CONFIG_ID;
  const feeDistribution = await context.FeeDistribution.get(globalFeeId);
  const feeData = event.params._feeDistribution;

  if (!feeDistribution) {
    context.FeeDistribution.set({
      id: globalFeeId,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      community: undefined,
      active: feeData[3],
      creator: undefined,
    });
  } else {
    context.FeeDistribution.set({
      ...feeDistribution,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      active: feeData[3],
    });
  }
});

PositionManager1.FairLaunchFeeCalculatorUpdated.handler(
  async ({ event, context }) => {}
);

PositionManager1.InitialPriceUpdated.handler(async ({ event, context }) => {});

PositionManager1.CreatorFeeAllocationUpdated.handler(
  async ({ event, context }) => {}
);

PositionManager1.Deposit.handler(async ({ event, context }) => {
  const payee = normalizeAddress(event.params._payee);
  if (!(await context.User.get(payee))) context.User.set({ id: payee });
});

PositionManager1.Withdrawal.handler(async ({ event, context }) => {
  const sender = normalizeAddress(event.params._sender);
  if (!(await context.User.get(sender))) context.User.set({ id: sender });
});

PositionManager1.PoolPremine.handler(async ({ event, context }) => {
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

PositionManager1.PoolScheduled.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const flaunchesAt = event.params._flaunchesAt;

  const pool = await context.Pool.get(poolId);
  if (pool) {
    context.Pool.set({ ...pool, liveAtTimestamp: flaunchesAt });
  }
});

PositionManager1.OwnershipTransferred.handler(async ({ event, context }) => {});
PositionManager1.OwnershipHandoverRequested.handler(
  async ({ event, context }) => {}
);
PositionManager1.OwnershipHandoverCanceled.handler(
  async ({ event, context }) => {}
);


