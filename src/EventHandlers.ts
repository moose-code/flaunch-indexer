/**
 * Flaunch Protocol Event Handlers
 * Migrated from TheGraph subgraph to Envio HyperIndex
 */

import {
  AnyPositionManager,
  PositionManager1,
  PositionManager2,
  PositionManager3,
  PoolManager,
  ActionManager1,
  ActionManager2,
  BidWall1,
  BidWall2,
  FeeEscrow,
  FeeExemptions,
  FlaunchFeeExemption,
  FairLaunch1,
  FairLaunch2,
  FlaunchNFT1,
  FlaunchNFT2,
  FlaunchNFT3,
  AnyFlaunchNFT,
  FlayBurner,
  BuyBackAndBurnFlay,
  TreasuryManagerFactory,
  CollectionToken,
  BigDecimal,
} from "generated";

import { ZERO_BI, ZERO_BD, CONFIG_ID, BUNDLE_ID } from "./utils/constants";
import { normalizeAddress } from "./utils/helpers";
import { getBidWallAddressForPositionManager, getFlaunchAddressForPositionManager } from "./addresses/base";

// =============================================================================
// HELPER FUNCTIONS (inline for now, will move to crud later)
// =============================================================================

const DEFAULT_FEE_DISTRIBUTION_ID = CONFIG_ID;

// =============================================================================
// POSITION MANAGER HANDLERS (AnyPositionManager)
// =============================================================================

AnyPositionManager.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
  } else {
    // Create config if doesn't exist
    context.Config.set({
      id: CONFIG_ID,
      locked: false,
      lockerPaused: false,
      collectionCount: ZERO_BI,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalUsers: ZERO_BI,
      totalFeesETH: ZERO_BI,
      totalFeesUSDC: ZERO_BD,
      feeCalculator: event.params._feeCalculator,
      protocolFeeRecipient: "0x0000000000000000000000000000000000000000",
      feeDistribution_id: DEFAULT_FEE_DISTRIBUTION_ID,
      latestReferralEscrow: "0x0000000000000000000000000000000000000000",
      staleTimeWindow: ZERO_BI,
    });
  }
});

AnyPositionManager.FeeDistributionUpdated.handler(async ({ event, context }) => {
  const globalFeeId = CONFIG_ID;
  const feeDistribution = await context.FeeDistribution.get(globalFeeId);
  
  const feeData = event.params._feeDistribution;
  
  if (!feeDistribution) {
    context.FeeDistribution.set({
      id: globalFeeId,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      community: undefined,
      active: feeData[3],
      creator: undefined,
    });
  } else {
    context.FeeDistribution.set({
      ...feeDistribution,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      active: feeData[3],
    });
  }
});

