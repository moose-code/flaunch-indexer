// Constants used throughout the indexer

import { BigDecimal } from "generated";

/**
 * Zero values
 */
export const ZERO_BI = 0n;
export const ONE_BI = 1n;

// BigDecimal constants - using string constructor for precision
export const ZERO_BD = BigDecimal("0");
export const ONE_BD = BigDecimal("1");

/**
 * Singleton IDs
 * These match subgraph's Bytes.fromI32() format (little-endian)
 */
export const CONFIG_ID = "0x01000000"; // Bytes.fromI32(1)
export const BUNDLE_ID = "1"; // Match subgraph convention
export const BURNER_ID = "0x02000000"; // Bytes.fromI32(2)

/**
 * Address constants
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Time constants (in seconds)
 */
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_15_MINUTES = 900;
export const SECONDS_PER_4_HOURS = 14400;

/**
 * Precision constants
 */
export const USDC_DECIMALS = 6;
export const ETH_DECIMALS = 18;
export const DEFAULT_DECIMALS = 18;

/**
 * Q96 for Uniswap V3/V4 price calculations
 */
export const Q96 = 2n ** 96n;
export const Q192 = 2n ** 192n;



