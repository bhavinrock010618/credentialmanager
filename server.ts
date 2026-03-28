import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");
const PROJECTS_FILE = path.join(process.cwd(), "projects.json");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "secure-vault-default-key-2024";
const IV_LENGTH = 16;

// Derive a 32-byte key from the ENCRYPTION_KEY string
const KEY_BUFFER = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

const VALID_PROTOCOLS = ["SFTP", "FTP"];
const VALID_LOGIN_TYPES = ["Anonymous", "Normal", "Ask Password", "Interactive", "Key file"];

app.use(express.json());

// Encryption Helpers
function encrypt(text: string) {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string) {
  if (!text || !text.includes(":")) return text;
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY_BUFFER, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text; // Return original if decryption fails (backward compatibility)
  }
}

// File Operations
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, "utf8");
    const credentials = JSON.parse(data);
    return credentials.map((c: any) => ({
      ...c,
      password: decrypt(c.password),
      ftp_pass: decrypt(c.ftp_pass || ""),
      secret_key: decrypt(c.secret_key || "")
    }));
  } catch (error) {
    console.error("Error reading data:", error);
    return [];
  }
}

function writeData(credentials: any[]) {
  try {
    const encryptedData = credentials.map((c: any) => ({
      ...c,
      password: encrypt(c.password),
      ftp_pass: encrypt(c.ftp_pass || ""),
      secret_key: encrypt(c.secret_key || "")
    }));
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(encryptedData, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    console.error("Error writing data:", error);
  }
}

function readProjects() {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) return ["General"];
    const data = fs.readFileSync(PROJECTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return ["General"];
  }
}

function writeProjects(projects: string[]) {
  try {
    const tempFile = `${PROJECTS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(projects, null, 2));
    fs.renameSync(tempFile, PROJECTS_FILE);
  } catch (error) {
    console.error("Error writing projects:", error);
  }
}

// Project API Endpoints
app.get("/api/projects", (req, res) => {
  res.json(readProjects());
});

app.post("/api/projects", (req, res) => {
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

// Credential API Endpoints
app.get("/api/credentials", (req, res) => {
  const credentials = readData();
  res.json(credentials);
});

app.post("/api/credentials", (req, res) => {
  const { 
    url, username, password, project, protocol, host, 
    login_type, ftp_user, ftp_pass, secret_key, public_key 
  } = req.body;
  
  if (!url && !host) {
    return res.status(400).json({ error: "Either Website URL or Host Name is required." });
  }
  
  const credentials = readData();
  const newCredential = {
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
    note: (req.body.note || "").replace(/<[^>]*>?/gm, "") // Strip HTML tags
  };
  
  credentials.push(newCredential);
  writeData(credentials);
  res.status(201).json(newCredential);
});

app.put("/api/credentials/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const updateData = { ...req.body };

  if (updateData.note !== undefined) {
    updateData.note = updateData.note.replace(/<[^>]*>?/gm, "");
  }
  
  let credentials = readData();
  const index = credentials.findIndex((c: any) => c.id === id);
  if (index === -1) return res.status(404).json({ error: "Not found" });

  const mergedData = { ...credentials[index], ...updateData };
  if (!mergedData.url && !mergedData.host) {
    return res.status(400).json({ error: "Either Website URL or Host Name is required." });
  }

  credentials[index] = mergedData;
  writeData(credentials);
  res.json(credentials[index]);
});

app.delete("/api/credentials/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let credentials = readData();
  const initialLength = credentials.length;
  credentials = credentials.filter((c: any) => c.id !== id);
  if (credentials.length === initialLength) return res.status(404).json({ error: "Not found" });

  writeData(credentials);
  res.status(204).send();
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
