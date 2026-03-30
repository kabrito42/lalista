"""LaLista local agent — Coles cart automation via Playwright.

Listens for session status changes via Supabase realtime.
When a session moves to 'finalised' with coles_dispatched=False,
it reads the final_list and adds items to the Coles cart.

Usage:
    python agent.py              # Normal mode (interactive login)
    python agent.py --relogin    # Force fresh Coles login
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HOUSEHOLD_ID = os.environ["HOUSEHOLD_ID"]

COLES_SEARCH_URL = "https://www.coles.com.au/search/products?q="
COOKIES_FILE = Path(__file__).parent / "coles_session.json"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def log(session_id: str, message: str, log_type: str = "info") -> None:
    """Write a log entry to automation_logs and print to stdout."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{log_type.upper()}] {message}")
    try:
        supabase.table("automation_logs").insert(
            {
                "session_id": session_id,
                "message": message,
                "log_type": log_type,
            }
        ).execute()
    except Exception as e:
        print(f"  (failed to write log to Supabase: {e})")


async def wait_for_login(page) -> bool:
    """Poll for Coles login by checking for the bought-before link."""
    print("Waiting for manual Coles login (up to 5 minutes)...")
    print("Please log in to your Coles account in the browser window.")
    for _ in range(60):
        await asyncio.sleep(5)
        logged_in = await page.evaluate(
            "(function(){ return document.querySelector('a[href*=\"bought-before\"]') !== null; })()"
        )
        if logged_in:
            print("Login detected!")
            return True
    return False


async def save_cookies(context) -> None:
    """Save browser cookies for session reuse."""
    cookies = await context.cookies()
    COOKIES_FILE.write_text(json.dumps(cookies, indent=2))
    print(f"Session cookies saved to {COOKIES_FILE}")


async def load_cookies(context) -> bool:
    """Load saved cookies if available."""
    if not COOKIES_FILE.exists():
        return False
    try:
        cookies = json.loads(COOKIES_FILE.read_text())
        await context.add_cookies(cookies)
        print("Loaded saved session cookies")
        return True
    except Exception:
        return False


async def add_item_to_cart(page, search_term: str, quantity: int, session_id: str) -> bool:
    """Search for an item on Coles and add it to cart."""
    url = COLES_SEARCH_URL + search_term.replace(" ", "%20")
    try:
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_selector('[data-testid="product-tile"]', timeout=8000)

        # Click add to cart
        add_btn = page.locator('[data-testid="add-to-cart-button"]').first
        await add_btn.scroll_into_view_if_needed()
        await add_btn.click()
        await page.wait_for_timeout(800)

        # Increase quantity if needed
        for _ in range(quantity - 1):
            try:
                inc_btn = page.locator('[data-testid="increase-quantity-button"]').first
                await inc_btn.click()
                await page.wait_for_timeout(500)
            except Exception:
                break

        log(session_id, f"Added: {search_term} x{quantity}", "success")
        return True

    except Exception as e:
        log(session_id, f"Failed: {search_term} — {e}", "error")
        return False


async def dispatch_session(session_id: str, final_list: list, force_relogin: bool = False) -> None:
    """Run the Coles cart automation for a session's final list."""
    from playwright.async_api import async_playwright

    log(session_id, f"Starting Coles dispatch — {len(final_list)} items")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            slow_mo=500,
            channel="chrome",
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-AU",
            timezone_id="Australia/Sydney",
            viewport={"width": 1440, "height": 900},
        )

        # Try stealth mode
        try:
            from playwright_stealth import stealth_async

            page = await context.new_page()
            await stealth_async(page)
        except ImportError:
            page = await context.new_page()

        # Login flow
        has_cookies = False
        if not force_relogin:
            has_cookies = await load_cookies(context)

        await page.goto("https://www.coles.com.au", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Check if already logged in
        logged_in = await page.evaluate(
            "(function(){ return document.querySelector('a[href*=\"bought-before\"]') !== null; })()"
        )

        if not logged_in:
            if has_cookies:
                log(session_id, "Saved session expired — manual login required", "warning")
            log(session_id, "Waiting for manual Coles login...")
            logged_in = await wait_for_login(page)
            if not logged_in:
                log(session_id, "Login timeout — aborting", "error")
                await browser.close()
                return
            await save_cookies(context)

        log(session_id, "Logged in to Coles — starting cart automation")

        # Add items
        added = 0
        failed = 0
        for i, item in enumerate(final_list, 1):
            name = item.get("name", "")
            coles_product = item.get("coles_product")
            search_term = coles_product or name
            qty = int(item.get("quantity", 1))

            log(session_id, f"[{i}/{len(final_list)}] Searching: {search_term}")
            if await add_item_to_cart(page, search_term, qty, session_id):
                added += 1
            else:
                failed += 1

            await page.wait_for_timeout(800)

        # Report results
        log(session_id, f"Dispatch complete: {added} added, {failed} failed", "success")

        # Mark session as dispatched
        supabase.table("weekly_sessions").update({"coles_dispatched": True}).eq(
            "id", session_id
        ).execute()

        log(session_id, "Browser will stay open for 10 minutes for manual review")
        await asyncio.sleep(600)
        await browser.close()


async def poll_for_dispatch(force_relogin: bool = False) -> None:
    """Poll Supabase for sessions ready to dispatch."""
    print(f"LaLista Agent started — monitoring household {HOUSEHOLD_ID}")
    print("Polling for dispatch-ready sessions every 10 seconds...")
    print("Press Ctrl+C to stop.\n")

    while True:
        try:
            result = (
                supabase.table("weekly_sessions")
                .select("id, final_list, status")
                .eq("household_id", HOUSEHOLD_ID)
                .eq("status", "finalised")
                .eq("coles_dispatched", False)
                .execute()
            )

            for session in result.data:
                final_list = session.get("final_list") or []
                if not final_list:
                    log(session["id"], "Session has no final list — skipping", "warning")
                    continue

                await dispatch_session(session["id"], final_list, force_relogin)

        except Exception as e:
            print(f"Poll error: {e}")

        await asyncio.sleep(10)


def main() -> None:
    force_relogin = "--relogin" in sys.argv
    try:
        asyncio.run(poll_for_dispatch(force_relogin))
    except KeyboardInterrupt:
        print("\nAgent stopped.")


if __name__ == "__main__":
    main()
