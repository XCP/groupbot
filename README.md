# XCP Group Bot

Token-gate your Telegram groups with Counterparty assets. Automatically verify that new members hold XCP, PEPECASH, or any Counterparty token before approving them to join.

## Features

- **Token-Gating**: Require minimum token holdings (e.g., 0.5 XCP, 1000 PEPECASH)
- **Anti-Bot Protection**: Basic signature verification without token requirements
- **Flexible Enforcement**: Choose to kick or restrict non-compliant members
- **Multiple Signature Formats**: Supports Legacy, SegWit, and Taproot addresses
- **Grandfathering**: Existing members exempt from new requirements until enforced
- **Auto-Verification**: 24-hour automatic compliance checks

## Quick Start

### For Group Admins

1. **Add the bot**: Search for [@xcpgroupbot](https://t.me/xcpgroupbot) in Telegram
2. **Make it admin**: Give the bot admin permissions with "Invite Users" enabled
3. **Configure requirements**:
   - **Public Groups**: Enable "Approve new members" in group settings
   - **Private Groups**: Create invite links with "Request Admin Approval" enabled
4. **Set policy**: Use `/setpolicy` to configure your requirements

### Commands

**Basic Anti-Bot (No tokens required)**
```
/setpolicy basic kick         # Remove unverified users
/setpolicy basic restrict      # Make unverified users read-only
```

**Token-Gating**
```
/setpolicy token 0.5 XCP kick          # Require 0.5 XCP
/setpolicy token 1000 PEPECASH restrict # Require 1000 PEPECASH
```

**Management**
```
/settings   # View current policy
/recheck    # Report on member compliance
/enforce    # Apply policy to existing members (requires CONFIRM)
/testjoin   # Test the verification flow
```

## How It Works

1. **User requests to join** your Telegram group
2. **Bot intercepts** the join request
3. **User verifies** their address by signing a message
4. **Bot checks** token balance via Counterparty API
5. **Auto-approves** if requirements are met, otherwise declines

## Verification Methods

- **XCP Wallet Extension** (Recommended) - One-click verification
- **Freewallet** - Desktop app with direct signing support
- **Manual** - Sign with any Bitcoin wallet and paste signature

## Requirements

### Group Setup
- Bot must be admin with "Invite Users" permission
- Topics/Forums must be disabled (not supported)
- Approval for new members must be enabled

### Technical Requirements
- Node.js 18+
- PostgreSQL database
- Telegram Bot Token
- Counterparty API access (default: https://api.counterparty.io:4000)

## Self-Hosting

### Environment Variables
```bash
TELEGRAM_BOT_TOKEN=your_bot_token
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=random_secret
XCP_API_BASE=https://api.counterparty.io:4000  # Optional, has default
```

### Setup
```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate deploy

# Run the bot
npm run bot

# Run the web app (separate process)
npm run dev
```

### Bot Setup
```bash
# Register bot commands
node scripts/setup-bot.js

# Setup webhook (for production)
node scripts/setup-webhook.js
```

## Supported Address Types

- **Legacy (1...)** - P2PKH addresses
- **Native SegWit (bc1q...)** - P2WPKH addresses
- **Nested SegWit (3...)** - P2SH-P2WPKH addresses
- **Taproot (bc1p...)** - P2TR addresses with BIP-322 signatures

## API Endpoints

- `POST /api/verify` - Verify signature and check token balance
- `GET /api/group/:chatId` - Get group info and policy

## Security

- Signatures are verified using BIP-137 and BIP-322 standards
- No private keys are ever transmitted or stored
- Token balances checked via public Counterparty API
