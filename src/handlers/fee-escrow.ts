/**
 * Fee Escrow Handlers
 * Handles FeeEscrow contract events
 */

import { FeeEscrow, BigDecimal } from "generated";
import { normalizeAddress } from "../utils/helpers";
import { ZERO_BI, ZERO_BD, BUNDLE_ID } from "../utils/constants";
import { convertETHtoUSDCWithBundle } from "../utils/pricing";

// =============================================================================
// FEE ESCROW HANDLERS
// =============================================================================

FeeEscrow.Deposit.handler(async ({ event, context }) => {
  const sender = normalizeAddress(event.params.sender);
  const poolId = event.params.poolId;
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);

  // Ensure User exists
  if (!(await context.User.get(sender))) {
    context.User.set({ id: sender });
  }

  // Get bundle for USD conversion
  const bundle = await context.Bundle.get(BUNDLE_ID);

  // 1. Create or update UserFee for the payee
  const userFeeId = sender;
  let userFee = await context.UserFee.get(userFeeId);
  if (!userFee) {
    userFee = {
      id: userFeeId,
      payee_id: sender,
      claimableAmount: ZERO_BI,
      claimableAmountUSDC: ZERO_BD,
      lifetimeFees: ZERO_BI,
      totalClaimed: ZERO_BI,
      totalClaimedUSDC: ZERO_BD,
      updatedAt: timestamp,
    };
  }

  context.UserFee.set({
    ...userFee,
    claimableAmount: userFee.claimableAmount + amount,
    claimableAmountUSDC: userFee.claimableAmountUSDC.plus(
      convertETHtoUSDCWithBundle(amount, bundle)
    ),
    lifetimeFees: userFee.lifetimeFees + amount,
    updatedAt: timestamp,
  });

  // 2. Find the collection token from the pool
  const poolLookup = await context.PoolCollectionLookup.get(poolId);
  if (!poolLookup) return;

  const collectionTokenId = poolLookup.collectionToken_id;

  // 3. Create or update UserCollectionFee
  const userCollectionFeeId = `${sender}-${collectionTokenId}`;
  let userCollectionFee = await context.UserCollectionFee.get(userCollectionFeeId);
  if (!userCollectionFee) {
    userCollectionFee = {
      id: userCollectionFeeId,
      user_id: sender,
      collectionToken_id: collectionTokenId,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
  }

  context.UserCollectionFee.set({
    ...userCollectionFee,
    lifetimeFees: userCollectionFee.lifetimeFees + amount,
    updatedAt: timestamp,
  });

  // 4. Create or update CollectionFee
  const collectionFeeId = collectionTokenId;
  let collectionFee = await context.CollectionFee.get(collectionFeeId);
  if (!collectionFee) {
    collectionFee = {
      id: collectionFeeId,
      lifetimeFees: ZERO_BI,
      updatedAt: timestamp,
    };
  }

  context.CollectionFee.set({
    ...collectionFee,
    lifetimeFees: collectionFee.lifetimeFees + amount,
    updatedAt: timestamp,
  });
});

FeeEscrow.Withdrawal.handler(async ({ event, context }) => {
  const sender = normalizeAddress(event.params.sender);
  const recipient = normalizeAddress(event.params.recipient);
  const amount = event.params.amount;
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Ensure Users exist
  if (!(await context.User.get(sender))) {
    context.User.set({ id: sender });
  }
  if (!(await context.User.get(recipient))) {
    context.User.set({ id: recipient });
  }

  // Get bundle for USD conversion
  const bundle = await context.Bundle.get(BUNDLE_ID);

  // Update UserFee - reset claimable, add to totalClaimed
  const userFeeId = recipient;
  let userFee = await context.UserFee.get(userFeeId);
  if (!userFee) {
    userFee = {
      id: userFeeId,
      payee_id: recipient,
      claimableAmount: ZERO_BI,
      claimableAmountUSDC: ZERO_BD,
      lifetimeFees: ZERO_BI,
      totalClaimed: ZERO_BI,
      totalClaimedUSDC: ZERO_BD,
      updatedAt: timestamp,
    };
  }

  context.UserFee.set({
    ...userFee,
    claimableAmount: ZERO_BI,
    claimableAmountUSDC: ZERO_BD,
    totalClaimed: userFee.totalClaimed + amount,
    totalClaimedUSDC: userFee.totalClaimedUSDC.plus(
      convertETHtoUSDCWithBundle(amount, bundle)
    ),
    updatedAt: timestamp,
  });

  // Create UserFeeClaimed record
  const userFeeClaimedId = `${txHash}-${event.logIndex}`;
  context.UserFeeClaimed.set({
    id: userFeeClaimedId,
    payee_id: recipient,
    amount,
    amountUSDC: convertETHtoUSDCWithBundle(amount, bundle),
    date: timestamp,
    txHash,
  });
});






