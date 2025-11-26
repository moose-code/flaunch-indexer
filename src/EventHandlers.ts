/**
 * Flaunch Protocol Event Handlers
 * Migrated from TheGraph subgraph to Envio HyperIndex
 */

import {
  AnyPositionManager,
  PositionManager1,
  PositionManager2,
  PositionManager3,
  PoolManager,
  ActionManager1,
  ActionManager2,
  BidWall1,
  BidWall2,
  FeeEscrow,
  FeeExemptions,
  FlaunchFeeExemption,
  FairLaunch1,
  FairLaunch2,
  FlaunchNFT1,
  FlaunchNFT2,
  FlaunchNFT3,
  AnyFlaunchNFT,
  FlayBurner,
  BuyBackAndBurnFlay,
  TreasuryManagerFactory,
  CollectionToken,
  BigDecimal,
} from "generated";

import { ZERO_BI, ZERO_BD, CONFIG_ID, BUNDLE_ID } from "./utils/constants";
import { normalizeAddress, absBigInt } from "./utils/helpers";
import { convertETHtoUSDC, convertETHtoUSDCWithBundle } from "./utils/pricing";
import {
  updateTokenDayData,
  updateTokenHourData,
  updateTokenMinuteData,
  updateToken15MinuteData,
  updateToken4HourData,
} from "./utils/timeseries";
import {
  getBidWallAddressForPositionManager,
  getFlaunchAddressForPositionManager,
  FLETH,
  isRevenueManager,
  isAddressFeeSplitManager,
  isStakingManager,
  isBuyBackManager,
} from "./addresses/base";

// =============================================================================
// HELPER FUNCTIONS (inline for now, will move to crud later)
// =============================================================================

const DEFAULT_FEE_DISTRIBUTION_ID = CONFIG_ID;

// =============================================================================
// POSITION MANAGER HANDLERS (AnyPositionManager)
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
    name: "Unknown", // Will be updated via Effect API
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

// =============================================================================
// DYNAMIC CONTRACT REGISTRATION
// Register CollectionToken contracts when pools are created
// =============================================================================

AnyPositionManager.PoolCreated.contractRegister(({ event, context }) => {
  // Register the newly created memecoin token for tracking Transfer events
  context.addCollectionToken(event.params._memecoin);
});

PositionManager1.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

PositionManager2.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

PositionManager3.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

// =============================================================================
// COLLECTION TOKEN HANDLERS (Dynamic - ERC20 Transfers)
// =============================================================================

CollectionToken.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const value = event.params.value;
  const tokenAddress = normalizeAddress(event.srcAddress);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Get the CollectionToken entity
  const token = await context.CollectionToken.get(tokenAddress);
  if (!token) return;

  const isZeroAddress = (addr: string) =>
    addr === "0x0000000000000000000000000000000000000000";

  // Handle sender's holdings (if not minting)
  if (!isZeroAddress(from)) {
    const fromHoldingId = `${from}-${tokenAddress}`;
    let fromHolding = await context.CollectionTokenHolding.get(fromHoldingId);

    if (fromHolding) {
      const newBalance = fromHolding.balance - value;
      context.CollectionTokenHolding.set({
        ...fromHolding,
        balance: newBalance,
        balanceBefore: fromHolding.balance,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });

      // If balance becomes 0, decrement holder count
      if (newBalance === 0n && fromHolding.balance > 0n) {
        context.CollectionToken.set({
          ...token,
          totalHolders: token.totalHolders - 1n,
        });
      }
    }
  }

  // Handle receiver's holdings (if not burning)
  if (!isZeroAddress(to)) {
    const toHoldingId = `${to}-${tokenAddress}`;
    let toHolding = await context.CollectionTokenHolding.get(toHoldingId);

    // Get or create user
    let user = await context.User.get(to);
    if (!user) {
      context.User.set({ id: to });
    }

    if (toHolding) {
      const wasZero = toHolding.balance === 0n;
      const newBalance = toHolding.balance + value;
      context.CollectionTokenHolding.set({
        ...toHolding,
        balance: newBalance,
        balanceBefore: toHolding.balance,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });

      // If balance goes from 0 to positive, increment holder count
      if (wasZero && newBalance > 0n) {
        const currentToken = await context.CollectionToken.get(tokenAddress);
        if (currentToken) {
          context.CollectionToken.set({
            ...currentToken,
            totalHolders: currentToken.totalHolders + 1n,
          });
        }
      }
    } else {
      // Create new holding
      context.CollectionTokenHolding.set({
        id: toHoldingId,
        user_id: to,
        collectionToken_id: tokenAddress,
        balance: value,
        balanceBefore: ZERO_BI,
        createdTimestamp: timestamp,
        createdTx: txHash,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
        price: token.derivedETH,
      });

      // New holder - increment count
      const currentToken = await context.CollectionToken.get(tokenAddress);
      if (currentToken) {
        context.CollectionToken.set({
          ...currentToken,
          totalHolders: currentToken.totalHolders + 1n,
        });
      }
    }
  }
});

