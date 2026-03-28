import fs from "fs";
import path from "path";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "secure-vault-default-key-2024";
const IV_LENGTH = 16;
const KEY_BUFFER = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

const TMP_DATA_FILE = "/tmp/data.json";
const TMP_PROJECTS_FILE = "/tmp/projects.json";

function findSeedFile(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), filename),
    path.resolve(__dirname, "../..", filename),
    path.resolve(__dirname, "..", filename),
    path.resolve(filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY_BUFFER, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  if (!text || !text.includes(":")) return text;
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY_BUFFER, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return text;
  }
}

function ensureFile(tmpPath: string, seedFilename: string, fallback: string) {
  if (!fs.existsSync(tmpPath)) {
    const seedPath = findSeedFile(seedFilename);
    if (seedPath) {
      try {
        fs.writeFileSync(tmpPath, fs.readFileSync(seedPath, "utf8"));
        return;
      } catch { /* fall through */ }
    }
    fs.writeFileSync(tmpPath, fallback);
  }
}

export function readCredentials(): any[] {
  ensureFile(TMP_DATA_FILE, "data.json", "[]");
  try {
    const data = fs.readFileSync(TMP_DATA_FILE, "utf8");
    const credentials = JSON.parse(data);
    return credentials.map((c: any) => ({
      ...c,
      password: decrypt(c.password),
      ftp_pass: decrypt(c.ftp_pass || ""),
      secret_key: decrypt(c.secret_key || ""),
    }));
  } catch {
    return [];
  }
}

export function writeCredentials(credentials: any[]) {
  const encryptedData = credentials.map((c: any) => ({
    ...c,
    password: encrypt(c.password),
    ftp_pass: encrypt(c.ftp_pass || ""),
    secret_key: encrypt(c.secret_key || ""),
  }));
  fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(encryptedData, null, 2));
}

export function readProjects(): string[] {
  ensureFile(TMP_PROJECTS_FILE, "projects.json", '["General"]');
  try {
    const data = fs.readFileSync(TMP_PROJECTS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return ["General"];
  }
}

export function writeProjects(projects: string[]) {
  fs.writeFileSync(TMP_PROJECTS_FILE, JSON.stringify(projects, null, 2));
}
