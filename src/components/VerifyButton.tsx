'use client';

import { useState, useEffect } from 'react';
import { PencilSquareIcon, CheckBadgeIcon, WalletIcon } from '@heroicons/react/24/outline';
import { trackEvent } from 'fathom-client';

interface VerifyButtonProps {
  message: string;
  tgId: string;
  chatId: string;
  policyId?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

declare global {
  interface Window {
    xcpwallet?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      enable?: () => Promise<string[]>;
      isConnected: () => boolean;
      on?: (event: string, handler: (data: unknown) => void) => void;
      removeListener?: (event: string, handler: (data: unknown) => void) => void;
    };
  }
}

export function VerifyButton({ message, tgId, chatId, policyId, onSuccess, onError }: VerifyButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is already connected on mount and listen for events
  useEffect(() => {
    async function checkConnection() {
      // Wait for provider to be injected
      if (!window.xcpwallet) {
        // Listen for provider initialization
        const handleProviderInit = () => {
          checkConnection(); // Retry when provider is ready
        };
        window.addEventListener('xcp-wallet#initialized', handleProviderInit);
        return () => window.removeEventListener('xcp-wallet#initialized', handleProviderInit);
      }

      // Check if connected using isConnected method
      if (window.xcpwallet.isConnected && window.xcpwallet.isConnected()) {
        try {
          const accounts = await window.xcpwallet.request({
            method: 'xcp_accounts',
            params: []
          }) as string[];

          if (accounts && Array.isArray(accounts) && accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
          }
        } catch {
          // Not connected, that's fine
        }
      }
    }

    checkConnection();

    // Listen for account changes
    const handleAccountsChanged = (accounts: unknown) => {
      if (Array.isArray(accounts)) {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setAddress(null);
          setIsConnected(false);
        }
      }
    };

    // Listen for disconnect
    const handleDisconnect = () => {
      setAddress(null);
      setIsConnected(false);
    };

    if (window.xcpwallet?.on) {
      window.xcpwallet.on('accountsChanged', handleAccountsChanged);
      window.xcpwallet.on('disconnect', handleDisconnect);
    }

    return () => {
      if (window.xcpwallet?.removeListener) {
        window.xcpwallet.removeListener('accountsChanged', handleAccountsChanged);
        window.xcpwallet.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  async function handleConnect() {
    // Track connect click
    if (process.env.NEXT_PUBLIC_FATHOM_ID) {
      trackEvent('connect_wallet_click');
    }

    setConnecting(true);
    setError(null);

    try {
      if (!window.xcpwallet?.request) {
        setError('Please install the XCP Wallet extension from https://github.com/XCP/extension');
        return;
      }

      // Request accounts connection
      const accounts = await window.xcpwallet.request({
        method: 'xcp_requestAccounts',
        params: []
      }) as string[];

      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        setError('No accounts available. Please unlock your wallet.');
        return;
      }

      setAddress(accounts[0]);
      setIsConnected(true);
    } catch (err) {
      console.error('Connection error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';

      // Handle specific error messages from XCP Wallet
      if (errorMsg.includes('WALLET_NOT_SETUP')) {
        setError('Please complete wallet setup first. Open the XCP Wallet extension to get started.');
      } else if (errorMsg.includes('WALLET_LOCKED')) {
        setError('Please unlock your wallet first. Click the XCP Wallet extension icon to unlock.');
      } else if (errorMsg.includes('NO_ACTIVE_ADDRESS')) {
        setError('No address selected. Please select an address in the wallet.');
      } else if (errorMsg.includes('User denied') || errorMsg.includes('User rejected')) {
        setError('Connection request was rejected.');
      } else if (errorMsg.includes('Extension services not available')) {
        setError('Extension services not available. Please try reloading the extension.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleVerify() {
    // Track verify click
    if (process.env.NEXT_PUBLIC_FATHOM_ID) {
      trackEvent('verify_signature_click');
    }

    if (!address) {
      setError('No wallet connected');
      return;
    }

    if (!window.xcpwallet?.request) {
      setError('XCP Wallet not available');
      return;
    }

    setSigning(true);
    setError(null);

    try {
      // Sign the message using XCP Wallet
      // Note: xcp_signMessage expects [message, address] as params
      const signature = await window.xcpwallet.request({
        method: 'xcp_signMessage',
        params: [message, address]
      }) as string;

      if (!signature) {
        throw new Error('No signature received');
      }

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
          manual: false
        })
      });

      const result = await response.json();

      if (result.ok) {
        onSuccess?.();
      } else {
        const errorMsg = result.reason || 'Verification failed';
        setError(`Verification failed: ${errorMsg}`);
        onError?.(errorMsg);
      }
    } catch (err) {
      console.error('Verification error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Verification failed';

      // Handle specific error messages
      if (errorMsg.includes('User denied') || errorMsg.includes('User rejected')) {
        setError('Signature request was rejected.');
      } else if (errorMsg.includes('Unauthorized')) {
        setError('Not connected to wallet. Please reconnect.');
        setIsConnected(false);
        setAddress(null);
      } else {
        setError(errorMsg);
      }

      onError?.(errorMsg);
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#155dfc] text-white text-lg font-semibold rounded-xl hover:bg-[#0d4fd4] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {connecting ? (
            <>
              <WalletIcon className="w-6 h-6 animate-pulse" />
              Connecting...
            </>
          ) : (
            <>
              <WalletIcon className="w-6 h-6" />
              Connect XCP Wallet
            </>
          )}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm text-gray-600">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <button
            onClick={handleVerify}
            disabled={signing}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {signing ? (
              <>
                <CheckBadgeIcon className="w-6 h-6 animate-pulse" />
                Signing...
              </>
            ) : (
              <>
                <PencilSquareIcon className="w-6 h-6" />
                Sign & Verify
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}