CollectionToken.MetadataUpdated.handler(async ({ event, context }) => {
  const tokenAddress = normalizeAddress(event.srcAddress);
  const baseURI = event.params.baseURI;

  const token = await context.CollectionToken.get(tokenAddress);
  if (token) {
    context.CollectionToken.set({
      ...token,
      baseURI,
    });
  }
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

    // Create or update pool-specific fee distribution
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

    // Link to pool
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

  // Ensure user exists
  if (!(await context.User.get(recipient))) context.User.set({ id: recipient });

  // Create ReferrerFee record
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

  // Update config with latest referral escrow
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({ ...config, latestReferralEscrow: referralEscrow });
  }
});

// =============================================================================
// POSITION MANAGER 1 HANDLERS
// =============================================================================

PositionManager1.PoolCreated.handler(async ({ event, context }) => {
  // PositionManager1 has: _poolId, _memecoin, _memecoinTreasury, _tokenId, _currencyFlipped, _flaunchFee, _params
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const flaunchFee = event.params._flaunchFee;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);

  // _params tuple: [name, symbol, tokenURI, initialSupply, maxSupply, creator, creatorFeeAllocation, ?, initialPriceParams, ?]
  const paramsData = event.params._params;
  const name = paramsData[0] || "Unknown";
  const symbol = paramsData[1] || "UNKNOWN";
  const creator = normalizeAddress(paramsData[5]);

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
  });

  // Create Pool
  const bidWallAddr =
    getBidWallAddressForPositionManager(positionManager) || positionManager;
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

