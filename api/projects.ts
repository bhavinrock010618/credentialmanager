import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readProjects, writeProjects } from "./_lib/helpers";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      return res.json(readProjects());
    }

    if (req.method === "POST") {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Project name is required" });

      const projects = readProjects();
      if (projects.includes(name)) {
        return res.status(400).json({ error: "Project already exists" });
      }

      projects.push(name);
      writeProjects(projects);
      return res.status(201).json(projects);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("projects handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
