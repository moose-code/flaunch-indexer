# HyperIndex Migration Verification Plan

After a comprehensive review of the codebase, it appears that **all the identified issues from Wave 4 have already been fixed** in the current `flaunch-indexer` code.

## Verified Fixes

The following logic is correctly implemented and matches the subgraph behavior:

### 1. Critical: MemecoinTreasury (W4-10, W4-11, W4-12)

- **Status:** ✅ **Fixed**
- **Code Evidence:** `addMemecoinTreasuryContract` is correctly called in the `PoolCreated.contractRegister` handler for all PositionManagers (1, 2, 3, and Any).
- **Expected Result:** `ActionExecuted` events will now be indexed, populating `totalActions` and `MemecoinTreasuryActivity`.

### 2. Critical: FeeAllocation (W4-1, W4-2)

- **Status:** ✅ **Fixed**
- **Code Evidence:** `position-manager-common.ts` > `createPoolEntities` now accepts `creatorFeeAllocation`, creates the `FeeAllocation` entity if missing, and links it to the `Pool`. All PM handlers pass this parameter correctly.
- **Expected Result:** `Pool.feeAllocation_id` will be populated.

### 3. High: BidWall Balance (W4-7)

- **Status:** ✅ **Fixed**
- **Code Evidence:** `bid-wall.ts` handlers for `BidWallDeposit` correctly accumulate balance: `balance: bidWall.balance + addedAmount`.
- **Expected Result:** Balance should match subgraph (assuming no missing events).

### 4. Medium: FairLaunch & StakingManager (W4-8, W4-13)

- **Status:** ✅ **Fixed**
- **Code Evidence:**
  - `FairLaunchEnded` sets `active: false`.
  - `ETHReceivedFromUnknownSource` updates `externalManagerETHTotal`.

## Recommended Next Steps

Since the code is correct, the "lingering issues" are likely due to the deployed indexer running an older version of the code.

1.  **Re-generate code:** Run `pnpm codegen` to ensure all dynamic contract helpers are fresh.
2.  **Full Redeploy:** Deploy the current codebase to the indexing service.
3.  **Verify:** Once indexed, run the comparison tool again:
    ```bash
    pnpm compare --entity MemecoinTreasury --sample 50
    ```



