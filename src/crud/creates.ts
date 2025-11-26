/**
 * Entity creation functions for Envio
 * These functions create new entities using context.Entity.set()
 */

import { 
  BigDecimal, 
  handlerContext, 
  Config, 
  Pool, 
  Collection, 
  User, 
  UserAggregate, 
  BidWall, 
  FairLaunch, 
  FeeDistribution, 
  Bundle,
  NFTLookup,
  PoolCollectionLookup,
  MemecoinTreasury,
  PoolSwap,
  Activity,
  UserFee,
  UserCollectionFee,
  PoolFees,
  PoolFeeDistribution,
  CollectionFee,
  ActivityType,
} from "generated";
import type { CollectionToken_t } from "generated/src/db/Entities.gen";
import { CONFIG_ID, BUNDLE_ID, ZERO_BI, ZERO_BD, ZERO_ADDRESS } from "../utils/constants";
import { getConfig } from "./reads";

/**
 * Create the global Config entity
 */
export function createConfig(context: handlerContext, feeDistributionId: string): Config {
  const config: Config = {
    id: CONFIG_ID,
    locked: false,
    lockerPaused: false,
    collectionCount: ZERO_BI,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalUsers: ZERO_BI,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    feeCalculator: ZERO_ADDRESS,
    protocolFeeRecipient: ZERO_ADDRESS,
    feeDistribution_id: feeDistributionId,
    latestReferralEscrow: ZERO_ADDRESS,
    staleTimeWindow: ZERO_BI,
  };
  context.Config.set(config);
  return config;
}

/**
 * Get or create a User entity
 */
export async function getOrCreateUser(context: handlerContext, userId: string): Promise<User> {
  let user = await context.User.get(userId);
  if (!user) {
    user = { id: userId };
    context.User.set(user);
    
    // Increment total users
    const config = await getConfig(context);
    context.Config.set({
      ...config,
      totalUsers: config.totalUsers + 1n,
    });
  }
  return user;
}

/**
 * Get or create a UserAggregate entity
 */
export async function getOrCreateUserAggregate(context: handlerContext, userId: string): Promise<UserAggregate> {
  const aggregateId = userId;
  let userAggregate = await context.UserAggregate.get(aggregateId);
  if (!userAggregate) {
    await getOrCreateUser(context, userId);
    userAggregate = {
      id: aggregateId,
      user_id: userId,
      totalReferrerFeesETH: ZERO_BI,
    };
    context.UserAggregate.set(userAggregate);
  }
  return userAggregate;
}

/**
 * Get or create a UserFee entity
 */
