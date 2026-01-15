/**
 * Entity update functions for Envio
 * These functions update existing entities using context.Entity.set()
 */

import { BigDecimal, handlerContext, Config, Pool, BidWall, FairLaunch } from "generated";
import type { CollectionToken_t } from "generated/src/db/Entities.gen";
import { getConfig, getPool, getCollectionToken, getBidWall, getFairLaunch, getBundle } from "./reads";
import { ZERO_BD } from "../utils/constants";

/**
 * Increment the collection count in Config
 */
export async function incrementCollectionCount(context: handlerContext): Promise<Config> {
  const config = await getConfig(context);
  const updated: Config = {
    ...config,
    collectionCount: config.collectionCount + 1n,
  };
  context.Config.set(updated);
  return updated;
}

/**
 * Increment total users in Config
 */
export async function incrementTotalUsers(context: handlerContext): Promise<Config> {
  const config = await getConfig(context);
  const updated: Config = {
    ...config,
    totalUsers: config.totalUsers + 1n,
  };
  context.Config.set(updated);
  return updated;
}

/**
 * Increment total volume in Config
 */
export async function incrementTotalVolume(
  context: handlerContext, 
  volumeETH: bigint, 
  volumeUSDC: BigDecimal
): Promise<Config> {
  const config = await getConfig(context);
  const updated: Config = {
    ...config,
    volumeETH: config.volumeETH + volumeETH,
    volumeUSDC: config.volumeUSDC.plus(volumeUSDC),
  };
  context.Config.set(updated);
  return updated;
}

/**
 * Increment total fees in Config
 */
export async function incrementTotalFeesETH(
  context: handlerContext, 
  feesETH: bigint
): Promise<Config> {
  const config = await getConfig(context);
  const bundle = await getBundle(context);
  const ethPriceUSDC = bundle?.ethPriceUSDC || BigDecimal("2500");
  
  // Calculate fees in USDC
  const feesUSDC = BigDecimal(feesETH.toString())
    .div(BigDecimal("1000000000000000000"))
    .times(ethPriceUSDC);
  
  const updated: Config = {
    ...config,
    totalFeesETH: config.totalFeesETH + feesETH,
    totalFeesUSDC: config.totalFeesUSDC.plus(feesUSDC),
  };
  context.Config.set(updated);
  return updated;
}

/**
 * Update Pool volume
 */
export async function updatePoolVolume(
  context: handlerContext,
  poolId: string,
  volumeETH: bigint,
  volumeUSDC: BigDecimal
): Promise<Pool | undefined> {
  const pool = await getPool(context, poolId);
  if (!pool) return undefined;
  
  const updated: Pool = {
    ...pool,
    volumeETH: pool.volumeETH + volumeETH,
    volumeUSDC: pool.volumeUSDC.plus(volumeUSDC),
  };
  context.Pool.set(updated);
  return updated;
}

/**
 * Update Pool state (tick, sqrtPrice, liquidity)
 */
export async function updatePoolState(
  context: handlerContext,
  poolId: string,
  sqrtPriceX96: bigint,
  tick: number,
  liquidity: bigint
): Promise<Pool | undefined> {
  const pool = await getPool(context, poolId);
  if (!pool) return undefined;
  
  const updated: Pool = {
    ...pool,
    sqrtPriceX96,
    tick,
    liquidity,
  };
  context.Pool.set(updated);
  return updated;
}

/**
 * Update CollectionToken volume and fees
 */
export async function updateCollectionTokenVolume(
  context: handlerContext,
  tokenId: string,
  volumeETH: bigint,
  volumeUSDC: BigDecimal
): Promise<CollectionToken_t | undefined> {
  const token = await getCollectionToken(context, tokenId);
  if (!token) return undefined;
  
  const updated: CollectionToken_t = {
    ...token,
    volumeETH: token.volumeETH + volumeETH,
    volumeUSDC: token.volumeUSDC.plus(volumeUSDC),
  };
  context.CollectionToken.set(updated);
  return updated;
}

/**
 * Update CollectionToken fees
 */
export async function updateCollectionTokenFees(
  context: handlerContext,
  tokenId: string,
  feesETH: bigint,
  feesUSDC: BigDecimal
): Promise<CollectionToken_t | undefined> {
  const token = await getCollectionToken(context, tokenId);
  if (!token) return undefined;
  
  const updated: CollectionToken_t = {
    ...token,
    totalFeesETH: token.totalFeesETH + feesETH,
    totalFeesUSDC: token.totalFeesUSDC.plus(feesUSDC),
  };
  context.CollectionToken.set(updated);
  return updated;
}

/**
 * Update CollectionToken price (derivedETH)
 */
export async function updateCollectionTokenPrice(
  context: handlerContext,
  tokenId: string,
  derivedETH: bigint,
  marketCapETH: bigint,
  marketCapUSDC: BigDecimal
): Promise<CollectionToken_t | undefined> {
  const token = await getCollectionToken(context, tokenId);
  if (!token) return undefined;
  
  const updated: CollectionToken_t = {
    ...token,
    derivedETH,
    tokenPrice: derivedETH,
    marketCapETH,
    marketCapUSDC,
  };
  context.CollectionToken.set(updated);
  return updated;
}

/**
 * Update BidWall balance and amount
 */
export async function updateBidWallDeposit(
  context: handlerContext,
  poolId: string,
  depositAmount: bigint
): Promise<BidWall | undefined> {
  const bidWall = await getBidWall(context, poolId);
  if (!bidWall) return undefined;
  
  const updated: BidWall = {
    ...bidWall,
    balance: bidWall.balance + depositAmount,
    amount: bidWall.amount + depositAmount,
  };
  context.BidWall.set(updated);
  return updated;
}

/**
 * Update BidWall position (repositioned)
 */
export async function updateBidWallPosition(
  context: handlerContext,
  poolId: string,
  tickLower: bigint,
  tickUpper: bigint,
  deployedETH: bigint
): Promise<BidWall | undefined> {
  const bidWall = await getBidWall(context, poolId);
  if (!bidWall) return undefined;
  
  const updated: BidWall = {
    ...bidWall,
    tickLower,
    tickUpper,
    deployedETH,
    initialized: true,
  };
  context.BidWall.set(updated);
  return updated;
}

/**
 * Close BidWall
 */
export async function closeBidWall(
  context: handlerContext,
  poolId: string
): Promise<BidWall | undefined> {
  const bidWall = await getBidWall(context, poolId);
  if (!bidWall) return undefined;
  
  const updated: BidWall = {
    ...bidWall,
    closed: true,
    balance: 0n,
  };
  context.BidWall.set(updated);
  return updated;
}

/**
 * End FairLaunch
 */
export async function endFairLaunch(
  context: handlerContext,
  poolId: string,
  ethEarned: bigint,
  timestamp: bigint
): Promise<FairLaunch | undefined> {
  const fairLaunch = await getFairLaunch(context, poolId);
  if (!fairLaunch) return undefined;
  
  const updated: FairLaunch = {
    ...fairLaunch,
    active: false,
    ethEarned,
    ends_at: timestamp,
  };
  context.FairLaunch.set(updated);
  return updated;
}

/**
 * Update FairLaunch tick
 */
export async function updateFairLaunchTick(
  context: handlerContext,
  poolId: string,
  tick: number
): Promise<FairLaunch | undefined> {
  const fairLaunch = await getFairLaunch(context, poolId);
  if (!fairLaunch) return undefined;
  
  const updated: FairLaunch = {
    ...fairLaunch,
    tick,
  };
  context.FairLaunch.set(updated);
  return updated;
}
