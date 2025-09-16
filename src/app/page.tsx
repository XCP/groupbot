'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Transition } from '@headlessui/react';
import { 
  ShieldCheckIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Footer from '@/src/components/Footer';

export default function HomePage() {
  const [isShowing] = useState(true);

  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Token-Gated Access',
      description: 'Require specific Counterparty token holdings for group membership'
    },
    {
      icon: LockClosedIcon,
      title: 'Wallet-Gated Access',
      description: 'Instead of requiring a specific token, just require signing a message'
    },
    {
      icon: UserGroupIcon,
      title: 'Automatic Management',
      description: 'Bot handles join requests and verifies balances automatically'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Multiple Assets',
      description: 'Support for XCP, PEPECASH, and any Counterparty asset'
    }
  ];

  const steps = [
    'Add @xcpgroupbot to your group',
    'Configure requirements with /setpolicy',
    'Bot verifies and approves members'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
          <Transition
            show={isShowing}
            enter="transform transition duration-[1000ms]"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
          >
            <div className="text-center max-w-4xl mx-auto">
              {/* Logo */}
              <div className="mb-8 inline-flex items-center justify-center">
                <img 
                  src="/images/xcp-bot-logo.png" 
                  alt="XCP Group Bot"
                  className="w-32 h-32 object-contain"
                />
              </div>

              {/* Title */}
              <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                XCP Group Bot
              </h1>
              
              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
                Token-gate your Telegram groups with Counterparty assets. 
                Secure, automated, and easy to manage.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <a
                  href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'xcpgroupbot'}?startgroup=true&admin=can_invite_users`}
                  className="group px-8 py-4 bg-[#155dfc] text-white font-semibold rounded-xl hover:bg-[#0d4fd4] transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-2"
                >
                  Add to Telegram Group
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                
                <Link 
                  href="/faq"
                  className="px-8 py-4 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-all border border-gray-200 text-center flex items-center justify-center gap-2"
                >
                  <InformationCircleIcon className="w-5 h-5" />
                  FAQ
                </Link>
              </div>
            </div>
          </Transition>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-20">
            {features.map((feature, index) => (
              <Transition
                key={index}
                show={isShowing}
                enter={`transform transition duration-[1000ms] delay-[${index * 100}ms]`}
                enterFrom="opacity-0 translate-y-4"
                enterTo="opacity-100 translate-y-0"
              >
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-[#155dfc] hover:shadow-lg transition-all">
                  <feature.icon className="w-10 h-10 text-[#155dfc] mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </Transition>
            ))}
          </div>

          {/* How it Works */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <Transition
                  key={index}
                  show={isShowing}
                  enter={`transform transition duration-[1000ms] delay-[${600 + index * 100}ms]`}
                  enterFrom="opacity-0 translate-x-4"
                  enterTo="opacity-100 translate-x-0"
                >
                  <div className="flex items-center gap-4 bg-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#155dfc] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <p className="text-gray-700 font-medium flex-1">
                      {step.includes('@xcpgroupbot') ? (
                        <>
                          Add{' '}
                          <a
                            href="https://t.me/xcpgroupbot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#155dfc] hover:text-[#0d4fd4] font-semibold underline"
                          >
                            @xcpgroupbot
                          </a>
                          {' '}to your group
                        </>
                      ) : step.includes('/setpolicy') ? (
                        <>
                          Configure requirements with{' '}
                          <Link
                            href="/policy"
                            className="text-[#155dfc] hover:text-[#0d4fd4] font-semibold underline"
                          >
                            /setpolicy
                          </Link>
                        </>
                      ) : (
                        step
                      )}
                    </p>
                  </div>
                </Transition>
              ))}
            </div>
          </div>

          {/* Bot Commands */}
          <div className="max-w-4xl mx-auto mt-20">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Bot Commands</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { command: '/setpolicy', description: 'Configure group requirements (basic or token-based)' },
                { command: '/settings', description: 'View current group policy and configuration' },
                { command: '/recheck', description: 'Generate report of non-compliant members' },
                { command: '/enforce', description: 'Remove or restrict non-compliant members' },
                { command: '/testjoin', description: 'Test the verification flow as an admin' },
                { command: '/help', description: 'Show all available commands and usage' }
              ].map((cmd, index) => (
                <div key={index} className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                  <div className="font-mono text-[#155dfc] font-semibold mb-2">{cmd.command}</div>
                  <div className="text-gray-700 text-sm">{cmd.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-20">
            <p className="text-gray-600 mb-6">Ready to secure your Telegram group?</p>
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'xcpgroupbot'}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#155dfc] text-white font-semibold rounded-lg hover:bg-[#0d4fd4] transition-all"
            >
              <CheckCircleIcon className="w-5 h-5" />
              Start with @xcpgroupbot
            </a>
          </div>
      </div>

      <Footer />

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}