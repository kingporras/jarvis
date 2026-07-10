#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const outputDir = path.join(repoRoot, ".jarvis-imports");
const previewJsonPath = path.join(outputDir, "obsidian-import-preview.json");
const reportPath = path.join(outputDir, "obsidian-import-report.md");
const tempSqlPath = path.join(outputDir, ".obsidian-import-apply.sql");

const DB_NAME = "jarvis-db";
const CONFIRM_TOKEN = "APPLY_OBSIDIAN_IMPORT";
const LEGACY_OWNER = "__legacy_unowned__";
const MAX_NOTES = 300;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const MAX_NOTE_BYTES = 200 * 1024;

const TABLES_WITH_OWNER = [
  "projects",
  "tasks",
  "memory_items",
  "decisions",
  "persons",
  "reminders",
  "action_executions",
];

const BASE_PROJECTS = [
  {
    name: "JARVIS",
    aliases: ["jarvis"],
  },
  {
    name: "JANUS",
    aliases: ["janus", "raspberry", "piper", "ollama"],
  },
  {
    name: "Inter de Verdún / IDV",
    aliases: ["idv", "inter de verdun", "inter de verdun / idv", "inter de verdun idv"],
  },
  {
    name: "OkGreen",
    aliases: ["okgreen", "ok green"],
  },
  {
    name: "IA Local Lenovo",
    aliases: ["lenovo", "ia local", "ia local lenovo"],
  },
  {
    name: "Obsidian / Segundo Cerebro",
    aliases: ["obsidian", "segundo cerebro", "segundo cerebro obsidian"],
  },
];

const PROJECT_MAPPINGS = [
  ["janus", "JANUS"],
  ["raspberry", "JANUS"],
  ["piper", "JANUS"],
  ["ollama", "JANUS"],
  ["jarvis", "JARVIS"],
  ["idv", "Inter de Verdún / IDV"],
  ["inter de verdun", "Inter de Verdún / IDV"],
  ["okgreen", "OkGreen"],
  ["lenovo", "IA Local Lenovo"],
  ["ia local", "IA Local Lenovo"],
  ["obsidian", "Obsidian / Segundo Cerebro"],
  ["segundo cerebro", "Obsidian / Segundo Cerebro"],
];

const IGNORED_DIRS = new Set([
  ".obsidian",
  ".trash",
  "node_modules",
  ".git",
  "attachments",
  "assets",
  "imagenes",
  "images",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
]);

const MEMORY_LABEL_TYPES = new Map([
  ["memoria", "knowledge"],
  ["recordar", "knowledge"],
  ["contexto", "project"],
  ["estado", "task_context"],
  ["arquitectura", "system"],
  ["decision tomada", "decision"],
  ["regla", "system"],
]);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exit(1);
});

