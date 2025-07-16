/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  // AnyPositionManager
  AnyPositionManager,
  AnyPositionManager_FeeCalculatorUpdated,
  AnyPositionManager_FeeDistributionUpdated,
  AnyPositionManager_PoolSwap,
  AnyPositionManager_PoolCreated,
  AnyPositionManager_PoolFeeDistributionUpdated,
  AnyPositionManager_PoolFeesDistributed,
  AnyPositionManager_PoolFeesReceived,
  AnyPositionManager_PoolFeesSwapped,
  AnyPositionManager_PoolStateUpdated,
  AnyPositionManager_ReferrerFeePaid,
  AnyPositionManager_ReferralEscrowUpdated,

  // PositionManager1
  PositionManager1,
  PositionManager1_CreatorFeeAllocationUpdated,
  PositionManager1_Deposit,
  PositionManager1_FairLaunchFeeCalculatorUpdated,
  PositionManager1_FeeCalculatorUpdated,
  PositionManager1_FeeDistributionUpdated,
  PositionManager1_InitialPriceUpdated,
  PositionManager1_OwnershipHandoverCanceled,
  PositionManager1_OwnershipHandoverRequested,
  PositionManager1_OwnershipTransferred,
  PositionManager1_PoolCreated,
  PositionManager1_PoolFeeDistributionUpdated,
  PositionManager1_PoolFeesDistributed,
  PositionManager1_PoolFeesReceived,
  PositionManager1_PoolFeesSwapped,
  PositionManager1_PoolPremine,
  PositionManager1_PoolScheduled,
  PositionManager1_PoolStateUpdated,
  PositionManager1_PoolSwap,
  PositionManager1_ReferralEscrowUpdated,
  PositionManager1_ReferrerFeePaid,
  PositionManager1_Withdrawal,

  // PositionManager2
  PositionManager2,
  PositionManager2_FeeCalculatorUpdated,
  PositionManager2_FeeDistributionUpdated,
  PositionManager2_PoolSwap,
  PositionManager2_PoolPremine,
  PositionManager2_PoolScheduled,
  PositionManager2_PoolCreated,
  PositionManager2_PoolFeeDistributionUpdated,
  PositionManager2_PoolFeesDistributed,
  PositionManager2_PoolFeesReceived,
  PositionManager2_PoolFeesSwapped,
  PositionManager2_PoolStateUpdated,
  PositionManager2_ReferrerFeePaid,
  PositionManager2_FairLaunchFeeCalculatorUpdated,
  PositionManager2_ReferralEscrowUpdated,

  // PositionManager3
  PositionManager3,
  PositionManager3_FeeCalculatorUpdated,
  PositionManager3_FeeDistributionUpdated,
  PositionManager3_PoolSwap,
  PositionManager3_PoolPremine,
  PositionManager3_PoolScheduled,
  PositionManager3_PoolCreated,
  PositionManager3_PoolFeeDistributionUpdated,
  PositionManager3_PoolFeesDistributed,
  PositionManager3_PoolFeesReceived,
  PositionManager3_PoolFeesSwapped,
  PositionManager3_PoolStateUpdated,
  PositionManager3_ReferrerFeePaid,
  PositionManager3_FairLaunchFeeCalculatorUpdated,
  PositionManager3_ReferralEscrowUpdated,

  // PoolManager
  PoolManager,
  PoolManager_Swap,

  // ActionManager1
  ActionManager1,
  ActionManager1_ActionApproved,
  ActionManager1_ActionUnapproved,

  // ActionManager2
  ActionManager2,
  ActionManager2_ActionApproved,
  ActionManager2_ActionUnapproved,

  // BidWall1
  BidWall1,
  BidWall1_BidWallClosed,
  BidWall1_BidWallRepositioned,
  BidWall1_BidWallRewardsTransferred,
  BidWall1_BidWallDeposit,
  BidWall1_BidWallDisabledStateUpdated,

  // BidWall2
  BidWall2,
  BidWall2_BidWallClosed,
  BidWall2_BidWallRepositioned,
  BidWall2_BidWallRewardsTransferred,
  BidWall2_BidWallDeposit,
  BidWall2_BidWallDisabledStateUpdated,

  // FeeEscrow
  FeeEscrow,
  FeeEscrow_Deposit,
  FeeEscrow_Withdrawal,

  // FeeExemptions
  FeeExemptions,
  FeeExemptions_BeneficiaryFeeRemoved,
  FeeExemptions_BeneficiaryFeeSet,

  // FlaunchFeeExemption
  FlaunchFeeExemption,
  FlaunchFeeExemption_FeeExemptionUpdated,

  // FairLaunch1
  FairLaunch1,
  FairLaunch1_FairLaunchEnded,
  FairLaunch1_FairLaunchCreated,

  // FairLaunch2
  FairLaunch2,
  FairLaunch2_FairLaunchEnded,
  FairLaunch2_FairLaunchCreated,

  // FlaunchNFT1
  FlaunchNFT1,
  FlaunchNFT1_Transfer,

  // FlaunchNFT2
  FlaunchNFT2,
  FlaunchNFT2_Transfer,

  // FlaunchNFT3
  FlaunchNFT3,
  FlaunchNFT3_Transfer,

  // AnyFlaunchNFT
  AnyFlaunchNFT,
  AnyFlaunchNFT_Transfer,

  // FlayBurner
  FlayBurner,
  FlayBurner_BurnerUpdated,

  // BuyBackAndBurnFlay
  BuyBackAndBurnFlay,
  BuyBackAndBurnFlay_BurnBabyBurn,
  BuyBackAndBurnFlay_EthBalanceUpdated,

  // TreasuryManagerFactory
  TreasuryManagerFactory,
  TreasuryManagerFactory_ManagerImplementationUnapproved,
  TreasuryManagerFactory_ManagerDeployed,
  TreasuryManagerFactory_ManagerImplementationApproved,
} from "generated";