PositionManager1.PoolSwap.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";
  const maker = normalizeAddress(
    event.transaction.from || "0x0000000000000000000000000000000000000000"
  );

  // Get pool to check if flipped
  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  // Ensure user exists
  if (!(await context.User.get(maker))) {
    context.User.set({ id: maker });
  }

  let totalETHAmount = 0n;
  let totalTokenAmount = 0n;
  let totalFeeETH = 0n;
  let totalFeeToken = 0n;
  let isBuy = false;
  let flETHAmount = 0n;
  let ispETHAmount = 0n;
  let uniETHAmount = 0n;

  if (!pool.flipped) {
    // ETH is token0
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

    totalFeeToken =
      absBigInt(event.params.flFee1) +
      absBigInt(event.params.ispFee1) +
      absBigInt(event.params.uniFee1);

    flETHAmount = absBigInt(event.params.flAmount0);
    ispETHAmount = absBigInt(event.params.ispAmount0);
    uniETHAmount = absBigInt(event.params.uniAmount0);

    if (
      event.params.flAmount1 > 0n ||
      event.params.ispAmount1 > 0n ||
      event.params.uniAmount1 > 0n
    ) {
      isBuy = true;
    }
  } else {
    // ETH is token1
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

    totalFeeToken =
      absBigInt(event.params.flFee0) +
      absBigInt(event.params.ispFee0) +
      absBigInt(event.params.uniFee0);

    flETHAmount = absBigInt(event.params.flAmount1);
    ispETHAmount = absBigInt(event.params.ispAmount1);
    uniETHAmount = absBigInt(event.params.uniAmount1);

    if (
      event.params.flAmount0 > 0n ||
      event.params.ispAmount0 > 0n ||
      event.params.uniAmount0 > 0n
    ) {
      isBuy = true;
    }
  }

  // Convert ETH to USDC
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

    // Check if we should update time series (FairLaunch or ISP swap)
    const isFairLaunchSwap =
      absBigInt(event.params.flAmount0) > 0n ||
      absBigInt(event.params.flAmount1) > 0n;
    const isISPSwap =
      absBigInt(event.params.ispAmount0) > 0n ||
      absBigInt(event.params.ispAmount1) > 0n;

    if (isFairLaunchSwap || isISPSwap) {
      const openPrice = collectionToken.derivedETH;

      // Update time series
      const tokenDayData = await updateTokenDayData(
        context,
        updatedToken,
        timestamp,
        openPrice
      );
      const tokenHourData = await updateTokenHourData(
        context,
        updatedToken,
        timestamp,
        openPrice
      );
      const tokenMinuteData = await updateTokenMinuteData(
        context,
        updatedToken,
        timestamp,
        openPrice
      );
      const token15MinuteData = await updateToken15MinuteData(
        context,
        updatedToken,
        timestamp,
        openPrice
      );
      const token4HourData = await updateToken4HourData(
        context,
        updatedToken,
        timestamp,
        openPrice
      );

      // Add volume to time series
      context.TokenDayData.set({
        ...tokenDayData,
        volumeETH: tokenDayData.volumeETH + totalETHAmount,
      });
      context.TokenHourData.set({
        ...tokenHourData,
        volumeETH: tokenHourData.volumeETH + totalETHAmount,
      });
      context.TokenMinuteData.set({
        ...tokenMinuteData,
        volumeETH: tokenMinuteData.volumeETH + totalETHAmount,
      });
      context.Token15MinuteData.set({
        ...token15MinuteData,
        volumeETH: token15MinuteData.volumeETH + totalETHAmount,
      });
      context.Token4HourData.set({
        ...token4HourData,
        volumeETH: token4HourData.volumeETH + totalETHAmount,
      });
    }
  }

  // Create PoolSwap entity
  const swapId = `${txHash}-${event.logIndex}`;
  context.PoolSwap.set({
    id: swapId,
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
  const activityId = `${txHash}-${event.logIndex}-activity`;
  context.Activity.set({
    id: activityId,
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
});

PositionManager1.PoolStateUpdated.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  // Update pool state
  context.Pool.set({
    ...pool,
    sqrtPriceX96: event.params._sqrtPriceX96,
    liquidity: event.params._liquidity,
    tick: Number(event.params._tick),
  });

  // Update FairLaunch tick if not ended
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
  const poolId = event.params._poolId;
  const timestamp = BigInt(event.block.timestamp);
  const totalFeesETH = event.params._amount0;
  const totalFeesToken = event.params._amount1;

  const pool = await context.Pool.get(poolId);
  if (!pool) return;

  // Update PoolFees
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

  // Update Pool fees
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
});
PositionManager1.PoolFeesDistributed.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
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

  // Update CollectionToken fees
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

  // Update Pool fees
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

  // Increment global fees
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

  // Create PoolFeeDistribution record
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
});
PositionManager1.PoolFeesSwapped.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const amount0 = event.params._amount0;
  const amount1 = event.params._amount1;
  const zeroForOne = event.params.zeroForOne;

  const poolFees = await context.PoolFees.get(poolId);
  if (poolFees) {
    // When swapping, one side decreases and other increases
    if (zeroForOne) {
      // Swapping token0 for token1
      context.PoolFees.set({
        ...poolFees,
        ethAvailable: poolFees.ethAvailable - amount0,
        tokenAvailable: poolFees.tokenAvailable + amount1,
      });
    } else {
      // Swapping token1 for token0
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
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});