export async function getOrCreateUserFee(
  context: handlerContext,
  payeeId: string,
  timestamp: bigint
): Promise<UserFee> {
  let userFee = await context.UserFee.get(payeeId);
  if (!userFee) {
    userFee = {
      id: payeeId,
      payee_id: payeeId,
      claimableAmount: ZERO_BI,
      claimableAmountUSDC: ZERO_BD,
      totalClaimed: ZERO_BI,
      totalClaimedUSDC: ZERO_BD,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
    context.UserFee.set(userFee);
  }
  return userFee;
}

/**
 * Get or create a UserCollectionFee entity
 */
export async function getOrCreateUserCollectionFee(
  context: handlerContext,
  userId: string,
  collectionTokenId: string,
  timestamp: bigint
): Promise<UserCollectionFee> {
  const id = `${userId}-${collectionTokenId}`;
  let userCollectionFee = await context.UserCollectionFee.get(id);
  if (!userCollectionFee) {
    await getOrCreateUser(context, userId);
    userCollectionFee = {
      id,
      user_id: userId,
      collectionToken_id: collectionTokenId,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
    context.UserCollectionFee.set(userCollectionFee);
  }
  return userCollectionFee;
}

/**
 * Get or create a CollectionFee entity
 */
export async function getOrCreateCollectionFee(
  context: handlerContext,
  collectionTokenId: string,
  timestamp: bigint
): Promise<CollectionFee> {
  let collectionFee = await context.CollectionFee.get(collectionTokenId);
  if (!collectionFee) {
    collectionFee = {
      id: collectionTokenId,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
    context.CollectionFee.set(collectionFee);
  }
  return collectionFee;
}

/**
 * Create a Bundle entity for ETH price tracking
 */
export function createBundle(context: handlerContext, ethPriceUSDC: BigDecimal): Bundle {
  const bundle: Bundle = {
    id: BUNDLE_ID,
    ethPriceUSDC,
  };
  context.Bundle.set(bundle);
  return bundle;
}

/**
 * Create a Pool entity
 */
export function createPool(
  context: handlerContext,
  poolId: string,
  collectionTokenId: string,
  sqrtPriceX96: bigint,
  tick: number,
  liquidity: bigint,
  tickSpacing: number,
  flipped: boolean,
  timestamp: bigint,
  startingMarketCap: bigint,
  startingMarketCapETH: bigint,
  positionManager: string
): Pool {
  const pool: Pool = {
    id: poolId,
    collectionToken_id: collectionTokenId,
    sqrtPriceX96,
    tickSpacing,
    tick,
    fairLaunchedEnded: false,
    liquidity,
    liveAtTimestamp: timestamp,
    flipped,
    startingMarketCap,
    startingMarketCapETH,
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
    memecoinTreasury_id: undefined,
    feeAllocation_id: undefined,
    feeDistribution_id: undefined,
    positionManager,
  };
  context.Pool.set(pool);
  return pool;
}

/**
 * Create a CollectionToken entity
 */
export function createCollectionToken(
  context: handlerContext,
  tokenAddress: string,
  poolId: string,
  collectionId: string,
  name: string,
  symbol: string,
  decimals: number,
  totalSupply: bigint,
  creatorAddress: string,
  ownerAddress: string,
  timestamp: bigint,
  flipped: boolean,
  derivedETH: bigint,
  marketCapETH: bigint,
  creationFee: bigint = ZERO_BI
): CollectionToken_t {
  const token: CollectionToken_t = {
    id: tokenAddress,
    pool_id: poolId,
    collection_id: collectionId,
    creator_id: creatorAddress,
    owner_id: ownerAddress,
    name,
    symbol,
    decimals,
    totalSupply,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    totalCommunityFeesETH: ZERO_BD,
    totalCreatorFeesETH: ZERO_BD,
    derivedETH,
    tokenPrice: derivedETH,
    marketCapETH,
    marketCapUSDC: ZERO_BD,
    totalHolders: ZERO_BI,
    isNative: flipped,
    createdAt: timestamp,
    baseURI: "",
    creationFee,
    fairLaunch_id: undefined,
    metadata_id: undefined,
    lastMinuteRecorded: ZERO_BI,
    lastMinuteArchived: ZERO_BI,
    lastHourRecorded: ZERO_BI,
    lastHourArchived: ZERO_BI,
    lastFifteenMinuteRecorded: ZERO_BI,
    lastFifteenMinuteArchived: ZERO_BI,
    lastFourHourRecorded: ZERO_BI,
    lastFourHourArchived: ZERO_BI,
    // Archive arrays
    minuteArray: [],
    hourArray: [],
    fifteenMinuteArray: [],
    fourHourArray: [],
  };
  context.CollectionToken.set(token);
  return token;
}

/**
 * Create a Collection entity
 */
export function createCollection(
  context: handlerContext,
  collectionId: string,
  tokenId: bigint,
  contractAddress: string,
  creatorAddress: string,
  ownerAddress: string,
  collectionTokenId: string,
  name: string,
  symbol: string,
  timestamp: bigint
): Collection {
  const collection: Collection = {
    id: collectionId,
    tokenID: tokenId,
    contract: contractAddress,
    creator_id: creatorAddress,
    owner_id: ownerAddress,
    collectionToken_id: collectionTokenId,
    name,
    symbol,
    managerUpdatedAt: timestamp,
    managerType: undefined,
    revenueManager_id: undefined,
    stakingManager_id: undefined,
    buyBackManager_id: undefined,
    addressFeeSplitManager_id: undefined,
  };
  context.Collection.set(collection);
  return collection;
}

/**
 * Create a BidWall entity
 */
export function createBidWall(
  context: handlerContext,
  poolId: string,
  collectionTokenId: string,
  contractAddress: string,
  timestamp: bigint
): BidWall {
  const bidWall: BidWall = {
    id: poolId,
    pool_id: poolId,
    collectionToken_id: collectionTokenId,
    contract: contractAddress,
    initialized: false,
    amount: ZERO_BI,
    balance: ZERO_BI,
    tickLower: ZERO_BI,
    tickUpper: ZERO_BI,
    deployedETH: ZERO_BI,
    closed: false,
  };
  context.BidWall.set(bidWall);
  return bidWall;
}

/**
 * Create a FairLaunch entity
 */
export function createFairLaunch(
  context: handlerContext,
  poolId: string,
  collectionTokenId: string,
  tick: number,
  timestamp: bigint
): FairLaunch {
  const fairLaunch: FairLaunch = {
    id: poolId,
    active: true,
    collectionToken_id: collectionTokenId,
    tick,
    initialSupply: ZERO_BI,
    soldInitialSupply: ZERO_BI,
    ethEarned: ZERO_BI,
    starts_at: timestamp,
    ends_at: ZERO_BI,
  };
  context.FairLaunch.set(fairLaunch);
  return fairLaunch;
}

/**
 * Create an NFTLookup entity
 */
export function createNFTLookup(
  context: handlerContext,
  id: string,
  collectionTokenId: string
): NFTLookup {
  const nftLookup: NFTLookup = {
    id,
    collectionToken_id: collectionTokenId,
  };
  context.NFTLookup.set(nftLookup);
  return nftLookup;
}

/**
 * Create a PoolCollectionLookup entity
 */
export function createPoolCollectionLookup(
  context: handlerContext,
  collectionTokenAddress: string
): PoolCollectionLookup {
  const lookup: PoolCollectionLookup = {
    id: collectionTokenAddress,
    collectionToken_id: collectionTokenAddress,
  };
  context.PoolCollectionLookup.set(lookup);
  return lookup;
}

/**
 * Create a MemecoinTreasury entity
 */
export function createMemecoinTreasury(
  context: handlerContext,
  treasuryAddress: string,
  poolId: string,
  timestamp: bigint
): MemecoinTreasury {
  const treasury: MemecoinTreasury = {
    id: treasuryAddress,
    pool_id: poolId,
    createdAt: timestamp,
    totalETH: ZERO_BI,
    totalToken: ZERO_BI,
    totalActions: ZERO_BI,
    lastActionTimestamp: timestamp,
  };
  context.MemecoinTreasury.set(treasury);
  return treasury;
}

/**
 * Create a PoolFees entity
 */
export function createPoolFees(
  context: handlerContext,
  poolId: string
): PoolFees {
  const poolFees: PoolFees = {
    id: poolId,
    ethAvailable: ZERO_BI,
    tokenAvailable: ZERO_BI,
    totalEthIn: ZERO_BI,
    totalTokenIn: ZERO_BI,
  };
  context.PoolFees.set(poolFees);
  return poolFees;
}

/**
 * Create a PoolFeeDistribution entity
 */
export function createPoolFeeDistribution(
  context: handlerContext,
  id: string,
  poolId: string,
  amount: bigint,
  creatorAmount: bigint,
  bidWallAmount: bigint,
  governanceAmount: bigint,
  protocolAmount: bigint,
  timestamp: bigint
): PoolFeeDistribution {
  const distribution: PoolFeeDistribution = {
    id,
    pool_id: poolId,
    amount,
    creatorAmount,
    bidWallAmount,
    governanceAmount,
    protocolAmount,
    timestamp,
  };
  context.PoolFeeDistribution.set(distribution);
  return distribution;
}

/**
 * Create a PoolSwap entity
 */
export function createPoolSwap(
  context: handlerContext,
  id: string,
  poolId: string,
  makerId: string,
  swapType: ActivityType,
  timestamp: bigint,
  txHash: string,
  userHoldingId: string | undefined
): PoolSwap {
  const swap: PoolSwap = {
    id,
    pool_id: poolId,
    maker_id: makerId,
    swapType,
    timestamp,
    txHash,
    userHolding_id: userHoldingId,
    fairLaunchAmount0: undefined,
    fairLaunchAmount1: undefined,
    fairLaunchFee0: undefined,
    fairLaunchFee1: undefined,
    flAmountUSDC: undefined,
    ispAmount0: undefined,
    ispAmount1: undefined,
    ispAmountUSDC: undefined,
    ispFee0: undefined,
    ispFee1: undefined,
    uniswapAmount0: undefined,
    uniswapAmount1: undefined,
    uniswapFee0: undefined,
    uniswapFee1: undefined,
    uniAmountUSDC: undefined,
    totalAmountUSDC: undefined,
  };
  context.PoolSwap.set(swap);
  return swap;
}

/**
 * Create an Activity entity
 */
export function createActivity(
  context: handlerContext,
  id: string,
  tokenId: string,
  activityType: ActivityType,
  makerId: string,
  amountETH: bigint,
  amountToken: bigint,
  timestamp: bigint,
  txHash: string
): Activity {
  const activity: Activity = {
    id,
    token_id: tokenId,
    activityType,
    maker_id: makerId,
    amountETH,
    amountToken,
    timestamp,
    txHash,
  };
  context.Activity.set(activity);
  return activity;
}

/**
 * Create a FeeDistribution entity
 */
export function createFeeDistribution(
  context: handlerContext,
  id: string,
  swapFee: number,
  referrer: number,
  protocol: number,
  active: boolean
): FeeDistribution {
  const feeDistribution: FeeDistribution = {
    id,
    swapFee,
    referrer,
    protocol,
    active,
    community: undefined,
    creator: undefined,
  };
  context.FeeDistribution.set(feeDistribution);
  return feeDistribution;
}
