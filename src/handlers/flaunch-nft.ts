/**
 * Flaunch NFT Handlers
 * Handles FlaunchNFT1, FlaunchNFT2, FlaunchNFT3, FlaunchNFT4, and AnyFlaunchNFT events
 */

import {
  FlaunchNFT1,
  FlaunchNFT2,
  FlaunchNFT3,
  FlaunchNFT4,
  AnyFlaunchNFT,
} from "generated";
import {
  normalizeAddress,
  generateCollectionId,
  concatBytes,
  concatI32,
} from "../utils/helpers";
import { ZERO_ADDRESS } from "../utils/constants";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Handle NFT Transfer event - shared logic for all NFT contracts
 */
async function handleNFTTransfer(
  event: {
    params: { from: string; to: string; tokenId: bigint };
    srcAddress: string;
    block: { timestamp: number };
    transaction: { hash?: string };
  },
  context: any
) {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  const tokenId = event.params.tokenId;
  const contractAddr = normalizeAddress(event.srcAddress);

  // Ensure users exist
  if (!(await context.User.get(from))) context.User.set({ id: from });
  if (!(await context.User.get(to))) context.User.set({ id: to });

  // Get NFT lookup to find collection token - use subgraph-compatible ID format
  const nftLookupId = generateCollectionId(contractAddr, tokenId);
  const lookup = await context.NFTLookup.get(nftLookupId);
  if (!lookup) return;

  const collectionTokenId = lookup.collectionToken_id;
  const collectionToken = await context.CollectionToken.get(collectionTokenId);
  if (!collectionToken) return;

  const pool = await context.Pool.get(collectionToken.pool_id);

  // Handle BURN (to zero address)
  if (to === ZERO_ADDRESS) {
    // Update CollectionToken owner to zero
    context.CollectionToken.set({
      ...collectionToken,
      owner_id: ZERO_ADDRESS,
    });

    // Update Collection owner to zero
    const collection = await context.Collection.get(
      collectionToken.collection_id
    );
    if (collection) {
      context.Collection.set({
        ...collection,
        owner_id: ZERO_ADDRESS,
      });
    }

    // Update FeeAllocation to 100% community (0% creator) on burn
    if (pool && pool.feeAllocation_id) {
      const feeAllocation = await context.FeeAllocation.get(
        pool.feeAllocation_id
      );
      if (feeAllocation) {
        context.FeeAllocation.set({
          ...feeAllocation,
          creator: 0,
          community: 100,
        });
      }
    }

    // Create/update CollectionHolding for burn
    // Subgraph: owner.concatI32(tokenId)
    const holdingId = concatI32(to, Number(tokenId));
    context.CollectionHolding.set({
      id: holdingId,
      nftAddress: contractAddr,
      tokenId,
      owner_id: ZERO_ADDRESS,
    });

    return;
  }

  // Remove any existing approvals for this token (matching subgraph logic)
  // Subgraph: address.concat(from).concat(to)
  const flaunchApprovalId = concatBytes(concatBytes(contractAddr, from), to);
  context.FlaunchApproval.deleteUnsafe(flaunchApprovalId);

  // Handle regular transfer (not from zero address - i.e., not a mint)
  if (from !== ZERO_ADDRESS) {
    // Update CollectionToken owner
    context.CollectionToken.set({
      ...collectionToken,
      owner_id: to,
    });

    // Update Collection owner
    const collection = await context.Collection.get(
      collectionToken.collection_id
    );
    if (collection) {
      context.Collection.set({
        ...collection,
        owner_id: to,
      });
    }

    // Update CollectionHolding - transfer from old owner to new owner
    // Subgraph: owner.concatI32(tokenId)
    const fromHoldingId = concatI32(from, Number(tokenId));
    const fromHolding = await context.CollectionHolding.get(fromHoldingId);
    if (fromHolding) {
      context.CollectionHolding.set({
        ...fromHolding,
        owner_id: to,
      });
    } else {
      // Create holding if doesn't exist
      context.CollectionHolding.set({
        id: fromHoldingId,
        nftAddress: contractAddr,
        tokenId,
        owner_id: to,
      });
    }
  }
}

/**
 * Handle NFT Approval event - single token approval
 */
