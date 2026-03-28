import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readCredentials, writeCredentials } from "../_lib/helpers";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      return res.json(readCredentials());
    }

    if (req.method === "POST") {
      const {
        url, username, password, project, protocol, host,
        login_type, ftp_user, ftp_pass, secret_key, public_key,
      } = req.body;

      if (!url && !host) {
        return res.status(400).json({ error: "Either Website URL or Host Name is required." });
      }

      const credentials = readCredentials();
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
        note: (req.body.note || "").replace(/<[^>]*>?/gm, ""),
      };

      credentials.push(newCredential);
      writeCredentials(credentials);
      return res.status(201).json(newCredential);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("credentials handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
