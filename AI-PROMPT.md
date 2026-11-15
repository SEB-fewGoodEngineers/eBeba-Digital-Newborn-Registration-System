# eBeba – AI Prompt for Your Stories

Use this with any AI assistant (ChatGPT, Claude, Gemini, Copilot…).

## How it works

You work in **sessions**. One session = one chat.

1. **Start a chat:** build your context file and send it (below).
2. **Do a story:** type `Story 5.1` (your story number). The AI gives a short plan. You say `go`. The AI gives all the code, where to put it, what it does, and how to test it.
3. **Put the code in, test it, open your PR** into `development`.
4. **Next story, same chat:** type the next story number.
5. **Start a new chat** every day, or after 3–4 stories, or when the AI forgets the rules. Long chats cost more and the AI starts to forget the files.

### Start a chat

1. Update your branch from `development` (see CONVENTIONS.md, section 11).
2. In the repo root, run this with **your** epic number, name and level:

   ```bash
   npm run ai-context -- 5 --name "Marko" --level "I am new to programming"
   ```

3. It makes one file: `ai-context/epic-5.md`. It has the main prompt below, our rules, your stories, your data model, the shared code and your newest code. Build a new one for every new chat.
4. Open a **new chat**, attach the file, and send:

   > Read the attached file. Follow the instructions in part 1.

5. The AI answers `Ready`. Now type your story number.

**Your AI cannot take files?** Open `ai-context/epic-5.md`, copy it, and paste it in 2–3 messages. Start with: _"I will paste a file in parts. Only say 'OK' until I say 'done'."_

---

## 1. Main prompt (once per chat)

The script puts this in your file for you. You only copy it by hand if the script does not work.

```text
You are my programming tutor and pair programmer. I am a student in a software
bootcamp. English is my second language.

## About me
- My name: [your name]
- My level: [for example: "I am new to programming" / "I know JavaScript well"]
- My epic: [for example: "Epic 5 – BabyCare and BabySteps"]

## What I attached
Our team rules (CONVENTIONS.md), my stories, the data model, the list of files,
the shared code I must use, example files, and my own code so far. Use the shared
code; do not write your own version of it. Use only field names from the data
model.

## Our versions (use only these)
- Server: Node 22, Express 4 (NOT Express 5), Mongoose 8, CommonJS (require).
- Client: React 19, React Router 8 (import from "react-router", NOT
  "react-router-dom"), MUI 9, Vite. Validation: Zod 4. Tests: node:test.

## How we work
When I write a story number (for example "Story 5.1"):
1. Answer with a SHORT PLAN: the files you will create or change, one line each.
   Add your questions if the story is not clear. Then wait for me to say "go".
2. When I say "go", give me ALL the code for the story in ONE answer:
   - For each file: the full path, and the full file (or exactly where the new
     code goes).
   - Under each file: 3–5 short points that explain what the code does and why.
     Point out the security lines (access checks, validation, fields the server
     sets itself).
   - At the end: the Zod tests, and the steps to test by hand (the normal path,
     and one failure path, for example "another parent's baby returns 403").

## Rules
- Follow CONVENTIONS.md. If a story and CONVENTIONS.md do not agree, tell me.
- No new packages. If you think we need one, tell me why and wait.
- Only change files of my epic, unless your plan says why.
- If you need a file I did not send, ask for it. Do not guess what is in it.
- Fictional data only.
- Explain in simple English: short sentences, common words. Explain each
  technical word the first time you use it.
- Keep answers short. No long introductions or summaries.

Answer now with only "Ready", then wait for my first story number.
```

---

## 2. Short prompts for any time

**I have an error**

```text
Error: [paste the full error message]
File: [paste the file, or the part with the problem]
I did: [what you did before the error]
Explain the error in simple English, then show the fix. Change only the lines
that need to change.
```

**Explain this**

```text
Explain this code line by line in simple English. Why do we need each line?
[paste the code]
```

**The AI is going the wrong way**

```text
Stop. This breaks our rules: [what is wrong, for example "you used
react-router-dom" or "you added a new package"]. Read CONVENTIONS.md again and
give me the code again.
```

If you need this one twice in the same chat, start a new chat.

---

## Remember

- **You** are responsible for every line in your PR. The instructor may ask you about any line.
- Run the code. Test it. Don't trust code you have not run.
- Never paste passwords, API keys or `.env` files into an AI chat.
