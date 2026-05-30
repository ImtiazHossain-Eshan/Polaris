import { GoogleGenerativeAI } from "@google/generative-ai";

function getKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function geminiClient() {
  const key = getKey();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export function hasGeminiKey() {
  return !!getKey();
}

export async function embedText(text: string): Promise<number[] | null> {
  const client = geminiClient();
  if (!client) return null;
  const model = client.getGenerativeModel({ model: "gemini-embedding-2" });
  const res = await model.embedContent(text);
  return res.embedding.values;
}

const ROADMAP_MODEL = "gemini-3.5-flash";

export type RoadmapMilestone = {
  quarter: string;
  category: "Academics" | "Testing" | "Extracurriculars" | "Skills" | "Applications";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  rationale: string;
  metric: string;
};

export type RoadmapResponse = {
  summary: string;
  gaps: string[];
  milestones: RoadmapMilestone[];
};

const ROADMAP_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "2–3 sentences naming the most important strategic thrust for this student over the next 6–18 months.",
    },
    gaps: {
      type: "array",
      description:
        "3–5 short bullet phrases describing what successful applicants like this student typically had that they currently lack.",
      items: { type: "string" },
    },
    milestones: {
      type: "array",
      description: "8–12 milestones spanning at least 3 distinct categories.",
      items: {
        type: "object",
        properties: {
          quarter: {
            type: "string",
            description: "Time window, e.g. 'Q1 2026 (Jan–Mar)' or 'Months 1–3'.",
          },
          category: {
            type: "string",
            enum: ["Academics", "Testing", "Extracurriculars", "Skills", "Applications"],
          },
          title: { type: "string", description: "Concise action title under 60 chars." },
          description: { type: "string", description: "1–2 sentences with concrete next steps." },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          rationale: {
            type: "string",
            description:
              "Why this milestone matters, referencing a specific university requirement or case-study pattern when possible.",
          },
          metric: {
            type: "string",
            description: "Measurable success criterion, e.g. 'SAT 1500+', '5 GitHub stars', '2 published essays'.",
          },
        },
        required: ["quarter", "category", "title", "description", "priority", "rationale", "metric"],
      },
    },
  },
  required: ["summary", "gaps", "milestones"],
} as const;

export async function generateRoadmap(
  systemPrompt: string,
  userPrompt: string
): Promise<RoadmapResponse | null> {
  const client = geminiClient();
  if (!client) return null;

  const model = client.getGenerativeModel({
    model: ROADMAP_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ROADMAP_SCHEMA as any,
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  try {
    return JSON.parse(text) as RoadmapResponse;
  } catch {
    return null;
  }
}
