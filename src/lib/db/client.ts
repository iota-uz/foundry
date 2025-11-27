/**
 * SQLite database client using better-sqlite3
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

/**
 * Get the database instance (singleton)
 */
export function getDatabase(dbPath?: string): Database.Database {
  if (db) {
    return db;
  }

  const finalPath = dbPath || getDefaultDbPath();

  // Ensure directory exists
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create database connection
  db = new Database(finalPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get default database path
 */
function getDefaultDbPath(): string {
  // Look for .foundry directory in current working directory
  const cwd = process.cwd();
  const foundryDir = path.join(cwd, '.foundry');

  if (fs.existsSync(foundryDir)) {
    return path.join(foundryDir, 'foundry.db');
  }

  // Fallback to temp directory for testing
  return path.join(cwd, '.foundry', 'foundry.db');
}

/**
 * Run database migrations
 */
function runMigrations(database: Database.Database): void {
  // Create migrations table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  // Get applied migrations
  const appliedMigrations = database
    .prepare('SELECT name FROM migrations')
    .all() as { name: string }[];

  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  // Get migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Apply pending migrations
  for (const file of migrationFiles) {
    const name = file.replace('.sql', '');

    if (appliedNames.has(name)) {
      continue;
    }

    console.log(`Applying migration: ${name}`);

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Run migration in transaction
    const migrate = database.transaction(() => {
      database.exec(sql);
      database
        .prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)')
        .run(name, new Date().toISOString());
    });

    migrate();

    console.log(`Migration applied: ${name}`);
  }
}

/**
 * Execute a query within a transaction
 */
export function transaction<T>(
  fn: (db: Database.Database) => T,
  dbInstance?: Database.Database
): T {
  const database = dbInstance || getDatabase();
  const txn = database.transaction(fn);
  return txn(database);
}

/**
 * Reset database (for testing only)
 */
export function resetDatabase(dbPath?: string): void {
  closeDatabase();

  const finalPath = dbPath || getDefaultDbPath();
  if (fs.existsSync(finalPath)) {
    fs.unlinkSync(finalPath);
  }

  // Remove WAL files
  if (fs.existsSync(`${finalPath}-shm`)) {
    fs.unlinkSync(`${finalPath}-shm`);
  }
  if (fs.existsSync(`${finalPath}-wal`)) {
    fs.unlinkSync(`${finalPath}-wal`);
  }

  getDatabase(finalPath);
}