PositionManager1.ReferralEscrowUpdated.handler(
  async ({ event, context }) => {}
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
  // Note: PositionManager1 Deposit uses _payee with underscore
  const payee = normalizeAddress(event.params._payee);
  const user = await context.User.get(payee);
  if (!user) {
    context.User.set({ id: payee });
  }
});

PositionManager1.Withdrawal.handler(async ({ event, context }) => {
  // Note: PositionManager1 Withdrawal uses _sender, _recipient with underscore
  const sender = normalizeAddress(event.params._sender);
  const user = await context.User.get(sender);
  if (!user) {
    context.User.set({ id: sender });
  }
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
    context.Pool.set({
      ...pool,
      liveAtTimestamp: flaunchesAt,
    });
  }
});
PositionManager1.OwnershipTransferred.handler(async ({ event, context }) => {});
PositionManager1.OwnershipHandoverRequested.handler(
  async ({ event, context }) => {}
);
PositionManager1.OwnershipHandoverCanceled.handler(
  async ({ event, context }) => {}
);

// =============================================================================
// POSITION MANAGER 2 HANDLERS
// =============================================================================

PositionManager2.PoolCreated.handler(async ({ event, context }) => {
  // Same structure as PM1, params tuple may differ slightly
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const flaunchFee = event.params._flaunchFee;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);

  const paramsData = event.params._params;
  const name = paramsData[0] || "Unknown";
  const symbol = paramsData[1] || "UNKNOWN";
  const creator = normalizeAddress(paramsData[6]); // PM2 has different tuple structure

  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = { id: BUNDLE_ID, ethPriceUSDC: BigDecimal("2500") };
    context.Bundle.set(bundle);
  }

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

  if (!(await context.User.get(creator))) context.User.set({ id: creator });

  const flaunchAddr =
    getFlaunchAddressForPositionManager(positionManager) || positionManager;
  const collectionId = `${flaunchAddr}-${tokenId.toString()}`;
  const bidWallAddr =
    getBidWallAddressForPositionManager(positionManager) || positionManager;

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
  });

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

  context.MemecoinTreasury.set({
    id: memecoinTreasury,
    pool_id: poolId,
    createdAt: timestamp,
    totalETH: ZERO_BI,
    totalToken: ZERO_BI,
    totalActions: ZERO_BI,
    lastActionTimestamp: timestamp,
  });

  context.PoolFees.set({
    id: poolId,
    ethAvailable: ZERO_BI,
    tokenAvailable: ZERO_BI,
    totalEthIn: ZERO_BI,
    totalTokenIn: ZERO_BI,
  });
  context.NFTLookup.set({
    id: `${flaunchAddr}-${tokenId.toString()}`,
    collectionToken_id: memecoin,
  });
  context.PoolCollectionLookup.set({
    id: memecoin,
    collectionToken_id: memecoin,
  });
  context.Config.set({
    ...config,
    collectionCount: config.collectionCount + 1n,
  });
});
PositionManager2.PoolSwap.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
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
  let isBuy = false;
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
  const flAmountUSDC = convertETHtoUSDCWithBundle(flETHAmount, bundle);
  const ispAmountUSDC = convertETHtoUSDCWithBundle(ispETHAmount, bundle);
  const uniAmountUSDC = convertETHtoUSDCWithBundle(uniETHAmount, bundle);
  const totalAmountUSDC = convertETHtoUSDCWithBundle(totalETHAmount, bundle);

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

  const swapId = `${txHash}-${event.logIndex}`;
  context.PoolSwap.set({
    id: swapId,
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
    if (fairLaunch)
      context.FairLaunch.set({
        ...fairLaunch,
        tick: Number(event.params._tick),
      });
  }
});

