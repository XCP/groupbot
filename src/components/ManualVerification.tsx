'use client';

import { useState } from 'react';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { trackEvent } from 'fathom-client';

interface ManualVerificationProps {
  message: string;
  tgId: string;
  chatId: string;
  policyId?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function ManualVerification({
  message,
  tgId,
  chatId,
  policyId,
  onSuccess,
  onError
}: ManualVerificationProps) {
  const [address, setAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [messageCopied, setMessageCopied] = useState(false);

  const copyMessage = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed:', err);
          throw err;
        } finally {
          textArea.remove();
        }
      }

      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Could show an error message to the user here
    }
  };

  async function handleSubmit() {
    // Track manual submit click
    if (process.env.NEXT_PUBLIC_FATHOM_ID) {
      trackEvent('verify_manual_submit');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          tg_id: tgId, 
          chat_id: chatId, 
          policy_id: policyId, 
          address, 
          message, 
          signature, 
          manual: true 
        })
      });

      const result = await response.json();

      console.log('Manual verification response:', result);

      if (result.ok) {
        // Check if there's a warning about expired join request
        if (result.warning) {
          setWarning(result.warning);
        }
        setSuccess(true);
        onSuccess?.();
      } else {
        // Show custom message if available, otherwise generic error
        let errorMsg = result.message || `Verification failed: ${result.reason}`;

        // If we have details about message mismatch, show them
        if (result.details && result.reason === 'invalid_message') {
          errorMsg = `Message mismatch. Expected: "${result.details.expected}"`;
        }

        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      console.error('Manual verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  const handleToggleOtherMethods = () => {
    // Track toggle click
    if (process.env.NEXT_PUBLIC_FATHOM_ID) {
      trackEvent('toggle_other_methods');
    }
  };

  return (
    <details className="w-full max-w-2xl" onToggle={handleToggleOtherMethods}>
      <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium transition-colors py-2">
        Other Methods
      </summary>

      <div className="mt-4 space-y-4">
        {/* Freewallet Button - styled like XCP Wallet button but green */}
        <div className="flex justify-center">
          <a
            href={`counterparty:?action=sign&message=${encodeURIComponent(message)}`}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-all shadow-lg"
          onClick={() => {
            if (process.env.NEXT_PUBLIC_FATHOM_ID) {
              trackEvent('freewallet_sign_click');
            }
          }}
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Sign with Freewallet
          </a>
        </div>

        {/* Rare Pepe Wallet Button - styled similarly */}
        <div className="flex justify-center">
          <a
            href={`https://rarepepewallet.wtf/connect?apiUrl=${encodeURIComponent(`${window.location.origin}/api/rarepepewallet/auth?tg_id=${tgId}&chat_id=${chatId}`)}&siteUrl=${encodeURIComponent(`${window.location.origin}/verify/rarepepewallet-callback?tg_id=${tgId}&chat_id=${chatId}${policyId ? `&policy_id=${policyId}` : ''}`)}`}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-lg"
            onClick={() => {
              if (process.env.NEXT_PUBLIC_FATHOM_ID) {
                trackEvent('rarepepewallet_sign_click');
              }
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Connect with Rare Pepe Wallet
          </a>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or manually</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to sign:
          </label>
          <div 
            onClick={copyMessage}
            className={`p-4 bg-gray-100 rounded-lg cursor-pointer transition-all border-2 ${
              messageCopied 
                ? 'border-[#155dfc] bg-[#155dfc]/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <pre className="text-sm text-gray-700 text-left font-mono whitespace-pre-wrap break-all">
              {message}
            </pre>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {messageCopied ? '✓ Copied to clipboard!' : 'Click to copy message'}
              </p>
              {messageCopied ? (
                <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Bitcoin/Counterparty address:
          </label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="bc1q..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            disabled={loading || success}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your signature:
          </label>
          <textarea
            value={signature}
            onChange={e => setSignature(e.target.value)}
            placeholder="Paste your signature here..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            disabled={loading || success}
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading || !address || !signature || success}
          className="w-full px-6 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Verifying...' : success ? 'Verified!' : 'Submit'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && !warning && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Verification successful! Redirecting...
          </div>
        )}

        {success && warning && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            <strong>Verification successful!</strong><br/>
            {warning}
          </div>
        )}
      </div>
    </details>
  );
}