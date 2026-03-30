# LaLista Agent

Local Python agent for automated grocery shopping via browser automation.

**This agent runs locally only — it is NOT deployed to Vercel.**

## Setup

```bash
cd agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install
```

## Run

```bash
python agent.py
```

## Dependencies

- **playwright** — browser automation for interacting with grocery store websites
- **supabase** — read shopping lists and write order results to Supabase
- **pyobjc** — macOS native integration (notifications, keychain)
