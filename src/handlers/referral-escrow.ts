/**
 * Referral Escrow Handlers
 * Handles ReferralEscrow (dynamic) contract events
 */

import { ReferralEscrow } from "generated";
import { ZERO_BI, BUNDLE_ID } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";
import { FLETH } from "../addresses/base";

// =============================================================================
// REFERRAL ESCROW HANDLERS
// =============================================================================

ReferralEscrow.TokensAssigned.handler(async ({ event, context }) => {
  const userId = normalizeAddress(event.params.user);
  const tokenAddress = normalizeAddress(event.params.token);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Ensure user exists
  if (!(await context.User.get(userId))) context.User.set({ id: userId });

  // Create ReferralEscrowAssigned entity
  context.ReferralEscrowAssigned.set({
    id: `${txHash}-${event.logIndex}`,
    amount: event.params.amount,
    receiver_id: userId,
    token_id: tokenAddress === FLETH ? "fleth" : tokenAddress,
    timestamp,
    txHash,
  });

  // Create or update TokenReferralFee
  const isFleth =
    tokenAddress === FLETH ||
    tokenAddress === "0x0000000000000000000000000000000000000000";
  const tokenRefFeeId = `${userId}-${isFleth ? "fleth" : tokenAddress}`;
  const existingFee = await context.TokenReferralFee.get(tokenRefFeeId);

  if (existingFee) {
    context.TokenReferralFee.set({
      ...existingFee,
      totalAmount: existingFee.totalAmount + event.params.amount,
    });
  } else {
    context.TokenReferralFee.set({
      id: tokenRefFeeId,
      totalAmount: event.params.amount,
      collectionToken_id: isFleth ? undefined : tokenAddress,
      isFleth,
      user_id: userId,
    });
  }
});

ReferralEscrow.TokensClaimed.handler(async ({ event, context }) => {
  const userId = normalizeAddress(event.params.user);
  const recipientId = normalizeAddress(event.params.recipient);
  const tokenAddress = normalizeAddress(event.params.token);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Ensure users exist
  if (!(await context.User.get(userId))) context.User.set({ id: userId });
  if (!(await context.User.get(recipientId)))
    context.User.set({ id: recipientId });

  // Get or create UserAggregate
  let userAggregate = await context.UserAggregate.get(userId);
  let totalTokensInETH = 0n;

  const isFleth =
    tokenAddress === FLETH ||
    tokenAddress === "0x0000000000000000000000000000000000000000";

  if (isFleth) {
    totalTokensInETH = event.params.amount;
  } else {
    // Convert tokens to ETH value using collectionToken price
    const collectionToken = await context.CollectionToken.get(tokenAddress);
    if (collectionToken && collectionToken.decimals > 0) {
      // Scale and multiply by derivedETH
      const scaled =
        event.params.amount / BigInt(10 ** collectionToken.decimals);
      totalTokensInETH = scaled * collectionToken.derivedETH;
    }
  }

  if (userAggregate) {
    context.UserAggregate.set({
      ...userAggregate,
      totalReferrerFeesETH:
        userAggregate.totalReferrerFeesETH + totalTokensInETH,
    });
  } else {
    context.UserAggregate.set({
      id: userId,
      user_id: userId,
      totalReferrerFeesETH: totalTokensInETH,
    });
  }

  // Create ReferralEscrowClaimed entity
  const bundle = await context.Bundle.get(BUNDLE_ID);
  context.ReferralEscrowClaimed.set({
    id: `${txHash}-${event.logIndex}`,
    amount: event.params.amount,
    amountUSDC: convertETHtoUSDCWithBundle(totalTokensInETH, bundle),
    receiver_id: recipientId,
    token_id: isFleth ? "fleth" : tokenAddress,
    timestamp,
    txHash,
  });

  // Reset TokenReferralFee
  const tokenRefFeeId = `${userId}-${isFleth ? "fleth" : tokenAddress}`;
  const existingFee = await context.TokenReferralFee.get(tokenRefFeeId);
  if (existingFee) {
    context.TokenReferralFee.set({
      ...existingFee,
      totalAmount: 0n,
    });
  }
});

ReferralEscrow.TokensSwapped.handler(async ({ event, context }) => {
  const userId = normalizeAddress(event.params.user);
  const tokenAddress = normalizeAddress(event.params.token);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Ensure user exists
  if (!(await context.User.get(userId))) context.User.set({ id: userId });

  context.ReferralEscrowSwapped.set({
    id: `${txHash}-${event.logIndex}`,
    ethOut: event.params.ethOut,
    tokensIn: event.params.tokensIn,
    receiver_id: userId,
    token_id: tokenAddress,
    timestamp,
    txHash,
  });
});