AnyPositionManager.PoolCreated.handler(async ({ event, context }) => {
  // Pool creation - creates Pool, CollectionToken, Collection, BidWall, FairLaunch, MemecoinTreasury
  const poolId = event.params._poolId;
  const memecoin = normalizeAddress(event.params._memecoin);
  const memecoinTreasury = normalizeAddress(event.params._memecoinTreasury);
  const tokenId = event.params._tokenId;
  const flipped = event.params._currencyFlipped;
  const timestamp = BigInt(event.block.timestamp);
  const positionManager = normalizeAddress(event.srcAddress);
  
  // Extract params from tuple: [creator, ?, uint24, bytes, bytes] for AnyPositionManager
  const paramsData = event.params._params;
  const creator = normalizeAddress(paramsData[0]);
  
  // Ensure Bundle exists for ETH price
  let bundle = await context.Bundle.get(BUNDLE_ID);
  if (!bundle) {
    bundle = {
      id: BUNDLE_ID,
      ethPriceUSDC: BigDecimal("2500"),
    };
    context.Bundle.set(bundle);
  }
  
  // Ensure Config exists
  let config = await context.Config.get(CONFIG_ID);
  if (!config) {
    config = {
      id: CONFIG_ID,
      locked: false,
      lockerPaused: false,
      collectionCount: ZERO_BI,
      volumeETH: ZERO_BI,
      volumeUSDC: ZERO_BD,
      totalUsers: ZERO_BI,
      totalFeesETH: ZERO_BI,
      totalFeesUSDC: ZERO_BD,
      feeCalculator: "0x0000000000000000000000000000000000000000",
      protocolFeeRecipient: "0x0000000000000000000000000000000000000000",
      feeDistribution_id: CONFIG_ID,
      latestReferralEscrow: "0x0000000000000000000000000000000000000000",
      staleTimeWindow: ZERO_BI,
    };
    context.Config.set(config);
  }
  
  // Create or get creator User
  let creatorUser = await context.User.get(creator);
  if (!creatorUser) {
    context.User.set({ id: creator });
  }
  
  // Get Flaunch address for this position manager
  const flaunchAddr = getFlaunchAddressForPositionManager(positionManager) || positionManager;
  const collectionId = `${flaunchAddr}-${tokenId.toString()}`;
  
  // Create Collection
  context.Collection.set({
    id: collectionId,
    tokenID: tokenId,
    contract: flaunchAddr,
    creator_id: creator,
    owner_id: creator,
    collectionToken_id: memecoin,
    name: "Unknown", // Will be updated via Effect API
    symbol: "UNKNOWN",
    managerUpdatedAt: timestamp,
    managerType: undefined,
    revenueManager_id: undefined,
    stakingManager_id: undefined,
    buyBackManager_id: undefined,
    addressFeeSplitManager_id: undefined,
  });
  
  // Create CollectionToken
  const initialPrice = ZERO_BI;
  context.CollectionToken.set({
    id: memecoin,
    pool_id: poolId,
    collection_id: collectionId,
    creator_id: creator,
    owner_id: creator,
    name: "Unknown",
    symbol: "UNKNOWN",
    decimals: 18,
    totalSupply: ZERO_BI,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    totalCommunityFeesETH: ZERO_BD,
    totalCreatorFeesETH: ZERO_BD,
    derivedETH: initialPrice,
    tokenPrice: initialPrice,
    marketCapETH: ZERO_BI,
    marketCapUSDC: ZERO_BD,
    totalHolders: ZERO_BI,
    isNative: flipped,
    createdAt: timestamp,
    baseURI: "",
    creationFee: ZERO_BI,
    fairLaunch_id: poolId,
    metadata_id: undefined,
    lastMinuteRecorded: ZERO_BI,
    lastMinuteArchived: ZERO_BI,
    lastHourRecorded: ZERO_BI,
    lastHourArchived: ZERO_BI,
    lastFifteenMinuteRecorded: ZERO_BI,
    lastFifteenMinuteArchived: ZERO_BI,
    lastFourHourRecorded: ZERO_BI,
    lastFourHourArchived: ZERO_BI,
  });
  
  // Create Pool
  context.Pool.set({
    id: poolId,
    collectionToken_id: memecoin,
    sqrtPriceX96: ZERO_BI,
    tickSpacing: 60,
    tick: 0,
    fairLaunchedEnded: false,
    liquidity: ZERO_BI,
    liveAtTimestamp: timestamp,
    flipped,
    startingMarketCap: ZERO_BI,
    startingMarketCapETH: ZERO_BI,
    volumeETH: ZERO_BI,
    volumeUSDC: ZERO_BD,
    totalFeesETH: ZERO_BI,
    totalFeesUSDC: ZERO_BD,
    totalFeesToken: ZERO_BI,
    totalFeesTokenConverted: ZERO_BI,
    totalCommunityFeesETH: ZERO_BD,
    totalCreatorFeesETH: ZERO_BD,
    ispEthIn: ZERO_BI,
    ispTokenOut: ZERO_BI,
    bidWall_id: poolId,
    poolFees_id: poolId,
    memecoinTreasury_id: memecoinTreasury,
    feeAllocation_id: undefined,
    feeDistribution_id: undefined,
    positionManager,
  });
  
  // Create BidWall
  const bidWallAddr = getBidWallAddressForPositionManager(positionManager) || positionManager;
  context.BidWall.set({
    id: poolId,
    pool_id: poolId,
    collectionToken_id: memecoin,
    contract: bidWallAddr,
    initialized: false,
    amount: ZERO_BI,
    balance: ZERO_BI,
    tickLower: ZERO_BI,
    tickUpper: ZERO_BI,
    deployedETH: ZERO_BI,
    closed: false,
  });
  
  // Create FairLaunch
  context.FairLaunch.set({
    id: poolId,
    active: true,
    collectionToken_id: memecoin,
    tick: 0,
    initialSupply: ZERO_BI,
    soldInitialSupply: ZERO_BI,
    ethEarned: ZERO_BI,
    starts_at: timestamp,
    ends_at: ZERO_BI,
  });
  
  // Create MemecoinTreasury
  context.MemecoinTreasury.set({
    id: memecoinTreasury,
    pool_id: poolId,
    createdAt: timestamp,
    totalETH: ZERO_BI,
    totalToken: ZERO_BI,
    totalActions: ZERO_BI,
    lastActionTimestamp: timestamp,
  });
  
  // Create PoolFees
  context.PoolFees.set({
    id: poolId,
    ethAvailable: ZERO_BI,
    tokenAvailable: ZERO_BI,
    totalEthIn: ZERO_BI,
    totalTokenIn: ZERO_BI,
  });
  
  // Create NFTLookup
  const nftLookupId = `${flaunchAddr}-${tokenId.toString()}`;
  context.NFTLookup.set({
    id: nftLookupId,
    collectionToken_id: memecoin,
  });
  
  // Create PoolCollectionLookup
  context.PoolCollectionLookup.set({
    id: memecoin,
    collectionToken_id: memecoin,
  });
  
  // Increment collection count
  context.Config.set({
    ...config,
    collectionCount: config.collectionCount + 1n,
  });
});