// AnyPositionManager Handlers
AnyPositionManager.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_FeeCalculatorUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeCalculator: event.params._feeCalculator,
  };
  context.AnyPositionManager_FeeCalculatorUpdated.set(entity);
});

AnyPositionManager.FeeDistributionUpdated.handler(
  async ({ event, context }) => {
    const entity: AnyPositionManager_FeeDistributionUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _feeDistribution_0: event.params._feeDistribution[0],
      _feeDistribution_1: event.params._feeDistribution[1],
      _feeDistribution_2: event.params._feeDistribution[2],
      _feeDistribution_3: event.params._feeDistribution[3],
    };
    context.AnyPositionManager_FeeDistributionUpdated.set(entity);
  }
);

AnyPositionManager.PoolSwap.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_PoolSwap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    flAmount0: event.params.flAmount0,
    flAmount1: event.params.flAmount1,
    flFee0: event.params.flFee0,
    flFee1: event.params.flFee1,
    ispAmount0: event.params.ispAmount0,
    ispAmount1: event.params.ispAmount1,
    ispFee0: event.params.ispFee0,
    ispFee1: event.params.ispFee1,
    uniAmount0: event.params.uniAmount0,
    uniAmount1: event.params.uniAmount1,
    uniFee0: event.params.uniFee0,
    uniFee1: event.params.uniFee1,
  };
  context.AnyPositionManager_PoolSwap.set(entity);
});

AnyPositionManager.PoolCreated.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_PoolCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _memecoin: event.params._memecoin,
    _memecoinTreasury: event.params._memecoinTreasury,
    _tokenId: event.params._tokenId,
    _currencyFlipped: event.params._currencyFlipped,
    _params_0: event.params._params[0],
    _params_1: event.params._params[1],
    _params_2: event.params._params[2],
    _params_3: event.params._params[3],
    _params_4: event.params._params[4],
  };
  context.AnyPositionManager_PoolCreated.set(entity);
});

AnyPositionManager.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {
    const entity: AnyPositionManager_PoolFeeDistributionUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _poolId: event.params._poolId,
      _feeDistribution_0: event.params._feeDistribution[0],
      _feeDistribution_1: event.params._feeDistribution[1],
      _feeDistribution_2: event.params._feeDistribution[2],
      _feeDistribution_3: event.params._feeDistribution[3],
    };
    context.AnyPositionManager_PoolFeeDistributionUpdated.set(entity);
  }
);

AnyPositionManager.PoolFeesDistributed.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_PoolFeesDistributed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _donateAmount: event.params._donateAmount,
    _creatorAmount: event.params._creatorAmount,
    _bidWallAmount: event.params._bidWallAmount,
    _governanceAmount: event.params._governanceAmount,
    _protocolAmount: event.params._protocolAmount,
  };
  context.AnyPositionManager_PoolFeesDistributed.set(entity);
});

AnyPositionManager.PoolFeesReceived.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_PoolFeesReceived = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.AnyPositionManager_PoolFeesReceived.set(entity);
});

AnyPositionManager.PoolFeesSwapped.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_PoolFeesSwapped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    zeroForOne: event.params.zeroForOne,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.AnyPositionManager_PoolFeesSwapped.set(entity);
});

