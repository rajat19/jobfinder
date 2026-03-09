# 🚀 AI Job Finder

AI Job Finder is a full-stack Next.js application that intelligently matches your resume to jobs across multiple platforms (Indeed, LinkedIn, Instahyre) in real-time.

It leverages:
- **Local AI Parsing**: Uses your local Ollama instance (or configurable LLM) via our internal AI wrapper to parse your PDF resume entirely on your machine.
- **Concurrent Web Scraping**: Uses Playwright to navigate bypass anti-bot protections and fetch real-time jobs concurrently.
- **Intelligent Matching**: Uses generative AI to score each job against your parsed resume skills, extracting matched/missing skills.
- **Modern UI**: Built with React, Tailwind CSS v3, and Shadcn UI, featuring a soothing light and dark mode, beautifully animated cards, and Server-Sent Events (SSE) for streaming job results instantly.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v3, Shadcn UI
- **Scraping**: Playwright, Cheerio
- **AI Integration**: Ollama (`@rajat19/aiwrap`)
- **PDF Extraction**: `pdf-parse`

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js** (v18+)
- **Ollama** running locally (for offline, private resume parsing and job matching). Install from [ollama.com](https://ollama.com/).
  ```bash
  ollama run llama3.2 # Ensure you have a model pulled
  ```
- Install Playwright browsers:
  ```bash
  npx playwright install chromium
  ```

### 2. Environment Variables
Create a `.env.local` file in the root:
```env
# Optional: Set your Ollama details if different from defaults
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
GITHUB_TOKEN=your_github_pat_for_packages
```

### 3. Run the Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser. Upload your PDF resume, fill in your search parameters, and watch the AI find your best matches!
