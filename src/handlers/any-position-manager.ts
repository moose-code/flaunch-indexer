/**
 * Any Position Manager Handlers
 * Handles AnyPositionManager contract events
 */

import { AnyPositionManager, BigDecimal } from "generated";
import { ZERO_BI, ZERO_BD, CONFIG_ID, BUNDLE_ID } from "../utils/constants";
import { normalizeAddress, absBigInt } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";
import {
  getBidWallAddressForPositionManager,
  getFlaunchAddressForPositionManager,
  FLETH,
} from "../addresses/base";

const DEFAULT_FEE_DISTRIBUTION_ID = CONFIG_ID;

// =============================================================================
// ANY POSITION MANAGER HANDLERS
// =============================================================================

AnyPositionManager.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
  } else {
    // Create config if doesn't exist
    context.Config.set({
      id: CONFIG_ID,
      locked: false,
      lockerPaused: false,
      collectionCount: ZERO_BI,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalUsers: ZERO_BI,
      totalFeesETH: ZERO_BI,
      totalFeesUSDC: ZERO_BD,
      feeCalculator: event.params._feeCalculator,
      protocolFeeRecipient: "0x0000000000000000000000000000000000000000",
      feeDistribution_id: DEFAULT_FEE_DISTRIBUTION_ID,
      latestReferralEscrow: "0x0000000000000000000000000000000000000000",
      staleTimeWindow: ZERO_BI,
    });
  }
});

AnyPositionManager.FeeDistributionUpdated.handler(
  async ({ event, context }) => {
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
  }
);

