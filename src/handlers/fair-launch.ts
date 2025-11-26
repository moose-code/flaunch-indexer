/**
 * Fair Launch Handlers
 * Handles FairLaunch1 and FairLaunch2 contract events
 */

import { FairLaunch1, FairLaunch2 } from "generated";

// =============================================================================
// FAIR LAUNCH 1 HANDLERS
// =============================================================================

FairLaunch1.FairLaunchCreated.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const timestamp = BigInt(event.block.timestamp);

  // FairLaunch is already created by PoolCreated, just update with deadline
  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      starts_at: timestamp,
      ends_at: event.params.deadline,
    });
  }
});

FairLaunch1.FairLaunchEnded.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      active: false,
      ethEarned: event.params.totalRaised,
      ends_at: BigInt(event.block.timestamp),
    });
  }

  const pool = await context.Pool.get(poolId);
  if (pool) {
    context.Pool.set({
      ...pool,
      fairLaunchedEnded: true,
    });
  }
});

// =============================================================================
// FAIR LAUNCH 2 HANDLERS
// =============================================================================

FairLaunch2.FairLaunchCreated.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const timestamp = BigInt(event.block.timestamp);

  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      starts_at: timestamp,
      ends_at: event.params.deadline,
    });
  }
});

FairLaunch2.FairLaunchEnded.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;

  const fairLaunch = await context.FairLaunch.get(poolId);
  if (fairLaunch) {
    context.FairLaunch.set({
      ...fairLaunch,
      active: false,
      ethEarned: event.params.totalRaised,
      ends_at: BigInt(event.block.timestamp),
    });
  }

  const pool = await context.Pool.get(poolId);
  if (pool) {
    context.Pool.set({
      ...pool,
      fairLaunchedEnded: true,
    });
  }
});

