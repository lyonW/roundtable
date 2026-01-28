# Roundtable Advisors

A multi-LLM advisory council that lets you consult with Claude, GPT, Gemini, Grok, and DeepSeek simultaneously. Each AI brings a distinct perspective to your strategic questions.

![Roundtable](https://img.shields.io/badge/AI-Advisory_Council-gold)

## Features

- **5 AI Advisors** with distinct personas:
  - **Claude** (Anthropic) - Nuanced strategist, sees blind spots
  - **GPT** (OpenAI) - Pragmatic executor, framework builder
  - **Gemini** (Google) - Deep researcher, pattern finder
  - **Grok** (xAI) - Contrarian, assumption challenger
  - **DeepSeek** - Deep reasoner, edge case hunter

- **Parallel responses** - All advisors respond simultaneously
- **Conversation context** - Each advisor sees the full discussion history
- **Toggle advisors** - Enable/disable any advisor on the fly
- **Elegant dark UI** - Designed for focused strategic thinking

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd roundtable
npm install
```

### 2. Configure API Keys

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then add your API keys to `.env.local`:

| Provider | Key Variable | Get Your Key |
|----------|-------------|--------------|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI (GPT) | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) |
| Google (Gemini) | `GOOGLE_API_KEY` | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| xAI (Grok) | `XAI_API_KEY` | [console.x.ai](https://console.x.ai/) |
| DeepSeek | `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com/) |

**Note:** You only need to configure the APIs you want to use. Advisors with missing keys will show an error when called.

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option A: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

### Option B: Manual Deploy

1. Push this repo to GitHub

2. Go to [vercel.com/new](https://vercel.com/new)

3. Import your repository

4. **Add Environment Variables** in the Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add each API key:
     - `ANTHROPIC_API_KEY`
     - `OPENAI_API_KEY`
     - `GOOGLE_API_KEY`
     - `XAI_API_KEY`
     - `DEEPSEEK_API_KEY`

5. Deploy!

### Option C: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follow prompts to add env vars)
vercel

# Or deploy to production
vercel --prod
```

When prompted, add your environment variables or set them later in the Vercel dashboard.

## Customization

### Modify Advisor Personas

Edit the `DEFAULT_ADVISORS` array in `app/page.tsx`:

```typescript
{
  id: "claude",
  name: "Claude",
  model: "claude-sonnet-4-20250514",
  persona: "Your custom persona instructions here...",
  shortPersona: "Brief description for UI",
  enabled: true,
}
```

### Add New Advisors

1. Add a new entry to `DEFAULT_ADVISORS` in `app/page.tsx`
2. Add a new API handler function in `app/api/chat/route.ts`
3. Add the corresponding CSS class in `app/globals.css`
4. Add the environment variable

### Change Models

Update the `model` field in `DEFAULT_ADVISORS` and ensure your API handler uses the correct model string.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌─────────────────────────────────────────────┐    │
│  │           Roundtable Chat UI                │    │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │    │
│  │  │Claude│ │ GPT │ │Gemini│ │Grok │ │Deep │   │    │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              API Route (/api/chat)                   │
│         Parallel requests to all providers           │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────┬───────┼───────┬────────┐
        ▼        ▼       ▼       ▼        ▼
    ┌───────┐ ┌─────┐ ┌──────┐ ┌────┐ ┌────────┐
    │Anthropic│ │OpenAI│ │Google│ │xAI │ │DeepSeek│
    └───────┘ └─────┘ └──────┘ └────┘ └────────┘
```

## Cost Considerations

Each query goes to multiple APIs, so costs multiply. Typical per-query costs (at ~1K tokens response each):

| Provider | Model | ~Cost/Query |
|----------|-------|-------------|
| Anthropic | Claude Sonnet | $0.01 |
| OpenAI | GPT-4o | $0.01 |
| Google | Gemini 1.5 Pro | $0.003 |
| xAI | Grok 2 | $0.01 |
| DeepSeek | DeepSeek Chat | $0.001 |

**Total ~$0.03-0.04 per roundtable query** (all 5 advisors)

## License

MIT
