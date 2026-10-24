# StageMate
AI-assisted academic project · Portfolio edition (2026)

**[View the original educational prototype](https://stage-mate-zeta.vercel.app/)**

StageMate helps students organise internship information from documents and loose notes. It can suggest tasks, deadlines and requirements, and answer questions using relevant passages from uploaded documents. The student must check the original source before acting on AI suggestions.

## Why I built it
I chose the AI is all around us elective at Avans University of Applied Sciences because I wanted to explore practical uses of AI. Our course assignment was to brainstorm a problem and create a prototype with at least two AI implementations.

At the time I was looking for an internship myself, and I value having a clear overview of tasks and deadlines. That inspired StageMate. The initial idea was discussed during a two-person school assignment.

## My contribution and how I used AI
I took responsibility for the technical implementation, prompts, GitHub/Vercel/Supabase/Groq integration, troubleshooting, AI testing, iterations and the majority of the coursework and documentation. My project partner participated in early brainstorming, discussions and reviews. The hands-on technical work and most documentation were primarily mine.

I used AI-assisted coding tools extensively: I described features and changes, reviewed generated output, tested the application, identified issues and iterated. I started with Bolt to create an initial prototype, then moved to a GitHub-based workflow when I ran into tool limitations. I do not claim that I manually wrote every line of code.

This was my first project using GitHub actively. I had been interested in version control because of its importance in software development; through StageMate I began learning how to work with repositories and connect code changes to deployments. I'm continuing to improve those skills.

## Main features
1. AI text analysis: structures loose internship notes into summaries and suggestions for tasks, deadlines, requirements and attention points.
2. Document-based AI Q&A: extracts readable text from documents, retrieves relevant passages and generates answers grounded in selected source context.
3. Manual task and document management: overview, priorities and deadlines. These supporting features are not additional AI implementations.

The initial concept evolved throughout the course; this repository shows the final educational prototype.

## Tech stack
- Frontend: React, TypeScript, Vite and Tailwind CSS.
- AI backend: Supabase Edge Functions calling Groq's API (model in the code: `openai/gpt-oss-20b`).
- Retrieval: document text is split and relevant chunks are selected before the AI receives a question and source context.
- Data: tasks and extracted document information are stored in the browser's localStorage; this is not a hosted user database.
- Original deployment: Vercel.

Flow: user text/document → frontend extraction and retrieval → Supabase Edge Function → Groq model → AI-generated suggestion/answer → human checks the source.

## Testing and what I learned
The first prototype looked finished before the document AI actually worked. That taught me to verify functionality rather than trust a polished interface. I tested vague dates, typos, conflicting information, missing answers and document-retrieval edge cases.

A user test with an internship student revealed usability issues around navigating from documents to AI questions, demo content and the distinction between source text and AI-formulated answers. I used the feedback to guide targeted improvements.

I deliberately kept StageMate human-in-the-loop: it suggests information but does not independently submit work, confirm official deadlines or make irreversible decisions.

## Limitations
- Educational prototype, not production-ready. Do not upload confidential internship or company information.
- No login or role-based access control. Data saved in the browser can be seen by someone using that same browser/device.
- No OCR: scanned/image-only PDFs may not be readable.
- AI answers may be wrong; sources, deadlines and ambiguous information require manual checking.
- Developed mainly for Dutch-language use; other languages have not been extensively tested.
- A local checkout needs its own correctly configured Supabase/Groq backend for live AI features. The repository contains no API credentials.

## Running locally
You need Node.js and npm installed.

1. Clone this repository or download the ZIP from GitHub and extract it.
2. Open a terminal in the folder containing `package.json`.
3. Install dependencies and start the development server:

```bash
npm install
npm run dev
```

4. Open the local address shown in the terminal (usually `http://localhost:5173`). Stop the server with `Ctrl+C`.

To check that the frontend can be built for production:

```bash
npm run build
```

On Windows PowerShell, if running `npm` is blocked by script execution policy, use `npm.cmd install`, `npm.cmd run dev` and `npm.cmd run build` instead.

The frontend can run locally, but the AI features need a separately configured Supabase backend and a server-side `GROQ_API_KEY`. No credentials are included. Never commit secrets or expose them in frontend code. For a working online demonstration, use the original educational prototype linked at the top of this README.

## Why this repository is separate
This is a cleaned-up portfolio copy of the original private school repository. It includes application code and essential configuration, but excludes internal course rubrics, week notes, prompt logs, assessment documents and the original commit history. It is not connected to the original Vercel deployment; the existing educational website and its backend remain unchanged.
