// Bank stub - generates reference for manual reconciliation (Premium)
function generateBankReference(businessId) {
  return `BNK_${businessId}_${Date.now().toString(36).toUpperCase()}`;
}

async function initiate({ amount, businessId, reference, accountName }) {
  const ref = reference || generateBankReference(businessId);
  return {
    success: true,
    reference: ref,
    instructions: `Transfer KES ${amount} to Account: SwiftPOS Collection, Ref: ${ref}. Upload proof via support.`,
    amount,
  };
}

module.exports = { initiate, generateBankReference };
