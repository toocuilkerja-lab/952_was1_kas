import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from '@neondatabase/serverless';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Connection Logic
const databaseUrl = process.env.DATABASE_URL?.trim();
const sql = databaseUrl ? neon(databaseUrl) : null;

let localDb: any = null;

// Initialize database
const initDb = async () => {
  try {
    if (sql) {
      await sql`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          description TEXT NOT NULL,
          employee_name TEXT,
          month TEXT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("Neon database initialized successfully");
    } else if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
      console.log("Attempting to load local SQLite...");
      try {
        // Obfuscate module name to bypass Vercel's dependency tracing
        const parts = ["better", "-", "sqlite3"];
        const moduleName = parts.join("");
        const { default: Database } = await import(moduleName);
        localDb = new Database("kas.db");
        
        localDb.exec(`
          CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            description TEXT NOT NULL,
            employee_name TEXT,
            month TEXT,
            date TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log("Local SQLite database initialized successfully");
      } catch (e) {
        console.log("SQLite not loaded (expected on Vercel):", (e as Error).message);
      }
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};

initDb().catch(console.error);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/transactions", async (req, res) => {
  try {
    let transactions;
    if (sql) {
      transactions = await sql`SELECT * FROM transactions ORDER BY date DESC`;
    } else if (localDb) {
      transactions = localDb.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
    } else {
      // Fallback for Vercel: If Neon is not connected, return empty instead of crashing
      console.warn("No database connection available for GET /api/transactions");
      transactions = [];
    }
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/transactions", async (req, res) => {
  const { type, amount, description, employee_name, month } = req.body;
  
  if (!type || !amount || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    let newTransaction;
    if (sql) {
      const result = await sql`
        INSERT INTO transactions (type, amount, description, employee_name, month) 
        VALUES (${type}, ${amount}, ${description}, ${employee_name}, ${month}) 
        RETURNING *
      `;
      newTransaction = result[0];
    } else if (localDb) {
      const info = localDb.prepare(
        "INSERT INTO transactions (type, amount, description, employee_name, month) VALUES (?, ?, ?, ?, ?)"
      ).run(type, amount, description, employee_name, month);
      newTransaction = localDb.prepare("SELECT * FROM transactions WHERE id = ?").get(info.lastInsertRowid);
    } else {
      return res.status(503).json({ error: "Database not connected. Please check DATABASE_URL in Vercel settings." });
    }
    res.json(newTransaction);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    if (sql) {
      await sql`DELETE FROM transactions WHERE id = ${req.params.id}`;
    } else if (localDb) {
      localDb.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
    } else {
      return res.status(503).json({ error: "Database not connected" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    // Obfuscate 'vite' to prevent Vercel from bundling it
    const v = "v";
    const i = "i";
    const t = "t";
    const e = "e";
    const viteName = v + i + t + e;
    const { createServer: createViteServer } = await import(viteName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } catch (e) {
    console.log("Vite not loaded (expected on Vercel)");
  }
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  // In Vercel, the routing is handled by vercel.json, but we keep this for local production testing
  app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).send("Not found. Make sure to run build first.");
    }
  });
}

// Only listen if not running as a Vercel function
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
