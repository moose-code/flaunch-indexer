/**
 * Position Manager Common Utilities
 * Shared functions for PositionManager handlers
 */

import { BigDecimal } from "generated";
import { ZERO_BI, ZERO_BD, CONFIG_ID, BUNDLE_ID } from "../utils/constants";
import { normalizeAddress, absBigInt } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";
import {
  getBidWallAddressForPositionManager,
  getFlaunchAddressForPositionManager,
} from "../addresses/base";
import {
  updateTokenDayData,
  updateTokenHourData,
  updateTokenMinuteData,
  updateToken15MinuteData,
  updateToken4HourData,
} from "../utils/timeseries";

/**
 * Create all entities for a new pool
 */
export async function createPoolEntities(
  context: any,
  poolId: string,
  memecoin: string,
  memecoinTreasury: string,
  tokenId: bigint,
  flipped: boolean,
  flaunchFee: bigint,
  timestamp: bigint,
  positionManager: string,
  name: string,
  symbol: string,
  creator: string
) {
  // Ensure Bundle exists for ETH price
  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = { id: BUNDLE_ID, ethPriceUSDC: BigDecimal("2500") };
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
  if (!(await context.User.get(creator))) {
    context.User.set({ id: creator });
  }

  // Get Flaunch and BidWall addresses
  const flaunchAddr =
    getFlaunchAddressForPositionManager(positionManager) || positionManager;
  const collectionId = `${flaunchAddr}-${tokenId.toString()}`;
  const bidWallAddr =
    getBidWallAddressForPositionManager(positionManager) || positionManager;

  // Create Collection
  context.Collection.set({
    id: collectionId,
    tokenID: tokenId,
    contract: flaunchAddr,
    creator_id: creator,
    owner_id: creator,
    collectionToken_id: memecoin,
    name,
    symbol,
    managerUpdatedAt: timestamp,
    managerType: undefined,
    revenueManager_id: undefined,
    stakingManager_id: undefined,
    buyBackManager_id: undefined,
    addressFeeSplitManager_id: undefined,
  });

  // Create CollectionToken
  context.CollectionToken.set({
    id: memecoin,
    pool_id: poolId,
    collection_id: collectionId,
    creator_id: creator,
    owner_id: creator,
    name,
    symbol,
    decimals: 18,
    totalSupply: ZERO_BI,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    totalCommunityFeesETH: ZERO_BD,
    totalCreatorFeesETH: ZERO_BD,
    derivedETH: ZERO_BI,
    tokenPrice: ZERO_BI,
    marketCapETH: ZERO_BI,
    marketCapUSDC: ZERO_BD,
    totalHolders: ZERO_BI,
    isNative: flipped,
    createdAt: timestamp,
    baseURI: "",
    creationFee: flaunchFee,
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
  context.NFTLookup.set({
    id: collectionId,
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
}

/**
 * Process a pool swap event
 */
export async function processPoolSwap(
  context: any,
  event: any,
  poolId: string
) {
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";
  const maker = normalizeAddress(
    event.transaction.from || "0x0000000000000000000000000000000000000000"
  );

  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  if (!(await context.User.get(maker))) context.User.set({ id: maker });

  let totalETHAmount = 0n;
  let totalTokenAmount = 0n;
  let totalFeeETH = 0n;
  let isBuy = false;
  let flETHAmount = 0n;
  let ispETHAmount = 0n;
  let uniETHAmount = 0n;

  if (!pool.flipped) {
    totalETHAmount =
      absBigInt(event.params.flAmount0) +
      absBigInt(event.params.ispAmount0) +
      absBigInt(event.params.uniAmount0);
    totalTokenAmount =
      absBigInt(event.params.flAmount1) +
      absBigInt(event.params.ispAmount1) +
      absBigInt(event.params.uniAmount1);
    totalFeeETH =
      absBigInt(event.params.flFee0) +
      absBigInt(event.params.ispFee0) +
      absBigInt(event.params.uniFee0);
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
    totalFeeETH =
      absBigInt(event.params.flFee1) +
      absBigInt(event.params.ispFee1) +
      absBigInt(event.params.uniFee1);
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
  const flAmountUSDC = convertETHtoUSDCWithBundle(flETHAmount, bundle);
  const ispAmountUSDC = convertETHtoUSDCWithBundle(ispETHAmount, bundle);
  const uniAmountUSDC = convertETHtoUSDCWithBundle(uniETHAmount, bundle);
  const totalAmountUSDC = convertETHtoUSDCWithBundle(totalETHAmount, bundle);

  // Get and update CollectionToken
  const collectionToken = await context.CollectionToken.get(
    pool.collectionToken_id
  );
  if (collectionToken) {
    const newVolumeETH = collectionToken.volumeETH + totalETHAmount;
    const updatedToken = {
      ...collectionToken,
      volumeETH: newVolumeETH,
      volumeUSDC: convertETHtoUSDCWithBundle(newVolumeETH, bundle),
    };
    context.CollectionToken.set(updatedToken);

    // Update time series for FairLaunch or ISP swaps
    const isFairLaunchSwap =
      absBigInt(event.params.flAmount0) > 0n ||
      absBigInt(event.params.flAmount1) > 0n;
    const isISPSwap =
      absBigInt(event.params.ispAmount0) > 0n ||
      absBigInt(event.params.ispAmount1) > 0n;

    if (isFairLaunchSwap || isISPSwap) {
      const openPrice = collectionToken.derivedETH;
      const [dayData, hourData, minuteData, fifteenData, fourHourData] =
        await Promise.all([
          updateTokenDayData(context, updatedToken, timestamp, openPrice),
          updateTokenHourData(context, updatedToken, timestamp, openPrice),
          updateTokenMinuteData(context, updatedToken, timestamp, openPrice),
          updateToken15MinuteData(context, updatedToken, timestamp, openPrice),
          updateToken4HourData(context, updatedToken, timestamp, openPrice),
        ]);

      context.TokenDayData.set({
        ...dayData,
        volumeETH: dayData.volumeETH + totalETHAmount,
      });
      context.TokenHourData.set({
        ...hourData,
        volumeETH: hourData.volumeETH + totalETHAmount,
      });
      context.TokenMinuteData.set({
        ...minuteData,
        volumeETH: minuteData.volumeETH + totalETHAmount,
      });
      context.Token15MinuteData.set({
        ...fifteenData,
        volumeETH: fifteenData.volumeETH + totalETHAmount,
      });
      context.Token4HourData.set({
        ...fourHourData,
        volumeETH: fourHourData.volumeETH + totalETHAmount,
      });
    }
  }

  // Create PoolSwap entity
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
    flAmountUSDC,
    ispAmountUSDC,
    uniAmountUSDC,
    totalAmountUSDC,
    swapType: isBuy ? "Buy" : "Sell",
    userHolding_id: undefined,
  });

  // Create Activity entity
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

  // Update FairLaunch if applicable
  if (
    absBigInt(event.params.flAmount0) > 0n ||
    absBigInt(event.params.flAmount1) > 0n
  ) {
    const fairLaunch = await context.FairLaunch.get(poolId);
    if (fairLaunch) {
      if (!pool.flipped) {
        context.FairLaunch.set({
          ...fairLaunch,
          ethEarned: fairLaunch.ethEarned + absBigInt(event.params.flAmount0),
          soldInitialSupply:
            fairLaunch.soldInitialSupply + absBigInt(event.params.flAmount1),
        });
      } else {
        context.FairLaunch.set({
          ...fairLaunch,
          ethEarned: fairLaunch.ethEarned + absBigInt(event.params.flAmount1),
          soldInitialSupply:
            fairLaunch.soldInitialSupply + absBigInt(event.params.flAmount0),
        });
      }
    }
  }
}

/**
 * Process pool fees received event
 */
export async function processPoolFeesReceived(
  context: any,
  event: any,
  poolId: string
) {
  const timestamp = BigInt(event.block.timestamp);
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

  // Update time series fee data
  const collectionToken = await context.CollectionToken.get(
    pool.collectionToken_id
  );
  if (collectionToken) {
    const openPrice = collectionToken.derivedETH;
    const [dayData, hourData, minuteData, fifteenData, fourHourData] =
      await Promise.all([
        updateTokenDayData(context, collectionToken, timestamp, openPrice),
        updateTokenHourData(context, collectionToken, timestamp, openPrice),
        updateTokenMinuteData(context, collectionToken, timestamp, openPrice),
        updateToken15MinuteData(context, collectionToken, timestamp, openPrice),
        updateToken4HourData(context, collectionToken, timestamp, openPrice),
      ]);
    context.TokenDayData.set({
      ...dayData,
      feesETH: dayData.feesETH + totalFeesETH,
    });
    context.TokenHourData.set({
      ...hourData,
      feesETH: hourData.feesETH + totalFeesETH,
    });
    context.TokenMinuteData.set({
      ...minuteData,
      feesETH: minuteData.feesETH + totalFeesETH,
    });
    context.Token15MinuteData.set({
      ...fifteenData,
      feesETH: fifteenData.feesETH + totalFeesETH,
    });
    context.Token4HourData.set({
      ...fourHourData,
      feesETH: fourHourData.feesETH + totalFeesETH,
    });
  }
}

/**
 * Process pool fees distributed event
 */
export async function processPoolFeesDistributed(
  context: any,
  event: any,
  poolId: string
) {
  const feesETH = event.params._donateAmount;
  const creatorAmount = event.params._creatorAmount;
  const bidWallAmount = event.params._bidWallAmount;
  const governanceAmount = event.params._governanceAmount;
  const protocolAmount = event.params._protocolAmount;
  const txHash = event.transaction.hash || "";
  const timestamp = BigInt(event.block.timestamp);

  const bundle = await context.Bundle.get(BUNDLE_ID);
  const communityFees = BigDecimal(bidWallAmount.toString()).plus(
    BigDecimal(governanceAmount.toString())
  );
  const creatorFeesBD = BigDecimal(creatorAmount.toString());

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

  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      totalFeesETH: config.totalFeesETH + feesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(
        config.totalFeesETH + feesETH,
        bundle
      ),
    });
  }

  context.PoolFeeDistribution.set({
    id: `${txHash}-${event.logIndex}`,
    pool_id: poolId,
    timestamp,
    amount: feesETH,
    creatorAmount,
    bidWallAmount,
    governanceAmount,
    protocolAmount,
  });
}


