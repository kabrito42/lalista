"""Migrate data from weeklyshop v1 (SQLite) to LaLista v2 (Supabase).

Migrates: categories, pantry_items, longlist_items (other_items),
recipes, recipe_ingredients, coles_preferences.

Usage:
    python migrate_from_weeklyshop.py

Requires .env with SUPABASE_URL, SUPABASE_SERVICE_KEY, HOUSEHOLD_ID.
"""

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HOUSEHOLD_ID = os.environ["HOUSEHOLD_ID"]

WEEKLYSHOP_DB = Path.home() / "Development" / "weeklyshop" / "coles_shopper.db"

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def connect_sqlite():
    conn = sqlite3.connect(str(WEEKLYSHOP_DB))
    conn.row_factory = dict_factory
    return conn


def migrate_categories(conn):
    print("\n--- Categories ---")
    rows = conn.execute("SELECT name, sort_order FROM categories ORDER BY sort_order").fetchall()
    print(f"  Found {len(rows)} categories in weeklyshop")

    # Clear existing (except seed defaults)
    sb.table("categories").delete().eq("household_id", HOUSEHOLD_ID).execute()

    for row in rows:
        sb.table("categories").insert({
            "household_id": HOUSEHOLD_ID,
            "name": row["name"],
            "sort_order": row["sort_order"],
            "is_default": True,
        }).execute()
        print(f"  + {row['name']}")

    print(f"  Migrated {len(rows)} categories")
    return {row["name"]: get_category_id(row["name"]) for row in rows}


def get_category_id(name):
    result = sb.table("categories").select("id").eq("household_id", HOUSEHOLD_ID).eq("name", name).single().execute()
    return result.data["id"]


def migrate_pantry(conn):
    print("\n--- Pantry Items ---")
    rows = conn.execute("SELECT name, notes FROM pantry_items ORDER BY name").fetchall()
    print(f"  Found {len(rows)} pantry items in weeklyshop")

    sb.table("pantry_items").delete().eq("household_id", HOUSEHOLD_ID).execute()

    for row in rows:
        sb.table("pantry_items").insert({
            "household_id": HOUSEHOLD_ID,
            "name": row["name"],
            "notes": row.get("notes"),
        }).execute()

    print(f"  Migrated {len(rows)} pantry items")


def migrate_longlist(conn, category_map):
    print("\n--- Longlist Items (other_items) ---")
    rows = conn.execute("""
        SELECT oi.name, oi.default_quantity, oi.unit, oi.is_staple, oi.notes,
               c.name as category_name
        FROM other_items oi
        LEFT JOIN categories c ON oi.category_id = c.id
        ORDER BY oi.name
    """).fetchall()
    print(f"  Found {len(rows)} longlist items in weeklyshop")

    sb.table("longlist_items").delete().eq("household_id", HOUSEHOLD_ID).execute()

    for row in rows:
        cat_id = category_map.get(row["category_name"]) if row["category_name"] else None
        sb.table("longlist_items").insert({
            "household_id": HOUSEHOLD_ID,
            "name": row["name"],
            "category_id": cat_id,
            "default_qty": row["default_quantity"] or 1,
            "unit": row["unit"],
            "is_staple": bool(row["is_staple"]),
            "notes": row.get("notes"),
        }).execute()

    print(f"  Migrated {len(rows)} longlist items")


def migrate_recipes(conn):
    print("\n--- Recipes ---")
    rows = conn.execute("""
        SELECT id, name, servings, prep_time, cook_time, source_url, directions, notes
        FROM recipes ORDER BY name
    """).fetchall()
    print(f"  Found {len(rows)} recipes in weeklyshop")

    sb.table("recipe_ingredients").delete().in_(
        "recipe_id",
        [r["id"] for r in sb.table("recipes").select("id").eq("household_id", HOUSEHOLD_ID).execute().data]
    ).execute() if sb.table("recipes").select("id").eq("household_id", HOUSEHOLD_ID).execute().data else None
    sb.table("recipes").delete().eq("household_id", HOUSEHOLD_ID).execute()

    old_to_new = {}
    for row in rows:
        result = sb.table("recipes").insert({
            "household_id": HOUSEHOLD_ID,
            "title": row["name"],
            "servings": row["servings"],
            "prep_time": row["prep_time"],
            "cook_time": row["cook_time"],
            "source_url": row["source_url"],
            "directions": row["directions"],
            "notes": row["notes"],
        }).execute()
        old_to_new[row["id"]] = result.data[0]["id"]
        print(f"  + {row['name']}")

    print(f"  Migrated {len(rows)} recipes")
    return old_to_new


def migrate_recipe_ingredients(conn, recipe_map):
    print("\n--- Recipe Ingredients ---")
    rows = conn.execute("""
        SELECT recipe_id, ingredient_text, quantity, unit, coles_product_name, sort_order
        FROM recipe_ingredients ORDER BY recipe_id, sort_order
    """).fetchall()
    print(f"  Found {len(rows)} ingredients in weeklyshop")

    count = 0
    for row in rows:
        new_recipe_id = recipe_map.get(row["recipe_id"])
        if not new_recipe_id:
            print(f"  ! Skipping ingredient (recipe not found): {row['ingredient_text']}")
            continue

        sb.table("recipe_ingredients").insert({
            "recipe_id": new_recipe_id,
            "text": row["ingredient_text"],
            "quantity": row["quantity"],
            "unit": row["unit"],
            "coles_product": row["coles_product_name"],
            "sort_order": row["sort_order"] or 0,
        }).execute()
        count += 1

    print(f"  Migrated {count} ingredients")


def migrate_coles_preferences(conn):
    print("\n--- Coles Preferences ---")
    rows = conn.execute("SELECT product_name, pack_size FROM coles_preferences ORDER BY product_name").fetchall()
    print(f"  Found {len(rows)} Coles preferences in weeklyshop")

    sb.table("coles_preferences").delete().eq("household_id", HOUSEHOLD_ID).execute()

    for row in rows:
        sb.table("coles_preferences").insert({
            "household_id": HOUSEHOLD_ID,
            "product_name": row["product_name"],
            "pack_size": row.get("pack_size"),
        }).execute()

    print(f"  Migrated {len(rows)} Coles preferences")


def main():
    print(f"Migrating from: {WEEKLYSHOP_DB}")
    print(f"Migrating to:   {SUPABASE_URL}")
    print(f"Household:       {HOUSEHOLD_ID}")

    if not WEEKLYSHOP_DB.exists():
        print(f"\nError: SQLite database not found at {WEEKLYSHOP_DB}")
        return

    conn = connect_sqlite()

    try:
        category_map = migrate_categories(conn)
        migrate_pantry(conn)
        migrate_longlist(conn, category_map)
        recipe_map = migrate_recipes(conn)
        migrate_recipe_ingredients(conn, recipe_map)
        migrate_coles_preferences(conn)
        print("\n✓ Migration complete!")
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
