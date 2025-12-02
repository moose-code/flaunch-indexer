# HyperIndex Migration Fix Plan - Implementation Status

This document tracks the Wave 4 migration fixes for the Flaunch HyperIndex indexer.

## Completed Fixes

### 1. Critical: Fix Missing MemecoinTreasury Logic (W4-10, W4-11, W4-12) - DONE

**Root Cause:** The MemecoinTreasuryContract was dynamic but was not being registered in the indexer during pool creation. This caused all ActionExecuted events on treasuries to be ignored, resulting in 0 totalActions and broken activity links.

**Files Modified:**
- `src/handlers/position-manager1.ts`
- `src/handlers/position-manager2.ts`
- `src/handlers/position-manager3.ts`
- `src/handlers/any-position-manager.ts`

**Changes Made:**
Updated `PoolCreated.contractRegister` in all PositionManager handlers to register the treasury contract:
```typescript
context.addMemecoinTreasuryContract(event.params._memecoinTreasury);
```

---

### 2. Critical: Fix FeeAllocation Creation (W4-1, W4-2) - DONE

**Root Cause:** The subgraph creates a default FeeAllocation entity during PoolCreated if one doesn't exist. The indexer previously set feeAllocation_id to undefined, and the CreatorFeeAllocationUpdated handler might not have been firing for the initial setting in all cases.

**Files Modified:**
- `src/handlers/position-manager-common.ts`
- `src/handlers/position-manager1.ts`
- `src/handlers/position-manager2.ts`
- `src/handlers/position-manager3.ts`
- `src/handlers/any-position-manager.ts`

**Changes Made:**
1. Updated `createPoolEntities` signature to accept `creatorFeeAllocation` parameter (default: 10000 basis points)
2. Added FeeAllocation creation logic inside `createPoolEntities`:
```typescript
const communityShare = 10000 - creatorFeeAllocation;
context.FeeAllocation.set({
  id: poolId,
  creator: creatorFeeAllocation,
  community: communityShare,
});
```
3. Updated Pool creation to link to FeeAllocation: `feeAllocation_id: poolId`
4. Updated all PositionManager handlers to extract and pass `creatorFeeAllocation` from the `_params` tuple:
   - PM1: Index 6 (uint24)
   - PM2: Index 7 (uint24)
   - PM3: Index 7 (uint24)
   - AnyPositionManager: Index 2 (uint24)

---

### 3. High Priority: BidWall Balance (W4-7) & Stale Window - VERIFIED

**Status:** Implementation reviewed and verified correct.

**BidWallDeposit Handler:**
The handler correctly accumulates `balance` using the `added` parameter:
```typescript
balance: bidWall.balance + addedAmount
```

**StaleTimeWindowUpdated:**
Correctly implemented in BidWall2 handler, updating Config.staleTimeWindow.

---

### 4. Medium Priority: FairLaunch & StakingManager Checks - VERIFIED

**FairLaunch.active (W4-8):**
Verified that `FairLaunchEnded` handlers in both FairLaunch1 and FairLaunch2 correctly set `active: false`:
```typescript
context.FairLaunch.set({
  ...fairLaunch,
  active: false,
  ethEarned: event.params.totalRaised,
  ends_at: BigInt(event.block.timestamp),
});
```

**StakingManager ETHReceivedFromUnknownSource (W4-13):**
Verified handler implementation correctly:
- Creates `StakingManagerExternalETH` entity with proper ID format
- Updates `StakingManager.externalManagerETHTotal` accumulator
- Matches subgraph ID format: `address.concat(txHash).concatI32(logIndex)`

---

## Summary

| Issue | Priority | Status |
|-------|----------|--------|
| W4-10, W4-11, W4-12: MemecoinTreasury Registration | Critical | FIXED |
| W4-1, W4-2: FeeAllocation Creation | Critical | FIXED |
| W4-7: BidWall Balance | High | VERIFIED |
| W4-8: FairLaunch.active | Medium | VERIFIED |
| W4-13: StakingManager ETHReceivedFromUnknownSource | Medium | VERIFIED |

## Next Steps

1. Run `pnpm envio codegen` to regenerate types
2. Run `pnpm tsc` to verify no TypeScript errors
3. Re-deploy and run comparison tests against the subgraph