// =============================================================================
// DYNAMIC CONTRACT REGISTRATION
// Register CollectionToken contracts when pools are created
// =============================================================================

AnyPositionManager.PoolCreated.contractRegister(({ event, context }) => {
  // Register the newly created memecoin token for tracking Transfer events
  context.addCollectionToken(event.params._memecoin);
});

PositionManager1.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

PositionManager2.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

PositionManager3.PoolCreated.contractRegister(({ event, context }) => {
  context.addCollectionToken(event.params._memecoin);
});

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
  
  const isZeroAddress = (addr: string) => addr === "0x0000000000000000000000000000000000000000";
  
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

AnyPositionManager.PoolSwap.handler(async ({ event, context }) => {
  // Note: PoolSwap uses `poolId` (no underscore)
  const poolId = event.params.poolId;
  // TODO: Implement swap handler
});

AnyPositionManager.PoolStateUpdated.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  // TODO: Implement price update logic
});

AnyPositionManager.PoolFeesReceived.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  // TODO: Implement fee received logic
});

AnyPositionManager.PoolFeesDistributed.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  // TODO: Implement fee distribution logic
});

AnyPositionManager.PoolFeesSwapped.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  // TODO: Implement fee swap logic
});

AnyPositionManager.PoolFeeDistributionUpdated.handler(async ({ event, context }) => {
  const poolId = event.params._poolId;
  // TODO: Implement pool-specific fee distribution update
});

AnyPositionManager.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  // Ensure user exists
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
  // TODO: Implement referrer fee logic
});

AnyPositionManager.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  // TODO: Implement referral escrow update
});

// =============================================================================
// POSITION MANAGER 1 HANDLERS
// =============================================================================

PositionManager1.PoolCreated.handler(async ({ event, context }) => {
  // TODO: Same as AnyPositionManager.PoolCreated
});

PositionManager1.PoolSwap.handler(async ({ event, context }) => {
  // Note: uses poolId without underscore
  const poolId = event.params.poolId;
  // TODO: Same as AnyPositionManager.PoolSwap
});

PositionManager1.PoolStateUpdated.handler(async ({ event, context }) => {});
PositionManager1.PoolFeesReceived.handler(async ({ event, context }) => {});
PositionManager1.PoolFeesDistributed.handler(async ({ event, context }) => {});
PositionManager1.PoolFeesSwapped.handler(async ({ event, context }) => {});
PositionManager1.PoolFeeDistributionUpdated.handler(async ({ event, context }) => {});

PositionManager1.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});

PositionManager1.ReferralEscrowUpdated.handler(async ({ event, context }) => {});

PositionManager1.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const config = await context.Config.get(CONFIG_ID);
  if (config) {
    context.Config.set({
      ...config,
      feeCalculator: event.params._feeCalculator,
    });
  }
});

