/**
 * Flay Burner Handlers
 * Handles FlayBurner and BuyBackAndBurnFlay contract events
 */

import { FlayBurner, BuyBackAndBurnFlay } from "generated";
import { ZERO_BI, BURNER_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// FLAY BURNER HANDLERS
// =============================================================================

FlayBurner.BurnerUpdated.handler(async ({ event, context }) => {
  const burnerAddress = normalizeAddress(event.params.burner);
  const timestamp = BigInt(event.block.timestamp);

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
  const burner = await context.FlayBurner.get(BURNER_ID);
  if (burner) {
    context.FlayBurner.set({
      ...burner,
      pendingETH: event.params.balance,
    });
  }
});
