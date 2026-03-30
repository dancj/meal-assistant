import Database from "better-sqlite3";
import path from "path";
import type { Recipe } from "@/types/recipe";
import type { MealPlan } from "@/types/meal-plan";
import type {
  RecipeRepository,
  MealPlanRepository,
  StoredMealPlan,
} from "./types";
import { DEMO_RECIPES } from "@/lib/demo-data";

const DB_PATH = path.join(process.cwd(), "data", "meal-assistant.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL DEFAULT '[]',
      instructions TEXT,
      tags TEXT DEFAULT '[]',
      servings INTEGER,
      prep_time INTEGER,
      cook_time INTEGER,
      source_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      dinners TEXT NOT NULL,
      grocery_list TEXT NOT NULL,
      week_of TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed demo recipes if table is empty
  const count = db.prepare("SELECT COUNT(*) as n FROM recipes").get() as {
    n: number;
  };
  if (count.n === 0) {
    const insert = db.prepare(`
      INSERT INTO recipes (id, name, ingredients, instructions, tags, servings, prep_time, cook_time, source_url, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seedAll = db.transaction(() => {
      for (const r of DEMO_RECIPES) {
        insert.run(
          r.id,
          r.name,
          JSON.stringify(r.ingredients),
          r.instructions,
          JSON.stringify(r.tags),
          r.servings,
          r.prep_time,
          r.cook_time,
          r.source_url,
          r.notes,
          r.created_at,
          r.updated_at
        );
      }
    });
    seedAll();
  }
}

interface RecipeRow {
  id: string;
  name: string;
  ingredients: string;
  instructions: string | null;
  tags: string;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    ...row,
    ingredients: JSON.parse(row.ingredients),
    tags: JSON.parse(row.tags),
  };
}

export class SqliteRecipeRepository implements RecipeRepository {
  async list(): Promise<Recipe[]> {
    const rows = getDb()
      .prepare("SELECT * FROM recipes ORDER BY created_at DESC")
      .all() as RecipeRow[];
    return rows.map(rowToRecipe);
  }

  async getById(id: string): Promise<Recipe | null> {
    const row = getDb()
      .prepare("SELECT * FROM recipes WHERE id = ?")
      .get(id) as RecipeRow | undefined;
    return row ? rowToRecipe(row) : null;
  }

  async create(
    data: Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>
  ): Promise<Recipe> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO recipes (id, name, ingredients, instructions, tags, servings, prep_time, cook_time, source_url, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        data.name,
        JSON.stringify(data.ingredients),
        data.instructions ?? null,
        JSON.stringify(data.tags ?? []),
        data.servings ?? null,
        data.prep_time ?? null,
        data.cook_time ?? null,
        data.source_url ?? null,
        data.notes ?? null,
        now,
        now
      );
    return {
      id,
      name: data.name ?? "",
      ingredients: data.ingredients ?? [],
      instructions: data.instructions ?? null,
      tags: data.tags ?? [],
      servings: data.servings ?? null,
      prep_time: data.prep_time ?? null,
      cook_time: data.cook_time ?? null,
      source_url: data.source_url ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
  }

  async update(id: string, data: Partial<Recipe>): Promise<Recipe | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Recipe = {
      ...existing,
      ...data,
      id, // preserve
      created_at: existing.created_at, // preserve
      updated_at: new Date().toISOString(),
    };

    getDb()
      .prepare(
        `UPDATE recipes SET name=?, ingredients=?, instructions=?, tags=?, servings=?, prep_time=?, cook_time=?, source_url=?, notes=?, updated_at=?
         WHERE id=?`
      )
      .run(
        updated.name,
        JSON.stringify(updated.ingredients),
        updated.instructions,
        JSON.stringify(updated.tags),
        updated.servings,
        updated.prep_time,
        updated.cook_time,
        updated.source_url,
        updated.notes,
        updated.updated_at,
        id
      );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = getDb()
      .prepare("DELETE FROM recipes WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }
}

interface MealPlanRow {
  id: string;
  dinners: string;
  grocery_list: string;
  week_of: string;
  created_at: string;
}

function rowToMealPlan(row: MealPlanRow): StoredMealPlan {
  return {
    id: row.id,
    dinners: JSON.parse(row.dinners),
    groceryList: JSON.parse(row.grocery_list),
    weekOf: row.week_of,
    created_at: row.created_at,
  };
}

export class SqliteMealPlanRepository implements MealPlanRepository {
  async save(plan: MealPlan): Promise<StoredMealPlan> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO meal_plans (id, dinners, grocery_list, week_of, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        id,
        JSON.stringify(plan.dinners),
        JSON.stringify(plan.groceryList),
        plan.weekOf,
        now
      );
    return { id, ...plan, created_at: now };
  }

  async getCurrent(): Promise<StoredMealPlan | null> {
    const row = getDb()
      .prepare("SELECT * FROM meal_plans ORDER BY created_at DESC LIMIT 1")
      .get() as MealPlanRow | undefined;
    return row ? rowToMealPlan(row) : null;
  }

  async list(limit = 10): Promise<StoredMealPlan[]> {
    const rows = getDb()
      .prepare("SELECT * FROM meal_plans ORDER BY created_at DESC LIMIT ?")
      .all(limit) as MealPlanRow[];
    return rows.map(rowToMealPlan);
  }
}
