#!/usr/bin/env node
//
// npm run ai-context -- 5
// npm run ai-context -- 5 --name "Marko" --level "I am new to programming"
//
// Output: ai-context/epic-5.md (not committed to Git).
// Attach it to a NEW chat and send:
// "Read the attached file. Follow the instructions in part 1."

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const epics = require("./ai-context.config");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "ai-context");
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "ai-context",
]);

const WARN_TOKENS = 40000;

// ---------- read the command line ----------

const parseArgs = (argv) => {
  const args = {
    epic: null,
    name: null,
    level: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--epic") {
      args.epic = argv[++i];
    } else if (arg === "--name") {
      args.name = argv[++i];
    } else if (arg === "--level") {
      args.level = argv[++i];
    } else if (/^\d+$/.test(arg)) {
      args.epic = arg;
    }
  }

  return args;
};

// ---------- small file helpers ----------

const abs = (rel) => path.join(ROOT, rel);

const exists = (rel) => fs.existsSync(abs(rel));

const read = (rel) => fs.readFileSync(abs(rel), "utf8");

// All files inside a folder (recursive), as repo-relative paths

const filesInFolder = (relDir) => {
  const found = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {
      withFileTypes: true,
    })) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else {
        found.push(
          path.relative(ROOT, full)
            .split(path.sep)
            .join("/")
        );
      }
    }
  };

  if (fs.existsSync(abs(relDir))) {
    walk(abs(relDir));
  }

  return found.sort();
};

// The repository file list.
// Uses Git when possible, so ignored files are left out.

const fileList = () => {
  try {
    const out = execSync("git ls-files", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (out.trim()) return out.trim();
  } catch {
    // Not a Git repository: walk the folders instead.
  }

  return filesInFolder(".")
    .filter(
      (f) =>
        !isSecret(f) &&
        !f.endsWith("package-lock.json")
    )
    .join("\n");
};

const languageFor = (file) => {
  const ext = path.extname(file).slice(1);

  return (
    {
      js: "js",
      jsx: "jsx",
      ts: "ts",
      tsx: "tsx",
      json: "json",
      md: "markdown",
      dbml: "dbml",
      css: "css",
      html: "html",
    }[ext] || ""
  );
};

// Never put secrets in the context file.

const isSecret = (file) => {
  const normalized = file.replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (base === ".env.example") return false;

  if (
    base === ".env" ||
    base.startsWith(".env.")
  ) {
    return true;
  }

  if (
    /(^|\/)(secrets?|credentials?)(\/|$)/i.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\.(pem|key|p12|pfx)$/i.test(base)
  ) {
    return true;
  }

  return false;
};

// ---------- the DBML part ----------

// Returns { name: blockText } for every Table and Enum block.

const dbmlBlocks = (source) => {
  const blocks = {
    tables: {},
    enums: {},
  };

  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(
      /^(Table|Enum)\s+([A-Za-z_][\w]*)/
    );

    if (!match) continue;

    let depth = 0;
    const start = i;

    for (; i < lines.length; i++) {
      depth += (lines[i].match(/{/g) || []).length;
      depth -= (lines[i].match(/}/g) || []).length;

      if (
        depth === 0 &&
        lines[i].includes("}")
      ) {
        break;
      }
    }

    const text = lines
      .slice(start, i + 1)
      .join("\n");

    const category =
      match[1] === "Table" ? "tables" : "enums";

    blocks[category][match[2]] = text;
  }

  return blocks;
};

const dbmlSection = (tableNames) => {
  const rel = "docs/ebeba.dbml";

  if (!exists(rel)) {
    return {
      text: "(docs/ebeba.dbml not found)",
      missing: [rel],
    };
  }

  const { tables, enums } = dbmlBlocks(read(rel));

  const missing = tableNames
    .filter((name) => !tables[name])
    .map((name) => `DBML table ${name}`);

  const chosen = tableNames
    .filter((name) => tables[name])
    .map((name) => tables[name]);

  // Add every enum used by a chosen table.

  const usedEnums = Object.keys(enums).filter(
    (enumName) =>
      chosen.some((table) =>
        new RegExp(
          `^\\s+\\w+\\s+${enumName}\\b`,
          "m"
        ).test(table)
      )
  );

  const text = [
    ...usedEnums.map((e) => enums[e]),
    ...chosen,
  ].join("\n\n");

  return { text, missing };
};

// ---------- the main prompt from AI-PROMPT.md ----------

const mainPrompt = (epic, args) => {
  const source = read("AI-PROMPT.md")
    .replace(/\r\n?/g, "\n");

  // Find the main prompt heading.
  // Supports:
  // ## 1.Main prompt
  // ## 1. Main prompt (once per chat)

  const heading = source.match(
    /^##\s*1\.\s*Main prompt[^\n]*$/im
  );

  if (!heading) {
    throw new Error(
      "Could not find the main prompt heading in AI-PROMPT.md"
    );
  }

  // Extract everything up to section 2.

  const remaining = source
    .slice(heading.index + heading[0].length)
    .trim();

  const nextSection = remaining.search(
    /^##\s*2\.\s/m
  );

  const section =
    nextSection === -1
      ? remaining
      : remaining.slice(0, nextSection);

  // Support fenced and plain Markdown prompts.

  const fenced = section.match(
    /```(?:text|md|markdown)?[ \t]*\n([\s\S]*?)```/i
  );

  const prompt = (
    fenced ? fenced[1] : section
  ).trim();

  if (!prompt) {
    throw new Error(
      "The main prompt section in AI-PROMPT.md is empty"
    );
  }

  return prompt
    .replace(
      "[your name]",
      args.name || "[your name]"
    )
    .replace(
      /\[for example:\s*"I am new to programming"\s*\/\s*"I know JavaScript well"\]/,
      args.level || "[your level]"
    )
    .replace(
      /\[for example:\s*"Epic \d+[^"]*"\]/,
      epic.title
    )
    .trim();
};

