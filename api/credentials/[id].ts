import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readCredentials, writeCredentials } from "../_lib/helpers";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = parseInt(req.query.id as string);

    if (req.method === "PUT") {
      const updateData = { ...req.body };
      if (updateData.note !== undefined) {
        updateData.note = updateData.note.replace(/<[^>]*>?/gm, "");
      }

      const credentials = readCredentials();
      const index = credentials.findIndex((c: any) => c.id === id);
      if (index === -1) return res.status(404).json({ error: "Not found" });

      const mergedData = { ...credentials[index], ...updateData };
      if (!mergedData.url && !mergedData.host) {
        return res.status(400).json({ error: "Either Website URL or Host Name is required." });
      }

      credentials[index] = mergedData;
      writeCredentials(credentials);
      return res.json(credentials[index]);
    }

    if (req.method === "DELETE") {
      const credentials = readCredentials();
      const filtered = credentials.filter((c: any) => c.id !== id);
      if (filtered.length === credentials.length) {
        return res.status(404).json({ error: "Not found" });
      }

      writeCredentials(filtered);
      return res.status(204).send(null);
    }

    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("credentials/[id] handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
