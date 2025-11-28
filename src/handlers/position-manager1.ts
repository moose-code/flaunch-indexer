/**
 * Position Manager 1 Handlers
 */

import { PositionManager1 } from "generated";
import { CONFIG_ID, ZERO_BI, ZERO_BD, BUNDLE_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";
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
  const initialSupply = BigInt(paramsData[3] || "0");
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
    creator,
    initialSupply
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
  async ({ event, context }) => {
    const poolId = event.params._poolId;
    const allocation = event.params._allocation;

    const pool = await context.Pool.get(poolId);
    if (!pool) return;

    // Create or update FeeAllocation
    const feeAllocationId = `pool-${poolId}`;
    let feeAllocation = await context.FeeAllocation.get(feeAllocationId);

    // allocation is the creator's share (out of 100)
    const creatorShare = Number(allocation);
    const communityShare = 100 - creatorShare;

    if (!feeAllocation) {
      context.FeeAllocation.set({
        id: feeAllocationId,
        creator: creatorShare,
        community: communityShare,
      });
    } else {
      context.FeeAllocation.set({
        ...feeAllocation,
        creator: creatorShare,
        community: communityShare,
      });
    }

    // Link pool to fee allocation
    context.Pool.set({
      ...pool,
      feeAllocation_id: feeAllocationId,
    });
  }
);

PositionManager1.Deposit.handler(async ({ event, context }) => {
  const payee = normalizeAddress(event.params._payee);
  const poolId = event.params._poolId;
  const amount = event.params._amount;
  const timestamp = BigInt(event.block.timestamp);

  // Ensure User exists
  if (!(await context.User.get(payee))) {
    context.User.set({ id: payee });
  }

  // Get bundle for USD conversion
  const bundle = await context.Bundle.get(BUNDLE_ID);

  // 1. Create or update UserFee for the payee
  const userFeeId = payee;
  let userFee = await context.UserFee.get(userFeeId);
  if (!userFee) {
    userFee = {
      id: userFeeId,
      payee_id: payee,
      claimableAmount: ZERO_BI,
      claimableAmountUSDC: ZERO_BD,
      lifetimeFees: ZERO_BI,
      totalClaimed: ZERO_BI,
      totalClaimedUSDC: ZERO_BD,
      updatedAt: timestamp,
    };
  }

  context.UserFee.set({
    ...userFee,
    claimableAmount: userFee.claimableAmount + amount,
    claimableAmountUSDC: userFee.claimableAmountUSDC.plus(
      convertETHtoUSDCWithBundle(amount, bundle)
    ),
    lifetimeFees: userFee.lifetimeFees + amount,
    updatedAt: timestamp,
  });

  // 2. Find the collection token from the pool
  const poolLookup = await context.PoolCollectionLookup.get(poolId);
  if (!poolLookup) return;

  const collectionTokenId = poolLookup.collectionToken_id;

  // 3. Create or update UserCollectionFee
  const userCollectionFeeId = `${payee}-${collectionTokenId}`;
  let userCollectionFee = await context.UserCollectionFee.get(userCollectionFeeId);
  if (!userCollectionFee) {
    userCollectionFee = {
      id: userCollectionFeeId,
      user_id: payee,
      collectionToken_id: collectionTokenId,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
  }

  context.UserCollectionFee.set({
    ...userCollectionFee,
    lifetimeFees: userCollectionFee.lifetimeFees + amount,
    updatedAt: timestamp,
  });

  // 4. Create or update CollectionFee
  const collectionFeeId = collectionTokenId;
  let collectionFee = await context.CollectionFee.get(collectionFeeId);
  if (!collectionFee) {
    collectionFee = {
      id: collectionFeeId,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
  }

  context.CollectionFee.set({
    ...collectionFee,
    lifetimeFees: collectionFee.lifetimeFees + amount,
    updatedAt: timestamp,
  });
});

PositionManager1.Withdrawal.handler(async ({ event, context }) => {
  const sender = normalizeAddress(event.params._sender);
  const recipient = normalizeAddress(event.params._recipient);
  const amount = event.params._amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Ensure Users exist
  if (!(await context.User.get(sender))) {
    context.User.set({ id: sender });
  }
  if (!(await context.User.get(recipient))) {
    context.User.set({ id: recipient });
  }

  // Get bundle for USD conversion
  const bundle = await context.Bundle.get(BUNDLE_ID);

  // Update UserFee - reset claimable, add to totalClaimed
  const userFeeId = recipient;
  let userFee = await context.UserFee.get(userFeeId);
  if (!userFee) {
    userFee = {
      id: userFeeId,
      payee_id: recipient,
      claimableAmount: ZERO_BI,
      claimableAmountUSDC: ZERO_BD,
      lifetimeFees: ZERO_BI,
      totalClaimed: ZERO_BI,
      totalClaimedUSDC: ZERO_BD,
      updatedAt: timestamp,
    };
  }

  context.UserFee.set({
    ...userFee,
    claimableAmount: ZERO_BI,
    claimableAmountUSDC: ZERO_BD,
    totalClaimed: userFee.totalClaimed + amount,
    totalClaimedUSDC: userFee.totalClaimedUSDC.plus(
      convertETHtoUSDCWithBundle(amount, bundle)
    ),
    updatedAt: timestamp,
  });

  // Create UserFeeClaimed record
  const userFeeClaimedId = `${txHash}-${event.logIndex}`;
  context.UserFeeClaimed.set({
    id: userFeeClaimedId,
    payee_id: recipient,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    date: timestamp,
    txHash,
  });
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