AnyPositionManager.PoolStateUpdated.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_PoolStateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _sqrtPriceX96: event.params._sqrtPriceX96,
    _tick: event.params._tick,
    _protocolFee: event.params._protocolFee,
    _swapFee: event.params._swapFee,
    _liquidity: event.params._liquidity,
  };
  context.AnyPositionManager_PoolStateUpdated.set(entity);
});

AnyPositionManager.ReferrerFeePaid.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_ReferrerFeePaid = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _recipient: event.params._recipient,
    _token: event.params._token,
    _amount: event.params._amount,
  };
  context.AnyPositionManager_ReferrerFeePaid.set(entity);
});

AnyPositionManager.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const entity: AnyPositionManager_ReferralEscrowUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _referralEscrow: event.params._referralEscrow,
  };
  context.AnyPositionManager_ReferralEscrowUpdated.set(entity);
});

// PositionManager1 Handlers
PositionManager1.CreatorFeeAllocationUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager1_CreatorFeeAllocationUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _poolId: event.params._poolId,
      _allocation: event.params._allocation,
    };
    context.PositionManager1_CreatorFeeAllocationUpdated.set(entity);
  }
);

PositionManager1.Deposit.handler(async ({ event, context }) => {
  const entity: PositionManager1_Deposit = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _payee: event.params._payee,
    _token: event.params._token,
    _amount: event.params._amount,
  };
  context.PositionManager1_Deposit.set(entity);
});

PositionManager1.FairLaunchFeeCalculatorUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager1_FairLaunchFeeCalculatorUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _feeCalculator: event.params._feeCalculator,
    };
    context.PositionManager1_FairLaunchFeeCalculatorUpdated.set(entity);
  }
);

PositionManager1.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager1_FeeCalculatorUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeCalculator: event.params._feeCalculator,
  };
  context.PositionManager1_FeeCalculatorUpdated.set(entity);
});

PositionManager1.FeeDistributionUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager1_FeeDistributionUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeDistribution_0: event.params._feeDistribution[0],
    _feeDistribution_1: event.params._feeDistribution[1],
    _feeDistribution_2: event.params._feeDistribution[2],
    _feeDistribution_3: event.params._feeDistribution[3],
  };
  context.PositionManager1_FeeDistributionUpdated.set(entity);
});

PositionManager1.InitialPriceUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager1_InitialPriceUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _initialPrice: event.params._initialPrice,
  };
  context.PositionManager1_InitialPriceUpdated.set(entity);
});

PositionManager1.OwnershipHandoverCanceled.handler(
  async ({ event, context }) => {
    const entity: PositionManager1_OwnershipHandoverCanceled = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      pendingOwner: event.params.pendingOwner,
    };
    context.PositionManager1_OwnershipHandoverCanceled.set(entity);
  }
);

PositionManager1.OwnershipHandoverRequested.handler(
  async ({ event, context }) => {
    const entity: PositionManager1_OwnershipHandoverRequested = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      pendingOwner: event.params.pendingOwner,
    };
    context.PositionManager1_OwnershipHandoverRequested.set(entity);
  }
);

PositionManager1.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: PositionManager1_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    oldOwner: event.params.oldOwner,
    newOwner: event.params.newOwner,
  };
  context.PositionManager1_OwnershipTransferred.set(entity);
});

PositionManager1.PoolCreated.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _memecoin: event.params._memecoin,
    _memecoinTreasury: event.params._memecoinTreasury,
    _tokenId: event.params._tokenId,
    _currencyFlipped: event.params._currencyFlipped,
    _flaunchFee: event.params._flaunchFee,
    _params_0: event.params._params[0],
    _params_1: event.params._params[1],
    _params_2: event.params._params[2],
    _params_3: event.params._params[3],
    _params_4: event.params._params[4],
    _params_5: event.params._params[5],
    _params_6: event.params._params[6],
    _params_7: event.params._params[7],
    _params_8: event.params._params[8],
    _params_9: event.params._params[9],
  };
  context.PositionManager1_PoolCreated.set(entity);
});

PositionManager1.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager1_PoolFeeDistributionUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _poolId: event.params._poolId,
      _feeDistribution_0: event.params._feeDistribution[0],
      _feeDistribution_1: event.params._feeDistribution[1],
      _feeDistribution_2: event.params._feeDistribution[2],
      _feeDistribution_3: event.params._feeDistribution[3],
    };
    context.PositionManager1_PoolFeeDistributionUpdated.set(entity);
  }
);

