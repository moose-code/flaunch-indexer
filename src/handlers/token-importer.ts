/**
 * Token Importer Handlers
 * Handles TokenImporter contract events for imported tokens
 */

import { TokenImporter } from "generated";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// TOKEN IMPORTER HANDLERS
// =============================================================================

/**
 * Handle AnyPositionManagerSet event
 * This is not currently implemented in the subgraph either
 */
TokenImporter.AnyPositionManagerSet.handler(async ({ event, context }) => {
  // Not implemented - event is tracked but no entity updates needed
});

/**
 * Handle TokenImported event
 * When a token has been imported, create an ImportedToken entity
 */
TokenImporter.TokenImported.handler(async ({ event, context }) => {
  const memecoin = normalizeAddress(event.params._memecoin);
  const verifier = normalizeAddress(event.params._verifier);
  const timestamp = BigInt(event.block.timestamp);
  const txHash = event.transaction.hash || "";
  const sender = normalizeAddress(
    event.transaction.from || "0x0000000000000000000000000000000000000000"
  );

  // Ensure sender user exists
  if (!(await context.User.get(sender))) {
    context.User.set({ id: sender });
  }

  context.ImportedToken.set({
    id: memecoin,
    collectionToken_id: memecoin,
    verifier,
    sender,
    importedAt: timestamp,
    txHash,
  });
});

/**
 * Handle VerifierAdded event
 * Create a TokenImporterVerifier entity when a new verifier is added
 */
TokenImporter.VerifierAdded.handler(async ({ event, context }) => {
  const verifier = normalizeAddress(event.params._verifier);

  context.TokenImporterVerifier.set({
    id: verifier,
  });
});

/**
 * Handle VerifierRemoved event
 * Remove the TokenImporterVerifier entity when a verifier is removed
 */
TokenImporter.VerifierRemoved.handler(async ({ event, context }) => {
  const verifier = normalizeAddress(event.params._verifier);

  // In Envio, we can't truly delete entities, but we can mark them as removed
  // or simply not update. The subgraph uses store.remove, but Envio doesn't support this.
  // We'll use deleteUnsafe if available or just leave it
  context.TokenImporterVerifier.deleteUnsafe(verifier);
});

