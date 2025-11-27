/**
 * Collection Token Handlers
 * Handles CollectionToken (dynamic ERC20) contract events
 */

import { CollectionToken } from "generated";
import { ZERO_BI } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// COLLECTION TOKEN HANDLERS (Dynamic - ERC20 Transfers)
// =============================================================================

CollectionToken.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const value = event.params.value;
  const tokenAddress = normalizeAddress(event.srcAddress);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Get the CollectionToken entity
  const token = await context.CollectionToken.get(tokenAddress);
  if (!token) return;

  const isZeroAddress = (addr: string) =>
    addr === "0x0000000000000000000000000000000000000000";

  // Handle sender's holdings (if not minting)
  if (!isZeroAddress(from)) {
    const fromHoldingId = `${from}-${tokenAddress}`;
    let fromHolding = await context.CollectionTokenHolding.get(fromHoldingId);

    if (fromHolding) {
      const newBalance = fromHolding.balance - value;
      context.CollectionTokenHolding.set({
        ...fromHolding,
        balance: newBalance,
        balanceBefore: fromHolding.balance,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });

      // If balance becomes 0, decrement holder count
      if (newBalance === 0n && fromHolding.balance > 0n) {
        context.CollectionToken.set({
          ...token,
          totalHolders: token.totalHolders - 1n,
        });
      }
    }
  }

  // Handle receiver's holdings (if not burning)
  if (!isZeroAddress(to)) {
    const toHoldingId = `${to}-${tokenAddress}`;
    let toHolding = await context.CollectionTokenHolding.get(toHoldingId);

    // Get or create user
    let user = await context.User.get(to);
    if (!user) {
      context.User.set({ id: to });
    }

    if (toHolding) {
      const wasZero = toHolding.balance === 0n;
      const newBalance = toHolding.balance + value;
      context.CollectionTokenHolding.set({
        ...toHolding,
        balance: newBalance,
        balanceBefore: toHolding.balance,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });

      // If balance goes from 0 to positive, increment holder count
      if (wasZero && newBalance > 0n) {
        const currentToken = await context.CollectionToken.get(tokenAddress);
        if (currentToken) {
          context.CollectionToken.set({
            ...currentToken,
            totalHolders: currentToken.totalHolders + 1n,
          });
        }
      }
    } else {
      // Create new holding
      context.CollectionTokenHolding.set({
        id: toHoldingId,
        user_id: to,
        collectionToken_id: tokenAddress,
        balance: value,
        balanceBefore: ZERO_BI,
        createdTimestamp: timestamp,
        createdTx: txHash,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
        price: token.derivedETH,
      });

      // New holder - increment count
      const currentToken = await context.CollectionToken.get(tokenAddress);
      if (currentToken) {
        context.CollectionToken.set({
          ...currentToken,
          totalHolders: currentToken.totalHolders + 1n,
        });
      }
    }
  }
});

CollectionToken.MetadataUpdated.handler(async ({ event, context }) => {
  const tokenAddress = normalizeAddress(event.srcAddress);
  const baseURI = event.params.baseURI;

  const token = await context.CollectionToken.get(tokenAddress);
  if (token) {
    context.CollectionToken.set({
      ...token,
      baseURI,
    });
  }
});


