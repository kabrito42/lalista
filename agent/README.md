# LaLista Agent

Local Python agent for automated grocery shopping via Coles browser automation.

**This agent runs locally only — it is NOT deployed to Vercel.**

## How it works

1. Agent polls Supabase for sessions with `status=finalised` and `coles_dispatched=false`
2. When found, it reads the `final_list` JSONB from the session
3. Opens a Chrome browser via Playwright and waits for manual Coles login
4. Searches for each item and adds it to your Coles cart
5. Writes real-time progress logs to the `automation_logs` table (streamed to the frontend)
6. Marks the session as `coles_dispatched=true` when complete

## Setup

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

- `SUPABASE_URL` — your hosted Supabase project URL
- `SUPABASE_SERVICE_KEY` — service role key (from Supabase dashboard → Settings → API)
- `HOUSEHOLD_ID` — your household UUID (from the profiles table)

## Run

```bash
python agent.py              # Normal mode (reuses saved session)
python agent.py --relogin    # Force fresh Coles login
```

The agent will:
1. Poll every 10 seconds for dispatch-ready sessions
2. Open a Chrome window for manual Coles login (first run or expired session)
3. Automate cart additions, logging progress to Supabase in real-time
4. Keep the browser open for 10 minutes after completion for manual review

## Dependencies

- **playwright** — browser automation (uses real Chrome, not Chromium, to bypass Coles bot detection)
- **playwright-stealth** — stealth mode to avoid automation detection
- **supabase** — read sessions, write automation logs
- **pyobjc** — macOS native integration (notifications)
- **python-dotenv** — load .env configuration

## Session cookies

After first login, cookies are saved to `coles_session.json` (gitignored). Future runs reuse these cookies to skip login. Use `--relogin` to force a fresh login if the session expires.
