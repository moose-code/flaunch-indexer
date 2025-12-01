/**
 * Action Manager Handlers
 * Handles ActionManager1 and ActionManager2 contract events
 */

import { ActionManager1, ActionManager2 } from "generated";
import { ZERO_BI } from "../utils/constants";
import { normalizeAddress } from "../utils/helpers";

// =============================================================================
// ACTION MANAGER 1 HANDLERS
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

// Contract registration for Action contracts
ActionManager1.ActionApproved.contractRegister(({ event, context }) => {
  context.addActionContract(event.params.action);
});

// =============================================================================
// ACTION MANAGER 2 HANDLERS
// =============================================================================

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

// Contract registration for Action contracts
ActionManager2.ActionApproved.contractRegister(({ event, context }) => {
  context.addActionContract(event.params.action);
});


