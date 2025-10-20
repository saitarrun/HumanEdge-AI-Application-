import axios from "axios";
import { addHumanTexture } from "../../utils/humanTexture";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { text, style, texture } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const {
      region = "US",          // "US" | "UK" | "AU" | "IN"
      fluency = "native",     // "native" | "near-native" | "esl-light"
      formality = "neutral",  // "formal" | "neutral" | "casual"
      errors = 0,             // 0–3
      contractions = true,
      markers = true
    } = texture || {};

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY not set on server",
        hint: "Add it to .env.local or docker env and restart."
      });
    }

    // Editor-style guidance: clarity & flow; tone adjustable; meaning preserved.
    const guidance = `You are a careful editor. Improve clarity, flow, and tone without altering factual meaning.
- Vary sentence rhythm (short/long mix), remove redundancy and hype
- Prefer active voice when appropriate
- Maintain ${style || "Neutral"} tone and be respectful across dialects
- Do not invent data or sources
Return only the revised passage.`;

    const regionLine = region ? `Regional flavor: ${region} English.` : "";
    const formalityLine = `Formality: ${formality}. Fluency target: ${fluency}.`;

    const user = `${regionLine} ${formalityLine}
Revise this passage while preserving its meaning:
\"\"\"
${text}
\"\"\"`;

    const resp = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [
          { role: "system", content: guidance },
          { role: "user", content: user }
        ],
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Editorial Humanizer + Texture"
        },
        timeout: 30000
      }
    );

    let output = resp.data?.choices?.[0]?.message?.content?.trim() || "";

    // Apply controlled human texture (optional & bounded)
    output = addHumanTexture(output, {
      region, fluency, formality, errors, contractions, markers
    });

    return res.status(200).json({ output });
  } catch (e) {
    const details = e?.response?.data || { message: e.message };
    return res.status(500).json({ error: "Rewrite failed", details });
  }
}
