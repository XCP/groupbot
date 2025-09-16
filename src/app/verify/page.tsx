'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import {
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { VerifyButton } from '@/src/components/VerifyButton';
import { ManualVerification } from '@/src/components/ManualVerification';

interface GroupInfo {
  title: string;
  username?: string;
  memberCount: number;
  photoUrl?: string | null;
}

interface Policy {
  type: 'basic' | 'token';
  asset?: string;
  minAmount?: string;
  includeUnconfirmed?: boolean;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const [inTgWebView, setInTgWebView] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [, setErrorMessage] = useState<string>('');
  
  const tgId = searchParams.get('tg_id') || '';
  const chatId = searchParams.get('chat_id') || '';
  const policyId = searchParams.get('policy_id') || undefined;

  useEffect(() => {
    setInTgWebView(/Telegram/i.test(navigator.userAgent));

    // Fetch group info
    if (chatId) {
      fetch(`/api/group/${chatId}`)
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            setGroupInfo(data.group);
            setPolicy(data.policy);
            // Update page title with group name
            const groupName = data.group?.username ? `@${data.group.username}` : data.group?.title || 'Group';
            document.title = `Verify Address for ${groupName}`;
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      // Default title when no group
      document.title = 'Verify Address';
    }
  }, [chatId]);

  if (!tgId || !chatId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Transition
          appear={true}
          show={true}
          enter="transform transition duration-[500ms]"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
        >
          <div className="bg-gray-50 rounded-2xl shadow-xl p-8 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <XCircleIcon className="w-8 h-8 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900">Invalid Link</h2>
            </div>
            <p className="text-gray-600">
              This verification link is missing required parameters. 
              Please request a new link from the Telegram bot.
            </p>
          </div>
        </Transition>
      </div>
    );
  }

  if (verifyStatus === 'success') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Transition
          appear={true}
          show={true}
          enter="transform transition duration-[500ms]"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
        >
          <div className="bg-gray-50 rounded-2xl shadow-xl p-10 max-w-md text-center">
            <div className="w-20 h-20 bg-[#155dfc] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircleIcon className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Verification Successful!
            </h1>
            
            <p className="text-gray-600 mb-8">
              You&apos;ve been approved to join <span className="font-semibold">{groupInfo?.title || 'the group'}</span>.
              Return to Telegram to access the group.
            </p>

            <a
              href={
                groupInfo?.username
                  ? `https://web.telegram.org/k/#@${groupInfo.username}`
                  : `https://web.telegram.org/k/#${chatId}`
              }
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#155dfc] text-white font-medium rounded-xl hover:bg-[#0d4fd4] transition-all shadow-lg"
            >
              Open in Telegram
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>
        </Transition>
      </div>
    );
  }

  // Use the new single-line format that matches what we verify
  const message = `Verify: telegram.xcp.io | User: ${tgId} | Chat: ${chatId}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-full border border-gray-200 shadow-sm">
                <div className="w-4 h-4 bg-[#155dfc] rounded-full animate-pulse"></div>
                <p className="text-gray-600">Loading group information...</p>
              </div>
            </div>
          ) : (
            <Transition
              appear={true}
              show={!loading}
              enter="transform transition duration-[500ms]"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
            >
              <div>
                {/* Header */}
                <header className="text-center mb-10">
                  <div className="flex flex-col items-center">
                    {groupInfo?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={groupInfo.photoUrl} 
                        alt={groupInfo.title}
                        className="w-16 h-16 rounded-xl mb-4 shadow-xl"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-[#155dfc] rounded-xl mb-4 shadow-xl flex items-center justify-center">
                        <UserGroupIcon className="w-8 h-8 text-white" />
                      </div>
                    )}
                    
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {groupInfo?.title || 'Group'}
                    </h1>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {groupInfo?.memberCount && (
                        <span className="flex items-center gap-1">
                          <UserGroupIcon className="w-4 h-4" />
                          {groupInfo.memberCount.toLocaleString()} members
                        </span>
                      )}
                      {groupInfo?.username && (
                        <span className="text-[#155dfc]">
                          @{groupInfo.username}
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                {inTgWebView && (
                  <div className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-100 font-medium">
                          Open in External Browser
                        </p>
                        <p className="text-yellow-200 text-sm mt-1">
                          Wallet extensions don&apos;t work inside Telegram. 
                          Tap the menu and select &quot;Open in Browser&quot;.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">

                  <div className="text-center">
                    <p className="text-gray-700 mb-6">
                      Sign message to verify your account
                    </p>
                    
                    <VerifyButton
                      message={message}
                      tgId={tgId}
                      chatId={chatId}
                      policyId={policyId}
                      onSuccess={() => setVerifyStatus('success')}
                      onError={(msg) => {
                        setVerifyStatus('failed');
                        setErrorMessage(msg);
                      }}
                    />

                    {/* Mobile Detection Message */}
                    <div className="mt-4 md:hidden">
                      <p className="text-sm text-gray-500">
                        💻 Desktop recommended
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <ManualVerification
                      message={message}
                      tgId={tgId}
                      chatId={chatId}
                      policyId={policyId}
                      onSuccess={() => setVerifyStatus('success')}
                      onError={(msg) => {
                        setVerifyStatus('failed');
                        setErrorMessage(msg);
                      }}
                    />
                  </div>
                </div>
              </div>
            </Transition>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}