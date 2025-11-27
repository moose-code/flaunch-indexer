// Helper utility functions

import { BigDecimal } from "generated";
import { ZERO_BI, ONE_BI, ZERO_BD, Q192 } from "./constants";

/**
 * Get absolute value of a BigInt
 */
export function absBigInt(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/**
 * Safe division that returns 0 if denominator is 0
 */
export function safeDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    return ZERO_BI;
  }
  return numerator / denominator;
}

/**
 * Safe division for BigDecimal
 */
export function safeDivBD(
  numerator: BigDecimal,
  denominator: BigDecimal
): BigDecimal {
  if (denominator.eq(ZERO_BD)) {
    return ZERO_BD;
  }
  return numerator.div(denominator);
}

/**
 * Scale a value by decimals (multiply by 10^decimals)
 */
export function scale(value: bigint, decimals: number): bigint {
  return value * 10n ** BigInt(decimals);
}

/**
 * Descale a value by decimals (divide by 10^decimals)
 */
export function descale(value: bigint, decimals: number): bigint {
  return value / 10n ** BigInt(decimals);
}

/**
 * Convert BigInt to BigDecimal with given decimals
 */
export function convertTokenToDecimal(
  amount: bigint,
  decimals: number
): BigDecimal {
  if (decimals === 0) {
    return BigDecimal(amount.toString());
  }
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const remainder = amount % divisor;

  // Pad remainder with leading zeros
  let remainderStr = remainder.toString();
  while (remainderStr.length < decimals) {
    remainderStr = "0" + remainderStr;
  }

  return BigDecimal(`${integerPart}.${remainderStr}`);
}

/**
 * Generate entity ID from components (multichain safe)
 */
export function generateId(
  ...components: (string | number | bigint)[]
): string {
  return components.map((c) => c.toString()).join("-");
}

/**
 * Generate entity ID with chain prefix for multichain support
 */
export function generateChainId(
  chainId: number,
  ...components: (string | number | bigint)[]
): string {
  return generateId(chainId, ...components);
}

/**
 * Convert sqrtPriceX96 to token prices
 * Returns [price0, price1] where:
 * - price0 = price of token0 in terms of token1
 * - price1 = price of token1 in terms of token0
 */
export function sqrtPriceX96ToTokenPrices(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): [bigint, bigint] {
  // price = (sqrtPriceX96 / 2^96)^2
  // price0 = price = token1 per token0
  // price1 = 1/price = token0 per token1

  const sqrtPrice = sqrtPriceX96;
  const price = (sqrtPrice * sqrtPrice) / Q192;

  // Adjust for decimal differences
  const decimalDiff = token1Decimals - token0Decimals;

  if (decimalDiff > 0) {
    // token1 has more decimals
    const multiplier = 10n ** BigInt(decimalDiff);
    const price0 = price * multiplier;
    const price1 =
      price0 > 0n
        ? 10n ** BigInt(token0Decimals + token1Decimals) / price0
        : 0n;
    return [price0, price1];
  } else if (decimalDiff < 0) {
    // token0 has more decimals
    const divisor = 10n ** BigInt(-decimalDiff);
    const price0 = price / divisor;
    const price1 =
      price0 > 0n
        ? 10n ** BigInt(token0Decimals + token1Decimals) / price0
        : 0n;
    return [price0, price1];
  } else {
    // Same decimals
    const price1 = price > 0n ? 10n ** BigInt(token0Decimals * 2) / price : 0n;
    return [price, price1];
  }
}

/**
 * Get BigInt from hex bytes
 */
export function getBigIntFromBytes(bytes: string): bigint {
  if (bytes.startsWith("0x")) {
    return BigInt(bytes);
  }
  return BigInt("0x" + bytes);
}

/**
 * Hex string to BigInt
 */
export function hexToBigInt(hex: string): bigint {
  if (hex.startsWith("0x")) {
    return BigInt(hex);
  }
  return BigInt("0x" + hex);
}

/**
 * Get timestamp in seconds from block timestamp
 */
export function getTimestampInSeconds(blockTimestamp: bigint): number {
  return Number(blockTimestamp);
}

/**
 * Get day ID from timestamp (number of days since epoch)
 */
export function getDayId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 86400);
}

/**
 * Get hour ID from timestamp
 */
export function getHourId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 3600);
}

/**
 * Get minute ID from timestamp
 */
export function getMinuteId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 60);
}

/**
 * Get 15-minute ID from timestamp
 */
export function get15MinuteId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 900);
}

/**
 * Get 4-hour ID from timestamp
 */
export function get4HourId(timestamp: bigint): number {
  return Math.floor(Number(timestamp) / 14400);
}

/**
 * Get period start unix timestamp for day
 */
export function getDayStartTimestamp(timestamp: bigint): number {
  return getDayId(timestamp) * 86400;
}

/**
 * Get period start unix timestamp for hour
 */
export function getHourStartTimestamp(timestamp: bigint): number {
  return getHourId(timestamp) * 3600;
}

/**
 * Get period start unix timestamp for minute
 */
export function getMinuteStartTimestamp(timestamp: bigint): number {
  return getMinuteId(timestamp) * 60;
}

/**
 * Get period start unix timestamp for 15 minutes
 */
export function get15MinuteStartTimestamp(timestamp: bigint): number {
  return get15MinuteId(timestamp) * 900;
}

/**
 * Get period start unix timestamp for 4 hours
 */
export function get4HourStartTimestamp(timestamp: bigint): number {
  return get4HourId(timestamp) * 14400;
}

/**
 * Normalize address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Generate Collection ID to match subgraph format.
 * Subgraph uses: flaunchAddr.concatI32(tokenId.toI32()).toHexString()
 * This concatenates the address bytes with the tokenId as a 4-byte int32.
 */
export function generateCollectionId(
  flaunchAddr: string,
  tokenId: bigint
): string {
  // Normalize address and remove 0x prefix
  const addrHex = normalizeAddress(flaunchAddr).replace("0x", "");

  // Convert tokenId to 4-byte int32 hex (big-endian)
  const tokenIdNum = Number(tokenId);
  const tokenIdHex = tokenIdNum.toString(16).padStart(8, "0");

  // Concatenate and add 0x prefix
  return "0x" + addrHex + tokenIdHex;
}

/**
 * Generate Activity ID to match subgraph format.
 * Subgraph uses: txHash.concatI32(totalActions.toI32())
 */
export function generateActivityId(
  txHash: string,
  actionCount: bigint
): string {
  // Normalize txHash and remove 0x prefix
  const hashHex = txHash.toLowerCase().replace("0x", "");

  // Convert actionCount to 4-byte int32 hex (big-endian)
  const countNum = Number(actionCount);
  const countHex = countNum.toString(16).padStart(8, "0");

  // Concatenate and add 0x prefix
  return "0x" + hashHex + countHex;
}

/**
 * Check if two addresses are equal (case-insensitive)
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

