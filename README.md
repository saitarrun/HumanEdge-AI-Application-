# HumanEdge AI

This app improves clarity, flow, and tone **without** altering meaning, and includes:
- Metrics (readability, sentence variance, repetition, passive voice flags)
- Paraphrase similarity to a source (character trigram Jaccard)
- Citation/quotation checklist
- OpenRouter-based rewrite endpoint for quality edits
- Dockerized stack

> **Note**: This project is not designed to evade detectors. Use it to produce clear, accurate writing and cite properly.

## Local
```bash
npm install
cp .env.example .env.local
# add your OPENROUTER_API_KEY
npm run dev
```
Open http://localhost:3000

## Docker
```bash
export OPENROUTER_API_KEY=sk-or-v1-yourkey
docker compose up --build
```

## Environment
- `OPENROUTER_API_KEY` (required for /api/rewrite)