PositionManager1.PoolFeesDistributed.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolFeesDistributed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _donateAmount: event.params._donateAmount,
    _creatorAmount: event.params._creatorAmount,
    _bidWallAmount: event.params._bidWallAmount,
    _governanceAmount: event.params._governanceAmount,
    _protocolAmount: event.params._protocolAmount,
  };
  context.PositionManager1_PoolFeesDistributed.set(entity);
});

PositionManager1.PoolFeesReceived.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolFeesReceived = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.PositionManager1_PoolFeesReceived.set(entity);
});

PositionManager1.PoolFeesSwapped.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolFeesSwapped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    zeroForOne: event.params.zeroForOne,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.PositionManager1_PoolFeesSwapped.set(entity);
});

PositionManager1.PoolPremine.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolPremine = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _premineAmount: event.params._premineAmount,
  };
  context.PositionManager1_PoolPremine.set(entity);
});

PositionManager1.PoolScheduled.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolScheduled = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _flaunchesAt: event.params._flaunchesAt,
  };
  context.PositionManager1_PoolScheduled.set(entity);
});

PositionManager1.PoolStateUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolStateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _sqrtPriceX96: event.params._sqrtPriceX96,
    _tick: event.params._tick,
    _protocolFee: event.params._protocolFee,
    _swapFee: event.params._swapFee,
    _liquidity: event.params._liquidity,
  };
  context.PositionManager1_PoolStateUpdated.set(entity);
});

PositionManager1.PoolSwap.handler(async ({ event, context }) => {
  const entity: PositionManager1_PoolSwap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    flAmount0: event.params.flAmount0,
    flAmount1: event.params.flAmount1,
    flFee0: event.params.flFee0,
    flFee1: event.params.flFee1,
    ispAmount0: event.params.ispAmount0,
    ispAmount1: event.params.ispAmount1,
    ispFee0: event.params.ispFee0,
    ispFee1: event.params.ispFee1,
    uniAmount0: event.params.uniAmount0,
    uniAmount1: event.params.uniAmount1,
    uniFee0: event.params.uniFee0,
    uniFee1: event.params.uniFee1,
  };
  context.PositionManager1_PoolSwap.set(entity);
});

PositionManager1.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager1_ReferralEscrowUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _referralEscrow: event.params._referralEscrow,
  };
  context.PositionManager1_ReferralEscrowUpdated.set(entity);
});

PositionManager1.ReferrerFeePaid.handler(async ({ event, context }) => {
  const entity: PositionManager1_ReferrerFeePaid = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _recipient: event.params._recipient,
    _token: event.params._token,
    _amount: event.params._amount,
  };
  context.PositionManager1_ReferrerFeePaid.set(entity);
});

PositionManager1.Withdrawal.handler(async ({ event, context }) => {
  const entity: PositionManager1_Withdrawal = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _sender: event.params._sender,
    _recipient: event.params._recipient,
    _token: event.params._token,
    _amount: event.params._amount,
  };
  context.PositionManager1_Withdrawal.set(entity);
});

// PositionManager2 Handlers
PositionManager2.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager2_FeeCalculatorUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeCalculator: event.params._feeCalculator,
  };
  context.PositionManager2_FeeCalculatorUpdated.set(entity);
});

PositionManager2.FeeDistributionUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager2_FeeDistributionUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeDistribution_0: event.params._feeDistribution[0],
    _feeDistribution_1: event.params._feeDistribution[1],
    _feeDistribution_2: event.params._feeDistribution[2],
    _feeDistribution_3: event.params._feeDistribution[3],
  };
  context.PositionManager2_FeeDistributionUpdated.set(entity);
});

PositionManager2.PoolSwap.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolSwap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    flAmount0: event.params.flAmount0,
    flAmount1: event.params.flAmount1,
    flFee0: event.params.flFee0,
    flFee1: event.params.flFee1,
    ispAmount0: event.params.ispAmount0,
    ispAmount1: event.params.ispAmount1,
    ispFee0: event.params.ispFee0,
    ispFee1: event.params.ispFee1,
    uniAmount0: event.params.uniAmount0,
    uniAmount1: event.params.uniAmount1,
    uniFee0: event.params.uniFee0,
    uniFee1: event.params.uniFee1,
  };
  context.PositionManager2_PoolSwap.set(entity);
});

PositionManager2.PoolPremine.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolPremine = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _premineAmount: event.params._premineAmount,
  };
  context.PositionManager2_PoolPremine.set(entity);
});

