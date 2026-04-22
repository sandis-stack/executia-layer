
export default {
  name: "mock_bank",
  validateRequest() { return true; },
  async dispatch() { return { ok:true, accepted:true, raw_response:{ simulated:true } }; },
  verifyResponse(result) { return !!result; },
  normalizeResult(result) { return { accepted: !!result.accepted, provider_status: result.accepted ? 'simulated_accepted' : 'simulated_rejected', provider_transaction_id: null, raw_response: result.raw_response || result }; },
  async execute({ ticket, payload }) { return this.normalizeResult(await this.dispatch({ ticket, payload })); }
};
