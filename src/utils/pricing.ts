// Pricing utility functions

import { BigDecimal, handlerContext, Bundle } from "generated";
import { ZERO_BI, ZERO_BD, Q192 } from "./constants";
import { BUNDLE_ID } from "./constants";

/**
 * Convert ETH amount to USDC using a bundle that's already been loaded
 * This is the synchronous version that takes the bundle directly
 */
export function convertETHtoUSDCWithBundle(
  ethAmount: bigint,
  bundle: Bundle | undefined
): BigDecimal {
  if (!bundle) {
    return ZERO_BD;
  }

  // ethAmount is in wei (18 decimals)
  // Convert to ETH first, then multiply by USD price
  const ethBD = BigDecimal(ethAmount.toString()).div(
    BigDecimal("1000000000000000000")
  );
  return ethBD.times(bundle.ethPriceUSDC);
}

/**
 * Convert ETH amount to USDC
 * Uses Bundle entity to get current ETH/USDC price
 * NOTE: This is async - must be awaited
 */
export async function convertETHtoUSDC(
  ethAmount: bigint,
  context: handlerContext
): Promise<BigDecimal> {
  const bundle = await context.Bundle.get(BUNDLE_ID);
  return convertETHtoUSDCWithBundle(ethAmount, bundle);
}

/**
 * Convert sqrtPriceX96 to human-readable prices
 * For Uniswap V3/V4 style AMMs
 *
 * sqrtPriceX96 = sqrt(price) * 2^96
 * price = (sqrtPriceX96 / 2^96)^2
 */
export function sqrtPriceX96ToTokenPrices(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): [bigint, bigint] {
  if (sqrtPriceX96 === 0n) {
    return [ZERO_BI, ZERO_BI];
  }

  // Calculate price = (sqrtPriceX96)^2 / 2^192
  const sqrtPriceSquared = sqrtPriceX96 * sqrtPriceX96;

  // Adjust for decimal differences between tokens
  const decimalsDiff = token0Decimals - token1Decimals;

  // price0 = how much token1 for 1 token0
  // price1 = how much token0 for 1 token1 (inverse)

  let price0: bigint;
  let price1: bigint;

  // Scale by 10^18 to maintain precision (since we're dealing with integers)
  const precision = 10n ** 18n;

  if (decimalsDiff >= 0) {
    const decimalMultiplier = 10n ** BigInt(decimalsDiff);
    price0 = (sqrtPriceSquared * precision * decimalMultiplier) / Q192;
  } else {
    const decimalDivisor = 10n ** BigInt(-decimalsDiff);
    price0 = (sqrtPriceSquared * precision) / (Q192 * decimalDivisor);
  }

  // Calculate inverse price
  if (price0 > 0n) {
    price1 = (precision * precision) / price0;
  } else {
    price1 = ZERO_BI;
  }

  return [price0, price1];
}

/**
 * Calculate initial token price based on sqrtPriceX96 and market cap
 */
export function calculateInitialTokenPrice(
  sqrtPriceX96: bigint,
  totalSupply: bigint,
  decimals: number = 18,
  flipped: boolean = false
): bigint {
  if (sqrtPriceX96 === 0n || totalSupply === 0n) {
    return ZERO_BI;
  }

  // For flETH (token0) / memecoin (token1) pairs
  // Price is expressed as memecoin per flETH (or inverse if flipped)
  const [price0, price1] = sqrtPriceX96ToTokenPrices(
    sqrtPriceX96,
    18,
    decimals
  );

  // If flipped, token0 is memecoin, so use price1 (flETH per memecoin)
  return flipped ? price0 : price1;
}

/**
 * Calculate market cap in ETH
 */
export function calculateMarketCapETH(
  tokenPrice: bigint,
  totalSupply: bigint
): bigint {
  if (tokenPrice === 0n || totalSupply === 0n) {
    return ZERO_BI;
  }

  // tokenPrice is in 18 decimal precision
  // totalSupply is in token decimals (usually 18)
  // marketCap = tokenPrice * totalSupply / 10^18
  return (tokenPrice * totalSupply) / 10n ** 18n;
}

/**
 * Calculate initial token price from starting market cap and total supply.
 * Matches subgraph's calculateInitialTokenPrice behavior.
 *
 * Formula: initialPrice = startingMarketCap * 10^decimals / totalSupply
 *
 * @param startingMarketCap - The market cap in USDC (or the base currency)
 * @param totalSupply - The effective total supply (may be overridden for bridged tokens)
 * @param decimals - The token decimals (default 18)
 */
export function calculateInitialPriceFromMarketCap(
  startingMarketCap: bigint,
  totalSupply: bigint,
  decimals: number = 18
): bigint {
  if (totalSupply === 0n) {
    return ZERO_BI;
  }

  // initialPrice = startingMarketCap * 10^decimals / totalSupply
  return (startingMarketCap * 10n ** BigInt(decimals)) / totalSupply;
}

/**
 * Get or create Bundle with default ETH price
 * NOTE: This is async - must be awaited
 */
export async function getOrCreateBundle(
  context: handlerContext
): Promise<Bundle> {
  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = {
      id: BUNDLE_ID,
      ethPriceUSDC: BigDecimal("2500"), // Default ETH price, will be updated
    };
    context.Bundle.set(bundle);
  }
  return bundle;
}

/**
 * Update ETH price in bundle
 * NOTE: This is async - must be awaited
 */
export async function updateEthPriceUSD(
  context: handlerContext,
  newPrice: BigDecimal
): Promise<void> {
  const bundle = await getOrCreateBundle(context);
  context.Bundle.set({
    ...bundle,
    ethPriceUSDC: newPrice,
  });
}