AnyPositionManager.PoolCreated.handler(async ({ event, context }) => {
  // Pool creation - creates Pool, CollectionToken, Collection, BidWall, FairLaunch, MemecoinTreasury
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);

  // Extract params from tuple: [creator, ?, uint24, bytes, bytes] for AnyPositionManager
  const paramsData = event.params._params;
  const creator = normalizeAddress(paramsData[0]);

  // Ensure Bundle exists for ETH price
  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = {
      id: BUNDLE_ID,
      ethPriceUSDC: BigDecimal("2500"),
    };
    context.Bundle.set(bundle);
  }

  // Ensure Config exists
  let config = await context.Config.get(CONFIG_ID);
  if (!config) {
    config = {
      id: CONFIG_ID,
      locked: false,
      lockerPaused: false,
      collectionCount: ZERO_BI,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalUsers: ZERO_BI,
      totalFeesETH: ZERO_BI,
      totalFeesUSDC: ZERO_BD,
      feeCalculator: "0x0000000000000000000000000000000000000000",
      protocolFeeRecipient: "0x0000000000000000000000000000000000000000",
      feeDistribution_id: CONFIG_ID,
      latestReferralEscrow: "0x0000000000000000000000000000000000000000",
      staleTimeWindow: ZERO_BI,
    };
    context.Config.set(config);
  }

  // Create or get creator User
  let creatorUser = await context.User.get(creator);
  if (!creatorUser) {
    context.User.set({ id: creator });
  }

  // Get Flaunch address for this position manager
  const flaunchAddr =
    getFlaunchAddressForPositionManager(positionManager) || positionManager;
  const collectionId = `${flaunchAddr}-${tokenId.toString()}`;

  // Create Collection
  context.Collection.set({
    id: collectionId,
    tokenID: tokenId,
    contract: flaunchAddr,
    creator_id: creator,
    owner_id: creator,
    collectionToken_id: memecoin,
    name: "Unknown",
    symbol: "UNKNOWN",
    managerUpdatedAt: timestamp,
    managerType: undefined,
    revenueManager_id: undefined,
    stakingManager_id: undefined,
    buyBackManager_id: undefined,
    addressFeeSplitManager_id: undefined,
  });

  // Create CollectionToken
  const initialPrice = ZERO_BI;
  context.CollectionToken.set({
    id: memecoin,
    pool_id: poolId,
    collection_id: collectionId,
    creator_id: creator,
    owner_id: creator,
    name: "Unknown",
    symbol: "UNKNOWN",
    decimals: 18,
    totalSupply: ZERO_BI,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    totalCommunityFeesETH: ZERO_BD,
    totalCreatorFeesETH: ZERO_BD,
    derivedETH: initialPrice,
    tokenPrice: initialPrice,
    marketCapETH: ZERO_BI,
    marketCapUSDC: ZERO_BD,
    totalHolders: ZERO_BI,
    isNative: flipped,
    createdAt: timestamp,
    baseURI: "",
    creationFee: ZERO_BI,
    fairLaunch_id: poolId,
    metadata_id: undefined,
    lastMinuteRecorded: ZERO_BI,
    lastMinuteArchived: ZERO_BI,
    lastHourRecorded: ZERO_BI,
    lastHourArchived: ZERO_BI,
    lastFifteenMinuteRecorded: ZERO_BI,
    lastFifteenMinuteArchived: ZERO_BI,
    lastFourHourRecorded: ZERO_BI,
    lastFourHourArchived: ZERO_BI,
    minuteArray: [],
    hourArray: [],
    fifteenMinuteArray: [],
    fourHourArray: [],
  });

  // Create Pool
  context.Pool.set({
    id: poolId,
    collectionToken_id: memecoin,
    sqrtPriceX96: ZERO_BI,
    tickSpacing: 60,
    tick: 0,
    fairLaunchedEnded: false,
    liquidity: ZERO_BI,
    liveAtTimestamp: timestamp,
    flipped,
    startingMarketCap: ZERO_BI,
    startingMarketCapETH: ZERO_BI,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    totalFeesToken: ZERO_BI,
    totalFeesTokenConverted: ZERO_BI,
    totalCommunityFeesETH: ZERO_BD,
    totalCreatorFeesETH: ZERO_BD,
    ispEthIn: ZERO_BI,
    ispTokenOut: ZERO_BI,
    bidWall_id: poolId,
    poolFees_id: poolId,
    memecoinTreasury_id: memecoinTreasury,
    feeAllocation_id: undefined,
    feeDistribution_id: undefined,
    positionManager,
  });

  // Create BidWall
  const bidWallAddr =
    getBidWallAddressForPositionManager(positionManager) || positionManager;
  context.BidWall.set({
    id: poolId,
    pool_id: poolId,
    collectionToken_id: memecoin,
    contract: bidWallAddr,
    initialized: false,
    amount: ZERO_BI,
    balance: ZERO_BI,
    tickLower: ZERO_BI,
    tickUpper: ZERO_BI,
    deployedETH: ZERO_BI,
    closed: false,
  });

  // Create FairLaunch
  context.FairLaunch.set({
    id: poolId,
    active: true,
    collectionToken_id: memecoin,
    tick: 0,
    initialSupply: ZERO_BI,
    soldInitialSupply: ZERO_BI,
    ethEarned: ZERO_BI,
    starts_at: timestamp,
    ends_at: ZERO_BI,
  });

  // Create MemecoinTreasury
  context.MemecoinTreasury.set({
    id: memecoinTreasury,
    pool_id: poolId,
    createdAt: timestamp,
    totalETH: ZERO_BI,
    totalToken: ZERO_BI,
    totalActions: ZERO_BI,
    lastActionTimestamp: timestamp,
  });

  // Create PoolFees
  context.PoolFees.set({
    id: poolId,
    ethAvailable: ZERO_BI,
    tokenAvailable: ZERO_BI,
    totalEthIn: ZERO_BI,
    totalTokenIn: ZERO_BI,
  });

  // Create NFTLookup
  const nftLookupId = `${flaunchAddr}-${tokenId.toString()}`;
  context.NFTLookup.set({
    id: nftLookupId,
    collectionToken_id: memecoin,
  });

  // Create PoolCollectionLookup
  context.PoolCollectionLookup.set({
    id: memecoin,
    collectionToken_id: memecoin,
  });

  // Increment collection count
  context.Config.set({
    ...config,
    collectionCount: config.collectionCount + 1n,
  });
});

// Contract registration
AnyPositionManager.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

