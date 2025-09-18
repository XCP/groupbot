'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { trackEvent } from 'fathom-client';

function RarePepeWalletCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get parameters from URL
  const address = searchParams.get('address') || '';
  const msg = searchParams.get('msg') || '';
  const sig = searchParams.get('sig') || '';
  const tgId = searchParams.get('tg_id') || '';
  const chatId = searchParams.get('chat_id') || '';
  const policyId = searchParams.get('policy_id') || undefined;

  useEffect(() => {
    async function verifySignature() {
      if (!address || !msg || !sig || !tgId || !chatId) {
        setError('Missing required parameters');
        setVerifying(false);
        return;
      }

      try {
        // Track Rare Pepe Wallet verification attempt
        if (process.env.NEXT_PUBLIC_FATHOM_ID) {
          trackEvent('rarepepewallet_verify_attempt');
        }

        // Use the msg parameter from RarePepeWallet which contains the exact message that was signed
        // This is the message we sent them from our auth endpoint

        // Call the verify endpoint
        const response = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tg_id: tgId,
            chat_id: chatId,
            policy_id: policyId,
            address,
            message: msg,  // Use the actual signed message from URL params
            signature: sig,
            manual: true,
            rarepepewallet: true
          })
        });

        const result = await response.json();

        if (result.ok) {
          setSuccess(true);
          // Track successful verification
          if (process.env.NEXT_PUBLIC_FATHOM_ID) {
            trackEvent('rarepepewallet_verify_success');
          }
          // Redirect to success page after a short delay
          setTimeout(() => {
            router.push(`/verify?tg_id=${tgId}&chat_id=${chatId}${policyId ? `&policy_id=${policyId}` : ''}&verified=true`);
          }, 2000);
        } else {
          setError(result.message || 'Verification failed');
          // Track failed verification
          if (process.env.NEXT_PUBLIC_FATHOM_ID) {
            trackEvent('rarepepewallet_verify_failed');
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify signature');
      } finally {
        setVerifying(false);
      }
    }

    verifySignature();
  }, [address, msg, sig, tgId, chatId, policyId, router]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-gray-50 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Signature</h2>
          <p className="text-gray-600">Please wait while we verify your Rare Pepe Wallet signature...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-gray-50 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
          <p className="text-gray-600">Redirecting you back to complete the process...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="bg-gray-50 rounded-2xl shadow-xl p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <XCircleIcon className="w-8 h-8 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">Verification Failed</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/verify?tg_id=${tgId}&chat_id=${chatId}${policyId ? `&policy_id=${policyId}` : ''}`)}
            className="px-4 py-2 bg-[#155dfc] text-white rounded-lg hover:bg-[#0d4fd4] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function RarePepeWalletCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <RarePepeWalletCallbackContent />
    </Suspense>
  );
}