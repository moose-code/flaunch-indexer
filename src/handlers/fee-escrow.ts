/**
 * Fee Escrow Handlers
 * Handles FeeEscrow contract events
 */

import { FeeEscrow } from "generated";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// FEE ESCROW HANDLERS
// =============================================================================

FeeEscrow.Deposit.handler(async ({ event, context }) => {
  // Note: FeeEscrow uses `sender` without underscore
  const sender = normalizeAddress(event.params.sender);
  const user = await context.User.get(sender);
  if (!user) {
    context.User.set({ id: sender });
  }
});

FeeEscrow.Withdrawal.handler(async ({ event, context }) => {
  // Note: FeeEscrow uses `sender` without underscore
  const sender = normalizeAddress(event.params.sender);
  const user = await context.User.get(sender);
  if (!user) {
    context.User.set({ id: sender });
  }
});


