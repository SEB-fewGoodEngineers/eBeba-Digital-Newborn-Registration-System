import { api } from "./api";

// MoI staff: run the pre-check for a registration.
// Returns the aiSuggestions document: { _id, aiAvailable, flags, … }.
// Server route is built by Epic 3. Until then, the server stub returns
// one rule flag and aiAvailable: true.
export const runPrecheck = (registrationId) =>
  api(`/registrations/${registrationId}/precheck`, { method: "POST" });

// MoI staff: decide one flag. decision = "accepted" | "dismissed".
// decidedByUserId and decidedAt are set by the server from req.user and now().
export const decideFlag = (suggestionId, flagId, decision) =>
  api(`/ai-suggestions/${suggestionId}/flags/${flagId}`, {
    method: "PATCH",
    body: { decision },
  });