async function main() {
  validateArgs(args);
  await ensureOutputDir();

  const startedAt = nowIso();
  const vaultRoot = await safeRealPath(args.vault);
  assertInsideAllowedRoot(vaultRoot, vaultRoot, "vault");

  const notes = await readVault(vaultRoot);
  const ownerState = await inspectOwner(args.target);
  const blockers = [];
  const warnings = [...notes.warnings];
  const existing = emptyExistingState();

  if (ownerState.owners.length === 0) {
    blockers.push("No JARVIS owner found in D1. Create one manual JARVIS item first, then rerun preview.");
  } else if (ownerState.owners.length > 1) {
    blockers.push("More than one JARVIS owner found in D1. Import aborted to avoid mixing users.");
  } else {
    Object.assign(existing, await loadExistingState(args.target, ownerState.owners[0].owner));
  }

  const extraction = buildImportPlan(notes.items, existing);
  warnings.push(...extraction.warnings);

  const snapshot = buildSnapshot({
    startedAt,
    mode: args.mode,
    target: args.target,
    vaultRoot,
    notes,
    ownerState,
    existing,
    extraction,
    blockers,
    warnings,
  });

  await writePreviewFiles(snapshot);
  printSummary(snapshot, ownerState);

  if (blockers.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (args.mode === "preview") {
    return;
  }

  if (args.confirm !== CONFIRM_TOKEN) {
    throw new Error(`Apply requires --confirm ${CONFIRM_TOKEN}`);
  }

  const applyResult = await applyPlan({
    target: args.target,
    ownerSubject: ownerState.owners[0].owner,
    plan: extraction,
    existing,
  });

  snapshot.apply = applyResult;
  await writePreviewFiles(snapshot);
  printApplySummary(applyResult);
}

function parseArgs(argv) {
  const parsed = {
    vault: "",
    mode: "",
    target: "local",
    confirm: "",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--help" || value === "-h") {
      parsed.help = true;
      continue;
    }

    if (value === "--vault") {
      parsed.vault = argv[++index] ?? "";
      continue;
    }

    if (value === "--mode") {
      parsed.mode = argv[++index] ?? "";
      continue;
    }

    if (value === "--target") {
      parsed.target = argv[++index] ?? "";
      continue;
    }

    if (value === "--confirm") {
      parsed.confirm = argv[++index] ?? "";
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  return parsed;
}

function validateArgs(parsed) {
  if (!parsed.vault) {
    throw new Error("Missing --vault path");
  }

  if (!["preview", "apply"].includes(parsed.mode)) {
    throw new Error("Missing or invalid --mode. Use preview or apply.");
  }

  if (!["local", "remote"].includes(parsed.target)) {
    throw new Error("Missing or invalid --target. Use local or remote.");
  }

  if (parsed.mode === "apply" && parsed.confirm !== CONFIRM_TOKEN) {
    throw new Error(`Apply requires --confirm ${CONFIRM_TOKEN}`);
  }

  if (parsed.mode === "preview" && parsed.confirm && parsed.confirm !== CONFIRM_TOKEN) {
    throw new Error("Invalid --confirm value");
  }
}

function printHelp() {
  console.log(`Local Obsidian importer for JARVIS

Usage:
  node scripts/obsidian-importer.mjs --vault "C:\\Users\\nayar\\Documents\\Obsidian Vault" --mode preview
  node scripts/obsidian-importer.mjs --vault "C:\\Users\\nayar\\Documents\\Obsidian Vault" --mode apply --target local --confirm ${CONFIRM_TOKEN}
  node scripts/obsidian-importer.mjs --vault "C:\\Users\\nayar\\Documents\\Obsidian Vault" --mode apply --target remote --confirm ${CONFIRM_TOKEN}

Options:
  --vault     Absolute path to the Obsidian vault.
  --mode      preview or apply. Preview never writes to D1.
  --target    local or remote. Defaults to local.
  --confirm   Required for apply: ${CONFIRM_TOKEN}
`);
}

async function ensureOutputDir() {
  await mkdir(outputDir, { recursive: true });
}

async function safeRealPath(inputPath) {
  const resolved = path.resolve(inputPath);

  if (!existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }

  const stats = await stat(resolved);

  if (!stats.isDirectory()) {
    throw new Error(`Vault path is not a directory: ${resolved}`);
  }

  return resolved;
}

function assertInsideAllowedRoot(candidate, root, label) {
  const relative = path.relative(root, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escaped allowed root: ${candidate}`);
  }
}

async function readVault(vaultRoot) {
  const state = {
    items: [],
    ignored: [],
    warnings: [],
    totalBytes: 0,
  };

  await walkVault(vaultRoot, vaultRoot, state);

  return {
    items: state.items,
    ignored: state.ignored,
    warnings: state.warnings,
    totalBytes: state.totalBytes,
  };
}

async function walkVault(currentDir, vaultRoot, state) {
  assertInsideAllowedRoot(currentDir, vaultRoot, "vault scan");
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = toVaultPath(path.relative(vaultRoot, absolutePath));
    const lowerName = entry.name.toLowerCase();

    if (entry.isSymbolicLink()) {
      state.ignored.push({ path: relativePath, reason: "symlink" });
      continue;
    }

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(lowerName)) {
        state.ignored.push({ path: relativePath, reason: "ignored_directory" });
        continue;
      }

      await walkVault(absolutePath, vaultRoot, state);
      continue;
    }

    if (!entry.isFile()) {
      state.ignored.push({ path: relativePath, reason: "not_file" });
      continue;
    }

    const ext = path.extname(lowerName);

    if (IGNORED_EXTENSIONS.has(ext)) {
      state.ignored.push({ path: relativePath, reason: "ignored_extension" });
      continue;
    }

    if (ext !== ".md") {
      state.ignored.push({ path: relativePath, reason: "not_markdown" });
      continue;
    }

    const fileStats = await stat(absolutePath);

    if (fileStats.size > MAX_NOTE_BYTES) {
      throw new Error(`Markdown note exceeds 200 KB limit: ${relativePath}`);
    }

    if (state.items.length + 1 > MAX_NOTES) {
      throw new Error(`Vault scan exceeds ${MAX_NOTES} markdown notes. Filter by subfolder and retry.`);
    }

    if (state.totalBytes + fileStats.size > MAX_TOTAL_BYTES) {
      throw new Error("Vault scan exceeds 5 MB markdown limit. Filter by subfolder and retry.");
    }

    const raw = await readFile(absolutePath, "utf8");
    state.items.push(parseNote({ raw, relativePath, absolutePath }));
    state.totalBytes += fileStats.size;
  }
}

function parseNote({ raw, relativePath, absolutePath }) {
  const content = raw.replace(/^\uFEFF/, "");
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    relativePath,
    absolutePath,
    title: path.basename(relativePath, path.extname(relativePath)),
    frontmatter,
    body,
    headings: collectHeadings(body),
  };
}

function parseFrontmatter(content) {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const lines = content.split(/\r?\n/);
  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const frontmatter = {};

  for (const line of frontmatterLines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    const key = match[1].trim().toLowerCase();
    let value = match[2].trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (value.includes(",") && key === "tags") {
      value = value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body: lines.slice(endIndex + 1).join("\n") };
}

function collectHeadings(body) {
  return body
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^#{1,6}\s+/.test(line))
    .map(({ line, index }) => ({
      line: index + 1,
      heading: cleanMarkdown(line.replace(/^#{1,6}\s+/, "")),
    }));
}

function buildImportPlan(notes, existing) {
  const warnings = [];
  const duplicates = [];
  const candidates = {
    projects: buildProjectCandidates(existing),
    tasks: [],
    memory: [],
    decisions: [],
    reminders: [],
  };
  const projectIdsByName = new Map(candidates.projects.map((project) => [project.name, project.id]));

  for (const note of notes) {
    const noteProject = detectProject(note);
    const extracted = extractCandidatesFromNote(note, noteProject);
    candidates.tasks.push(...extracted.tasks);
    candidates.memory.push(...extracted.memory);
    candidates.decisions.push(...extracted.decisions);
    candidates.reminders.push(...extracted.reminders);
    warnings.push(...extracted.warnings);
  }

  for (const type of ["tasks", "memory", "decisions", "reminders"]) {
    const deduped = dedupeById(candidates[type], duplicates);
    candidates[type] = markExisting(
      deduped.map((item) => ({
        ...item,
        projectId: projectIdsByName.get(item.project) ?? deterministicId("project", item.project),
      })),
      existing,
      type,
    );
  }

  return {
    candidates,
    warnings,
    duplicates,
    counts: countPlan(candidates),
  };
}

function buildProjectCandidates(existing) {
  return BASE_PROJECTS.map((project) => {
    const existingProject = findExistingProject(project.name, existing);
    const id = existingProject?.id ?? deterministicId("project", project.name);

    return {
      kind: "project",
      id,
      name: project.name,
      operation: existingProject ? "skipped_existing" : "create",
      source: "base_project",
      warnings: [],
    };
  });
}

function extractCandidatesFromNote(note, projectName) {
  const lines = note.body.split(/\r?\n/);
  const tasks = [];
  const memory = [];
  const decisions = [];
  const reminders = [];
  const warnings = [];
  let currentHeading = "";

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (/^#{1,6}\s+/.test(line)) {
      currentHeading = cleanMarkdown(line.replace(/^#{1,6}\s+/, ""));
      const headingMemory = extractHeadingMemory(lines, index, note, projectName, currentHeading);

      if (headingMemory) {
        memory.push(headingMemory);
      }

      continue;
    }

    if (/^\s*[-*]\s+\[[xX]\]/.test(rawLine)) {
      continue;
    }

    const taskTitle = extractTaskTitle(rawLine);
    if (taskTitle) {
      tasks.push(makeTaskCandidate(note, projectName, currentHeading, taskTitle));
      continue;
    }

    const memoryCandidate = extractLabelMemory(rawLine, note, projectName, currentHeading, lines, index);
    if (memoryCandidate) {
      memory.push(memoryCandidate);
      continue;
    }

    const decisionCandidate = extractDecision(rawLine, note, projectName, currentHeading);
    if (decisionCandidate) {
      decisions.push(decisionCandidate);
      continue;
    }

    const reminderCandidate = extractReminder(rawLine, note, projectName, currentHeading);
    if (reminderCandidate.candidate) {
      reminders.push(reminderCandidate.candidate);
    }

    warnings.push(...reminderCandidate.warnings);
  }

  return { tasks, memory, decisions, reminders, warnings };
}

function extractTaskTitle(rawLine) {
  const checkbox = rawLine.match(/^\s*[-*]\s+\[\s\]\s+(.+)$/);

  if (checkbox) {
    return cleanMarkdown(checkbox[1]);
  }

  const label = rawLine.match(/^\s*(?:[-*]\s*)?(?:TODO|Pendiente|Proximo paso|Proximo paso|Pr[oó]ximo paso):\s*(.+)$/i);

  return label ? cleanMarkdown(label[1]) : "";
}

function makeTaskCandidate(note, projectName, heading, title) {
  const cleanTitle = truncate(title, 160);
  const dueAt = parseClearDate(title)?.date ?? null;
  const priority = priorityFromText(title);
  const id = deterministicId("task", projectName, note.relativePath, heading, cleanTitle);

  return {
    kind: "task",
    id,
    title: cleanTitle,
    notes: sourceNote(note, heading),
    priority,
    dueAt,
    project: projectName,
    sourceFile: note.relativePath,
    sourceHeading: heading || null,
    operation: "create",
    warnings: [],
  };
}

function extractLabelMemory(rawLine, note, projectName, heading, lines, index) {
  const match = rawLine.match(/^\s*(Memoria|Recordar|Contexto|Estado|Arquitectura|Decision tomada|Decisi[oó]n tomada|Regla):\s*(.*)$/i);

  if (!match) {
    return null;
  }

  const label = normalizeText(match[1]);
  const inline = cleanMarkdown(match[2] ?? "");
  const content = inline || collectFollowingBlock(lines, index + 1);

  if (!isUsefulMemory(content)) {
    return null;
  }

  return makeMemoryCandidate({
    note,
    projectName,
    heading,
    label,
    content,
  });
}

function extractHeadingMemory(lines, index, note, projectName, heading) {
  const normalizedHeading = normalizeText(heading);
  const label = [...MEMORY_LABEL_TYPES.keys()].find((candidate) => normalizedHeading === candidate);

  if (!label) {
    return null;
  }

  const content = collectFollowingBlock(lines, index + 1);

  if (!isUsefulMemory(content)) {
    return null;
  }

  return makeMemoryCandidate({
    note,
    projectName,
    heading,
    label,
    content,
  });
}

function makeMemoryCandidate({ note, projectName, heading, label, content }) {
  const memoryType = MEMORY_LABEL_TYPES.get(label) ?? "knowledge";
  const cleanContent = truncate(sanitizeText(cleanMarkdown(content)), 2000);
  const title = truncate(`${titleCase(label)} - ${firstWords(cleanContent, 10)}`, 180);
  const id = deterministicId("memory", projectName, note.relativePath, heading, label, cleanContent);

  return {
    kind: "memory",
    id,
    title,
    content: cleanContent,
    type: memoryType,
    priority: priorityFromText(cleanContent),
    status: "active",
    source: "manual",
    confidence: 0.66,
    expiresAt: null,
    reviewDueAt: null,
    project: projectName,
    sourceFile: note.relativePath,
    sourceHeading: heading || null,
    operation: "create",
    warnings: [],
  };
}

function extractDecision(rawLine, note, projectName, heading) {
  const match = rawLine.match(/^\s*(Decision|Decisi[oó]n|Decidido|Acordado):\s*(.+)$/i);

  if (!match) {
    return null;
  }

  const text = sanitizeText(cleanMarkdown(match[2]));
  const status = /\b(decidido|aprobado|completado|acordado)\b/i.test(rawLine) ? "decided" : "open";
  const parsedDate = parseClearDate(rawLine);
  const title = truncate(firstWords(text, 14), 180);
  const id = deterministicId("decision", projectName, note.relativePath, heading, text);

  return {
    kind: "decision",
    id,
    title,
    context: truncate(text, 2000),
    outcome: null,
    rationale: null,
    status,
    priority: priorityFromText(text),
    decidedAt: status === "decided" ? parsedDate?.timestamp ?? nowIso() : "",
    project: projectName,
    sourceFile: note.relativePath,
    sourceHeading: heading || null,
    operation: "create",
    warnings: [],
  };
}

function extractReminder(rawLine, note, projectName, heading) {
  const match = rawLine.match(/^\s*(Recordatorio|Reminder|Aviso):\s*(.+)$/i);

  if (!match) {
    return { candidate: null, warnings: [] };
  }

  const text = sanitizeText(cleanMarkdown(match[2]));
  const parsedDate = parseClearDate(text);

  if (!parsedDate) {
    return {
      candidate: null,
      warnings: [`Reminder skipped without clear date: ${note.relativePath}${heading ? `#${heading}` : ""}`],
    };
  }

  const title = truncate(stripDateText(text), 180) || "Recordatorio Obsidian";
  const id = deterministicId("reminder", projectName, note.relativePath, heading, text);

  return {
    candidate: {
      kind: "reminder",
      id,
      title,
      notes: sourceNote(note, heading),
      dueAt: parsedDate.timestamp,
      priority: priorityFromText(text),
      status: "pending",
      project: projectName,
      sourceFile: note.relativePath,
      sourceHeading: heading || null,
      operation: "create",
      warnings: [],
    },
    warnings: [],
  };
}

function collectFollowingBlock(lines, startIndex) {
  const collected = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^#{1,6}\s+/.test(line)) {
      break;
    }

    if (!line.trim()) {
      if (collected.length > 0) {
        break;
      }

      continue;
    }

    collected.push(cleanMarkdown(line));

    if (collected.join(" ").length > 2000) {
      break;
    }
  }

  return collected.join("\n");
}

function isUsefulMemory(content) {
  const clean = cleanMarkdown(content);

  if (clean.length < 20) {
    return false;
  }

  if (clean.length > 4000) {
    return false;
  }

  return true;
}

function detectProject(note) {
  const frontmatterProject = valueToText(note.frontmatter.project);
  const tags = valueToText(note.frontmatter.tags);
  const haystacks = [
    frontmatterProject,
    note.relativePath,
    note.title,
    tags,
    note.body.slice(0, 2500),
  ];

  for (const haystack of haystacks) {
    const normalized = normalizeText(haystack);

    for (const [keyword, projectName] of PROJECT_MAPPINGS) {
      if (normalized.includes(keyword)) {
        return projectName;
      }
    }
  }

  return "Obsidian / Segundo Cerebro";
}

function valueToText(value) {
  if (Array.isArray(value)) {
    return value.join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function findExistingProject(projectName, existing) {
  const aliases = BASE_PROJECTS.find((project) => project.name === projectName)?.aliases ?? [];
  const candidates = [projectName, ...aliases].map(normalizeText);

  for (const project of existing.projects) {
    if (candidates.includes(normalizeText(project.name))) {
      return project;
    }
  }

  return null;
}

function markExisting(items, existing, type) {
  const idSet = existing.ids[type] ?? new Set();

  return items.map((item) => {
    if (!idSet.has(item.id)) {
      return item;
    }

    return {
      ...item,
      operation: "skipped_existing",
    };
  });
}

function dedupeById(items, duplicates) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.push({
        id: item.id,
        type: item.kind,
        title: item.title ?? item.name,
        sourceFile: item.sourceFile ?? null,
      });
      continue;
    }

    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

async function inspectOwner(target) {
  const owners = new Map();

  for (const table of TABLES_WITH_OWNER) {
    const rows = await d1Rows(target, `SELECT owner_subject, COUNT(*) AS count FROM ${table} GROUP BY owner_subject;`);

    for (const row of rows) {
      const owner = typeof row.owner_subject === "string" ? row.owner_subject : "";

      if (!owner || owner === LEGACY_OWNER) {
        continue;
      }

      const current = owners.get(owner) ?? { owner, count: 0 };
      current.count += Number(row.count ?? 0);
      owners.set(owner, current);
    }
  }

  return {
    owners: [...owners.values()],
  };
}

async function loadExistingState(target, ownerSubject) {
  const owner = sql(ownerSubject);
  const [projects, tasks, memory, decisions, reminders, audits] = await Promise.all([
    d1Rows(target, `SELECT id, name FROM projects WHERE owner_subject = ${owner};`),
    d1Rows(target, `SELECT id FROM tasks WHERE owner_subject = ${owner} AND id LIKE 'obsidian_task_%';`),
    d1Rows(target, `SELECT id FROM memory_items WHERE owner_subject = ${owner} AND id LIKE 'obsidian_memory_%';`),
    d1Rows(target, `SELECT id FROM decisions WHERE owner_subject = ${owner} AND id LIKE 'obsidian_decision_%';`),
    d1Rows(target, `SELECT id FROM reminders WHERE owner_subject = ${owner} AND id LIKE 'obsidian_reminder_%';`),
    d1Rows(target, `SELECT id FROM action_executions WHERE owner_subject = ${owner} AND id LIKE 'obsidian_audit_%';`),
  ]);

  return {
    projects: projects.map((row) => ({ id: String(row.id), name: String(row.name) })),
    ids: {
      tasks: new Set(tasks.map((row) => String(row.id))),
      memory: new Set(memory.map((row) => String(row.id))),
      decisions: new Set(decisions.map((row) => String(row.id))),
      reminders: new Set(reminders.map((row) => String(row.id))),
      audits: new Set(audits.map((row) => String(row.id))),
    },
  };
}

function emptyExistingState() {
  return {
    projects: [],
    ids: {
      tasks: new Set(),
      memory: new Set(),
      decisions: new Set(),
      reminders: new Set(),
      audits: new Set(),
    },
  };
}

async function d1Rows(target, query) {
  const output = execWrangler([
    "d1",
    "execute",
    DB_NAME,
    target === "remote" ? "--remote" : "--local",
    "--command",
    query,
    "--json",
  ]);
  const parsed = parseWranglerJson(output);

  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry) => Array.isArray(entry.results) ? entry.results : []);
  }

  if (Array.isArray(parsed.results)) {
    return parsed.results;
  }

  return [];
}

function execWrangler(argsForWrangler) {
  const wranglerBin = path.join(repoRoot, "node_modules", "wrangler", "bin", "wrangler.js");

  if (!existsSync(wranglerBin)) {
    throw new Error("Local Wrangler binary not found. Run npm install before importing.");
  }

  const output = execFileSync(process.execPath, [wranglerBin, ...argsForWrangler], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output;
}

function parseWranglerJson(output) {
  const firstBracket = output.indexOf("[");
  const firstBrace = output.indexOf("{");
  const starts = [firstBracket, firstBrace].filter((index) => index >= 0);

  if (starts.length === 0) {
    throw new Error(`Wrangler did not return JSON: ${output.slice(0, 200)}`);
  }

  return JSON.parse(output.slice(Math.min(...starts)));
}

async function applyPlan({ target, ownerSubject, plan, existing }) {
  const createdAt = nowIso();
  const statements = [];
  const auditStatements = [];
  const result = {
    target,
    created: { projects: 0, tasks: 0, memory: 0, decisions: 0, reminders: 0, audits: 0 },
    skippedExisting: 0,
    skippedAuditExisting: 0,
  };

  for (const project of plan.candidates.projects) {
    if (project.operation === "create") {
      statements.push(insertProject(project, ownerSubject, createdAt));
      result.created.projects += 1;
    } else {
      result.skippedExisting += 1;
    }

    addAudit(project, ownerSubject, createdAt, existing, auditStatements, result);
  }

  for (const task of plan.candidates.tasks) {
    if (task.operation === "create") {
      statements.push(insertTask(task, ownerSubject, createdAt));
      result.created.tasks += 1;
    } else {
      result.skippedExisting += 1;
    }

    addAudit(task, ownerSubject, createdAt, existing, auditStatements, result);
  }

  for (const memory of plan.candidates.memory) {
    if (memory.operation === "create") {
      statements.push(insertMemory(memory, ownerSubject, createdAt));
      result.created.memory += 1;
    } else {
      result.skippedExisting += 1;
    }

    addAudit(memory, ownerSubject, createdAt, existing, auditStatements, result);
  }

  for (const decision of plan.candidates.decisions) {
    if (decision.operation === "create") {
      statements.push(insertDecision(decision, ownerSubject, createdAt));
      result.created.decisions += 1;
    } else {
      result.skippedExisting += 1;
    }

    addAudit(decision, ownerSubject, createdAt, existing, auditStatements, result);
  }

  for (const reminder of plan.candidates.reminders) {
    if (reminder.operation === "create") {
      statements.push(insertReminder(reminder, ownerSubject, createdAt));
      result.created.reminders += 1;
    } else {
      result.skippedExisting += 1;
    }

    addAudit(reminder, ownerSubject, createdAt, existing, auditStatements, result);
  }

  statements.push(...auditStatements);

  if (statements.length === 0) {
    return result;
  }

  // Wrangler D1 remote rejects explicit BEGIN/COMMIT here; inserts are idempotent.
  const sqlText = statements.join("\n");
  await writeFile(tempSqlPath, sqlText, "utf8");

  try {
    execWrangler([
      "d1",
      "execute",
      DB_NAME,
      target === "remote" ? "--remote" : "--local",
      "--file",
      tempSqlPath,
    ]);
  } finally {
    await unlink(tempSqlPath).catch(() => {});
  }

  return result;
}

function addAudit(item, ownerSubject, createdAt, existing, statements, result) {
  const auditId = deterministicId("audit", item.operation, item.kind, item.id);

  if (existing.ids.audits.has(auditId)) {
    result.skippedAuditExisting += 1;
    return;
  }

  statements.push(insertAudit({
    id: auditId,
    ownerSubject,
    actionType: "obsidian_import",
    status: item.operation === "create" ? "executed" : "skipped_existing",
    targetType: item.kind,
    targetId: item.id,
    summary: auditSummary(item),
    payload: auditPayload(item),
    result: {
      id: item.id,
      type: item.kind,
      status: item.operation,
    },
    warnings: item.warnings ?? [],
    createdAt,
  }));
  result.created.audits += 1;
}

function insertProject(project, ownerSubject, createdAt) {
  return `INSERT OR IGNORE INTO projects (id, owner_subject, name, objective, status, priority, created_at, updated_at, completed_at, archived_at)
VALUES (${sql(project.id)}, ${sql(ownerSubject)}, ${sql(project.name)}, ${sql("Proyecto base propuesto por importacion local de Obsidian.")}, 'active', 'P2', ${sql(createdAt)}, ${sql(createdAt)}, NULL, NULL);`;
}

function insertTask(task, ownerSubject, createdAt) {
  return `INSERT OR IGNORE INTO tasks (id, owner_subject, project_id, title, description, status, priority, due_date, created_at, updated_at, completed_at)
VALUES (${sql(task.id)}, ${sql(ownerSubject)}, ${sql(task.projectId)}, ${sql(task.title)}, ${sql(task.notes)}, 'todo', ${sql(task.priority)}, ${sql(task.dueAt)}, ${sql(createdAt)}, ${sql(createdAt)}, NULL);`;
}

function insertMemory(memory, ownerSubject, createdAt) {
  return `INSERT OR IGNORE INTO memory_items (id, owner_subject, title, content, type, priority, status, source, confidence, expires_at, review_due_at, last_reviewed_at, created_at, updated_at, archived_at)
VALUES (${sql(memory.id)}, ${sql(ownerSubject)}, ${sql(memory.title)}, ${sql(memory.content)}, ${sql(memory.type)}, ${sql(memory.priority)}, 'active', 'manual', ${sql(memory.confidence)}, NULL, NULL, NULL, ${sql(createdAt)}, ${sql(createdAt)}, NULL);`;
}

function insertDecision(decision, ownerSubject, createdAt) {
  return `INSERT OR IGNORE INTO decisions (id, owner_subject, project_id, title, reason, impact, context, outcome, rationale, status, priority, decided_at, created_at, updated_at, archived_at)
VALUES (${sql(decision.id)}, ${sql(ownerSubject)}, ${sql(decision.projectId)}, ${sql(decision.title)}, ${sql(decision.context)}, ${sql(decision.outcome)}, ${sql(decision.context)}, ${sql(decision.outcome)}, ${sql(decision.rationale)}, ${sql(decision.status)}, ${sql(decision.priority)}, ${sql(decision.decidedAt)}, ${sql(createdAt)}, ${sql(createdAt)}, NULL);`;
}

function insertReminder(reminder, ownerSubject, createdAt) {
  return `INSERT OR IGNORE INTO reminders (id, owner_subject, title, notes, remind_at, due_at, priority, status, created_at, updated_at, completed_at, dismissed_at)
VALUES (${sql(reminder.id)}, ${sql(ownerSubject)}, ${sql(reminder.title)}, ${sql(reminder.notes)}, NULL, ${sql(reminder.dueAt)}, ${sql(reminder.priority)}, 'pending', ${sql(createdAt)}, ${sql(createdAt)}, NULL, NULL);`;
}

function insertAudit(audit) {
  return `INSERT OR IGNORE INTO action_executions (id, owner_subject, action_type, source_request_id, proposal_id, status, target_type, target_id, summary, payload_json, result_json, warnings_json, error_code, created_at)
VALUES (${sql(audit.id)}, ${sql(audit.ownerSubject)}, ${sql(audit.actionType)}, NULL, NULL, ${sql(audit.status)}, ${sql(audit.targetType)}, ${sql(audit.targetId)}, ${sql(audit.summary)}, ${sql(JSON.stringify(audit.payload))}, ${sql(JSON.stringify(audit.result))}, ${sql(JSON.stringify(audit.warnings))}, NULL, ${sql(audit.createdAt)});`;
}

function auditSummary(item) {
  const label = item.title ?? item.name ?? item.id;
  return truncate(`Obsidian import ${item.operation}: ${item.kind} ${label}`, 240);
}

function auditPayload(item) {
  return removeEmpty({
    source: "obsidian_import",
    sourceFile: item.sourceFile ?? null,
    sourceHeading: item.sourceHeading ?? null,
    project: item.project ?? null,
    title: item.title ?? item.name ?? null,
    contentExcerpt: item.content ? truncate(sanitizeText(item.content), 180) : null,
  });
}

function buildSnapshot({ startedAt, mode, target, vaultRoot, notes, ownerState, existing, extraction, blockers, warnings }) {
  return {
    generatedAt: nowIso(),
    startedAt,
    mode,
    target,
    vault: {
      root: vaultRoot,
      notesRead: notes.items.length,
      markdownBytes: notes.totalBytes,
      ignoredCount: notes.ignored.length,
      ignored: notes.ignored.slice(0, 80),
      limits: {
        maxNotes: MAX_NOTES,
        maxTotalBytes: MAX_TOTAL_BYTES,
        maxNoteBytes: MAX_NOTE_BYTES,
      },
    },
    owner: {
      status: ownerState.owners.length === 1 ? "single" : ownerState.owners.length === 0 ? "missing" : "multiple",
      count: ownerState.owners.length,
    },
    existing: {
      projects: existing.projects.map((project) => ({ id: project.id, name: project.name })),
      obsidianIds: {
        tasks: existing.ids.tasks.size,
        memory: existing.ids.memory.size,
        decisions: existing.ids.decisions.size,
        reminders: existing.ids.reminders.size,
        audits: existing.ids.audits.size,
      },
    },
    counts: extraction.counts,
    candidates: sanitizeCandidates(extraction.candidates),
    possibleDuplicates: extraction.duplicates,
    warnings,
    blockers,
  };
}

function sanitizeCandidates(candidates) {
  return {
    projects: candidates.projects.map((item) => publicCandidate(item)),
    tasks: candidates.tasks.map((item) => publicCandidate(item)),
    memory: candidates.memory.map((item) => publicCandidate(item)),
    decisions: candidates.decisions.map((item) => publicCandidate(item)),
    reminders: candidates.reminders.map((item) => publicCandidate(item)),
  };
}

function publicCandidate(item) {
  return removeEmpty({
    id: item.id,
    kind: item.kind,
    operation: item.operation,
    name: item.name,
    title: item.title,
    type: item.type,
    priority: item.priority,
    status: item.status,
    dueAt: item.dueAt,
    decidedAt: item.decidedAt || null,
    project: item.project,
    sourceFile: item.sourceFile,
    sourceHeading: item.sourceHeading,
    contentExcerpt: item.content ? truncate(sanitizeText(item.content), 220) : null,
    warnings: item.warnings,
  });
}

async function writePreviewFiles(snapshot) {
  const fileSnapshot = {
    ...snapshot,
    vault: {
      ...snapshot.vault,
      root: "[vault]",
    },
  };
  await writeFile(previewJsonPath, `${JSON.stringify(fileSnapshot, null, 2)}\n`, "utf8");
  await writeFile(reportPath, renderReport(fileSnapshot), "utf8");
}

function renderReport(snapshot) {
  const lines = [
    "# Obsidian Import Preview",
    "",
    `Generated: ${snapshot.generatedAt}`,
    `Mode: ${snapshot.mode}`,
    `Target: ${snapshot.target}`,
    `Owner: ${snapshot.owner.status}`,
    "",
    "## Vault",
    "",
    `- Notes read: ${snapshot.vault.notesRead}`,
    `- Markdown bytes: ${snapshot.vault.markdownBytes}`,
    `- Ignored entries: ${snapshot.vault.ignoredCount}`,
    "",
    "## Candidates",
    "",
    `- Projects to create: ${snapshot.counts.projects.create}`,
    `- Tasks to create: ${snapshot.counts.tasks.create}`,
    `- Memory items to create: ${snapshot.counts.memory.create}`,
    `- Decisions to create: ${snapshot.counts.decisions.create}`,
    `- Reminders to create: ${snapshot.counts.reminders.create}`,
    `- Skipped existing: ${snapshot.counts.totalSkippedExisting}`,
    "",
  ];

  appendCandidateTable(lines, "Projects", snapshot.candidates.projects, "name");
  appendCandidateTable(lines, "Tasks", snapshot.candidates.tasks, "title");
  appendCandidateTable(lines, "Memory", snapshot.candidates.memory, "title");
  appendCandidateTable(lines, "Decisions", snapshot.candidates.decisions, "title");
  appendCandidateTable(lines, "Reminders", snapshot.candidates.reminders, "title");

  lines.push("## Warnings", "");

  if (snapshot.warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of snapshot.warnings.slice(0, 80)) {
      lines.push(`- ${warning}`);
    }
  }

  lines.push("", "## Possible Duplicates", "");

  if (snapshot.possibleDuplicates.length === 0) {
    lines.push("- None");
  } else {
    for (const duplicate of snapshot.possibleDuplicates.slice(0, 80)) {
      lines.push(`- ${duplicate.type}: ${duplicate.title} (${duplicate.sourceFile ?? "unknown source"})`);
    }
  }

  lines.push("", "## Blockers", "");

  if (snapshot.blockers.length === 0) {
    lines.push("- None");
  } else {
    for (const blocker of snapshot.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function appendCandidateTable(lines, title, items, labelField) {
  lines.push(`## ${title}`, "");

  if (items.length === 0) {
    lines.push("- None", "");
    return;
  }

  for (const item of items.slice(0, 80)) {
    const label = item[labelField] ?? item.id;
    const suffix = item.sourceFile ? ` - ${item.sourceFile}` : "";
    lines.push(`- ${item.operation}: ${label}${suffix}`);
  }

  if (items.length > 80) {
    lines.push(`- ... ${items.length - 80} more`);
  }

  lines.push("");
}

function printSummary(snapshot, ownerState) {
  console.log(`Preview written: ${path.relative(repoRoot, previewJsonPath)}`);
  console.log(`Report written: ${path.relative(repoRoot, reportPath)}`);
  console.log(`Notes read: ${snapshot.vault.notesRead}; ignored entries: ${snapshot.vault.ignoredCount}`);
  console.log(
    `Candidates create: projects=${snapshot.counts.projects.create}, tasks=${snapshot.counts.tasks.create}, memory=${snapshot.counts.memory.create}, decisions=${snapshot.counts.decisions.create}, reminders=${snapshot.counts.reminders.create}`,
  );

  if (ownerState.owners.length === 1) {
    console.log(`Owner: single (${maskOwner(ownerState.owners[0].owner)})`);
  } else {
    console.log(`Owner: ${ownerState.owners.length === 0 ? "missing" : "multiple"}`);
  }

  if (snapshot.blockers.length > 0) {
    console.log(`Blocked: ${snapshot.blockers.join(" | ")}`);
  }
}

function printApplySummary(applyResult) {
  console.log(`Apply complete on ${applyResult.target}`);
  console.log(JSON.stringify(applyResult.created, null, 2));
  console.log(`Skipped existing: ${applyResult.skippedExisting}`);
}

function countPlan(candidates) {
  const counts = {};
  let totalSkippedExisting = 0;

  for (const [type, items] of Object.entries(candidates)) {
    const create = items.filter((item) => item.operation === "create").length;
    const skipped = items.filter((item) => item.operation === "skipped_existing").length;
    counts[type] = { create, skippedExisting: skipped, total: items.length };
    totalSkippedExisting += skipped;
  }

  return {
    ...counts,
    totalSkippedExisting,
  };
}

function deterministicId(type, ...parts) {
  return `obsidian_${type}_${hash(parts.map((part) => normalizeText(String(part ?? ""))).join("|"))}`;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function priorityFromText(text) {
  const normalized = normalizeText(text);

  if (/\b(urgente|critico|critica|bloqueante)\b/.test(normalized)) {
    return "P1";
  }

  if (/\bimportante\b/.test(normalized)) {
    return "P2";
  }

  return "P3";
}

function parseClearDate(text) {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);

  if (iso) {
    return buildDate(iso[1], iso[2], iso[3]);
  }

  const spanish = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);

  if (spanish) {
    return buildDate(spanish[3], spanish[2], spanish[1]);
  }

  return null;
}

function buildDate(year, month, day) {
  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  const date = new Date(Date.UTC(yyyy, mm - 1, dd, 9, 0, 0));

  if (date.getUTCFullYear() !== yyyy || date.getUTCMonth() + 1 !== mm || date.getUTCDate() !== dd) {
    return null;
  }

  const dateOnly = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  return {
    date: dateOnly,
    timestamp: `${dateOnly}T09:00:00.000Z`,
  };
}

function stripDateText(text) {
  return text
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]20\d{2}\b/g, "")
    .trim();
}

function sourceNote(note, heading) {
  return truncate(`Importado desde Obsidian: ${note.relativePath}${heading ? `#${heading}` : ""}`, 1000);
}

function cleanMarkdown(value) {
  return String(value ?? "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(api[_ -]?key|secret|token|password|jwt)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\b(owner_subject|claims|prompt|configuracion interna|configuracion interna)\b/gi, "[redacted]")
    .trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return value
    .split(" ")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

function firstWords(value, count) {
  return cleanMarkdown(value).split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

function truncate(value, maxLength) {
  const clean = String(value ?? "").trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return clean.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}

function removeEmpty(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function sql(value) {
  if (value === null || value === undefined || value === "") {
    return "NULL";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "NULL";
    }

    return String(value);
  }

  return `'${String(value).replace(/\u0000/g, "").replace(/'/g, "''")}'`;
}

function toVaultPath(value) {
  return value.split(path.sep).join("/");
}

function maskOwner(owner) {
  if (owner.length <= 10) {
    return "[masked]";
  }

  return `${owner.slice(0, 6)}...${owner.slice(-4)}`;
}

function nowIso() {
  return new Date().toISOString();
}
