/**
 * Pool Manager Handlers
 * Handles Uniswap V4 PoolManager events
 */

import { PoolManager } from "generated";

// =============================================================================
// POOL MANAGER HANDLERS
// =============================================================================

PoolManager.Swap.handler(async ({ event, context }) => {
  // Uniswap V4 Swap event - may be used for ETH/USDC price updates
});

