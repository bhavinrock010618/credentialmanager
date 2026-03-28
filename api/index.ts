import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(express.json());

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "secure-vault-default-key-2024";
const IV_LENGTH = 16;
const KEY_BUFFER = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

const TMP_DATA = "/tmp/data.json";
const TMP_PROJECTS = "/tmp/projects.json";

function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
  if (!text || !text.includes(":")) return text;
  try {
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift()!, "hex");
    const enc = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY_BUFFER, iv);
    let dec = decipher.update(enc);
    dec = Buffer.concat([dec, decipher.final()]);
    return dec.toString();
  } catch {
    return text;
  }
}

function seedFromDeploy(tmpPath: string, filename: string, fallback: string) {
  if (fs.existsSync(tmpPath)) return;
  const candidates = [
    path.join(process.cwd(), filename),
    path.resolve(__dirname, "..", filename),
    path.resolve(__dirname, filename),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, tmpPath);
        return;
      }
    } catch { /* continue */ }
  }
  fs.writeFileSync(tmpPath, fallback);
}

function readCredentials(): any[] {
  seedFromDeploy(TMP_DATA, "data.json", "[]");
  const raw = JSON.parse(fs.readFileSync(TMP_DATA, "utf8"));
  return raw.map((c: any) => ({
    ...c,
    password: decrypt(c.password),
    ftp_pass: decrypt(c.ftp_pass || ""),
    secret_key: decrypt(c.secret_key || ""),
  }));
}

function writeCredentials(credentials: any[]) {
  const enc = credentials.map((c: any) => ({
    ...c,
    password: encrypt(c.password),
    ftp_pass: encrypt(c.ftp_pass || ""),
    secret_key: encrypt(c.secret_key || ""),
  }));
  fs.writeFileSync(TMP_DATA, JSON.stringify(enc, null, 2));
}

function readProjects(): string[] {
  seedFromDeploy(TMP_PROJECTS, "projects.json", '["General"]');
  return JSON.parse(fs.readFileSync(TMP_PROJECTS, "utf8"));
}

function writeProjects(projects: string[]) {
  fs.writeFileSync(TMP_PROJECTS, JSON.stringify(projects, null, 2));
}

// --- Projects ---

app.get("/api/projects", (_req: Request, res: Response) => {
  res.json(readProjects());
});

app.post("/api/projects", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Project name is required" });

  const projects = readProjects();
  if (projects.includes(name)) {
    return res.status(400).json({ error: "Project already exists" });
  }

  projects.push(name);
  writeProjects(projects);
  res.status(201).json(projects);
});

// --- Credentials ---

app.get("/api/credentials", (_req: Request, res: Response) => {
  res.json(readCredentials());
});

app.post("/api/credentials", (req: Request, res: Response) => {
  const { url, username, password, project, protocol, host, login_type, ftp_user, ftp_pass, secret_key, public_key } = req.body;

  if (!url && !host) {
    return res.status(400).json({ error: "Either Website URL or Host Name is required." });
  }

  const credentials = readCredentials();
  const newCred = {
    id: Date.now(),
    url: url || "",
    username,
    password,
    project: project || "General",
    protocol: protocol || "",
    host: host || "",
    login_type: login_type || "",
    ftp_user: ftp_user || "",
    ftp_pass: ftp_pass || "",
    secret_key: secret_key || "",
    public_key: public_key || "",
    note: (req.body.note || "").replace(/<[^>]*>?/gm, ""),
  };

  credentials.push(newCred);
  writeCredentials(credentials);
  res.status(201).json(newCred);
});

app.put("/api/credentials/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const updateData = { ...req.body };
  if (updateData.note !== undefined) {
    updateData.note = updateData.note.replace(/<[^>]*>?/gm, "");
  }

  const credentials = readCredentials();
  const index = credentials.findIndex((c: any) => c.id === id);
  if (index === -1) return res.status(404).json({ error: "Not found" });

  const merged = { ...credentials[index], ...updateData };
  if (!merged.url && !merged.host) {
    return res.status(400).json({ error: "Either Website URL or Host Name is required." });
  }

  credentials[index] = merged;
  writeCredentials(credentials);
  res.json(credentials[index]);
});

app.delete("/api/credentials/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const credentials = readCredentials();
  const filtered = credentials.filter((c: any) => c.id !== id);
  if (filtered.length === credentials.length) {
    return res.status(404).json({ error: "Not found" });
  }

  writeCredentials(filtered);
  res.status(204).send();
});

export default app;