PositionManager2.PoolFeesReceived.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
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
});

PositionManager2.PoolFeesDistributed.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
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
  if (config)
    context.Config.set({
      ...config,
      totalFeesETH: config.totalFeesETH + feesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(
        config.totalFeesETH + feesETH,
        bundle
      ),
    });
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
});

PositionManager2.PoolFeesSwapped.handler(async ({ event, context }) => {
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
PositionManager2.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {}
);
PositionManager2.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});
PositionManager2.ReferralEscrowUpdated.handler(
  async ({ event, context }) => {}
);
PositionManager2.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config)
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
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
  if (pool) context.Pool.set({ ...pool, liveAtTimestamp: flaunchesAt });
});

// =============================================================================
// POSITION MANAGER 3 HANDLERS
// =============================================================================

PositionManager3.PoolCreated.handler(async ({ event, context }) => {
  // Same as PM2
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const flaunchFee = event.params._flaunchFee;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);

  const paramsData = event.params._params;
  const name = paramsData[0] || "Unknown";
  const symbol = paramsData[1] || "UNKNOWN";
  const creator = normalizeAddress(paramsData[6]);

  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = { id: BUNDLE_ID, ethPriceUSDC: BigDecimal("2500") };
    context.Bundle.set(bundle);
  }

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

  if (!(await context.User.get(creator))) context.User.set({ id: creator });

  const flaunchAddr =
    getFlaunchAddressForPositionManager(positionManager) || positionManager;
  const collectionId = `${flaunchAddr}-${tokenId.toString()}`;
  const bidWallAddr =
    getBidWallAddressForPositionManager(positionManager) || positionManager;

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
  });

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

  context.MemecoinTreasury.set({
    id: memecoinTreasury,
    pool_id: poolId,
    createdAt: timestamp,
    totalETH: ZERO_BI,
    totalToken: ZERO_BI,
    totalActions: ZERO_BI,
    lastActionTimestamp: timestamp,
  });

  context.PoolFees.set({
    id: poolId,
    ethAvailable: ZERO_BI,
    tokenAvailable: ZERO_BI,
    totalEthIn: ZERO_BI,
    totalTokenIn: ZERO_BI,
  });
  context.NFTLookup.set({
    id: `${flaunchAddr}-${tokenId.toString()}`,
    collectionToken_id: memecoin,
  });
  context.PoolCollectionLookup.set({
    id: memecoin,
    collectionToken_id: memecoin,
  });
  context.Config.set({
    ...config,
    collectionCount: config.collectionCount + 1n,
  });
});
PositionManager3.PoolSwap.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
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
  let isBuy = false;
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
  const flAmountUSDC = convertETHtoUSDCWithBundle(flETHAmount, bundle);
  const ispAmountUSDC = convertETHtoUSDCWithBundle(ispETHAmount, bundle);
  const uniAmountUSDC = convertETHtoUSDCWithBundle(uniETHAmount, bundle);
  const totalAmountUSDC = convertETHtoUSDCWithBundle(totalETHAmount, bundle);

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

  const swapId = `${txHash}-${event.logIndex}`;
  context.PoolSwap.set({
    id: swapId,
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
});
PositionManager3.PoolStateUpdated.handler(async ({ event, context }) => {
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

PositionManager3.PoolFeesReceived.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
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
});

PositionManager3.PoolFeesDistributed.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
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
  if (config)
    context.Config.set({
      ...config,
      totalFeesETH: config.totalFeesETH + feesETH,
      totalFeesUSDC: convertETHtoUSDCWithBundle(
        config.totalFeesETH + feesETH,
        bundle
      ),
    });
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
});

