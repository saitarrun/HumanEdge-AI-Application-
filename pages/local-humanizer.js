
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { humanizeAdvanced } from "../utils/humanTexture";

function sentenceCount(t) {
  return (t || "").split(/(?<=[.!?])\s+/).filter(s => s.trim().length).length;
}
function wordCount(t) {
  return (t || "").trim() ? (t || "").trim().split(/\s+/).length : 0;
}

export default function LocalHumanizer() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [metadata, setMetadata] = useState(null);

  // Human texture controls from humanizeAdvanced
  const [region, setRegion] = useState("US");
  const [formality, setFormality] = useState("neutral");
  const [fluency, setFluency] = useState("native");
  const [errors, setErrors] = useState(0);
  const [seed, setSeed] = useState("default-seed");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const formalities = ["neutral", "formal", "casual", "technical", "marketing", "academic"];
  const regions = ["US", "UK", "AU", "IN"];
  const fluencies = ["native", "near-native", "esl-light"];

  function handleRewrite() {
    setLoading(true);
    setMsg("");
    try {
      // Direct call to the local function
      const result = humanizeAdvanced(input, {
        region,
        formality,
        fluency,
        errors,
        seed,
      });

      if (!result.meta.ok) {
        throw new Error(`Processing failed: Similarity score (${result.meta.similarity.toFixed(2)}) is below the target threshold.`);
      }

      setOutput(result.text);
      setMetadata(result.meta);

    } catch (e) {
      setMsg(e.message || "Rewrite failed");
      setOutput("");
      setMetadata(null);
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
    <div className="min-h-screen bg-[#0d1117] text-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Client-Side Humanizer</h1>
          <p className="text-sm text-gray-400">
            Instant, in-browser text transformation. No API calls.
          </p>
          <nav className="mt-4">
            <Link href="/">
              <a className="text-blue-400 hover:underline">Switch to API Version</a>
            </Link>
          </nav>
        </header>

        {/* Texture controls */}
        <div className="grid md:grid-cols-4 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700">
          <div>
            <label className="block text-sm mb-1">Formality / Preset</label>
            <select
              value={formality}
              onChange={(e) => setFormality(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2"
            >
              {formalities.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2"
            >
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Fluency</label>
            <select
              value={fluency}
              onChange={(e) => setFluency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2"
            >
              {fluencies.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Imperfections (0–3)</label>
            <input
              type="number"
              min={0}
              max={3}
              value={errors}
              onChange={(e) => setErrors(Math.max(0, Math.min(3, Number(e.target.value) || 0)))}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2"
            />
          </div>
           <div>
            <label className="block text-sm mb-1">Seed (for reproducibility)</label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2"
            />
          </div>
        </div>

        {/* Editors */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
            <h2 className="text-lg mb-2">Input</h2>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-64 bg-slate-800 p-3 rounded text-gray-100 border border-slate-700"
              placeholder="Paste text here..."
            />
            <div className="text-xs text-gray-400 mt-2">
              Sentences: {counts.inS} | Words: {counts.inW}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
            <h2 className="text-lg mb-2">Output</h2>
            <textarea
              value={output}
              readOnly
              className="w-full h-64 bg-slate-800 p-3 rounded text-gray-100 border border-slate-700"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleRewrite}
                disabled={loading}
                className="bg-blue-600 px-4 py-2 rounded"
              >
                {loading ? "Working..." : "Humanize"}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="border px-4 py-2 rounded"
              >
                Copy
              </button>
            </div>
            {msg && <p className="text-red-400 text-sm mt-3 whitespace-pre-wrap">{msg}</p>}
            <div className="text-xs text-gray-400 mt-2">
              Sentences: {counts.outS} | Words: {counts.outW}
            </div>
          </div>
        </div>

        {metadata && (
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
            <h2 className="text-lg mb-2">Metadata</h2>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}
