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
 * Matches subgraph behavior: extracts first 32 bytes (64 hex chars) from the bytes string
 * Handles empty bytes ("0x" or "") by returning 0n
 *
 * @param bytes - Hex string of bytes, e.g., "0x000000000000000000000000000000000000000000000000000000012a05f200"
 */
export function getBigIntFromBytes(bytes: string): bigint {
  // Handle empty or invalid bytes
  if (!bytes || bytes === "0x" || bytes === "" || bytes.length < 3) {
    return 0n;
  }

  // Normalize to lowercase
  let normalized = bytes.toLowerCase();

  // Determine if string has 0x prefix and adjust accordingly
  let hexPortion: string;
  if (normalized.startsWith("0x")) {
    // Has 0x prefix - extract first 32 bytes (64 hex chars) after the prefix
    // substring(2, 66) gets chars 2-65 (64 chars = 32 bytes)
    hexPortion = normalized.substring(2, 66);
  } else {
    // No 0x prefix - extract first 64 hex chars directly
    hexPortion = normalized.substring(0, 64);
  }

  // Handle empty extraction
  if (!hexPortion || hexPortion.length === 0) {
    return 0n;
  }

  // Ensure we have a valid hex string
  if (!/^[0-9a-f]+$/i.test(hexPortion)) {
    return 0n;
  }

  try {
    return BigInt("0x" + hexPortion);
  } catch {
    return 0n;
  }
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
 * AssemblyScript's concatI32 uses LITTLE-ENDIAN byte order.
 */
export function generateCollectionId(
  flaunchAddr: string,
  tokenId: bigint
): string {
  // Normalize address and remove 0x prefix
  const addrHex = normalizeAddress(flaunchAddr).replace("0x", "");

  // Convert tokenId to 4-byte int32 hex in LITTLE-ENDIAN format
  // (to match AssemblyScript's concatI32 behavior)
  const tokenIdNum = Number(tokenId);
  const tokenIdHex = tokenIdNum.toString(16).padStart(8, "0");
  // Reverse byte order: "00001f5d" -> "5d1f0000"
  const littleEndian = tokenIdHex.match(/.{2}/g)!.reverse().join("");

  // Concatenate and add 0x prefix
  return "0x" + addrHex + littleEndian;
}

/**
 * Generate Activity ID to match subgraph format.
 * Subgraph uses: txHash.concatI32(totalActions.toI32())
 * AssemblyScript's concatI32 uses LITTLE-ENDIAN byte order.
 */
export function generateActivityId(
  txHash: string,
  actionCount: bigint
): string {
  // Normalize txHash and remove 0x prefix
  const hashHex = txHash.toLowerCase().replace("0x", "");

  // Convert actionCount to 4-byte int32 hex in LITTLE-ENDIAN format
  const countNum = Number(actionCount);
  const countHex = countNum.toString(16).padStart(8, "0");
  // Reverse byte order to match AssemblyScript's concatI32
  const littleEndian = countHex.match(/.{2}/g)!.reverse().join("");

  // Concatenate and add 0x prefix
  return "0x" + hashHex + littleEndian;
}

/**
 * Check if two addresses are equal (case-insensitive)
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// =============================================================================
// SUBGRAPH-COMPATIBLE ID GENERATION FUNCTIONS
// These functions replicate AssemblyScript's Bytes class methods for ID generation
// =============================================================================

/**
 * Replicate Bytes.fromI32() from AssemblyScript.
 * Creates a 4-byte hex string from an integer in LITTLE-ENDIAN format.
 *
 * @example bytesFromI32(1) => "0x01000000"
 * @example bytesFromI32(2) => "0x02000000"
 */
export function bytesFromI32(num: number): string {
  // Convert to 4-byte hex in little-endian format
  const hex = (num >>> 0).toString(16).padStart(8, "0");
  // Reverse byte order: "00000001" -> "01000000"
  const littleEndian = hex.match(/.{2}/g)!.reverse().join("");
  return "0x" + littleEndian;
}

/**
 * Replicate Bytes.concat() from AssemblyScript.
 * Concatenates two hex strings by removing the 0x prefix from the second.
 *
 * @example concatBytes("0xabc123", "0xdef456") => "0xabc123def456"
 */
export function concatBytes(a: string, b: string): string {
  const aHex = a.toLowerCase().replace("0x", "");
  const bHex = b.toLowerCase().replace("0x", "");
  return "0x" + aHex + bHex;
}

/**
 * Replicate Bytes.concatI32() from AssemblyScript.
 * Appends a 4-byte little-endian integer to a hex string.
 *
 * @example concatI32("0xabc123", 5) => "0xabc12305000000"
 */
export function concatI32(bytes: string, num: number | bigint): string {
  const bytesHex = bytes.toLowerCase().replace("0x", "");
  // Convert to 4-byte hex in little-endian format
  const numValue = typeof num === "bigint" ? Number(num) : num;
  const hex = (numValue >>> 0).toString(16).padStart(8, "0");
  // Reverse byte order for little-endian
  const littleEndian = hex.match(/.{2}/g)!.reverse().join("");
  return "0x" + bytesHex + littleEndian;
}

/**
 * Generate a subgraph-compatible ID from txHash and logIndex.
 * Matches: txHash.concatI32(logIndex.toI32())
 */
export function generateTxLogId(
  txHash: string,
  logIndex: number | bigint
): string {
  return concatI32(txHash, logIndex);
}

/**
 * Generate a subgraph-compatible ID from address + txHash + logIndex.
 * Matches: address.concat(txHash).concatI32(logIndex.toI32())
 */
export function generateAddressTxLogId(
  address: string,
  txHash: string,
  logIndex: number | bigint
): string {
  return concatI32(concatBytes(address, txHash), logIndex);
}
