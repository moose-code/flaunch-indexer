/**
 * Action Contract Handlers
 * Handles ActionContract (dynamic) events
 */

import { ActionContract } from "generated";
import { normalizeAddress, generateActivityId } from "../utils/helpers";

// =============================================================================
// ACTION CONTRACT HANDLERS
// =============================================================================

ActionContract.ActionExecuted.handler(async ({ event, context }) => {
  const actionAddress = normalizeAddress(event.srcAddress);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Load action
  let action = await context.MemecoinAction.get(actionAddress);

  if (action && action.approved) {
    // Use subgraph-compatible ID format
    const activityId = generateActivityId(txHash, action.totalActions);

    // Increment action count
    context.MemecoinAction.set({
      ...action,
      totalActions: action.totalActions + 1n,
    });

    // Create activity - treasury will be linked by MemecoinTreasury handler
    context.MemecoinTreasuryActivity.set({
      id: activityId,
      pool_id: undefined,
      treasury_id: undefined,
      action_id: actionAddress,
      tokenDelta0: event.params._token0,
      tokenDelta1: event.params._token1,
      timestamp,
      transactionHash: txHash,
      blockNumber: BigInt(event.block.number),
    });
  }
});


