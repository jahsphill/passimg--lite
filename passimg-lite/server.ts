import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import crypto from "crypto";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("passimg.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    image_hash TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    image_data TEXT NOT NULL,
    mime_type TEXT NOT NULL
  )
`);

const app = express();
const PORT = 3000;

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Security headers for iframe compatibility
  res.header('Access-Control-Allow-Credentials', 'true');
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  next();
});

// Configure multer for memory storage for this prototype
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Init endpoint to prime cookies
app.get("/api/init", (req, res) => {
  console.log("Init requested - priming cookies");
  // Set a dummy cookie with SameSite=None; Secure to help with iframe context
  res.cookie('pimg_session', 'active', { 
    sameSite: 'none', 
    secure: true, 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
  res.json({ ok: true });
});

// API Endpoints
app.post("/api/verify", upload.single("image"), (req: any, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/verify - Start`);
  
  if (!req.file) {
    console.warn("Verify request failed: No file uploaded");
    return res.status(400).json({ error: "No image uploaded" });
  }

  console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

  const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const id = `PIMG-${Math.floor(10000 + Math.random() * 90000)}`;
  const timestamp = new Date().toISOString();
  const imageData = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype;

  try {
    db.prepare("INSERT INTO verifications (id, image_hash, timestamp, image_data, mime_type) VALUES (?, ?, ?, ?, ?)")
      .run(id, hash, timestamp, imageData, mimeType);
    
    res.json({ id, hash, timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to store verification" });
  }
});

app.get("/api/verify/:id", (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /api/verify/${req.params.id}`);
  const row = db.prepare("SELECT id, image_hash, timestamp, image_data, mime_type FROM verifications WHERE id = ?").get(req.params.id) as any;
  
  if (!row) {
    console.warn(`Verification not found: ${req.params.id}`);
    return res.status(404).json({ error: "Verification not found" });
  }

  // First-seen hashing logic
  const firstSeen = db.prepare("SELECT id, timestamp FROM verifications WHERE image_hash = ? ORDER BY timestamp ASC LIMIT 1").get(row.image_hash) as any;
  
  const isFirstSeen = firstSeen.id === row.id;

  res.json({
    id: row.id,
    hash: row.image_hash,
    timestamp: row.timestamp,
    imageData: `data:${row.mime_type};base64,${row.image_data}`,
    status: "Verified Original",
    investigation: {
      isFirstSeen,
      firstSeenTimestamp: firstSeen.timestamp,
      firstSeenId: firstSeen.id
    }
  });
});

app.post("/api/check/:id", upload.single("image"), (req: any, res) => {
  console.log(`[${new Date().toISOString()}] POST /api/check/${req.params.id}`);
  
  if (!req.file) {
    console.warn("Check request failed: No file uploaded");
    return res.status(400).json({ error: "No image uploaded" });
  }

  const row = db.prepare("SELECT image_hash FROM verifications WHERE id = ?").get(req.params.id) as any;
  
  if (!row) {
    console.warn(`Check request failed: Verification ID not found: ${req.params.id}`);
    return res.status(404).json({ error: "Verification ID not found" });
  }

  const newHash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const match = newHash === row.image_hash;

  console.log(`Integrity check for ${req.params.id}: ${match ? "MATCH" : "MODIFIED"}`);

  res.json({
    match,
    status: match ? "MATCH ✔" : "MODIFIED ⚠",
    originalHash: row.image_hash,
    newHash: newHash
  });
});

// Catch-all for API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Server Error:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PassIMG] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[PassIMG] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