AnyPositionManager.PoolSwap.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";
  const maker = normalizeAddress(
    event.transaction.from || "0x0000000000000000000000000000000000000000"
  );
  const pool = await context.Pool.get(poolId);
  if (!pool) return;
  if (!(await context.User.get(maker))) context.User.set({ id: maker });
  let totalETHAmount = 0n,
    totalTokenAmount = 0n,
    isBuy = false;
  let flETHAmount = 0n,
    ispETHAmount = 0n,
    uniETHAmount = 0n;
  if (!pool.flipped) {
    totalETHAmount =
      absBigInt(event.params.flAmount0) +
      absBigInt(event.params.ispAmount0) +
      absBigInt(event.params.uniAmount0);
    totalTokenAmount =
      absBigInt(event.params.flAmount1) +
      absBigInt(event.params.ispAmount1) +
      absBigInt(event.params.uniAmount1);
    flETHAmount = absBigInt(event.params.flAmount0);
    ispETHAmount = absBigInt(event.params.ispAmount0);
    uniETHAmount = absBigInt(event.params.uniAmount0);
    if (
      event.params.flAmount1 > 0n ||
      event.params.ispAmount1 > 0n ||
      event.params.uniAmount1 > 0n
    )
      isBuy = true;
  } else {
    totalETHAmount =
      absBigInt(event.params.flAmount1) +
      absBigInt(event.params.ispAmount1) +
      absBigInt(event.params.uniAmount1);
    totalTokenAmount =
      absBigInt(event.params.flAmount0) +
      absBigInt(event.params.ispAmount0) +
      absBigInt(event.params.uniAmount0);
    flETHAmount = absBigInt(event.params.flAmount1);
    ispETHAmount = absBigInt(event.params.ispAmount1);
    uniETHAmount = absBigInt(event.params.uniAmount1);
    if (
      event.params.flAmount0 > 0n ||
      event.params.ispAmount0 > 0n ||
      event.params.uniAmount0 > 0n
    )
      isBuy = true;
  }
  const bundle = await context.Bundle.get(BUNDLE_ID);
  const collectionToken = await context.CollectionToken.get(
    pool.collectionToken_id
  );
  if (collectionToken) {
    const newVolumeETH = collectionToken.volumeETH + totalETHAmount;
    context.CollectionToken.set({
      ...collectionToken,
      volumeETH: newVolumeETH,
      volumeUSDC: convertETHtoUSDCWithBundle(newVolumeETH, bundle),
    });
  }
  context.PoolSwap.set({
    id: `${txHash}-${event.logIndex}`,
    maker_id: maker,
    timestamp,
    txHash,
    pool_id: poolId,
    fairLaunchAmount0: event.params.flAmount0,
    fairLaunchAmount1: event.params.flAmount1,
    ispAmount0: event.params.ispAmount0,
    ispAmount1: event.params.ispAmount1,
    uniswapAmount0: event.params.uniAmount0,
    uniswapAmount1: event.params.uniAmount1,
    fairLaunchFee0: event.params.flFee0,
    fairLaunchFee1: event.params.flFee1,
    ispFee0: event.params.ispFee0,
    ispFee1: event.params.ispFee1,
    uniswapFee0: event.params.uniFee0,
    uniswapFee1: event.params.uniFee1,
    flAmountUSDC: convertETHtoUSDCWithBundle(flETHAmount, bundle),
    ispAmountUSDC: convertETHtoUSDCWithBundle(ispETHAmount, bundle),
    uniAmountUSDC: convertETHtoUSDCWithBundle(uniETHAmount, bundle),
    totalAmountUSDC: convertETHtoUSDCWithBundle(totalETHAmount, bundle),
    swapType: isBuy ? "Buy" : "Sell",
    userHolding_id: undefined,
  });
  context.Activity.set({
    id: `${txHash}-${event.logIndex}-activity`,
    maker_id: maker,
    timestamp,
    txHash,
    token_id: pool.collectionToken_id,
    amountETH: totalETHAmount,
    amountToken: totalTokenAmount,
    activityType: isBuy ? "Buy" : "Sell",
  });
});

AnyPositionManager.PoolStateUpdated.handler(async ({ event, context }) => {
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
    if (fairLaunch)
      context.FairLaunch.set({
        ...fairLaunch,
        tick: Number(event.params._tick),
      });
  }
});

AnyPositionManager.PoolFeesReceived.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const totalFeesETH = event.params._amount0;
  const totalFeesToken = event.params._amount1;
  const pool = await context.Pool.get(poolId);
  if (!pool) return;
  const poolFees = await context.PoolFees.get(poolId);
  if (poolFees) {
    context.PoolFees.set({
      ...poolFees,
      ethAvailable: poolFees.ethAvailable + totalFeesETH,
      tokenAvailable: poolFees.tokenAvailable + totalFeesToken,
      totalEthIn: poolFees.totalEthIn + totalFeesETH,
      totalTokenIn: poolFees.totalTokenIn + totalFeesToken,
    });
  }
  context.Pool.set({
    ...pool,
    totalFeesToken: pool.totalFeesToken + totalFeesToken,
    totalFeesTokenConverted: pool.totalFeesTokenConverted + totalFeesETH,
  });
});

