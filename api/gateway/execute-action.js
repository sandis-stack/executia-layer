import { executeProvider } from "./providers/provider-registry.js";

export async function executeAction(event) {
  return await executeProvider(event);
}
