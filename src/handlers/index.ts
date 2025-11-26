/**
 * Handler Index
 * Imports all handler files to register them with Envio
 */

// Static contract handlers
import "./pool-manager";
import "./fee-escrow";
import "./fee-exemptions";
import "./fair-launch";
import "./flay-burner";
import "./action-manager";
import "./flaunch-nft";
import "./bid-wall";
import "./treasury-manager-factory";

// Position managers (largest files)
// Note: position-manager-common is imported by the PM files, not directly
import "./any-position-manager";
import "./position-manager1";
import "./position-manager2";
import "./position-manager3";

// Dynamic contract handlers
import "./collection-token";
import "./referral-escrow";
import "./memecoin-treasury";
import "./action";
import "./revenue-manager";
import "./staking-manager";
import "./address-fee-split-manager";
import "./buy-back-manager";