AnyPositionManager.PoolFeesDistributed.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const feesETH = event.params._donateAmount;
  const txHash = event.transaction.hash || "";
  const timestamp = BigInt(event.block.timestamp);
  const bundle = await context.Bundle.get(BUNDLE_ID);
  const communityFees = BigDecimal(event.params._bidWallAmount.toString()).plus(
    BigDecimal(event.params._governanceAmount.toString())
  );
  const creatorFeesBD = BigDecimal(event.params._creatorAmount.toString());
  const pool = await context.Pool.get(poolId);
  if (!pool) return;
  const collectionToken = await context.CollectionToken.get(
    pool.collectionToken_id
  );
  if (collectionToken) {
    context.CollectionToken.set({
      ...collectionToken,
      totalCommunityFeesETH:
        collectionToken.totalCommunityFeesETH.plus(communityFees),
      totalCreatorFeesETH:
        collectionToken.totalCreatorFeesETH.plus(creatorFeesBD),
      totalFeesETH: collectionToken.totalFeesETH + feesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(
        collectionToken.totalFeesETH + feesETH,
        bundle
      ),
    });
  }
  context.Pool.set({
    ...pool,
    totalCommunityFeesETH: pool.totalCommunityFeesETH.plus(communityFees),
    totalCreatorFeesETH: pool.totalCreatorFeesETH.plus(creatorFeesBD),
    totalFeesETH: pool.totalFeesETH + feesETH,
    totalFeesUSDC: convertETHtoUSDCWithBundle(
      pool.totalFeesETH + feesETH,
      bundle
    ),
  });
  context.PoolFeeDistribution.set({
    id: `${txHash}-${event.logIndex}`,
    pool_id: poolId,
    timestamp,
    amount: feesETH,
    creatorAmount: event.params._creatorAmount,
    bidWallAmount: event.params._bidWallAmount,
    governanceAmount: event.params._governanceAmount,
    protocolAmount: event.params._protocolAmount,
  });
});

AnyPositionManager.PoolFeesSwapped.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const amount0 = event.params._amount0;
  const amount1 = event.params._amount1;
  const zeroForOne = event.params.zeroForOne;
  const poolFees = await context.PoolFees.get(poolId);
  if (poolFees) {
    if (zeroForOne)
      context.PoolFees.set({
        ...poolFees,
        ethAvailable: poolFees.ethAvailable - amount0,
        tokenAvailable: poolFees.tokenAvailable + amount1,
      });
    else
      context.PoolFees.set({
        ...poolFees,
        ethAvailable: poolFees.ethAvailable + amount0,
        tokenAvailable: poolFees.tokenAvailable - amount1,
      });
  }
});

AnyPositionManager.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {
    const poolId = event.params._poolId;
    const feeData = event.params._feeDistribution;

    const feeDistId = `pool-${poolId}`;
    context.FeeDistribution.set({
      id: feeDistId,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      community: undefined,
      active: feeData[3],
      creator: undefined,
    });

    const pool = await context.Pool.get(poolId);
    if (pool) {
      context.Pool.set({ ...pool, feeDistribution_id: feeDistId });
    }
  }
);

AnyPositionManager.ReferrerFeePaid.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const recipient = normalizeAddress(event.params._recipient);
  const token = normalizeAddress(event.params._token);
  const amount = event.params._amount;
  const txHash = event.transaction.hash || "";
  const timestamp = BigInt(event.block.timestamp);

  if (!(await context.User.get(recipient))) context.User.set({ id: recipient });

  const isETH =
    token === "0x0000000000000000000000000000000000000000" || token === FLETH;
  context.ReferrerFee.set({
    id: `${txHash}-${event.logIndex}`,
    pool_id: poolId,
    recipient_id: recipient,
    txHash,
    isETH,
    token_id: isETH ? undefined : token,
    amount,
    amountInETH: isETH ? amount : 0n,
    timestamp,
  });
});

AnyPositionManager.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const referralEscrow = normalizeAddress(event.params._referralEscrow);

  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({ ...config, latestReferralEscrow: referralEscrow });
  }
});

// Contract registration for ReferralEscrow
AnyPositionManager.ReferralEscrowUpdated.contractRegister(
  ({ event, context }) => {
    context.addReferralEscrow(event.params._referralEscrow);
  }
);

