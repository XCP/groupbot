'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Disclosure, Transition } from '@headlessui/react';
import {
  ChevronDownIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import Footer from '@/src/components/Footer';
import { trackEvent } from 'fathom-client';

interface FAQ {
  question: string;
  answer: string;
  hasImages?: boolean;
}

interface FAQSection {
  title: string;
  faqs: FAQ[];
}


export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const faqSections: FAQSection[] = [
    {
      title: "Getting Started",
      faqs: [
        {
          question: "What is XCP Group Bot?",
          answer: "XCP Group Bot is a Telegram bot that allows you to token-gate your groups with Counterparty assets. It automatically verifies that new members hold a minimum amount of specified tokens (like XCP, PEPECASH, or any Counterparty asset) before approving them to join."
        },
        {
          question: "How do I add the bot to my group?",
          answer: "1. Click 'Add to Telegram Group' from our homepage or search for @xcpgroupbot in Telegram\n2. Add it to your group with admin permissions\n3. Make sure 'Approve new members' is enabled in your group settings\n4. Ensure Topics/Forums are disabled (bot doesn't support forum groups)\n5. The bot will send a welcome message with a status checklist",
          hasImages: true
        },
        {
          question: "What are the group requirements?",
          answer: "**Requirements depend on your group type:**\n\n**📢 Public Groups:**\n• Go to Group Info → Edit\n• Turn on \"Approve new members\"\n• Bot will automatically gate all new join requests\n\n**🔒 Private Groups:**\n• Go to Group Info → Invite Links\n• Create or edit a link\n• Enable \"Request Admin Approval\"\n• Share only these links for gated access\n\n**⚠️ Important for Private Groups:** The bot only gates users who join via invite links with \"Request Admin Approval\" enabled.\n\n**Both types also need:**\n• Bot as admin with 'Invite Users' permission\n• Topics/Forums disabled (bot cannot work in forum groups)"
        },
        {
          question: "How do I enable approval for new members?",
          answer: "The setup depends on whether your group is public or private:",
          hasImages: true
        }
      ]
    },
    {
      title: "Policies & Configuration",
      faqs: [
        {
          question: "What are the two policy types?",
          answer: "**Basic Policy (Anti-Bot Protection)**: Simply requires users to sign a message proving they control a Bitcoin/Counterparty address. No token holdings required - perfect for groups that just want to prevent spam bots while remaining open to all real users.\n\n**Token Policy (Token-Gating)**: Requires users to hold a minimum amount of a specific Counterparty asset (e.g., 0.5 XCP or 1000 PEPECASH). Great for exclusive communities based on token ownership."
        },
        {
          question: "Do I need to require tokens? Can I just use it for anti-bot protection?",
          answer: "No, you don't need to require tokens! The **Basic Policy** mode (`/setpolicy basic`) is perfect for anti-bot protection without any token requirements. Users simply sign a message to prove they're real humans with a Bitcoin wallet - no specific token holdings needed. This is great for open communities that want to stay accessible while filtering out spam bots."
        },
        {
          question: "What are the available commands?",
          answer: "**Admin Commands:**\n\n**Anti-Bot Protection (No Token Required):**\n`/setpolicy basic [kick|restrict]` - Signature verification only, no token requirement\n\n**Token-Gating Commands:**\n`/setpolicy token 0.5 XCP [kick|restrict]` - Require 0.5 XCP minimum\n`/setpolicy token 1000 PEPECASH [kick|restrict]` - Require 1000 PEPECASH\n`/setpolicy token 1 RARE [kick|restrict]` - Require 1 RARE token\n\n**Management Commands:**\n`/settings` - View current group policy\n`/recheck` - Generate report of non-compliant members\n`/enforce` - Remove/restrict non-compliant members (type: /enforce CONFIRM)\n`/testjoin` - Test the verification flow as an admin\n`/help` - Show all available commands\n\n**Examples for popular tokens:**\n`/setpolicy token 1 XCP kick` - 1 XCP minimum, remove violators\n`/setpolicy token 420000 PEPECASH restrict` - 420k PEPECASH, restrict violators\n`/setpolicy token 100000 BITCORN kick` - 100k BITCORN, remove violators"
        },
        {
          question: "Can I change requirements after setting them?",
          answer: "Yes! You can change the policy at any time using `/setpolicy`. The new requirements will apply to new members immediately. Use `/recheck` and `/enforce` to apply new requirements to existing members."
        }
      ]
    },
    {
      title: "Member Management",
      faqs: [
        {
          question: "⚠️ Can the bot enforce policies on my existing 100+ members?",
          answer: "**No, this is a fundamental limitation.** The bot can ONLY enforce policies on members who join AFTER the bot was added to your group.\n\n**Technical reason:** Telegram's Bot API doesn't allow bots to retrieve a list of existing group members. The bot can only see members when they:\n• Join the group (after bot was added)\n• Send messages\n• Interact with the group\n\n**Impact on your group:**\n• If you have 100 existing members and add the bot, those 100 members are invisible to the bot\n• Only NEW members (member #101 onwards) will go through verification\n• `/enforce` command only affects tracked members, not the original 100\n\n**Solutions:**\n1. **Start fresh** - Create a new group with the bot already added\n2. **Manual migration** - Ask existing members to leave and rejoin\n3. **Accept the limitation** - Use the bot for new members only"
        },
        {
          question: "What happens to existing members when I add the bot?",
          answer: "**Important limitation:** The bot CANNOT track or enforce policies on members who were already in your group before the bot was added.\n\n**Why?** Telegram's API doesn't provide a way to get a list of existing group members. The bot can only track:\n• New members who join after the bot was added\n• Members who interact with the group after the bot was added\n\n**What this means:**\n• Pre-existing members are completely unaffected by the bot\n• `/recheck` only reports on tracked members (those who joined after the bot)\n• `/enforce` cannot remove pre-existing members\n• Your group effectively has two classes of members: tracked (new) and untracked (pre-existing)\n\n**Workaround:** The only way to apply policies to all members is to start fresh with a new group, or have existing members leave and rejoin through the verification process."
        },
        {
          question: "Can I restrict instead of kick non-compliant members?",
          answer: "Yes! When setting your policy, you can choose the enforcement action:\n\n• **kick** (default) - Removes non-compliant members\n• **restrict** - Makes non-compliant members read-only\n\nExamples:\n`/setpolicy basic kick` - Remove non-verified users\n`/setpolicy token 1 XCP restrict` - Make users without 1 XCP read-only\n\nAutomatic 24-hour enforcement checks only apply to users after `/enforce` has been run once. Grandfathered members are protected until then."
        },
        {
          question: "What happens if someone's balance drops below the requirement?",
          answer: "The bot doesn't continuously monitor balances. Members are only checked:\n\n• When they first join\n• When an admin runs `/recheck` or `/enforce`\n• During automatic 24-hour enforcement checks (only after `/enforce` has been run once)\n\nThis prevents members from being unexpectedly removed due to temporary balance fluctuations. Grandfathered members are protected from automatic checks until `/enforce` is first used."
        },
        {
          question: "Can admins test the join flow?",
          answer: "Yes! Admins can use `/testjoin` in the group to simulate a join request and receive the verification link. This lets you test the flow without leaving and rejoining the group."
        }
      ]
    },
    {
      title: "Privacy & Security",
      faqs: [
        {
          question: "What data does the bot store about members?",
          answer: "**Stored data:**\n• Telegram user ID\n• Bitcoin address used for verification\n• Verification timestamp\n• Policy hash (tracks which requirements version they met)\n\n**Not stored:**\n• Messages or chat content\n• Personal information\n• Private keys or passwords\n\nAll data is stored securely in PostgreSQL. Members can leave the group to remove their active record."
        },
        {
          question: "Can the bot read our group messages?",
          answer: "**No.** The bot only receives:\n• Join requests (when approval is required)\n• Bot commands (starting with /)\n• Admin status changes\n\nThe bot cannot and does not read regular chat messages between members. It only processes commands specifically directed to it."
        },
        {
          question: "Is my wallet address visible to other members?",
          answer: "**No.** Wallet addresses are private and only stored in the bot's database. Other members cannot see:\n• Your Bitcoin address\n• Your token holdings\n• Your verification status\n\nOnly admins can see aggregated reports (who doesn't meet requirements) but not specific addresses or balances."
        }
      ]
    },
    {
      title: "Verification Process",
      faqs: [
        {
          question: "How does the verification process work?",
          answer: "1. User requests to join via an invite link with 'Approval Required'\n2. Bot sends them a DM with a verification link\n3. User signs a message with their Bitcoin/XCP wallet\n4. Bot verifies the signature and checks token balance (if required)\n5. If requirements are met, user is automatically approved\n\n⏰ **Join requests expire after 48 hours if not completed.**"
        },
        {
          question: "Which wallets are supported?",
          answer: "The bot supports any wallet that can sign Bitcoin messages, including:\n\n• XCP Wallet Extension (recommended)\n• Freewallet (click the green button in Other Methods)\n• Any wallet supporting Bitcoin message signing\n\nUsers can also manually sign and submit if their wallet isn't directly supported."
        },
        {
          question: "How secure is the verification process?",
          answer: "Very secure! The bot uses Bitcoin message signing for verification, which proves ownership without exposing private keys. The bot never stores private keys or has access to your funds. Verification is cryptographically secure and cannot be forged."
        }
      ]
    },
    {
      title: "Troubleshooting",
      faqs: [
        {
          question: "Why does the bot say 'signature invalid' when I try to verify?",
          answer: "**Common causes:**\n\n• **Wrong message format** - Make sure you're signing the exact message shown, including line breaks\n• **Wrong address** - Ensure you're using the same address for signing and verification\n• **Wallet compatibility** - Some wallets may use different signing methods\n\n**Solutions:**\n• Try using the manual verification option\n• Use a different wallet (XCP Wallet Extension recommended)\n• Make sure you're not adding or removing any characters from the message"
        },
        {
          question: "Does Freewallet work with the bot?",
          answer: "Yes! Freewallet is fully supported. You can click the green 'Sign with Freewallet' button in the Other Methods section to sign your message directly with Freewallet. Our improved verification system now handles various signature formats including those from Freewallet."
        },
        {
          question: "The bot approved someone who doesn't meet requirements",
          answer: "This can happen due to:\n\n• **Grandfathering** - Members who joined before policy changes are exempt until `/enforce` is run\n• **Policy recently changed** - New policy only applies to new verifications\n• **API delays** - Token balance checks might have a slight delay\n\n**Fix:** Run `/enforce` to apply current policy to all members"
        },
        {
          question: "Bot is not responding to commands",
          answer: "**Check these things:**\n\n• Bot must be an admin with 'Invite Users' permission\n• Commands must be sent in the group (not DM)\n• Make sure you're using the correct command format\n• Check if bot is online (message @xcpgroupbot directly)\n\n**If still not working:** Remove and re-add the bot to your group"
        },
        {
          question: "Why can't the bot see my tokens/balance?",
          answer: "**Possible reasons:**\n\n• **Unconfirmed transactions** - Wait for at least 1 confirmation\n• **API issues** - Counterparty API might be temporarily down\n• **Wrong address** - Make sure you're checking the correct address\n• **Token not on Counterparty** - Bot only supports Counterparty assets\n\n**Debug:** Check your balance on xchain.io to verify"
        },
        {
          question: "What address types are supported for verification?",
          answer: "**Supported:**\n• **Legacy addresses (1...)** - P2PKH\n• **Native Segwit (bc1q...)** - P2WPKH\n• **Nested Segwit (3...)** - P2SH-P2WPKH\n• **Taproot addresses (bc1p...)** - Format validation (full BIP-322 pending)\n\n**Not supported:**\n• **Multisig addresses** - Complex signing requirements\n\n**Note:** All major Bitcoin address types work with the bot."
        }
      ]
    },
    {
      title: "Advanced Topics",
      faqs: [
        {
          question: "What admin commands are available?",
          answer: "\n• `/setpolicy [basic|token] [kick|restrict]` - Configure group requirements\n• `/settings` - View current policy\n• `/recheck` - Report on member compliance\n• `/enforce` - Remove/restrict non-compliant members (requires confirmation)\n• `/testjoin` - Test the verification flow\n• `/help` - Show all commands"
        },
        {
          question: "Is the bot open source?",
          answer: "Yes! The bot is fully open source. You can view the code, contribute, or even host your own instance. Visit our GitHub repository to learn more."
        },
        {
          question: "Can I require multiple tokens (AND/OR logic)?",
          answer: "**Currently not supported.** The bot can only check for a single token requirement at a time. You cannot set conditions like '1 XCP AND 1000 PEPECASH' or '1 XCP OR 1 RARE'.\n\n**Workaround:** Create separate groups for different token requirements, or choose the most important token for your community."
        },
        {
          question: "Can I temporarily disable the bot without removing it?",
          answer: "**Not directly**, but you can:\n\n• Set policy to `basic` with no token requirements\n• Disable 'Approve new members' temporarily\n• Remove the bot's admin permissions\n\n**Note:** Existing members won't be affected, only new joins."
        },
        {
          question: "What happens if the Counterparty API is down?",
          answer: "If the API is unavailable:\n\n• **Basic verification** still works (address-only)\n• **Token checks** will fail temporarily\n• **Join requests** may be declined if token policy is active\n\n**The bot will retry** failed API calls, but extended outages may require manual approval of pending members."
        }
      ]
    }
  ];

  // Filter sections and FAQs based on search query
  const filteredSections = searchQuery.trim() === ''
    ? faqSections
    : faqSections.map(section => ({
        ...section,
        faqs: section.faqs.filter(faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.faqs.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center mb-6">
              <Link href="/">
                <img
                  src="/images/xcp-bot-faq.png"
                  alt="XCP Group Bot FAQ"
                  className="w-32 h-32 object-contain hover:opacity-80 transition-opacity cursor-pointer"
                />
              </Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Everything you need to know about XCP Group Bot
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#155dfc] focus:border-transparent outline-none"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                Found {filteredSections.reduce((acc, section) => acc + section.faqs.length, 0)} results
              </p>
            )}
          </div>

          {/* Policy Generator Button */}
          <div className="text-center mb-12">
            <a 
              href="/policy"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#155dfc] text-white font-semibold rounded-lg hover:bg-[#0d4fd4] transition-all"
            >
              <span className="text-lg">✨</span>
              Generate Policy Command
              <ArrowLeftIcon className="w-4 h-4 rotate-180" />
            </a>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-12">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No FAQs found matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              filteredSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                  {section.title}
                </h2>
                
                <div className="space-y-4">
                  {section.faqs.map((faq, index) => (
                    <Disclosure key={index}>
                      {({ open }) => (
                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden transition-all hover:border-[#155dfc] hover:shadow-lg">
                          <Disclosure.Button
                            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                            onClick={() => {
                              // Track FAQ toggle with question text
                              if (process.env.NEXT_PUBLIC_FATHOM_ID && !open) {
                                // Only track when opening, not closing
                                trackEvent(`faq_toggle_${section.title.toLowerCase().replace(/\s+/g, '_')}_q${index + 1}`);
                              }
                            }}
                          >
                            <h3 className="text-lg font-bold text-gray-900 pr-2">
                              {faq.question}
                            </h3>
                            <ChevronDownIcon
                              className={`w-5 h-5 text-[#155dfc] flex-shrink-0 transition-transform duration-200 ${
                                open ? 'rotate-180' : ''
                              }`}
                            />
                          </Disclosure.Button>
                          
                          <Transition
                            enter="transition duration-100 ease-out"
                            enterFrom="transform scale-95 opacity-0"
                            enterTo="transform scale-100 opacity-100"
                            leave="transition duration-75 ease-out"
                            leaveFrom="transform scale-100 opacity-100"
                            leaveTo="transform scale-95 opacity-0"
                          >
                            <Disclosure.Panel className="px-6 pb-5">
                              <div className="text-gray-700 leading-relaxed prose prose-gray max-w-none">
                                <ReactMarkdown
                                  components={{
                                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                    code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-[#155dfc]">{children}</code>,
                                    p: ({ children }) => <p className="mb-3">{children}</p>,
                                    ul: ({ children }) => <ul className="mb-3 ml-4">{children}</ul>,
                                    li: ({ children }) => <li className="mb-1">{children}</li>
                                  }}
                                >
                                  {faq.answer}
                                </ReactMarkdown>
                              </div>
                              {faq.hasImages && (
                                <div className="mt-6 grid md:grid-cols-2 gap-4">
                                  {faq.question === "How do I enable approval for new members?" ? (
                                    <>
                                      <div className="space-y-2">
                                        <p className="text-[#155dfc] text-sm font-medium">📢 Public Groups</p>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src="/images/public.png"
                                          alt="Public group settings"
                                          className="w-full rounded-lg border border-gray-200 shadow-xl"
                                        />
                                        <p className="text-xs text-gray-600">Go to Group Info → Edit → Enable &quot;Approve new members&quot;</p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-[#155dfc] text-sm font-medium">🔒 Private Groups</p>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src="/images/private.png"
                                          alt="Private group invite link settings"
                                          className="w-full rounded-lg border border-gray-200 shadow-xl"
                                        />
                                        <p className="text-xs text-gray-600">Go to Invite Links → Enable &quot;Request Admin Approval&quot;</p>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="space-y-2">
                                        <p className="text-[#155dfc] text-sm font-medium">Step 1: Set Permissions</p>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src="/images/screen-1.png"
                                          alt="Set bot permissions"
                                          className="w-full rounded-lg border border-white/20 shadow-xl"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-[#155dfc] text-sm font-medium">Step 2: Confirm Admin</p>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src="/images/screen-2.png"
                                          alt="Confirm admin status"
                                          className="w-full rounded-lg border border-white/20 shadow-xl"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </Disclosure.Panel>
                          </Transition>
                        </div>
                      )}
                    </Disclosure>
                  ))}
                </div>
              </div>
            )))}
          </div>

      </div>

      <Footer />
    </div>
  );
}