// ---------- build the file ----------

const build = () => {
  const args = parseArgs(
    process.argv.slice(2)
  );

  const epic = epics[args.epic];

  if (!epic) {
    console.error(
      "Tell me your epic number, for example: npm run ai-context -- 5"
    );

    console.error(
      "Epics: " +
        Object.entries(epics)
          .map(
            ([n, e]) =>
              `${n} = ${e.title}`
          )
          .join("\n        ")
    );

    process.exit(1);
  }

  const missing = [];
  const parts = [];

  // Safely embed file contents in Markdown.

  const fileBlock = (rel) => {
    if (isSecret(rel)) return "";

    const content = read(rel).trimEnd();
    const lang = languageFor(rel);

    const fence = "````";

    return (
      `### File: ${rel}\n\n` +
      `${fence}${lang}\n` +
      `${content}\n` +
      `${fence}`
    );
  };

  // Part 1: Instructions

  parts.push(
    `# AI context – ${epic.title}\n\n` +
      `Built ${new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", " ")} UTC.`
  );

  parts.push(
    `## Part 1: Instructions for the AI\n\n` +
      mainPrompt(epic, args)
  );

  // Part 2: Rules

  parts.push(
    `## Part 2: CONVENTIONS.md (our rules)\n\n` +
      read("CONVENTIONS.md").trim()
  );

  // Part 3: Stories

  if (exists(epic.epicFile)) {
    parts.push(
      `## Part 3: My epic and stories (${epic.epicFile})\n\n` +
        read(epic.epicFile).trim()
    );
  } else {
    missing.push(epic.epicFile);

    parts.push(
      "## Part 3: My epic and stories\n\n" +
        "(The epic file was not found. I will paste my story in the chat.)"
    );
  }

  // Part 4: Data model

  const dbml = dbmlSection(
    epic.dbmlTables
  );

  missing.push(...dbml.missing);

  parts.push(
    "## Part 4: Data model for my collections " +
      "(from docs/ebeba.dbml)\n\n" +
      "```dbml\n" +
      dbml.text +
      "\n```"
  );

  // Part 5: Repository file list

  parts.push(
    "## Part 5: All files in the repository\n\n" +
      "```text\n" +
      fileList() +
      "\n```"
  );

  // Part 6: Shared files

  const shared = epic.sharedFiles.filter(
    (f) => {
      if (isSecret(f)) {
        missing.push(
          `Excluded secret file: ${f}`
        );
        return false;
      }

      if (exists(f)) return true;

      missing.push(f);
      return false;
    }
  );

  parts.push(
    "## Part 6: Shared code to USE and examples " +
      "to COPY THE STYLE from\n\n" +
      "Do not change these files unless my story says so.\n\n" +
      shared
        .map(fileBlock)
        .filter(Boolean)
        .join("\n\n")
  );

  // Part 7: Own files

  const own = [
    ...new Set(
      epic.ownFiles.flatMap(
        (entry) =>
          entry.endsWith("/")
            ? filesInFolder(entry)
            : exists(entry)
              ? [entry]
              : []
      )
    ),
  ].filter(
    (f) =>
      !isSecret(f) &&
      !shared.includes(f)
  );

  parts.push(
    "## Part 7: My code from earlier stories " +
      "(newest version)\n\n" +
      (own.length
        ? own
            .map(fileBlock)
            .filter(Boolean)
            .join("\n\n")
        : "None yet. This is my first story.")
  );

  // Write output

  const output =
    parts.join("\n\n---\n\n") + "\n";

  fs.mkdirSync(OUT_DIR, {
    recursive: true,
  });

  const outFile = path.join(
    OUT_DIR,
    `epic-${args.epic}.md`
  );

  fs.writeFileSync(
    outFile,
    output,
    "utf8"
  );

  // ---------- report ----------

  const tokens = Math.round(
    output.length / 4
  );

  console.log(
    `\nDone: ${path.relative(ROOT, outFile)}`
  );

  console.log(
    `Shared files: ${shared.length} · ` +
      `Your files: ${own.length} · ` +
      `About ${tokens.toLocaleString("en")} tokens`
  );

  if (missing.length) {
    console.log(
      "\nNot found (OK if nobody has created them yet):"
    );

    for (const m of missing) {
      console.log("  - " + m);
    }
  }

  if (tokens > WARN_TOKENS) {
    console.log(
      "\nThis file is large. If your AI says " +
        "it is too long, start a new chat " +
        "and paste your story only."
    );
  }

  console.log(
    '\nNext: open a NEW chat, attach the file, and send:\n' +
      '  "Read the attached file. Follow the instructions in part 1."\n'
  );
};

build();