PositionManager3.PoolFeesSwapped.handler(async ({ event, context }) => {
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
PositionManager3.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {}
);
PositionManager3.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});
PositionManager3.ReferralEscrowUpdated.handler(
  async ({ event, context }) => {}
);
PositionManager3.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config)
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
});
PositionManager3.FeeDistributionUpdated.handler(
  async ({ event, context }) => {}
);
PositionManager3.FairLaunchFeeCalculatorUpdated.handler(
  async ({ event, context }) => {}
);
PositionManager3.PoolPremine.handler(async ({ event, context }) => {
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

PositionManager3.PoolScheduled.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  const flaunchesAt = event.params._flaunchesAt;
  const pool = await context.Pool.get(poolId);
  if (pool) context.Pool.set({ ...pool, liveAtTimestamp: flaunchesAt });
});

// =============================================================================
// POOL MANAGER HANDLERS
// =============================================================================

PoolManager.Swap.handler(async ({ event, context }) => {
  // Uniswap V4 Swap event - may be used for ETH/USDC price updates
});

// =============================================================================
// ACTION MANAGER HANDLERS
// =============================================================================

ActionManager1.ActionApproved.handler(async ({ event, context }) => {
  // Note: uses `action` without underscore
  const actionId = normalizeAddress(event.params.action);

  const action = await context.MemecoinAction.get(actionId);
  if (!action) {
    context.MemecoinAction.set({
      id: actionId,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      unapprovedAt: undefined,
      totalActions: ZERO_BI,
      approvedBy: event.srcAddress,
      unapprovedBy: undefined,
    });
  } else {
    context.MemecoinAction.set({
      ...action,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      approvedBy: event.srcAddress,
    });
  }
});

ActionManager1.ActionUnapproved.handler(async ({ event, context }) => {
  const actionId = normalizeAddress(event.params.action);

  const action = await context.MemecoinAction.get(actionId);
  if (action) {
    context.MemecoinAction.set({
      ...action,
      approved: false,
      unapprovedAt: BigInt(event.block.timestamp),
      unapprovedBy: event.srcAddress,
    });
  }
});

ActionManager2.ActionApproved.handler(async ({ event, context }) => {
  const actionId = normalizeAddress(event.params.action);

  const action = await context.MemecoinAction.get(actionId);
  if (!action) {
    context.MemecoinAction.set({
      id: actionId,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      unapprovedAt: undefined,
      totalActions: ZERO_BI,
      approvedBy: event.srcAddress,
      unapprovedBy: undefined,
    });
  } else {
    context.MemecoinAction.set({
      ...action,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      approvedBy: event.srcAddress,
    });
  }
});

ActionManager2.ActionUnapproved.handler(async ({ event, context }) => {
  const actionId = normalizeAddress(event.params.action);

  const action = await context.MemecoinAction.get(actionId);
  if (action) {
    context.MemecoinAction.set({
      ...action,
      approved: false,
      unapprovedAt: BigInt(event.block.timestamp),
      unapprovedBy: event.srcAddress,
    });
  }
});

// =============================================================================
// BID WALL HANDLERS
// =============================================================================

BidWall1.BidWallClosed.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);

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
});

BidWall1.BidWallRepositioned.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      tickLower: event.params.tickLower,
      tickUpper: event.params.tickUpper,
      deployedETH: event.params.liquidity, // liquidity in the event
    });
  }

  // Create BidWallRepositioned record
  const id = `${poolId}-${event.transaction.hash}`;
  context.BidWallRepositioned.set({
    id,
    pool_id: poolId,
    _eth: event.params.liquidity, // Using liquidity as ETH equivalent
    _tickLower: Number(event.params.tickLower),
    _tickUpper: Number(event.params.tickUpper),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  });
});

BidWall1.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params.recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
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

BidWall1.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {});

BidWall2.BidWallClosed.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);

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
  const recipient = normalizeAddress(event.params.recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
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

BidWall2.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {});

// =============================================================================
// FEE ESCROW HANDLERS
// =============================================================================

FeeEscrow.Deposit.handler(async ({ event, context }) => {
  // Note: FeeEscrow uses `sender` without underscore
  const sender = normalizeAddress(event.params.sender);
  const user = await context.User.get(sender);
  if (!user) {
    context.User.set({ id: sender });
  }
});

