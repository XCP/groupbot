'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import Footer from '@/src/components/Footer';

export default function PolicyPage() {
  const [policyType, setPolicyType] = useState<'basic' | 'token'>('basic');
  const [tokenSymbol, setTokenSymbol] = useState('XCP');
  const [tokenAmount, setTokenAmount] = useState('1');
  const [enforcementAction, setEnforcementAction] = useState<'kick' | 'restrict'>('restrict');
  const [copied, setCopied] = useState(false);


  const command = policyType === 'basic' 
    ? `/setpolicy basic ${enforcementAction}`
    : `/setpolicy token ${tokenAmount} ${tokenSymbol} ${enforcementAction}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <Link href="/">
              <img 
                src="/images/xcp-bot.png" 
                alt="Policy Generator"
                className="w-32 h-32 object-contain mx-auto hover:opacity-80 transition-opacity cursor-pointer"
              />
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Policy Command Generator
          </h1>
          <p className="text-xl text-gray-600">
            Configure your group&apos;s requirements and get the command to copy
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-50 rounded-2xl shadow-lg border border-gray-200 p-8">
          {/* Generated Command - Moved to Top */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Your Command
            </label>
            <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm relative group">
              <div className="pr-12 break-all">{command}</div>
              <button
                onClick={copyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-2">Copied to clipboard!</p>
            )}
          </div>

          {/* Policy Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Policy Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPolicyType('basic')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  policyType === 'basic'
                    ? 'border-[#155dfc] bg-[#155dfc]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">Basic Policy</div>
                <div className="text-sm text-gray-600">
                  Anti-bot protection with signature verification only
                </div>
              </button>
              
              <button
                onClick={() => setPolicyType('token')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  policyType === 'token'
                    ? 'border-[#155dfc] bg-[#155dfc]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">Token Policy</div>
                <div className="text-sm text-gray-600">
                  Require minimum token holdings
                </div>
              </button>
            </div>
          </div>

          {/* Enforcement Action Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Enforcement Action
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setEnforcementAction('kick')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  enforcementAction === 'kick'
                    ? 'border-[#E72A5D] bg-[#E72A5D]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">Remove (kick)</div>
                <div className="text-sm text-gray-600">
                  Non-compliant members are removed from the group
                </div>
              </button>
              
              <button
                onClick={() => setEnforcementAction('restrict')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  enforcementAction === 'restrict'
                    ? 'border-[#E72A5D] bg-[#E72A5D]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">Restrict (read-only)</div>
                <div className="text-sm text-gray-600">
                  Non-compliant members can only read messages
                </div>
              </button>
            </div>
          </div>

          {/* Token Configuration */}
          {policyType === 'token' && (
            <>
              <div className="mb-6">
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Token Name
                </label>
                <input
                  type="text"
                  id="token"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                  placeholder="e.g., XCP, PEPECASH, RARE"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Amount Required
                </label>
                <input
                  type="text"
                  id="amount"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#155dfc] focus:border-transparent"
                  placeholder="e.g., 1, 1000, 0.5"
                />
              </div>
            </>
          )}
        </div>

        {/* Important Warning Box */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mt-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Important: Existing Members Not Affected</h3>
              <p className="text-gray-700 text-sm mb-3">
                The bot <strong>CANNOT</strong> enforce policies on members who are already in your group. Due to Telegram API limitations, the bot can only track and verify members who join AFTER the bot is added.
              </p>
              <p className="text-gray-600 text-sm">
                <strong>Example:</strong> If you have 100 existing members, they will remain untracked and unaffected. Only member #101 onwards will go through verification.
              </p>
              <div className="mt-3 pt-3 border-t border-yellow-300">
                <p className="text-sm font-medium text-gray-700">Options:</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• Start with a new group (recommended)</li>
                  <li>• Ask existing members to leave and rejoin</li>
                  <li>• Accept that only new members will be verified</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <a 
            href="/faq"
            className="text-[#155dfc] hover:text-[#0d4fd4] font-medium"
          >
            View all commands and FAQ →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}