// Protocol addresses for Base mainnet

/**
 * Zero address
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Protocol addresses
 */
export const PROTOCOL_FEE_RECIPIENT = "0x1150c53eb4ce3ade47808d1d1ac9636b774ee079";
export const FLETH = "0x000000000d564d5be76f7f0d28fe52605afc7cf8";

/**
 * Zaps
 */
export const FLAUNCH_ZAP = "0xf9753e6e4fdd1869be40685690a28bff26b8b114";

/**
 * Treasury Manager Implementations
 */
export const REVENUE_MANAGERS = [
  "0x712fa8ddc7347b4b6b029aa21710f365cd02d898",
  "0x4fb9de6bbe970a49c19fb967f937351728c01b8f",
  "0xb6c0cca8b3a354fa0f348c121657f4a952e92b3d",
  "0x33f04d3a76cffa25e5da285d97336e67611b2282",
  "0xc8d4b2ca8ed6868ee768beab1f932d7eeccc1b50",
  "0x1af9b9f168bfd2046f45e0ce03972864bce7ee36",
];

export const ADDRESS_FEE_SPLIT_MANAGERS = [
  "0x6baa4ec493a9698dc7388c0f290e29ea3d149f99",
  "0xc3f4e72de4d37988f12c101b0766fd8462f6faf9",
  "0xabde686e8a710ade941189d634596215ba78334b",
  "0x929d4815fe415b85e53975aec58a8980bda3d90c",
  "0xfab4ba48a322efc8b25815448be6018d211e89f3",
  "0xf6d8018450109a68acfbcd2523dc43fb31920a7d",
];

export const STAKING_MANAGERS = [
  "0xb5dd2fbca9b746a56cf9e5e2adabf8bef0badbea",
  "0x3c3bc8e63df9ccd5cdaa01f6833b2e4dcdb40bf0",
  "0x540677596a3aa2d75f2eb1e791b8f27ec4a9622d",
  "0xcc920a815169230c0c85add65a9786b2691324c2",
  "0xec0069f8dbbbc94058dc895000dd38ef40b3125d",
  "0xa15f92a7c09a7d6adbc00ff2db63e414fbfea193",
];

export const BUY_BACK_MANAGERS = [
  "0x3aaf3b1d8cd5b61c77f99ba7cdf41e9ec0ba8a3f",
];

/**
 * Position Manager <-> BidWall / Flaunch mappings.
 * Key: Position Manager address (lowercase)
 * Value: { bidWall: address, flaunch: address }
 */
export interface PositionManagerMapping {
  bidWall: string;
  flaunch: string;
}

export const positionManagers: Record<string, PositionManagerMapping> = {
  // PositionManager 1.0
  "0x51bba15255406cfe7099a42183302640ba7dafdc": {
    bidWall: "0x66681f10ba90496241a25e33380004f30dfd8aa8",
    flaunch: "0x6a53f8b799be11a2a3264ef0bff183dcb12d9571",
  },
  // PositionManager 1.1
  "0xf785bb58059fab6fb19bdda2cb9078d9e546efdc": {
    bidWall: "0x7f22353d1634223a802d1c1ea5308ddf5dd0ef9c",
    flaunch: "0xb4512bf57d50fbcb64a3adf8b17a79b2a204c18c",
  },
  // PositionManager 1.2
  "0xb903b0ab7bcee8f5e4d8c9b10a71aac7135d6fdc": {
    bidWall: "0x7f22353d1634223a802d1c1ea5308ddf5dd0ef9c",
    flaunch: "0x0cf6bdf0a85a9d6763361037985b76c8893553af",
  },
  // PositionManager 1.3
  "0x23321f11a6d44fd1ab790044fdfde5758c902fdc": {
    bidWall: "0x7f22353d1634223a802d1c1ea5308ddf5dd0ef9c",
    flaunch: "0x516af52d0c629b5e378da4dc64ecb0744ce10109",
  },
  // AnyPositionManager1
  "0x2ad43d0618b1d8a0cc75cf716cf0bf64070725dc": {
    bidWall: "0x7f22353d1634223a802d1c1ea5308ddf5dd0ef9c",
    flaunch: "0xf175a370eb26ea26c42caaecd10ee723ed844c50",
  },
  // AnyPositionManager2
  "0x8dc3b85e1dc1c846ebf3971179a751896842e5dc": {
    bidWall: "0x2154c604df568a5285284d1c4918dc98c39240df",
    flaunch: "0xc5b2e8f197407263f4b62a35c71bfc394ecf95d5",
  },
};

/**
 * An array of all zap addresses (lowercase)
 */
export const ZAPS = [
  // Current, live zaps
  FLAUNCH_ZAP,
  // Deprecated zaps
  "0x68d967d25806fef4aa134db031cdcc55d3e20f92", // Legacy FastFlaunchZap
  "0x8af174ed38891f0f3ea26a6cd692cc22eac913ee", // Legacy FlaunchZap
  "0xefa8267954b0740dc981a40d8e23d07116c8dffe", // Legacy FlaunchZap
];

/**
 * ETH / USDC Pool
 */
export const ETH_USDC_POOL_ID = "0x96d4b53a38337a5733179751781178a2613306063c511b78cd02684739288c0a";

/**
 * Get BidWall address for a position manager
 */
export function getBidWallAddressForPositionManager(positionManagerAddress: string): string | undefined {
  return positionManagers[positionManagerAddress.toLowerCase()]?.bidWall;
}

/**
 * Get Flaunch address for a position manager
 */
export function getFlaunchAddressForPositionManager(positionManagerAddress: string): string | undefined {
  return positionManagers[positionManagerAddress.toLowerCase()]?.flaunch;
}

/**
 * Check if an address is a known zap address
 */
export function isZapAddress(address: string): boolean {
  return ZAPS.includes(address.toLowerCase());
}

/**
 * Check if an address is a Revenue Manager implementation
 */
export function isRevenueManager(address: string): boolean {
  return REVENUE_MANAGERS.includes(address.toLowerCase());
}

/**
 * Check if an address is an Address Fee Split Manager implementation
 */
export function isAddressFeeSplitManager(address: string): boolean {
  return ADDRESS_FEE_SPLIT_MANAGERS.includes(address.toLowerCase());
}

/**
 * Check if an address is a Staking Manager implementation
 */
export function isStakingManager(address: string): boolean {
  return STAKING_MANAGERS.includes(address.toLowerCase());
}

/**
 * Check if an address is a BuyBack Manager implementation
 */
export function isBuyBackManager(address: string): boolean {
  return BUY_BACK_MANAGERS.includes(address.toLowerCase());
}