PositionManager2.PoolScheduled.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolScheduled = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _flaunchesAt: event.params._flaunchesAt,
  };
  context.PositionManager2_PoolScheduled.set(entity);
});

PositionManager2.PoolCreated.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _memecoin: event.params._memecoin,
    _memecoinTreasury: event.params._memecoinTreasury,
    _tokenId: event.params._tokenId,
    _currencyFlipped: event.params._currencyFlipped,
    _flaunchFee: event.params._flaunchFee,
    _params_0: event.params._params[0],
    _params_1: event.params._params[1],
    _params_2: event.params._params[2],
    _params_3: event.params._params[3],
    _params_4: event.params._params[4],
    _params_5: event.params._params[5],
    _params_6: event.params._params[6],
    _params_7: event.params._params[7],
    _params_8: event.params._params[8],
    _params_9: event.params._params[9],
    _params_10: event.params._params[10],
  };
  context.PositionManager2_PoolCreated.set(entity);
});

PositionManager2.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager2_PoolFeeDistributionUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _poolId: event.params._poolId,
      _feeDistribution_0: event.params._feeDistribution[0],
      _feeDistribution_1: event.params._feeDistribution[1],
      _feeDistribution_2: event.params._feeDistribution[2],
      _feeDistribution_3: event.params._feeDistribution[3],
    };
    context.PositionManager2_PoolFeeDistributionUpdated.set(entity);
  }
);

PositionManager2.PoolFeesDistributed.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolFeesDistributed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _donateAmount: event.params._donateAmount,
    _creatorAmount: event.params._creatorAmount,
    _bidWallAmount: event.params._bidWallAmount,
    _governanceAmount: event.params._governanceAmount,
    _protocolAmount: event.params._protocolAmount,
  };
  context.PositionManager2_PoolFeesDistributed.set(entity);
});

PositionManager2.PoolFeesReceived.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolFeesReceived = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.PositionManager2_PoolFeesReceived.set(entity);
});

PositionManager2.PoolFeesSwapped.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolFeesSwapped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    zeroForOne: event.params.zeroForOne,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.PositionManager2_PoolFeesSwapped.set(entity);
});

PositionManager2.PoolStateUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager2_PoolStateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _sqrtPriceX96: event.params._sqrtPriceX96,
    _tick: event.params._tick,
    _protocolFee: event.params._protocolFee,
    _swapFee: event.params._swapFee,
    _liquidity: event.params._liquidity,
  };
  context.PositionManager2_PoolStateUpdated.set(entity);
});

PositionManager2.ReferrerFeePaid.handler(async ({ event, context }) => {
  const entity: PositionManager2_ReferrerFeePaid = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _recipient: event.params._recipient,
    _token: event.params._token,
    _amount: event.params._amount,
  };
  context.PositionManager2_ReferrerFeePaid.set(entity);
});

PositionManager2.FairLaunchFeeCalculatorUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager2_FairLaunchFeeCalculatorUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _feeCalculator: event.params._feeCalculator,
    };
    context.PositionManager2_FairLaunchFeeCalculatorUpdated.set(entity);
  }
);

PositionManager2.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager2_ReferralEscrowUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _referralEscrow: event.params._referralEscrow,
  };
  context.PositionManager2_ReferralEscrowUpdated.set(entity);
});

// PositionManager3 Handlers (same as PositionManager2)
PositionManager3.FeeCalculatorUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager3_FeeCalculatorUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeCalculator: event.params._feeCalculator,
  };
  context.PositionManager3_FeeCalculatorUpdated.set(entity);
});

PositionManager3.FeeDistributionUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager3_FeeDistributionUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _feeDistribution_0: event.params._feeDistribution[0],
    _feeDistribution_1: event.params._feeDistribution[1],
    _feeDistribution_2: event.params._feeDistribution[2],
    _feeDistribution_3: event.params._feeDistribution[3],
  };
  context.PositionManager3_FeeDistributionUpdated.set(entity);
});

PositionManager3.PoolSwap.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolSwap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    flAmount0: event.params.flAmount0,
    flAmount1: event.params.flAmount1,
    flFee0: event.params.flFee0,
    flFee1: event.params.flFee1,
    ispAmount0: event.params.ispAmount0,
    ispAmount1: event.params.ispAmount1,
    ispFee0: event.params.ispFee0,
    ispFee1: event.params.ispFee1,
    uniAmount0: event.params.uniAmount0,
    uniAmount1: event.params.uniAmount1,
    uniFee0: event.params.uniFee0,
    uniFee1: event.params.uniFee1,
  };
  context.PositionManager3_PoolSwap.set(entity);
});

