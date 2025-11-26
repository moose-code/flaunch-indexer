/**
 * Treasury Manager Factory Handlers
 * Handles TreasuryManagerFactory contract events and dynamic contract registration
 */

import { TreasuryManagerFactory, BigDecimal } from "generated";
import { ZERO_BI, ZERO_BD } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";
import {
  isRevenueManager,
  isAddressFeeSplitManager,
  isStakingManager,
  isBuyBackManager,
} from "../addresses/base";

// =============================================================================
// TREASURY MANAGER FACTORY HANDLERS
// =============================================================================

TreasuryManagerFactory.ManagerImplementationApproved.handler(
  async ({ event, context }) => {
    const implAddress = normalizeAddress(event.params.implementation);

    context.TreasuryManagerImplementation.set({
      id: implAddress,
      approvedAt: BigInt(event.block.timestamp),
      unapprovedAt: undefined,
    });
  }
);

TreasuryManagerFactory.ManagerImplementationUnapproved.handler(
  async ({ event, context }) => {
    const implAddress = normalizeAddress(event.params.implementation);

    const impl = await context.TreasuryManagerImplementation.get(implAddress);
    if (impl) {
      context.TreasuryManagerImplementation.set({
        ...impl,
        unapprovedAt: BigInt(event.block.timestamp),
      });
    }
  }
);

TreasuryManagerFactory.ManagerDeployed.handler(async ({ event, context }) => {
  const managerAddress = normalizeAddress(event.params.manager);
  const implementationAddress = normalizeAddress(event.params.implementation);
  const timestamp = BigInt(event.block.timestamp);
  const deployer = normalizeAddress(
    event.transaction.from || "0x0000000000000000000000000000000000000000"
  );

  // Ensure deployer user exists
  if (!(await context.User.get(deployer))) context.User.set({ id: deployer });

  if (isRevenueManager(implementationAddress)) {
    context.RevenueManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      createdAt: timestamp,
      owner_id: undefined,
      protocolFeeRecipient_id: undefined,
      protocolFee: undefined,
    });
  } else if (isAddressFeeSplitManager(implementationAddress)) {
    context.AddressFeeSplitManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      externalManagerETHTotal: 0n,
      createdAt: timestamp,
      owner_id: undefined,
      creatorShare: undefined,
    });
  } else if (isStakingManager(implementationAddress)) {
    context.StakingManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      stakingToken_id: "0x0000000000000000000000000000000000000000",
      totalStaked: 0n,
      createdAt: timestamp,
      owner_id: undefined,
      minEscrowDuration: 0n,
      minStakeDuration: 0n,
      creatorShare: 0n,
      ownerShare: 0n,
      totalStakers: 0n,
      externalManagerETHTotal: 0n,
    });
  } else if (isBuyBackManager(implementationAddress)) {
    context.BuyBackManager.set({
      id: managerAddress,
      deployer,
      permissions: "0x0000000000000000000000000000000000000000",
      managerImplementation: implementationAddress,
      createdAt: timestamp,
      owner_id: undefined,
      creatorShare: 0n,
      ownerShare: 0n,
      buyBackCurrency0: "0x0000000000000000000000000000000000000000",
      buyBackCurrency1: "0x0000000000000000000000000000000000000000",
      totalDeposits: 0n,
      totalDepositsUSDC: ZERO_BD,
      externalManagerETHTotal: 0n,
    });
  }
});

// =============================================================================
// CONTRACT REGISTRATION HANDLERS
// =============================================================================

TreasuryManagerFactory.ManagerDeployed.contractRegister(
  ({ event, context }) => {
    const impl = normalizeAddress(event.params.implementation);
    const manager = event.params.manager;

    if (isRevenueManager(impl)) {
      context.addRevenueManager(manager);
    } else if (isStakingManager(impl)) {
      context.addStakingManager(manager);
    } else if (isAddressFeeSplitManager(impl)) {
      context.addAddressFeeSplitManager(manager);
    } else if (isBuyBackManager(impl)) {
      context.addBuyBackManager(manager);
    }
  }
);