PositionManager1.FeeDistributionUpdated.handler(async ({ event, context }) => {
  const globalFeeId = CONFIG_ID;
  const feeDistribution = await context.FeeDistribution.get(globalFeeId);
  const feeData = event.params._feeDistribution;
  
  if (!feeDistribution) {
    context.FeeDistribution.set({
      id: globalFeeId,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      community: undefined,
      active: feeData[3],
      creator: undefined,
    });
  } else {
    context.FeeDistribution.set({
      ...feeDistribution,
      swapFee: Number(feeData[0]),
      referrer: Number(feeData[1]),
      protocol: Number(feeData[2]),
      active: feeData[3],
    });
  }
});

PositionManager1.FairLaunchFeeCalculatorUpdated.handler(async ({ event, context }) => {});
PositionManager1.InitialPriceUpdated.handler(async ({ event, context }) => {});
PositionManager1.CreatorFeeAllocationUpdated.handler(async ({ event, context }) => {});

PositionManager1.Deposit.handler(async ({ event, context }) => {
  // Note: PositionManager1 Deposit uses _payee with underscore
  const payee = normalizeAddress(event.params._payee);
  const user = await context.User.get(payee);
  if (!user) {
    context.User.set({ id: payee });
  }
});

PositionManager1.Withdrawal.handler(async ({ event, context }) => {
  // Note: PositionManager1 Withdrawal uses _sender, _recipient with underscore
  const sender = normalizeAddress(event.params._sender);
  const user = await context.User.get(sender);
  if (!user) {
    context.User.set({ id: sender });
  }
});

PositionManager1.PoolPremine.handler(async ({ event, context }) => {});
PositionManager1.PoolScheduled.handler(async ({ event, context }) => {});
PositionManager1.OwnershipTransferred.handler(async ({ event, context }) => {});
PositionManager1.OwnershipHandoverRequested.handler(async ({ event, context }) => {});
PositionManager1.OwnershipHandoverCanceled.handler(async ({ event, context }) => {});

// =============================================================================
// POSITION MANAGER 2 HANDLERS
// =============================================================================

PositionManager2.PoolCreated.handler(async ({ event, context }) => {});
PositionManager2.PoolSwap.handler(async ({ event, context }) => {});
PositionManager2.PoolStateUpdated.handler(async ({ event, context }) => {});
PositionManager2.PoolFeesReceived.handler(async ({ event, context }) => {});
PositionManager2.PoolFeesDistributed.handler(async ({ event, context }) => {});
PositionManager2.PoolFeesSwapped.handler(async ({ event, context }) => {});
PositionManager2.PoolFeeDistributionUpdated.handler(async ({ event, context }) => {});
PositionManager2.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});
PositionManager2.ReferralEscrowUpdated.handler(async ({ event, context }) => {});
PositionManager2.FeeCalculatorUpdated.handler(async ({ event, context }) => {});
PositionManager2.FeeDistributionUpdated.handler(async ({ event, context }) => {});
PositionManager2.FairLaunchFeeCalculatorUpdated.handler(async ({ event, context }) => {});
PositionManager2.PoolPremine.handler(async ({ event, context }) => {});
PositionManager2.PoolScheduled.handler(async ({ event, context }) => {});

// =============================================================================
// POSITION MANAGER 3 HANDLERS
// =============================================================================

PositionManager3.PoolCreated.handler(async ({ event, context }) => {});
PositionManager3.PoolSwap.handler(async ({ event, context }) => {});
PositionManager3.PoolStateUpdated.handler(async ({ event, context }) => {});
PositionManager3.PoolFeesReceived.handler(async ({ event, context }) => {});
PositionManager3.PoolFeesDistributed.handler(async ({ event, context }) => {});
PositionManager3.PoolFeesSwapped.handler(async ({ event, context }) => {});
PositionManager3.PoolFeeDistributionUpdated.handler(async ({ event, context }) => {});
PositionManager3.ReferrerFeePaid.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params._recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});
PositionManager3.ReferralEscrowUpdated.handler(async ({ event, context }) => {});
PositionManager3.FeeCalculatorUpdated.handler(async ({ event, context }) => {});
PositionManager3.FeeDistributionUpdated.handler(async ({ event, context }) => {});
PositionManager3.FairLaunchFeeCalculatorUpdated.handler(async ({ event, context }) => {});
PositionManager3.PoolPremine.handler(async ({ event, context }) => {});
PositionManager3.PoolScheduled.handler(async ({ event, context }) => {});

