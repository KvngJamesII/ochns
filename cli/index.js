#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const readline = require("readline");

const CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".vpush"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const PROJECT_FILE = ".vpush.json";
const IGNORE_FILE = ".vpushignore";

const DEFAULT_SERVER = "https://vpush.tech";

const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  ".vpush.json",
  ".vpushignore",
  ".env",
  ".DS_Store",
  "Thumbs.db",
  "__pycache__",
  "*.pyc",
  ".vscode",
  ".idea",
  "dist",
  "build",
];

const VERSION = "2.0.0";

// ── Config helpers ──────────────────────────────────────────

function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getProjectConfig() {
  const filePath = path.resolve(PROJECT_FILE);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {}
  return null;
}

function saveProjectConfig(config) {
  fs.writeFileSync(path.resolve(PROJECT_FILE), JSON.stringify(config, null, 2));
}

function getServerUrl() {
  const config = getConfig();
  return config.server || DEFAULT_SERVER;
}

// ── Prompts ─────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const onData = (ch) => {
      const s = ch.toString("utf8");
      if (s === "\n" || s === "\r" || s === "\u0004") {
        if (stdin.setRawMode) stdin.setRawMode(wasRaw || false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (s === "\u0003") {
        process.exit(0);
      } else if (s === "\u007F" || s === "\b") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        value += s;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

// ── HTTP helpers ────────────────────────────────────────────

function request(method, urlPath, body, pin) {
  const serverUrl = getServerUrl();
  const url = new URL(urlPath, serverUrl);
  const isHttps = url.protocol === "https:";
  const mod = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `vpush-cli/${VERSION}`,
      },
    };

    if (pin) {
      options.headers["X-Auth-Pin"] = pin;
    }

    const config = getConfig();
    if (config.token) {
      options.headers["Authorization"] = `Bearer ${config.token}`;
    }

    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on("error", (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function uploadFile(urlPath, filePath, remotePath, pin) {
  const serverUrl = getServerUrl();
  const url = new URL(urlPath, serverUrl);
  const isHttps = url.protocol === "https:";
  const mod = isHttps ? https : http;

  const boundary = "----VPushBoundary" + Date.now();
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const parentPathField =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="parentPath"\r\n\r\n` +
    `${remotePath}\r\n`;

  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;

  const footer = `\r\n--${boundary}--\r\n`;

  const bodyParts = [
    Buffer.from(parentPathField, "utf-8"),
    Buffer.from(fileHeader, "utf-8"),
    fileContent,
    Buffer.from(footer, "utf-8"),
  ];
  const bodyBuffer = Buffer.concat(bodyParts);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": bodyBuffer.length,
        "User-Agent": `vpush-cli/${VERSION}`,
      },
    };

    if (pin) {
      options.headers["X-Auth-Pin"] = pin;
    }

    const config = getConfig();
    if (config.token) {
      options.headers["Authorization"] = `Bearer ${config.token}`;
    }

    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ── File helpers ────────────────────────────────────────────

function getIgnorePatterns() {
  let patterns = [...DEFAULT_IGNORE];
  const ignorePath = path.resolve(IGNORE_FILE);
  try {
    if (fs.existsSync(ignorePath)) {
      const content = fs.readFileSync(ignorePath, "utf-8");
      const custom = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      patterns = [...patterns, ...custom];
    }
  } catch {}
  return patterns;
}

function shouldIgnore(filePath, patterns) {
  const parts = filePath.split(path.sep);
  for (const pattern of patterns) {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      if (filePath.endsWith(ext)) return true;
    } else {
      if (parts.includes(pattern)) return true;
      if (filePath === pattern) return true;
    }
  }
  return false;
}

function getAllFiles(dir, baseDir, patterns) {
  baseDir = baseDir || dir;
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    if (shouldIgnore(relativePath, patterns)) continue;

    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, baseDir, patterns));
    } else {
      results.push({
        path: "/" + relativePath,
        fullPath: fullPath,
        size: fs.statSync(fullPath).size,
      });
    }
  }
  return results;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ── Colors / logging ────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

function log(msg) { console.log(msg); }
function success(msg) { console.log(`${c.green}✓${c.reset} ${msg}`); }
function error(msg) { console.error(`${c.red}✗${c.reset} ${msg}`); }
function info(msg) { console.log(`${c.blue}→${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}!${c.reset} ${msg}`); }

// ── Resolve helper ──────────────────────────────────────────

/**
 * Parse a project reference — accepts:
 *   username/project
 *   vpush.tech/username/project
 *   https://vpush.tech/username/project
 */
function parseProjectRef(input) {
  let cleaned = input.replace(/^\//, "");
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, "");
  // Strip known domain prefix (any host)
  const slashParts = cleaned.split("/").filter(Boolean);
  // If 3+ parts, first is domain — drop it
  if (slashParts.length >= 3) {
    return { owner: slashParts[1], name: slashParts[2] };
  }
  if (slashParts.length === 2) {
    // Could be "domain/project" (invalid) or "owner/project"
    // If first part has a dot, it's a domain — invalid
    if (slashParts[0].includes(".")) return null;
    return { owner: slashParts[0], name: slashParts[1] };
  }
  return null;
}

async function resolveProject(owner, name, pin) {
  const res = await request(
    "GET",
    `/api/resolve/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
  );
  if (res.status === 404) {
    error(res.data.message || `Project ${owner}/${name} not found`);
    process.exit(1);
  }
  if (res.status !== 200) {
    error(res.data.message || "Failed to resolve project");
    process.exit(1);
  }
  return res.data; // { projectId, name, visibility, ownerUsername, requiresPin, hasPin }
}

// ── Commands ────────────────────────────────────────────────

async function cmdClone(projectRef) {
  if (!projectRef) {
    error("Usage: vpush <username/project>");
    log(`\n  ${c.dim}Example:${c.reset} vpush idledev/mysite`);
    log(`  ${c.dim}   or:${c.reset} vpush vpush.tech/idledev/mysite\n`);
    process.exit(1);
  }

  const parsed = parseProjectRef(projectRef);
  if (!parsed) {
    error(`Invalid project. Use format: ${c.bold}username/project${c.reset}`);
    process.exit(1);
  }

  const { owner: username, name: projectName } = parsed;

  log(`\n${c.bold}VPush${c.reset} ${c.dim}— Cloning${c.reset} ${c.cyan}${username}/${projectName}${c.reset}\n`);

  try {
    const resolved = await resolveProject(username, projectName);
    const { projectId, name, visibility, hasPin } = resolved;
    let pin = null;

    // Ask for PIN if required (private) or available (public with pin for push access)
    if (visibility === "private" || hasPin) {
      pin = await promptHidden(`${c.cyan}PIN${c.reset}: `);
      if (!pin && visibility === "private") {
        error("PIN is required for private projects");
        process.exit(1);
      }

      if (pin) {
        const testRes = await request("GET", `/api/projects/${projectId}/files`, null, pin);
        if (testRes.status === 403) {
          error("Invalid PIN");
          process.exit(1);
        }
      }
    }

    const dirName = projectName;
    const targetDir = path.resolve(dirName);

    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      if (files.length > 0 && !files.every((f) => f === ".vpush.json")) {
        warn(`Directory '${dirName}' already exists.`);
        const overwrite = await prompt(`${c.yellow}Continue anyway?${c.reset} (y/N): `);
        if (overwrite.toLowerCase() !== "y") process.exit(0);
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const projectConfig = {
      owner: username,
      name,
      server: getServerUrl(),
      pin: pin || undefined,
    };
    fs.writeFileSync(path.join(targetDir, PROJECT_FILE), JSON.stringify(projectConfig, null, 2));

    const ignorePath = path.join(targetDir, IGNORE_FILE);
    if (!fs.existsSync(ignorePath)) {
      fs.writeFileSync(
        ignorePath,
        "# VPush ignore patterns (one per line)\n\n" + DEFAULT_IGNORE.join("\n") + "\n"
      );
    }

    const filesRes = await request("GET", `/api/projects/${projectId}/files`, null, pin);
    if (filesRes.status !== 200) {
      error("Failed to fetch files");
      process.exit(1);
    }

    const remoteFiles = Array.isArray(filesRes.data) ? filesRes.data.filter((f) => !f.isDirectory) : [];

    if (remoteFiles.length === 0) {
      success(`Cloned ${c.bold}${username}/${name}${c.reset} ${c.dim}(empty project)${c.reset}`);
      log(`\n  ${c.dim}cd ${dirName} && add files, then:${c.reset} vpush push\n`);
      return;
    }

    info(`Pulling ${c.bold}${remoteFiles.length}${c.reset} file${remoteFiles.length !== 1 ? "s" : ""}...`);
    log("");

    let pulled = 0;
    for (const file of remoteFiles) {
      const fileRes = await request("GET", `/api/files/${file.id}`, null, pin);
      if (fileRes.status !== 200) {
        log(`  ${file.path} ${c.red}✗${c.reset}`);
        continue;
      }

      const localPath = path.join(targetDir, file.path.replace(/^\//, ""));
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(localPath, fileRes.data.content || "");
      log(`  ${c.dim}${pulled + 1}/${remoteFiles.length}${c.reset} ${file.path} ${c.green}✓${c.reset}`);
      pulled++;
    }

    log("");
    const serverUrl = getServerUrl();
    success(`Cloned ${c.bold}${username}/${name}${c.reset} → ${c.cyan}${dirName}/${c.reset} (${pulled} file${pulled !== 1 ? "s" : ""})`);
    log(`\n  ${c.dim}URL:${c.reset} ${serverUrl}/${username}/${name}`);
    log(`  ${c.dim}cd ${dirName}${c.reset}`);
    log(`  ${c.dim}Make changes, then:${c.reset} vpush push\n`);
  } catch (err) {
    error(`Failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdPush() {
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    error("Not in a VPush project. Clone one first:");
    log(`\n  vpush ${c.cyan}username/project${c.reset}\n`);
    process.exit(1);
  }

  let { pin, name, owner } = projectConfig;
  if (!owner || !name) {
    error("Invalid project config. Re-clone with: vpush <username/project>");
    process.exit(1);
  }

  // Resolve owner/name to projectId
  const resolved = await resolveProject(owner, name);
  const projectId = resolved.projectId;

  if (!pin) {
    pin = await promptHidden(`${c.cyan}PIN${c.reset}: `);
    if (pin) {
      projectConfig.pin = pin;
      saveProjectConfig(projectConfig);
      success("PIN saved for future pushes");
    }
  }

  log(`\n${c.bold}VPush${c.reset} ${c.dim}— Pushing to${c.reset} ${c.cyan}${owner}/${name}${c.reset}\n`);

  const ignorePatterns = getIgnorePatterns();
  const files = getAllFiles(process.cwd(), process.cwd(), ignorePatterns);

  if (files.length === 0) {
    warn("No files to push");
    process.exit(0);
  }

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  info(`Found ${c.bold}${files.length}${c.reset} files (${formatSize(totalSize)})`);
  log("");

  let pushed = 0;
  let failed = 0;
  const errors = [];

  for (const file of files) {
    const parentPath = path.dirname(file.path);
    process.stdout.write(
      `  ${c.dim}${pushed + failed + 1}/${files.length}${c.reset} ${file.path} ${c.dim}(${formatSize(file.size)})${c.reset}`
    );

    try {
      const res = await uploadFile(
        `/api/projects/${projectId}/cli-upload`,
        file.fullPath,
        parentPath === "/" ? "/" : parentPath,
        pin || null
      );

      if (res.status === 200 || res.status === 201) {
        process.stdout.write(` ${c.green}✓${c.reset}\n`);
        pushed++;
      } else {
        process.stdout.write(` ${c.red}✗${c.reset}\n`);
        failed++;
        errors.push(`${file.path}: ${res.data.message || "Unknown error"}`);
      }
    } catch (err) {
      process.stdout.write(` ${c.red}✗${c.reset}\n`);
      failed++;
      errors.push(`${file.path}: ${err.message}`);
    }
  }

  log("");
  if (pushed > 0) success(`Pushed ${c.bold}${pushed}${c.reset} file${pushed !== 1 ? "s" : ""}`);
  if (failed > 0) {
    error(`Failed ${c.bold}${failed}${c.reset} file${failed !== 1 ? "s" : ""}`);
    errors.forEach((e) => log(`  ${c.red}→${c.reset} ${e}`));
  }
  log("");
}

async function cmdPull() {
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    error("Not in a VPush project. Clone one first:");
    log(`\n  vpush ${c.cyan}username/project${c.reset}\n`);
    process.exit(1);
  }

  const { pin, name, owner } = projectConfig;
  if (!owner || !name) {
    error("Invalid project config. Re-clone with: vpush <username/project>");
    process.exit(1);
  }

  // Resolve owner/name to projectId
  const resolved = await resolveProject(owner, name);
  const projectId = resolved.projectId;

  log(`\n${c.bold}VPush${c.reset} ${c.dim}— Pulling from${c.reset} ${c.cyan}${owner}/${name}${c.reset}\n`);

  try {
    const res = await request("GET", `/api/projects/${projectId}/files`, null, pin || null);
    if (res.status === 403) {
      error("Access denied. PIN may have changed.");
      process.exit(1);
    }
    if (res.status !== 200) {
      error(res.data.message || "Failed to fetch files");
      process.exit(1);
    }

    const files = Array.isArray(res.data) ? res.data.filter((f) => !f.isDirectory) : [];
    if (files.length === 0) {
      warn("No files to pull");
      process.exit(0);
    }

    info(`Found ${c.bold}${files.length}${c.reset} file${files.length !== 1 ? "s" : ""} on server`);
    log("");

    let pulled = 0;
    for (const file of files) {
      const fileRes = await request("GET", `/api/files/${file.id}`, null, pin || null);
      if (fileRes.status !== 200) {
        log(`  ${file.path} ${c.red}✗${c.reset}`);
        continue;
      }

      const localPath = path.join(process.cwd(), file.path.replace(/^\//, ""));
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(localPath, fileRes.data.content || "");
      log(`  ${c.dim}${pulled + 1}/${files.length}${c.reset} ${file.path} ${c.green}✓${c.reset}`);
      pulled++;
    }

    log("");
    if (pulled > 0) success(`Pulled ${c.bold}${pulled}${c.reset} file${pulled !== 1 ? "s" : ""}`);
    log("");
  } catch (err) {
    error(`Failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdStatus() {
  const projectConfig = getProjectConfig();

  log(`\n${c.bold}VPush${c.reset} v${VERSION}\n`);
  log(`  ${c.dim}Server:${c.reset}  ${getServerUrl()}`);

  if (projectConfig) {
    const projUrl = `${getServerUrl()}/${projectConfig.owner}/${projectConfig.name}`;
    log(`  ${c.dim}Project:${c.reset} ${c.cyan}${projectConfig.owner}/${projectConfig.name}${c.reset}`);
    log(`  ${c.dim}URL:${c.reset}     ${projUrl}`);
    log(`  ${c.dim}PIN:${c.reset}     ${projectConfig.pin ? c.green + "saved" + c.reset : c.yellow + "none" + c.reset}`);
  } else {
    log(`  ${c.dim}Project:${c.reset} ${c.yellow}not linked${c.reset}`);
    log(`\n  ${c.dim}Clone a project:${c.reset} vpush ${c.cyan}username/project${c.reset}`);
  }
  log("");
}

async function cmdServer(url) {
  const config = getConfig();
  if (url) {
    config.server = url.replace(/\/$/, "");
    saveConfig(config);
    success(`Server set to ${config.server}`);
  } else {
    log(`Server: ${c.bold}${getServerUrl()}${c.reset}`);
  }
}

function showHelp() {
  log(`
${c.bold}VPush CLI${c.reset} v${VERSION}
${c.dim}Push and pull files to your projects${c.reset}

${c.bold}USAGE${c.reset}
  vpush ${c.cyan}<username/project>${c.reset}   Clone a project (or use full URL)
  vpush ${c.cyan}push${c.reset}                 Push local files to server
  vpush ${c.cyan}pull${c.reset}                 Pull latest files from server
  vpush ${c.cyan}status${c.reset}               Show project info

${c.bold}GETTING STARTED${c.reset}
  ${c.dim}$${c.reset} vpush idledev/mysite              ${c.dim}# clone by name${c.reset}
  ${c.dim}$${c.reset} vpush vpush.tech/idledev/mysite   ${c.dim}# clone by URL${c.reset}
  ${c.dim}$${c.reset} cd mysite                ${c.dim}# enter project folder${c.reset}
  ${c.dim}$${c.reset} vpush push               ${c.dim}# push your changes${c.reset}

${c.bold}OTHER${c.reset}
  vpush ${c.cyan}server${c.reset} <url>         Set custom server URL
  vpush ${c.cyan}help${c.reset}                 Show this help
  vpush ${c.cyan}-v${c.reset}                   Show version

${c.bold}FILES${c.reset}
  ${c.dim}.vpush.json${c.reset}     Project config (created on clone)
  ${c.dim}.vpushignore${c.reset}    Ignore patterns (like .gitignore)
`);
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    log(`vpush v${VERSION}`);
    return;
  }

  try {
    switch (command) {
      case "push":
        await cmdPush();
        break;
      case "pull":
        await cmdPull();
        break;
      case "status":
        await cmdStatus();
        break;
      case "server":
        await cmdServer(args[1]);
        break;
      default:
        if (command.includes("/") || command.includes(".")) {
          await cmdClone(command);
        } else {
          error(`Unknown command: ${command}`);
          log(`${c.dim}Run 'vpush help' for usage${c.reset}`);
          process.exit(1);
        }
    }
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

main();
