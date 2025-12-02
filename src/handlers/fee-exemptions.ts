/**
 * Fee Exemptions Handlers
 * Handles FeeExemptions and FlaunchFeeExemption contract events
 */

import { FeeExemptions, FlaunchFeeExemption } from "generated";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// FEE EXEMPTIONS HANDLERS
// =============================================================================

FeeExemptions.BeneficiaryFeeSet.handler(async ({ event, context }) => {
  const beneficiary = normalizeAddress(event.params.beneficiary);
  context.FeeExemption.set({
    id: beneficiary,
    flatFee: Number(event.params.fee),
  });
});

FeeExemptions.BeneficiaryFeeRemoved.handler(async ({ event, context }) => {
  const beneficiary = normalizeAddress(event.params.beneficiary);
  const existing = await context.FeeExemption.get(beneficiary);
  if (existing) {
    context.FeeExemption.set({
      ...existing,
      flatFee: 0,
    });
  }
});

// =============================================================================
// FLAUNCH FEE EXEMPTION HANDLERS
// =============================================================================

FlaunchFeeExemption.FeeExemptionUpdated.handler(async ({ event, context }) => {
  const beneficiary = normalizeAddress(event.params.user);

  if (event.params.exempt) {
    context.FlaunchFeeExemption.set({
      id: beneficiary,
      createdAt: BigInt(event.block.timestamp),
    });
  }
});







