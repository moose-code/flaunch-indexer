/**
 * Entity read/load functions for Envio
 * These functions wrap context.Entity.get() calls
 */

import { handlerContext, Config, Pool, User, BidWall, FairLaunch, FeeDistribution, Bundle } from "generated";
import type { CollectionToken_t } from "generated/src/db/Entities.gen";
import { CONFIG_ID, BUNDLE_ID, BURNER_ID, ZERO_BI, ZERO_BD, ZERO_ADDRESS } from "../utils/constants";

/**
 * Get the global Config entity, creating it if it doesn't exist
 */
export async function getConfig(context: handlerContext): Promise<Config> {
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
      feeCalculator: ZERO_ADDRESS,
      protocolFeeRecipient: ZERO_ADDRESS,
      feeDistribution_id: CONFIG_ID,
      latestReferralEscrow: ZERO_ADDRESS,
      staleTimeWindow: ZERO_BI,
    };
    context.Config.set(config);
  }
  return config;
}

/**
 * Get a Pool entity by ID
 */
export async function getPool(context: handlerContext, poolId: string): Promise<Pool | undefined> {
  return context.Pool.get(poolId);
}

/**
 * Get a CollectionToken entity by ID
 */
export async function getCollectionToken(context: handlerContext, tokenId: string): Promise<CollectionToken_t | undefined> {
  return context.CollectionToken.get(tokenId);
}

/**
 * Get a User entity by ID
 */
export async function getUser(context: handlerContext, userId: string): Promise<User | undefined> {
  return context.User.get(userId);
}

/**
 * Get a BidWall entity by poolId
 */
export async function getBidWall(context: handlerContext, poolId: string): Promise<BidWall | undefined> {
  return context.BidWall.get(poolId);
}

/**
 * Get a FairLaunch entity by poolId
 */
export async function getFairLaunch(context: handlerContext, poolId: string): Promise<FairLaunch | undefined> {
  return context.FairLaunch.get(poolId);
}

/**
 * Get a FeeDistribution entity by ID
 */
export async function getFeeDistribution(context: handlerContext, id: string): Promise<FeeDistribution | undefined> {
  return context.FeeDistribution.get(id);
}

/**
 * Get the Bundle entity for ETH price
 */
export async function getBundle(context: handlerContext): Promise<Bundle | undefined> {
  return context.Bundle.get(BUNDLE_ID);
}

