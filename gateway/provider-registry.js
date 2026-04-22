/**
 * EXECUTIA™ — /gateway/provider-registry.js
 */
import * as mockBank from "./providers/mock-bank.js";
import webhook from "./providers/webhook.js";

const REGISTRY = Object.freeze({
  mock_bank: mockBank,
  webhook,
});

export function getProvider(providerName) {
  const adapter = REGISTRY[providerName];
  if (!adapter) {
    throw new Error(`UNKNOWN_PROVIDER: "${providerName}". Registered providers: ${Object.keys(REGISTRY).join(", ")}`);
  }
  return adapter;
}

export function assertProviderAllowed(providerName) {
  if (process.env.NODE_ENV === "production" && providerName === "mock_bank") {
    throw new Error("PROVIDER_FORBIDDEN: mock_bank is not allowed in production");
  }
  return true;
}

export function listProviders() {
  const all = Object.keys(REGISTRY);
  if (process.env.NODE_ENV === "production") {
    return all.filter((name) => name !== "mock_bank");
  }
  return all;
}
