import { connectionStates, requestStates, type ConnectionState, type RequestState } from "./contracts";

const requestTransitions: Record<RequestState, readonly RequestState[]> = {
  draft: ["draft", "ready", "archived"],
  ready: ["ready", "awaiting_authorization", "attention_required", "archived"],
  awaiting_authorization: ["awaiting_authorization", "authorizing", "attention_required", "archived"],
  authorizing: ["authorizing", "discovering", "attention_required", "archived"],
  discovering: ["discovering", "selection_required", "attention_required", "archived"],
  selection_required: ["selection_required", "verifying", "attention_required", "archived"],
  verifying: ["verifying", "completed", "attention_required", "archived"],
  completed: ["completed", "ready", "archived"],
  attention_required: ["attention_required", "ready", "awaiting_authorization", "archived"],
  archived: ["archived"],
};

const connectionTransitions: Record<ConnectionState, readonly ConnectionState[]> = {
  pending: ["pending", "authorizing", "verifying", "revoked"],
  authorizing: ["authorizing", "discovering", "degraded", "revoked"],
  discovering: ["discovering", "verifying", "degraded", "revoked"],
  verifying: ["verifying", "active_read_only", "degraded", "expired", "revoked"],
  active_read_only: ["active_read_only", "authorizing", "verifying", "degraded", "expired", "revoked"],
  degraded: ["degraded", "authorizing", "verifying", "expired", "revoked"],
  expired: ["expired", "authorizing", "revoked"],
  revoked: ["revoked", "archived"],
  archived: ["archived"],
};

export function canRequestTransition(from: string, to: RequestState) {
  return requestStates.includes(from as RequestState) && requestTransitions[from as RequestState].includes(to);
}

export function canConnectionTransition(from: string, to: ConnectionState) {
  return connectionStates.includes(from as ConnectionState) && connectionTransitions[from as ConnectionState].includes(to);
}

export function assertRequestTransition(from: string, to: RequestState) {
  if (!canRequestTransition(from, to)) throw new StateTransitionError("REQUEST_STATE_TRANSITION_NOT_ALLOWED");
}

export function assertConnectionTransition(from: string, to: ConnectionState) {
  if (!canConnectionTransition(from, to)) throw new StateTransitionError("CONNECTION_STATE_TRANSITION_NOT_ALLOWED");
}

export function assertConnectionArchivable(status: string, cleanupPending: boolean) {
  if (status !== "revoked") throw new StateTransitionError("CONNECTION_REVOKE_REQUIRED");
  if (cleanupPending) throw new StateTransitionError("CONNECTION_CLEANUP_PENDING");
  assertConnectionTransition(status, "archived");
}

export class StateTransitionError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "StateTransitionError";
    this.code = code;
  }
}
