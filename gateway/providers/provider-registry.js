import { executeMock } from "./mock.js";
// nākotnē:
// import { executeStripe } from "./stripe.js";
// import { executeBank } from "./bank.js";

export async function executeProvider(event) {
  // šobrīd:
  return executeMock(event);

  // vēlāk:
  // if (event.type === "payment") return executeStripe(event);
}