// =============================================================================
// POOL MANAGER HANDLERS
// =============================================================================

PoolManager.Swap.handler(async ({ event, context }) => {
  // Uniswap V4 Swap event - may be used for ETH/USDC price updates
});

// =============================================================================
// ACTION MANAGER HANDLERS
// =============================================================================

ActionManager1.ActionApproved.handler(async ({ event, context }) => {
  // Note: uses `action` without underscore
  const actionId = normalizeAddress(event.params.action);
  
  const action = await context.MemecoinAction.get(actionId);
  if (!action) {
    context.MemecoinAction.set({
      id: actionId,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      unapprovedAt: undefined,
      totalActions: ZERO_BI,
      approvedBy: event.srcAddress,
      unapprovedBy: undefined,
    });
  } else {
    context.MemecoinAction.set({
      ...action,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      approvedBy: event.srcAddress,
    });
  }
});

ActionManager1.ActionUnapproved.handler(async ({ event, context }) => {
  const actionId = normalizeAddress(event.params.action);
  
  const action = await context.MemecoinAction.get(actionId);
  if (action) {
    context.MemecoinAction.set({
      ...action,
      approved: false,
      unapprovedAt: BigInt(event.block.timestamp),
      unapprovedBy: event.srcAddress,
    });
  }
});

ActionManager2.ActionApproved.handler(async ({ event, context }) => {
  const actionId = normalizeAddress(event.params.action);
  
  const action = await context.MemecoinAction.get(actionId);
  if (!action) {
    context.MemecoinAction.set({
      id: actionId,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      unapprovedAt: undefined,
      totalActions: ZERO_BI,
      approvedBy: event.srcAddress,
      unapprovedBy: undefined,
    });
  } else {
    context.MemecoinAction.set({
      ...action,
      approved: true,
      approvedAt: BigInt(event.block.timestamp),
      approvedBy: event.srcAddress,
    });
  }
});

ActionManager2.ActionUnapproved.handler(async ({ event, context }) => {
  const actionId = normalizeAddress(event.params.action);
  
  const action = await context.MemecoinAction.get(actionId);
  if (action) {
    context.MemecoinAction.set({
      ...action,
      approved: false,
      unapprovedAt: BigInt(event.block.timestamp),
      unapprovedBy: event.srcAddress,
    });
  }
});

// =============================================================================
// BID WALL HANDLERS
// =============================================================================

BidWall1.BidWallClosed.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);
  
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
  
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      closed: true,
      balance: ZERO_BI,
    });
  }
});

BidWall1.BidWallRepositioned.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
      deployedETH: event.params.liquidity, // liquidity in the event
    });
  }
  
  // Create BidWallRepositioned record
  const id = `${poolId}-${event.transaction.hash}`;
  context.BidWallRepositioned.set({
    id,
    pool_id: poolId,
    _eth: event.params.liquidity, // Using liquidity as ETH equivalent
    _tickLower: Number(event.params.tickLower),
    _tickUpper: Number(event.params.tickUpper),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  });
});

BidWall1.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params.recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});

BidWall1.BidWallDeposit.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  // BidWallDeposit has amount0 and amount1, use amount0 as ETH
  const ethAmount = event.params.amount0;
  
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      balance: bidWall.balance + ethAmount,
      amount: bidWall.amount + ethAmount,
    });
  }
});

BidWall1.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {});

BidWall2.BidWallClosed.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const recipient = normalizeAddress(event.params.recipient);
  
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
  
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      closed: true,
      balance: ZERO_BI,
    });
  }
});

BidWall2.BidWallRepositioned.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
      deployedETH: event.params.liquidity,
    });
  }
});

BidWall2.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const recipient = normalizeAddress(event.params.recipient);
  const user = await context.User.get(recipient);
  if (!user) {
    context.User.set({ id: recipient });
  }
});

BidWall2.BidWallDeposit.handler(async ({ event, context }) => {
  const poolId = event.params.poolId;
  const ethAmount = event.params.amount0;
  
  const bidWall = await context.BidWall.get(poolId);
  if (bidWall) {
    context.BidWall.set({
      ...bidWall,
      balance: bidWall.balance + ethAmount,
      amount: bidWall.amount + ethAmount,
    });
  }
});

