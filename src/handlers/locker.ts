/**
 * Locker Handlers
 * Handles Locker contract events for pause state
 */

import { Locker } from "generated";
import { CONFIG_ID, ZERO_BI, ZERO_BD } from "../utils/constants";

const DEFAULT_FEE_DISTRIBUTION_ID = CONFIG_ID;

// =============================================================================
// LOCKER HANDLERS
// =============================================================================

Locker.Paused.handler(async ({ event, context }) => {
  let config = await context.Config.get(CONFIG_ID);

  if (!config) {
    // Initialize Config and FeeDistribution if they don't exist
    context.FeeDistribution.set({
      id: DEFAULT_FEE_DISTRIBUTION_ID,
      swapFee: 0,
      referrer: 0,
      protocol: 0,
      community: undefined,
      active: true,
      creator: undefined,
    });

    config = {
      id: CONFIG_ID,
      locked: false,
      lockerPaused: true,
      collectionCount: ZERO_BI,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalUsers: ZERO_BI,
      totalFeesETH: ZERO_BI,
      totalFeesUSDC: ZERO_BD,
      feeCalculator: "0x0000000000000000000000000000000000000000",
      protocolFeeRecipient: "0x0000000000000000000000000000000000000000",
      feeDistribution_id: DEFAULT_FEE_DISTRIBUTION_ID,
      latestReferralEscrow: "0x0000000000000000000000000000000000000000",
      staleTimeWindow: ZERO_BI,
    };
    context.Config.set(config);
  } else {
    context.Config.set({
      ...config,
      lockerPaused: true,
    });
  }
});

Locker.Unpaused.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);

  if (config) {
    context.Config.set({
      ...config,
      lockerPaused: false,
    });
  }
});


