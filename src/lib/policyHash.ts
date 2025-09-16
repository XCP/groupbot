import { createHash } from 'crypto';
import { Policy } from '@prisma/client';

/**
 * Generate a deterministic hash for a policy configuration
 * This hash is used to track which version of a policy members were verified against
 */
export function generatePolicyHash(policy: Policy | null): string {
  if (!policy) {
    // Default hash for no policy (basic verification only)
    return 'basic-default';
  }

  // Create a deterministic string representation of the policy
  const policyString = JSON.stringify({
    type: policy.type,
    asset: policy.asset || null,
    minAmount: policy.minAmount || null,
    includeUnconfirmed: policy.includeUnconfirmed,
    onFail: policy.onFail
  });

  // Generate SHA256 hash
  return createHash('sha256')
    .update(policyString)
    .digest('hex')
    .substring(0, 16); // Use first 16 chars for brevity
}

/**
 * Check if a member is grandfathered based on their policy hash
 * Grandfathered = their policy hash doesn't match the current policy
 */
export function isGrandfathered(memberPolicyHash: string | null, currentPolicyHash: string): boolean {
  // No hash means they joined before we started tracking = grandfathered
  if (!memberPolicyHash) {
    return true;
  }

  // Different hash means policy changed since they were verified = grandfathered
  return memberPolicyHash !== currentPolicyHash;
}