BidWall2.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {});

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

// =============================================================================
// FAIR LAUNCH HANDLERS
// =============================================================================

FairLaunch1.FairLaunchCreated.handler(async ({ event, context }) => {});

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

FairLaunch2.FairLaunchCreated.handler(async ({ event, context }) => {});

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

// =============================================================================
// FLAUNCH NFT TRANSFER HANDLERS
// =============================================================================

FlaunchNFT1.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  
  // Ensure users exist
  const fromUser = await context.User.get(from);
  if (!fromUser) {
    context.User.set({ id: from });
  }
  const toUser = await context.User.get(to);
  if (!toUser) {
    context.User.set({ id: to });
  }
  
  // TODO: Update Collection owner
  // TODO: Update CollectionToken owner
});

FlaunchNFT2.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  
  const fromUser = await context.User.get(from);
  if (!fromUser) {
    context.User.set({ id: from });
  }
  const toUser = await context.User.get(to);
  if (!toUser) {
    context.User.set({ id: to });
  }
});

FlaunchNFT3.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  
  const fromUser = await context.User.get(from);
  if (!fromUser) {
    context.User.set({ id: from });
  }
  const toUser = await context.User.get(to);
  if (!toUser) {
    context.User.set({ id: to });
  }
});

AnyFlaunchNFT.Transfer.handler(async ({ event, context }) => {
  const from = normalizeAddress(event.params.from);
  const to = normalizeAddress(event.params.to);
  
  const fromUser = await context.User.get(from);
  if (!fromUser) {
    context.User.set({ id: from });
  }
  const toUser = await context.User.get(to);
  if (!toUser) {
    context.User.set({ id: to });
  }
});

// =============================================================================
// FLAY BURNER HANDLERS
// =============================================================================

FlayBurner.BurnerUpdated.handler(async ({ event, context }) => {
  const burnerAddress = normalizeAddress(event.params.burner);
  const timestamp = BigInt(event.block.timestamp);
  const BURNER_ID = "flay-burner";
  
  const burner = await context.FlayBurner.get(BURNER_ID);
  if (!burner) {
    context.FlayBurner.set({
      id: BURNER_ID,
      address: burnerAddress,
      pendingETH: ZERO_BI,
      totalBurned: ZERO_BI,
      createdAt: timestamp,
    });
  } else {
    context.FlayBurner.set({
      ...burner,
      address: burnerAddress,
    });
  }
});

// =============================================================================
// BUY BACK AND BURN HANDLERS
// =============================================================================

BuyBackAndBurnFlay.BurnBabyBurn.handler(async ({ event, context }) => {
  const BURNER_ID = "flay-burner";
  const burner = await context.FlayBurner.get(BURNER_ID);
  if (burner) {
    context.FlayBurner.set({
      ...burner,
      totalBurned: burner.totalBurned + event.params.amount,
      pendingETH: ZERO_BI,
    });
  }
});

BuyBackAndBurnFlay.EthBalanceUpdated.handler(async ({ event, context }) => {
  const BURNER_ID = "flay-burner";
  const burner = await context.FlayBurner.get(BURNER_ID);
  if (burner) {
    context.FlayBurner.set({
      ...burner,
      pendingETH: event.params.balance,
    });
  }
});

// =============================================================================
// TREASURY MANAGER FACTORY HANDLERS
// =============================================================================

TreasuryManagerFactory.ManagerImplementationApproved.handler(async ({ event, context }) => {
  const implAddress = normalizeAddress(event.params.implementation);
  
  context.TreasuryManagerImplementation.set({
    id: implAddress,
    approvedAt: BigInt(event.block.timestamp),
    unapprovedAt: undefined,
  });
});

TreasuryManagerFactory.ManagerImplementationUnapproved.handler(async ({ event, context }) => {
  const implAddress = normalizeAddress(event.params.implementation);
  
  const impl = await context.TreasuryManagerImplementation.get(implAddress);
  if (impl) {
    context.TreasuryManagerImplementation.set({
      ...impl,
      unapprovedAt: BigInt(event.block.timestamp),
    });
  }
});

TreasuryManagerFactory.ManagerDeployed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.params.manager);
  const implementationAddress = normalizeAddress(event.params.implementation);
  
  // TODO: Determine manager type based on implementation and create appropriate entity
});