FeeEscrow.Withdrawal.handler(async ({ event, context }) => {
  // Note: FeeEscrow uses `sender` without underscore
  const sender = normalizeAddress(event.params.sender);
  const user = await context.User.get(sender);
  if (!user) {
    context.User.set({ id: sender });
  }
});

// =============================================================================
// FEE EXEMPTIONS HANDLERS
// =============================================================================

FeeExemptions.BeneficiaryFeeSet.handler(async ({ event, context }) => {
  const beneficiary = normalizeAddress(event.params.beneficiary);
  context.FeeExemption.set({
    id: beneficiary,
    flatFee: Number(event.params.fee),
  });
});

FeeExemptions.BeneficiaryFeeRemoved.handler(async ({ event, context }) => {
  const beneficiary = normalizeAddress(event.params.beneficiary);
  const existing = await context.FeeExemption.get(beneficiary);
  if (existing) {
    context.FeeExemption.set({
      ...existing,
      flatFee: 0,
    });
  }
});

// =============================================================================
// FLAUNCH FEE EXEMPTION HANDLERS
// =============================================================================

FlaunchFeeExemption.FeeExemptionUpdated.handler(async ({ event, context }) => {
  const beneficiary = normalizeAddress(event.params.user);

  if (event.params.exempt) {
    context.FlaunchFeeExemption.set({
      id: beneficiary,
      createdAt: BigInt(event.block.timestamp),
    });
  }
});

// =============================================================================
// FAIR LAUNCH HANDLERS
// =============================================================================

FairLaunch1.FairLaunchCreated.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const timestamp = BigInt(event.block.timestamp);

  // FairLaunch is already created by PoolCreated, just update with deadline
  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      starts_at: timestamp,
      ends_at: event.params.deadline,
    });
  }
});

FairLaunch1.FairLaunchEnded.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      active: false,
      ethEarned: event.params.totalRaised,
      ends_at: BigInt(event.block.timestamp),
    });
  }

  const pool = await context.Pool.get(poolId);
  if (pool) {
    context.Pool.set({
      ...pool,
      fairLaunchedEnded: true,
    });
  }
});

FairLaunch2.FairLaunchCreated.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const timestamp = BigInt(event.block.timestamp);

  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      starts_at: timestamp,
      ends_at: event.params.deadline,
    });
  }
});

FairLaunch2.FairLaunchEnded.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      active: false,
      ethEarned: event.params.totalRaised,
      ends_at: BigInt(event.block.timestamp),
    });
  }

  const pool = await context.Pool.get(poolId);
  if (pool) {
    context.Pool.set({
      ...pool,
      fairLaunchedEnded: true,
    });
  }
});

// =============================================================================
// FLAUNCH NFT TRANSFER HANDLERS
// =============================================================================

FlaunchNFT1.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  // Ensure users exist
  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  // Update Collection and CollectionToken owner
  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });

    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken) {
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
      }
    }
  }
});

FlaunchNFT2.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });
    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken)
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
    }
  }
});

FlaunchNFT3.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });
    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken)
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
    }
  }
});

AnyFlaunchNFT.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  const collectionId = `${contractAddr}-${tokenId.toString()}`;
  const collection = await context.Collection.get(collectionId);
  if (collection) {
    context.Collection.set({ ...collection, owner_id: to });
    if (collection.collectionToken_id) {
      const collectionToken = await context.CollectionToken.get(
        collection.collectionToken_id
      );
      if (collectionToken)
        context.CollectionToken.set({ ...collectionToken, owner_id: to });
    }
  }
});

// =============================================================================
// FLAY BURNER HANDLERS
// =============================================================================

