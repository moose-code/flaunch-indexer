/**
 * Memecoin Treasury Handlers
 * Handles MemecoinTreasuryContract (dynamic) events
 */

import { MemecoinTreasuryContract } from "generated";
import { normalizeAddress, generateActivityId } from "../utils/helpers";

// =============================================================================
// MEMECOIN TREASURY CONTRACT HANDLERS
// =============================================================================

MemecoinTreasuryContract.ActionExecuted.handler(async ({ event, context }) => {
  const treasuryAddress = normalizeAddress(event.srcAddress);
  const actionAddress = normalizeAddress(event.params.action);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Load treasury
  const treasury = await context.MemecoinTreasury.get(treasuryAddress);
  if (!treasury) return;

  // Load action
  const action = await context.MemecoinAction.get(actionAddress);
  const actionCount = action ? action.totalActions : 0n;

  // Update treasury
  context.MemecoinTreasury.set({
    ...treasury,
    totalActions: treasury.totalActions + 1n,
    lastActionTimestamp: timestamp,
  });

  // Find matching activity created by ActionContract handler - use subgraph-compatible ID format
  const activityId = generateActivityId(txHash, actionCount);
  const activity = await context.MemecoinTreasuryActivity.get(activityId);

  if (activity) {
    context.MemecoinTreasuryActivity.set({
      ...activity,
      treasury_id: treasuryAddress,
      pool_id: treasury.pool_id,
    });
  }
});