PositionManager3.PoolPremine.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolPremine = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _premineAmount: event.params._premineAmount,
  };
  context.PositionManager3_PoolPremine.set(entity);
});

PositionManager3.PoolScheduled.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolScheduled = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _flaunchesAt: event.params._flaunchesAt,
  };
  context.PositionManager3_PoolScheduled.set(entity);
});

PositionManager3.PoolCreated.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _memecoin: event.params._memecoin,
    _memecoinTreasury: event.params._memecoinTreasury,
    _tokenId: event.params._tokenId,
    _currencyFlipped: event.params._currencyFlipped,
    _flaunchFee: event.params._flaunchFee,
    _params_0: event.params._params[0],
    _params_1: event.params._params[1],
    _params_2: event.params._params[2],
    _params_3: event.params._params[3],
    _params_4: event.params._params[4],
    _params_5: event.params._params[5],
    _params_6: event.params._params[6],
    _params_7: event.params._params[7],
    _params_8: event.params._params[8],
    _params_9: event.params._params[9],
    _params_10: event.params._params[10],
  };
  context.PositionManager3_PoolCreated.set(entity);
});

PositionManager3.PoolFeeDistributionUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager3_PoolFeeDistributionUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _poolId: event.params._poolId,
      _feeDistribution_0: event.params._feeDistribution[0],
      _feeDistribution_1: event.params._feeDistribution[1],
      _feeDistribution_2: event.params._feeDistribution[2],
      _feeDistribution_3: event.params._feeDistribution[3],
    };
    context.PositionManager3_PoolFeeDistributionUpdated.set(entity);
  }
);

PositionManager3.PoolFeesDistributed.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolFeesDistributed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _donateAmount: event.params._donateAmount,
    _creatorAmount: event.params._creatorAmount,
    _bidWallAmount: event.params._bidWallAmount,
    _governanceAmount: event.params._governanceAmount,
    _protocolAmount: event.params._protocolAmount,
  };
  context.PositionManager3_PoolFeesDistributed.set(entity);
});

PositionManager3.PoolFeesReceived.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolFeesReceived = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.PositionManager3_PoolFeesReceived.set(entity);
});

PositionManager3.PoolFeesSwapped.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolFeesSwapped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    zeroForOne: event.params.zeroForOne,
    _amount0: event.params._amount0,
    _amount1: event.params._amount1,
  };
  context.PositionManager3_PoolFeesSwapped.set(entity);
});

PositionManager3.PoolStateUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager3_PoolStateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _sqrtPriceX96: event.params._sqrtPriceX96,
    _tick: event.params._tick,
    _protocolFee: event.params._protocolFee,
    _swapFee: event.params._swapFee,
    _liquidity: event.params._liquidity,
  };
  context.PositionManager3_PoolStateUpdated.set(entity);
});

PositionManager3.ReferrerFeePaid.handler(async ({ event, context }) => {
  const entity: PositionManager3_ReferrerFeePaid = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _poolId: event.params._poolId,
    _recipient: event.params._recipient,
    _token: event.params._token,
    _amount: event.params._amount,
  };
  context.PositionManager3_ReferrerFeePaid.set(entity);
});

PositionManager3.FairLaunchFeeCalculatorUpdated.handler(
  async ({ event, context }) => {
    const entity: PositionManager3_FairLaunchFeeCalculatorUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _feeCalculator: event.params._feeCalculator,
    };
    context.PositionManager3_FairLaunchFeeCalculatorUpdated.set(entity);
  }
);

PositionManager3.ReferralEscrowUpdated.handler(async ({ event, context }) => {
  const entity: PositionManager3_ReferralEscrowUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    _referralEscrow: event.params._referralEscrow,
  };
  context.PositionManager3_ReferralEscrowUpdated.set(entity);
});

// PoolManager Handlers
PoolManager.Swap.handler(async ({ event, context }) => {
  const entity: PoolManager_Swap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    sender: event.params.sender,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    sqrtPriceX96: event.params.sqrtPriceX96,
    liquidity: event.params.liquidity,
    tick: event.params.tick,
    fee: event.params.fee,
  };
  context.PoolManager_Swap.set(entity);
});

// ActionManager1 Handlers
ActionManager1.ActionApproved.handler(async ({ event, context }) => {
  const entity: ActionManager1_ActionApproved = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    actionAddress: event.params.action,
  };
  context.ActionManager1_ActionApproved.set(entity);
});