FlayBurner.BurnerUpdated.handler(async ({ event, context }) => {
  const burnerAddress = normalizeAddress(event.params.burner);
  const timestamp = BigInt(event.block.timestamp);
  const BURNER_ID = "flay-burner";

  const burner = await context.FlayBurner.get(BURNER_ID);
  if (!burner) {
    context.FlayBurner.set({
      id: BURNER_ID,
      address: burnerAddress,
      pendingETH: ZERO_BI,
      totalBurned: ZERO_BI,
      createdAt: timestamp,
    });
  } else {
    context.FlayBurner.set({
      ...burner,
      address: burnerAddress,
    });
  }
});

// =============================================================================
// BUY BACK AND BURN HANDLERS
// =============================================================================

BuyBackAndBurnFlay.BurnBabyBurn.handler(async ({ event, context }) => {
  const BURNER_ID = "flay-burner";
  const burner = await context.FlayBurner.get(BURNER_ID);
  if (burner) {
    context.FlayBurner.set({
      ...burner,
      totalBurned: burner.totalBurned + event.params.amount,
      pendingETH: ZERO_BI,
    });
  }
});

BuyBackAndBurnFlay.EthBalanceUpdated.handler(async ({ event, context }) => {
  const BURNER_ID = "flay-burner";
  const burner = await context.FlayBurner.get(BURNER_ID);
  if (burner) {
    context.FlayBurner.set({
      ...burner,
      pendingETH: event.params.balance,
    });
  }
});

// =============================================================================
// TREASURY MANAGER FACTORY HANDLERS
// =============================================================================

TreasuryManagerFactory.ManagerImplementationApproved.handler(
  async ({ event, context }) => {
    const implAddress = normalizeAddress(event.params.implementation);

    context.TreasuryManagerImplementation.set({
      id: implAddress,
      approvedAt: BigInt(event.block.timestamp),
      unapprovedAt: undefined,
    });
  }
);

TreasuryManagerFactory.ManagerImplementationUnapproved.handler(
  async ({ event, context }) => {
    const implAddress = normalizeAddress(event.params.implementation);

    const impl = await context.TreasuryManagerImplementation.get(implAddress);
    if (impl) {
      context.TreasuryManagerImplementation.set({
        ...impl,
        unapprovedAt: BigInt(event.block.timestamp),
      });
    }
  }
);

TreasuryManagerFactory.ManagerDeployed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.params.manager);
  const implementationAddress = normalizeAddress(event.params.implementation);
  const timestamp = BigInt(event.block.timestamp);
  const deployer = normalizeAddress(
    event.transaction.from || "0x0000000000000000000000000000000000000000"
  );

  // Ensure deployer user exists
  if (!(await context.User.get(deployer))) context.User.set({ id: deployer });

  if (isRevenueManager(implementationAddress)) {
    context.RevenueManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      createdAt: timestamp,
      owner_id: undefined,
      protocolFeeRecipient_id: undefined,
      protocolFee: undefined,
    });
  } else if (isAddressFeeSplitManager(implementationAddress)) {
    context.AddressFeeSplitManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      externalManagerETHTotal: 0n,
      createdAt: timestamp,
      owner_id: undefined,
      creatorShare: undefined,
    });
  } else if (isStakingManager(implementationAddress)) {
    context.StakingManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      stakingToken_id: "0x0000000000000000000000000000000000000000",
      totalStaked: 0n,
      createdAt: timestamp,
      owner_id: undefined,
      minEscrowDuration: 0n,
      minStakeDuration: 0n,
      creatorShare: 0n,
      ownerShare: 0n,
      totalStakers: 0n,
      externalManagerETHTotal: 0n,
    });
  } else if (isBuyBackManager(implementationAddress)) {
    context.BuyBackManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      createdAt: timestamp,
      owner_id: undefined,
      creatorShare: 0n,
      ownerShare: 0n,
      buyBackCurrency0: "0x0000000000000000000000000000000000000000",
      buyBackCurrency1: "0x0000000000000000000000000000000000000000",
      totalDeposits: 0n,
      totalDepositsUSDC: ZERO_BD,
      externalManagerETHTotal: 0n,
    });
  }
});