async function handleNFTApproval(
  event: {
    params: { owner: string; account: string; id: bigint };
    srcAddress: string;
    block: { timestamp: number };
    transaction: { hash?: string };
  },
  context: any
) {
  const owner = normalizeAddress(event.params.owner);
  const account = normalizeAddress(event.params.account);
  const tokenId = event.params.id;
  const contractAddr = normalizeAddress(event.srcAddress);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";

  // Ensure users exist
  if (!(await context.User.get(owner))) context.User.set({ id: owner });
  if (!(await context.User.get(account))) context.User.set({ id: account });

  // Subgraph: address.concat(owner).concat(operator)
  const flaunchApprovalId = concatBytes(
    concatBytes(contractAddr, owner),
    account
  );
  // Subgraph: address.concat(owner).concatI32(tokenId)
  const flaunchApprovalTokenId = concatI32(
    concatBytes(contractAddr, owner),
    Number(tokenId)
  );

  // When approval is NOT to zero address, create/update approval
  if (account !== ZERO_ADDRESS) {
    // Get or create FlaunchApproval
    let flaunchApproval = await context.FlaunchApproval.get(flaunchApprovalId);
    if (!flaunchApproval) {
      flaunchApproval = {
        id: flaunchApprovalId,
        owner_id: owner,
        operator_id: account,
        flaunchAddr: contractAddr,
        globalApproval: false,
      };
    }
    context.FlaunchApproval.set(flaunchApproval);

    // Get collection for this token if exists - use subgraph-compatible ID format
    const collectionId = generateCollectionId(contractAddr, tokenId);
    const collection = await context.Collection.get(collectionId);

    // Create FlaunchApprovalToken
    context.FlaunchApprovalToken.set({
      id: flaunchApprovalTokenId,
      flaunchApproval_id: flaunchApprovalId,
      tokenId,
      collection_id: collection ? collection.id : undefined,
      createdAt: timestamp,
      txHash,
    });
  } else {
    // Zero address = revoke approval - delete the token approval
    context.FlaunchApprovalToken.deleteUnsafe(flaunchApprovalTokenId);
  }
}

/**
 * Handle NFT ApprovalForAll event - global approval
 */
async function handleNFTApprovalForAll(
  event: {
    params: { owner: string; operator: string; isApproved: boolean };
    srcAddress: string;
    block: { timestamp: number };
  },
  context: any
) {
  const owner = normalizeAddress(event.params.owner);
  const operator = normalizeAddress(event.params.operator);
  const isApproved = event.params.isApproved;
  const contractAddr = normalizeAddress(event.srcAddress);

  // Ensure users exist
  if (!(await context.User.get(owner))) context.User.set({ id: owner });
  if (!(await context.User.get(operator))) context.User.set({ id: operator });

  // Subgraph: address.concat(owner).concat(operator)
  const flaunchApprovalId = concatBytes(
    concatBytes(contractAddr, owner),
    operator
  );

  // Get or create FlaunchApproval with global flag
  let flaunchApproval = await context.FlaunchApproval.get(flaunchApprovalId);
  if (!flaunchApproval) {
    flaunchApproval = {
      id: flaunchApprovalId,
      owner_id: owner,
      operator_id: operator,
      flaunchAddr: contractAddr,
      globalApproval: isApproved,
    };
  } else {
    flaunchApproval = {
      ...flaunchApproval,
      globalApproval: isApproved,
    };
  }
  context.FlaunchApproval.set(flaunchApproval);
}

// =============================================================================
// FLAUNCH NFT 1 HANDLERS
// =============================================================================

FlaunchNFT1.Transfer.handler(async ({ event, context }) => {
  await handleNFTTransfer(event, context);
});

FlaunchNFT1.Approval.handler(async ({ event, context }) => {
  await handleNFTApproval(event, context);
});

FlaunchNFT1.ApprovalForAll.handler(async ({ event, context }) => {
  await handleNFTApprovalForAll(event, context);
});

// =============================================================================
// FLAUNCH NFT 2 HANDLERS
// =============================================================================

FlaunchNFT2.Transfer.handler(async ({ event, context }) => {
  await handleNFTTransfer(event, context);
});

FlaunchNFT2.Approval.handler(async ({ event, context }) => {
  await handleNFTApproval(event, context);
});

FlaunchNFT2.ApprovalForAll.handler(async ({ event, context }) => {
  await handleNFTApprovalForAll(event, context);
});

// =============================================================================
// FLAUNCH NFT 3 HANDLERS
// =============================================================================

FlaunchNFT3.Transfer.handler(async ({ event, context }) => {
  await handleNFTTransfer(event, context);
});

FlaunchNFT3.Approval.handler(async ({ event, context }) => {
  await handleNFTApproval(event, context);
});

FlaunchNFT3.ApprovalForAll.handler(async ({ event, context }) => {
  await handleNFTApprovalForAll(event, context);
});

// =============================================================================
// FLAUNCH NFT 4 HANDLERS
// =============================================================================

FlaunchNFT4.Transfer.handler(async ({ event, context }) => {
  await handleNFTTransfer(event, context);
});

FlaunchNFT4.Approval.handler(async ({ event, context }) => {
  await handleNFTApproval(event, context);
});

FlaunchNFT4.ApprovalForAll.handler(async ({ event, context }) => {
  await handleNFTApprovalForAll(event, context);
});

// =============================================================================
// ANY FLAUNCH NFT HANDLERS
// =============================================================================

AnyFlaunchNFT.Transfer.handler(async ({ event, context }) => {
  await handleNFTTransfer(event, context);
});

AnyFlaunchNFT.Approval.handler(async ({ event, context }) => {
  await handleNFTApproval(event, context);
});

AnyFlaunchNFT.ApprovalForAll.handler(async ({ event, context }) => {
  await handleNFTApprovalForAll(event, context);
});
