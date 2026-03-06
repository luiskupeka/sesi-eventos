import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("events.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    date TEXT,
    time TEXT,
    max_vagas INTEGER,
    deadline TEXT,
    classes_allowed TEXT,
    years_allowed TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required INTEGER DEFAULT 0,
    options TEXT,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // Get all events
  app.get("/api/events", (req, res) => {
    const events = db.prepare(`
      SELECT e.*, 
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as current_registrations
      FROM events e
      ORDER BY e.created_at DESC
    `).all();
    res.json(events);
  });

  // Get single event with fields
  app.get("/api/events/:id", (req, res) => {
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    const fields = db.prepare("SELECT * FROM event_fields WHERE event_id = ?").all(req.params.id);
    const registrationsCount = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE event_id = ?").get(req.params.id);
    
    res.json({ ...event, fields, current_registrations: registrationsCount.count });
  });

  // Create event
  app.post("/api/events", (req, res) => {
    const { name, type, description, date, time, max_vagas, deadline, classes_allowed, years_allowed, fields } = req.body;
    
    const insertEvent = db.prepare(`
      INSERT INTO events (name, type, description, date, time, max_vagas, deadline, classes_allowed, years_allowed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      const info = insertEvent.run(name, type, description, date, time, max_vagas, deadline, classes_allowed, years_allowed);
      const eventId = info.lastInsertRowid;
      
      const insertField = db.prepare(`
        INSERT INTO event_fields (event_id, field_name, field_label, field_type, is_required, options)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const field of fields) {
        insertField.run(eventId, field.field_name, field.field_label, field.field_type, field.is_required ? 1 : 0, field.options || null);
      }
      
      return eventId;
    });
    
    try {
      const eventId = transaction();
      res.json({ id: eventId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete event
  app.delete("/api/events/:id", (req, res) => {
    db.prepare("DELETE FROM events WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Update event
  app.put("/api/events/:id", (req, res) => {
    const { name, type, description, date, time, max_vagas, deadline } = req.body;
    const eventId = req.params.id;

    try {
      db.prepare(`
        UPDATE events 
        SET name = ?, type = ?, description = ?, date = ?, time = ?, max_vagas = ?, deadline = ?
        WHERE id = ?
      `).run(name, type, description, date, time, max_vagas, deadline, eventId);
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Register for event
  app.post("/api/events/:id/register", (req, res) => {
    const eventId = req.params.id;
    const { data } = req.body;
    
    // Check spots
    const event = db.prepare("SELECT max_vagas, deadline FROM events WHERE id = ?").get(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    const count = db.prepare("SELECT COUNT(*) as count FROM registrations WHERE event_id = ?").get(eventId);
    
    if (count.count >= event.max_vagas) {
      return res.status(400).json({ error: "Acabaram as vagas deste evento, por favor escolha outro." });
    }

    // Check for duplicate registration by name and surname
    const existingRegs = db.prepare("SELECT data FROM registrations WHERE event_id = ?").all(eventId);
    const fullName = `${data.nome || ''} ${data.sobrenome || ''}`.trim().toLowerCase();
    
    if (fullName) {
      const isDuplicate = existingRegs.some(r => {
        const regData = JSON.parse(r.data);
        const regFullName = `${regData.nome || ''} ${regData.sobrenome || ''}`.trim().toLowerCase();
        return regFullName === fullName;
      });

      if (isDuplicate) {
        return res.status(400).json({ error: "Este aluno já está inscrito neste evento." });
      }
    }
    
    const now = new Date();
    const deadlineDate = new Date(event.deadline);
    if (now > deadlineDate) {
      return res.status(400).json({ error: "Inscrições encerradas" });
    }
    
    db.prepare("INSERT INTO registrations (event_id, data) VALUES (?, ?)").run(eventId, JSON.stringify(data));
    res.json({ success: true });
  });

  // Get registrations for an event
  app.get("/api/events/:id/registrations", (req, res) => {
    const regs = db.prepare("SELECT * FROM registrations WHERE event_id = ? ORDER BY registration_date DESC").all(req.params.id);
    const fields = db.prepare("SELECT * FROM event_fields WHERE event_id = ?").all(req.params.id);
    
    const formattedRegs = regs.map(r => ({
      ...r,
      data: JSON.parse(r.data)
    }));
    
    res.json({ registrations: formattedRegs, fields });
  });

  // Vite middleware for development or production static serving
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(__dirname, "dist"));
  
  if (!isProduction) {
    console.log(`[${new Date().toISOString()}] Starting in DEVELOPMENT mode (Vite Middleware)`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log(`[${new Date().toISOString()}] Starting in PRODUCTION mode (Serving dist folder)`);
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Check if it's an API call that missed
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