ActionManager1.ActionUnapproved.handler(async ({ event, context }) => {
  const entity: ActionManager1_ActionUnapproved = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    actionAddress: event.params.action,
  };
  context.ActionManager1_ActionUnapproved.set(entity);
});

// ActionManager2 Handlers
ActionManager2.ActionApproved.handler(async ({ event, context }) => {
  const entity: ActionManager2_ActionApproved = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    actionAddress: event.params.action,
  };
  context.ActionManager2_ActionApproved.set(entity);
});

ActionManager2.ActionUnapproved.handler(async ({ event, context }) => {
  const entity: ActionManager2_ActionUnapproved = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    actionAddress: event.params.action,
  };
  context.ActionManager2_ActionUnapproved.set(entity);
});

// BidWall1 Handlers
BidWall1.BidWallClosed.handler(async ({ event, context }) => {
  const entity: BidWall1_BidWallClosed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    recipient: event.params.recipient,
    amount: event.params.amount,
  };
  context.BidWall1_BidWallClosed.set(entity);
});

BidWall1.BidWallRepositioned.handler(async ({ event, context }) => {
  const entity: BidWall1_BidWallRepositioned = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    liquidity: event.params.liquidity,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
  };
  context.BidWall1_BidWallRepositioned.set(entity);
});

BidWall1.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const entity: BidWall1_BidWallRewardsTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    recipient: event.params.recipient,
    amount: event.params.amount,
  };
  context.BidWall1_BidWallRewardsTransferred.set(entity);
});

BidWall1.BidWallDeposit.handler(async ({ event, context }) => {
  const entity: BidWall1_BidWallDeposit = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
  };
  context.BidWall1_BidWallDeposit.set(entity);
});

BidWall1.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {
  const entity: BidWall1_BidWallDisabledStateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    disabled: event.params.disabled,
  };
  context.BidWall1_BidWallDisabledStateUpdated.set(entity);
});

// BidWall2 Handlers
BidWall2.BidWallClosed.handler(async ({ event, context }) => {
  const entity: BidWall2_BidWallClosed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    recipient: event.params.recipient,
    amount: event.params.amount,
  };
  context.BidWall2_BidWallClosed.set(entity);
});

BidWall2.BidWallRepositioned.handler(async ({ event, context }) => {
  const entity: BidWall2_BidWallRepositioned = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    liquidity: event.params.liquidity,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
  };
  context.BidWall2_BidWallRepositioned.set(entity);
});

BidWall2.BidWallRewardsTransferred.handler(async ({ event, context }) => {
  const entity: BidWall2_BidWallRewardsTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    recipient: event.params.recipient,
    amount: event.params.amount,
  };
  context.BidWall2_BidWallRewardsTransferred.set(entity);
});

BidWall2.BidWallDeposit.handler(async ({ event, context }) => {
  const entity: BidWall2_BidWallDeposit = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
  };
  context.BidWall2_BidWallDeposit.set(entity);
});

BidWall2.BidWallDisabledStateUpdated.handler(async ({ event, context }) => {
  const entity: BidWall2_BidWallDisabledStateUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    disabled: event.params.disabled,
  };
  context.BidWall2_BidWallDisabledStateUpdated.set(entity);
});

// FeeEscrow Handlers
FeeEscrow.Deposit.handler(async ({ event, context }) => {
  const entity: FeeEscrow_Deposit = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    sender: event.params.sender,
    token: event.params.token,
    amount: event.params.amount,
  };
  context.FeeEscrow_Deposit.set(entity);
});

FeeEscrow.Withdrawal.handler(async ({ event, context }) => {
  const entity: FeeEscrow_Withdrawal = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    recipient: event.params.recipient,
    token: event.params.token,
    amount: event.params.amount,
  };
  context.FeeEscrow_Withdrawal.set(entity);
});

// FeeExemptions Handlers
FeeExemptions.BeneficiaryFeeRemoved.handler(async ({ event, context }) => {
  const entity: FeeExemptions_BeneficiaryFeeRemoved = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    beneficiary: event.params.beneficiary,
  };
  context.FeeExemptions_BeneficiaryFeeRemoved.set(entity);
});

FeeExemptions.BeneficiaryFeeSet.handler(async ({ event, context }) => {
  const entity: FeeExemptions_BeneficiaryFeeSet = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    beneficiary: event.params.beneficiary,
    fee: event.params.fee,
  };
  context.FeeExemptions_BeneficiaryFeeSet.set(entity);
});

