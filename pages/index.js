import React, { useMemo, useState } from "react";

function sentenceCount(t) {
  return (t || "").split(/(?<=[.!?])\s+/).filter(s => s.trim().length).length;
}
function wordCount(t) {
  return (t || "").trim() ? (t || "").trim().split(/\s+/).length : 0;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [style, setStyle] = useState("Academic");

  // Human texture controls
  const [region, setRegion] = useState("US");          // US | UK | AU | IN
  const [fluency, setFluency] = useState("native");    // native | near-native | esl-light
  const [formality, setFormality] = useState("neutral"); // formal | neutral | casual
  const [errors, setErrors] = useState(0);             // 0–3
  const [useContractions, setUseContractions] = useState(true);
  const [useMarkers, setUseMarkers] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const styles = ["Academic", "Technical", "Concise", "Neutral", "Friendly"];
  const regions = ["US", "UK", "AU", "IN"];
  const fluencies = ["native", "near-native", "esl-light"];
  const formalities = ["formal", "neutral", "casual"];

  async function handleRewrite() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          style,
          texture: {
            region,
            fluency,
            formality,
            errors,
            contractions: useContractions,
            markers: useMarkers,
          },
        }),
      });

      // Read as text first (so we can show helpful errors even if server returns HTML)
      const raw = await res.text();

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Server returned non-JSON (status ${res.status}). First bytes:\n${raw.slice(0, 200)}`
        );
      }

      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        const details =
          typeof data?.details === "string"
            ? data.details
            : JSON.stringify(data?.details || {});
        throw new Error(`${msg}${details ? ` — ${details}` : ""}`);
      }

      setOutput(data.output || "");
    } catch (e) {
      setMsg(e.message || "Rewrite failed");
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(
    () => ({
      inS: sentenceCount(input),
      inW: wordCount(input),
      outS: sentenceCount(output),
      outW: wordCount(output),
    }),
    [input, output]
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-bg via-[#1b1b1b] to-bg text-gray-100">
      {/* subtle radial spotlight */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-14">
        {/* Hero */}
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Humanize AI text with control
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent">
              HumanEdge AI
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300/90">
            Precision text refinement with adaptive tone, clarity, and regional nuance — engineered for consistent, human-level style.
          </p>
        </header>

        {/* Control Panel */}
        <section className="mb-8 rounded-2xl border border-[#2A2A2A]/70 bg-[#1C1C1C]/80 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="grid gap-4 p-5 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Preset</label>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                      style === s
                        ? "bg-accent text-white"
                        : "bg-slate-800/80 text-gray-300 hover:bg-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Fluency</label>
              <select
                value={fluency}
                onChange={(e) => setFluency(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm"
              >
                {fluencies.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Formality</label>
              <select
                value={formality}
                onChange={(e) => setFormality(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm"
              >
                {formalities.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-300">Imperfections (0–3)</label>
              <input
                type="number"
                min={0}
                max={3}
                value={errors}
                onChange={(e) =>
                  setErrors(Math.max(0, Math.min(3, Number(e.target.value) || 0)))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900/60 p-2 text-sm"
              />
            </div>

            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useContractions}
                onChange={(e) => setUseContractions(e.target.checked)}
              />
              <span>Use contractions</span>
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useMarkers}
                onChange={(e) => setUseMarkers(e.target.checked)}
              />
              <span>Add discourse markers / slang</span>
            </label>
          </div>
        </section>

        {/* Editors */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#2A2A2A]/70 bg-gradient-to-b from-[#141414]/80 to-[#0F0F0F]/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-text">Input</h2>
              <div className="text-xs text-gray-400">Sentences: {counts.inS} | Words: {counts.inW}</div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-64 w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#1E1E1E]/80 p-4 text-sm text-[#EAEAEA] placeholder:text-dim outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="Paste draft text here..."
            />
          </div>

          <div className="rounded-2xl border border-[#2A2A2A]/70 bg-gradient-to-b from-[#141414]/80 to-[#0F0F0F]/60 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-text">Output</h2>
              <div className="text-xs text-gray-400">Sentences: {counts.outS} | Words: {counts.outW}</div>
            </div>
            <textarea
              value={output}
              readOnly
              className="h-64 w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#1E1E1E]/80 p-4 text-sm text-[#EAEAEA] placeholder:text-dim focus:border-accent"
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleRewrite}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition transform hover:scale-[1.03] hover:bg-accent2 hover:shadow-[0_0_20px_rgba(233,102,36,0.35)] focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Working…" : "Rewrite with texture"}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-slate-200 transition hover:bg-[#202020] focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                Copy
              </button>
            </div>
            {msg && (
              <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                {msg}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
