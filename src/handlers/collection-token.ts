/**
 * Collection Token Handlers
 * Handles CollectionToken (dynamic ERC20) contract events
 */

import { CollectionToken } from "generated";
import { ZERO_BI, ZERO_ADDRESS } from "../utils/constants";
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

  const isZeroAddress = (addr: string) => addr === ZERO_ADDRESS;

  // Handle sender's holdings (if not minting)
  if (!isZeroAddress(from)) {
    const fromHoldingId = `${from}-${tokenAddress}`;
    let fromHolding = await context.CollectionTokenHolding.get(fromHoldingId);

    if (fromHolding) {
      const balanceBefore = fromHolding.balance;
      const newBalance = fromHolding.balance - value;

      context.CollectionTokenHolding.set({
        ...fromHolding,
        balance: newBalance,
        balanceBefore: balanceBefore,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });

      // Create CollectionTokenHoldingChange for sender (decrement)
      const changeId = `${txHash}-${event.logIndex}-from`;
      context.CollectionTokenHoldingChange.set({
        id: changeId,
        collectionToken_id: tokenAddress,
        owner_id: from,
        counterpartEOA: to,
        balanceBefore: balanceBefore,
        balanceAfter: newBalance,
        priceBefore: token.derivedETH,
        priceAfter: token.derivedETH,
        isIncrement: false,
        createdTx: txHash,
        created: timestamp,
      });

      // If balance becomes 0, decrement holder count
      if (newBalance === 0n && balanceBefore > 0n) {
        context.CollectionToken.set({
          ...token,
          totalHolders: token.totalHolders - 1n,
        });
      }
    }
  }

  // Handle burn (transfer to zero address) - decrement totalSupply
  if (isZeroAddress(to)) {
    // Decrement totalSupply when tokens are burned
    context.CollectionToken.set({
      ...token,
      totalSupply: token.totalSupply - value,
    });

    // Ensure zero address User entity exists
    if (!(await context.User.get(ZERO_ADDRESS))) {
      context.User.set({ id: ZERO_ADDRESS });
    }

    // Track burned tokens in zero address holding
    const zeroHoldingId = `${ZERO_ADDRESS}-${tokenAddress}`;
    let zeroHolding = await context.CollectionTokenHolding.get(zeroHoldingId);

    if (zeroHolding) {
      context.CollectionTokenHolding.set({
        ...zeroHolding,
        balance: zeroHolding.balance + value,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });
    } else {
      // Create holding for zero address
      context.CollectionTokenHolding.set({
        id: zeroHoldingId,
        user_id: ZERO_ADDRESS,
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
      const balanceBefore = toHolding.balance;
      const newBalance = toHolding.balance + value;

      context.CollectionTokenHolding.set({
        ...toHolding,
        balance: newBalance,
        balanceBefore: balanceBefore,
        lastUpdatedTimestamp: timestamp,
        updatedTimestamp: timestamp,
        updatedTx: txHash,
      });

      // Create CollectionTokenHoldingChange for receiver (increment)
      const changeId = `${txHash}-${event.logIndex}-to`;
      context.CollectionTokenHoldingChange.set({
        id: changeId,
        collectionToken_id: tokenAddress,
        owner_id: to,
        counterpartEOA: from,
        balanceBefore: balanceBefore,
        balanceAfter: newBalance,
        priceBefore: token.derivedETH,
        priceAfter: token.derivedETH,
        isIncrement: true,
        createdTx: txHash,
        created: timestamp,
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

      // Create CollectionTokenHoldingChange for new holder (increment)
      const changeId = `${txHash}-${event.logIndex}-to`;
      context.CollectionTokenHoldingChange.set({
        id: changeId,
        collectionToken_id: tokenAddress,
        owner_id: to,
        counterpartEOA: from,
        balanceBefore: ZERO_BI,
        balanceAfter: value,
        priceBefore: token.derivedETH,
        priceAfter: token.derivedETH,
        isIncrement: true,
        createdTx: txHash,
        created: timestamp,
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