// FlaunchFeeExemption Handlers
FlaunchFeeExemption.FeeExemptionUpdated.handler(async ({ event, context }) => {
  const entity: FlaunchFeeExemption_FeeExemptionUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    exempt: event.params.exempt,
  };
  context.FlaunchFeeExemption_FeeExemptionUpdated.set(entity);
});

// FairLaunch1 Handlers
FairLaunch1.FairLaunchEnded.handler(async ({ event, context }) => {
  const entity: FairLaunch1_FairLaunchEnded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    totalRaised: event.params.totalRaised,
    liquidityAdded: event.params.liquidityAdded,
    refundAmount: event.params.refundAmount,
  };
  context.FairLaunch1_FairLaunchEnded.set(entity);
});

FairLaunch1.FairLaunchCreated.handler(async ({ event, context }) => {
  const entity: FairLaunch1_FairLaunchCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    targetAmount: event.params.targetAmount,
    maxAmount: event.params.maxAmount,
    deadline: event.params.deadline,
  };
  context.FairLaunch1_FairLaunchCreated.set(entity);
});

// FairLaunch2 Handlers
FairLaunch2.FairLaunchEnded.handler(async ({ event, context }) => {
  const entity: FairLaunch2_FairLaunchEnded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    totalRaised: event.params.totalRaised,
    liquidityAdded: event.params.liquidityAdded,
    refundAmount: event.params.refundAmount,
  };
  context.FairLaunch2_FairLaunchEnded.set(entity);
});

FairLaunch2.FairLaunchCreated.handler(async ({ event, context }) => {
  const entity: FairLaunch2_FairLaunchCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolId: event.params.poolId,
    targetAmount: event.params.targetAmount,
    maxAmount: event.params.maxAmount,
    deadline: event.params.deadline,
  };
  context.FairLaunch2_FairLaunchCreated.set(entity);
});

// FlaunchNFT1 Handlers
FlaunchNFT1.Transfer.handler(async ({ event, context }) => {
  const entity: FlaunchNFT1_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };
  context.FlaunchNFT1_Transfer.set(entity);
});

// FlaunchNFT2 Handlers
FlaunchNFT2.Transfer.handler(async ({ event, context }) => {
  const entity: FlaunchNFT2_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };
  context.FlaunchNFT2_Transfer.set(entity);
});

// FlaunchNFT3 Handlers
FlaunchNFT3.Transfer.handler(async ({ event, context }) => {
  const entity: FlaunchNFT3_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };
  context.FlaunchNFT3_Transfer.set(entity);
});

// AnyFlaunchNFT Handlers
AnyFlaunchNFT.Transfer.handler(async ({ event, context }) => {
  const entity: AnyFlaunchNFT_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };
  context.AnyFlaunchNFT_Transfer.set(entity);
});

// FlayBurner Handlers
FlayBurner.BurnerUpdated.handler(async ({ event, context }) => {
  const entity: FlayBurner_BurnerUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    burner: event.params.burner,
  };
  context.FlayBurner_BurnerUpdated.set(entity);
});

// BuyBackAndBurnFlay Handlers
BuyBackAndBurnFlay.BurnBabyBurn.handler(async ({ event, context }) => {
  const entity: BuyBackAndBurnFlay_BurnBabyBurn = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    amount: event.params.amount,
  };
  context.BuyBackAndBurnFlay_BurnBabyBurn.set(entity);
});

BuyBackAndBurnFlay.EthBalanceUpdated.handler(async ({ event, context }) => {
  const entity: BuyBackAndBurnFlay_EthBalanceUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    balance: event.params.balance,
  };
  context.BuyBackAndBurnFlay_EthBalanceUpdated.set(entity);
});

// TreasuryManagerFactory Handlers
TreasuryManagerFactory.ManagerImplementationUnapproved.handler(
  async ({ event, context }) => {
    const entity: TreasuryManagerFactory_ManagerImplementationUnapproved = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      implementation: event.params.implementation,
    };
    context.TreasuryManagerFactory_ManagerImplementationUnapproved.set(entity);
  }
);

TreasuryManagerFactory.ManagerDeployed.handler(async ({ event, context }) => {
  const entity: TreasuryManagerFactory_ManagerDeployed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    manager: event.params.manager,
    implementation: event.params.implementation,
  };
  context.TreasuryManagerFactory_ManagerDeployed.set(entity);
});

TreasuryManagerFactory.ManagerImplementationApproved.handler(
  async ({ event, context }) => {
    const entity: TreasuryManagerFactory_ManagerImplementationApproved = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      implementation: event.params.implementation,
    };
    context.TreasuryManagerFactory_ManagerImplementationApproved.set(entity);
  }
);
