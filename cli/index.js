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

const VERSION = "1.1.0";

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

function promptPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    let password = "";
    const onData = (ch) => {
      const c = ch.toString("utf8");
      if (c === "\n" || c === "\r" || c === "\u0004") {
        if (stdin.setRawMode) stdin.setRawMode(wasRaw || false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
      } else if (c === "\u0003") {
        process.exit(0);
      } else if (c === "\u007F" || c === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

function request(method, urlPath, body) {
  const config = getConfig();
  const serverUrl = config.server || "http://localhost:5000";
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
        resolve({
          status: res.statusCode,
          data: parsed,
          headers: res.headers,
        });
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function requestWithCookie(method, urlPath, body, cookie) {
  const config = getConfig();
  const serverUrl = config.server || "http://localhost:5000";
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

    if (cookie) {
      options.headers["Cookie"] = cookie;
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
        const setCookie = res.headers["set-cookie"];
        resolve({
          status: res.statusCode,
          data: parsed,
          cookies: setCookie,
          headers: res.headers,
        });
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function uploadFile(urlPath, filePath, remotePath) {
  const config = getConfig();
  const serverUrl = config.server || "http://localhost:5000";
  const url = new URL(urlPath, serverUrl);
  const isHttps = url.protocol === "https:";
  const mod = isHttps ? https : http;

  const boundary = "----VPushBoundary" + Date.now();
  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const pathField =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="path"\r\n\r\n` +
    `${remotePath}\r\n`;

  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files"; filename="${fileName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;

  const footer = `\r\n--${boundary}--\r\n`;

  const bodyParts = [
    Buffer.from(pathField, "utf-8"),
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

function log(msg) {
  console.log(msg);
}

function success(msg) {
  console.log(`${c.green}✓${c.reset} ${msg}`);
}

function error(msg) {
  console.error(`${c.red}✗${c.reset} ${msg}`);
}

function info(msg) {
  console.log(`${c.blue}→${c.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${c.yellow}!${c.reset} ${msg}`);
}

async function cmdLogin() {
  log(
    `\n${c.bold}VPush${c.reset} ${c.dim}— Sign in to your account${c.reset}\n`
  );

  const config = getConfig();
  if (!config.server) {
    const server = await prompt(
      `${c.cyan}Server URL${c.reset} ${c.dim}(e.g. https://vpush.tech)${c.reset}: `
    );
    if (!server) {
      error("Server URL is required");
      process.exit(1);
    }
    config.server = server.replace(/\/$/, "");
    saveConfig(config);
    success(`Server set to ${config.server}`);
  } else {
    info(`Server: ${config.server}`);
  }

  if (config.token) {
    try {
      const res = await request("GET", "/api/auth/me");
      if (res.status === 200) {
        success(`Already signed in as ${c.bold}${res.data.username}${c.reset}`);
        log(`${c.dim}  Token is valid. Use 'vpush logout' to sign out.${c.reset}\n`);
        return;
      }
    } catch {}
    config.token = null;
    saveConfig(config);
  }

  const username = await prompt(`${c.cyan}Username${c.reset}: `);
  const password = await promptPassword(`${c.cyan}Password${c.reset}: `);

  if (!username || !password) {
    error("Username and password are required");
    process.exit(1);
  }

  try {
    const loginRes = await requestWithCookie("POST", "/api/auth/login", {
      username,
      password,
    });

    if (loginRes.status !== 200) {
      error(loginRes.data.message || "Login failed");
      process.exit(1);
    }

    const sessionCookie = loginRes.cookies
      ? loginRes.cookies.map((c) => c.split(";")[0]).join("; ")
      : null;

    const tokenRes = await requestWithCookie("POST", "/api/auth/token", {
      name: `CLI (${require("os").hostname()})`,
    }, sessionCookie);

    if (tokenRes.status !== 200) {
      error("Failed to generate API token");
      process.exit(1);
    }

    config.token = tokenRes.data.token;
    config.username = loginRes.data.username;
    delete config.session;
    saveConfig(config);

    log("");
    success(
      `Signed in as ${c.bold}${loginRes.data.username}${c.reset}`
    );
    log(`${c.dim}  Token saved to ~/.vpush/config.json${c.reset}`);
    log(`${c.dim}  You won't need to log in again on this machine.${c.reset}\n`);
  } catch (err) {
    error(`Connection failed: ${err.message}`);
    error(`Make sure the server is running at ${config.server}`);
    process.exit(1);
  }
}

async function cmdLogout() {
  const config = getConfig();
  config.token = null;
  config.session = null;
  config.username = null;
  saveConfig(config);
  success("Signed out. Token removed.");
}

async function cmdWhoami() {
  const config = getConfig();
  if (!config.token) {
    error("Not signed in. Run: vpush login");
    process.exit(1);
  }

  try {
    const res = await request("GET", "/api/auth/me");
    if (res.status === 200) {
      log(
        `\n${c.bold}${res.data.username}${c.reset} ${c.dim}(${res.data.role})${c.reset}`
      );
      log(`${c.dim}Server: ${config.server}${c.reset}\n`);
    } else {
      error("Token expired or invalid. Run: vpush login");
      config.token = null;
      saveConfig(config);
      process.exit(1);
    }
  } catch (err) {
    error(`Connection failed: ${err.message}`);
    process.exit(1);
  }
}

async function ensureAuth() {
  const config = getConfig();
  if (!config.token) {
    error("Not signed in. Run: vpush login");
    process.exit(1);
  }

  try {
    const res = await request("GET", "/api/auth/me");
    if (res.status !== 200) {
      error("Token expired or invalid. Run: vpush login");
      config.token = null;
      saveConfig(config);
      process.exit(1);
    }
    return res.data;
  } catch (err) {
    error(`Connection failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdInit() {
  log(
    `\n${c.bold}VPush${c.reset} ${c.dim}— Initialize project${c.reset}\n`
  );

  const existing = getProjectConfig();
  if (existing) {
    warn(`Project already initialized: ${c.bold}${existing.projectId}${c.reset}`);
    const overwrite = await prompt(
      `${c.yellow}Reinitialize?${c.reset} (y/N): `
    );
    if (overwrite.toLowerCase() !== "y") {
      process.exit(0);
    }
  }

  const user = await ensureAuth();
  const config = getConfig();

  const res = await request("GET", "/api/projects");
  if (res.status !== 200) {
    error("Failed to fetch projects");
    process.exit(1);
  }

  const projects = res.data;

  log(`${c.dim}Select a project or create a new one:${c.reset}\n`);

  if (projects.length > 0) {
    projects.forEach((p, i) => {
      const vis = p.visibility === "public"
        ? `${c.green}public${c.reset}`
        : `${c.yellow}private${c.reset}`;
      log(`  ${c.dim}${i + 1}.${c.reset} ${c.bold}${p.name}${c.reset} ${c.dim}(${p.projectId})${c.reset} ${vis}`);
    });
    log(`  ${c.dim}${projects.length + 1}.${c.reset} ${c.cyan}Create new project${c.reset}`);
    log("");
  }

  let projectId;
  if (projects.length > 0) {
    const choice = await prompt(`${c.cyan}Choice${c.reset} [1-${projects.length + 1}]: `);
    const idx = parseInt(choice) - 1;

    if (idx === projects.length) {
      projectId = await createProject();
    } else if (idx >= 0 && idx < projects.length) {
      projectId = projects[idx].projectId;
    } else {
      error("Invalid choice");
      process.exit(1);
    }
  } else {
    info("No existing projects found. Creating one...\n");
    projectId = await createProject();
  }

  saveProjectConfig({
    projectId: projectId,
    server: config.server,
    username: config.username,
  });

  if (!fs.existsSync(path.resolve(IGNORE_FILE))) {
    fs.writeFileSync(
      path.resolve(IGNORE_FILE),
      "# VPush ignore patterns (one per line)\n# These files/folders won't be pushed\n\n" +
        DEFAULT_IGNORE.join("\n") +
        "\n"
    );
    success("Created .vpushignore");
  }

  log("");
  success(`Project initialized: ${c.bold}${projectId}${c.reset}`);
  log(`${c.dim}  Config saved to .vpush.json${c.reset}`);
  log(
    `\n${c.dim}  Next steps:${c.reset}\n    ${c.cyan}vpush push${c.reset}   Push files to server\n    ${c.cyan}vpush pull${c.reset}   Pull files from server\n    ${c.cyan}vpush status${c.reset} Check connection\n`
  );
}

async function createProject() {
  const name = await prompt(`${c.cyan}Project name${c.reset}: `);
  if (!name) {
    error("Project name is required");
    process.exit(1);
  }

  const desc = await prompt(
    `${c.cyan}Description${c.reset} ${c.dim}(optional)${c.reset}: `
  );
  const vis = await prompt(
    `${c.cyan}Visibility${c.reset} ${c.dim}(public/private)${c.reset} [public]: `
  );

  const res = await request("POST", "/api/projects", {
    name,
    description: desc || "",
    visibility: vis === "private" ? "private" : "public",
  });

  if (res.status === 201 || res.status === 200) {
    success(`Project created: ${c.bold}${name}${c.reset}`);
    return res.data.projectId;
  } else {
    error(res.data.message || "Failed to create project");
    process.exit(1);
  }
}

async function cmdPush() {
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    error("No project initialized. Run: vpush init");
    process.exit(1);
  }

  await ensureAuth();
  const projectId = projectConfig.projectId;

  log(
    `\n${c.bold}VPush${c.reset} ${c.dim}— Pushing to${c.reset} ${c.bold}${projectId}${c.reset}\n`
  );

  const ignorePatterns = getIgnorePatterns();
  const files = getAllFiles(process.cwd(), process.cwd(), ignorePatterns);

  if (files.length === 0) {
    warn("No files to push");
    process.exit(0);
  }

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  info(
    `Found ${c.bold}${files.length}${c.reset} files (${formatSize(totalSize)})`
  );
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
        `/api/projects/${projectId}/upload`,
        file.fullPath,
        parentPath === "/" ? "/" : parentPath
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
  if (pushed > 0)
    success(
      `Pushed ${c.bold}${pushed}${c.reset} file${pushed !== 1 ? "s" : ""}`
    );
  if (failed > 0) {
    error(
      `Failed ${c.bold}${failed}${c.reset} file${failed !== 1 ? "s" : ""}`
    );
    errors.forEach((e) => log(`  ${c.red}→${c.reset} ${e}`));
  }
  log("");
}

async function cmdPull() {
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    error("No project initialized. Run: vpush init");
    process.exit(1);
  }

  await ensureAuth();
  const projectId = projectConfig.projectId;

  log(
    `\n${c.bold}VPush${c.reset} ${c.dim}— Pulling from${c.reset} ${c.bold}${projectId}${c.reset}\n`
  );

  try {
    const res = await request("GET", `/api/projects/${projectId}/files`);
    if (res.status !== 200) {
      error(res.data.message || "Failed to fetch files");
      process.exit(1);
    }

    const files = res.data.filter((f) => !f.isDirectory);
    if (files.length === 0) {
      warn("No files to pull");
      process.exit(0);
    }

    info(`Found ${c.bold}${files.length}${c.reset} files on server`);
    log("");

    let pulled = 0;
    let failed = 0;

    for (const file of files) {
      const fileRes = await request("GET", `/api/files/${file.id}`);
      if (fileRes.status !== 200) {
        process.stdout.write(
          `  ${file.path} ${c.red}✗${c.reset}\n`
        );
        failed++;
        continue;
      }

      const localPath = path.join(
        process.cwd(),
        file.path.replace(/^\//, "")
      );
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = fileRes.data.content || "";
      fs.writeFileSync(localPath, content);
      process.stdout.write(
        `  ${c.dim}${pulled + failed + 1}/${files.length}${c.reset} ${file.path} ${c.green}✓${c.reset}\n`
      );
      pulled++;
    }

    log("");
    if (pulled > 0)
      success(
        `Pulled ${c.bold}${pulled}${c.reset} file${pulled !== 1 ? "s" : ""}`
      );
    if (failed > 0) error(`Failed ${c.bold}${failed}${c.reset}`);
    log("");
  } catch (err) {
    error(`Failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdStatus() {
  const config = getConfig();
  const projectConfig = getProjectConfig();

  log(`\n${c.bold}VPush Status${c.reset}\n`);
  log(`  ${c.dim}Version:${c.reset}  ${VERSION}`);
  log(`  ${c.dim}Server:${c.reset}   ${config.server || c.yellow + "not set" + c.reset}`);
  log(
    `  ${c.dim}Auth:${c.reset}     ${config.token ? c.green + "authenticated (token)" + c.reset : c.yellow + "not signed in" + c.reset}`
  );
  if (config.username) {
    log(`  ${c.dim}User:${c.reset}     ${config.username}`);
  }
  log(
    `  ${c.dim}Project:${c.reset}  ${projectConfig ? projectConfig.projectId : c.yellow + "not initialized" + c.reset}`
  );

  if (config.token) {
    try {
      const res = await request("GET", "/api/auth/me");
      log(
        `  ${c.dim}Token:${c.reset}    ${res.status === 200 ? c.green + "valid" + c.reset : c.red + "expired" + c.reset}`
      );
    } catch {
      log(`  ${c.dim}Token:${c.reset}    ${c.red}unable to reach server${c.reset}`);
    }
  }
  log("");
}

async function cmdToken(tokenValue) {
  if (!tokenValue) {
    const config = getConfig();
    if (config.token) {
      info(`Token is set: ${c.dim}${config.token.slice(0, 10)}...${config.token.slice(-4)}${c.reset}`);
    } else {
      warn("No token set. Generate one from the dashboard, then run:");
      log(`  ${c.cyan}vpush token <your-token>${c.reset}`);
    }
    return;
  }

  const config = getConfig();

  if (!config.server) {
    error("No server set. Run: vpush server <url> first");
    process.exit(1);
  }

  config.token = tokenValue;
  saveConfig(config);

  try {
    const res = await request("GET", "/api/auth/me");
    if (res.status === 200) {
      config.username = res.data.username;
      saveConfig(config);
      log("");
      success(`Authenticated as ${c.bold}${res.data.username}${c.reset}`);
      log(`${c.dim}  Token saved to ~/.vpush/config.json${c.reset}`);
      log(`${c.dim}  You're all set — no login needed.${c.reset}\n`);
    } else {
      config.token = null;
      saveConfig(config);
      error("Invalid token. Generate a new one from the dashboard.");
      process.exit(1);
    }
  } catch (err) {
    config.token = null;
    saveConfig(config);
    error(`Connection failed: ${err.message}`);
    process.exit(1);
  }
}

async function cmdServer(url) {
  const config = getConfig();
  if (url) {
    config.server = url.replace(/\/$/, "");
    saveConfig(config);
    success(`Server set to ${config.server}`);
  } else {
    if (config.server) {
      log(`Current server: ${c.bold}${config.server}${c.reset}`);
    } else {
      warn("No server configured. Run: vpush server <url>");
    }
  }
}

function showHelp() {
  log(`
${c.bold}VPush CLI${c.reset} v${VERSION}
${c.dim}Deploy files to your servers${c.reset}

${c.bold}USAGE${c.reset}
  vpush <command> [options]

${c.bold}COMMANDS${c.reset}
  ${c.cyan}token${c.reset} <token>       Set API token (from dashboard — no login needed)
  ${c.cyan}login${c.reset}              Sign in interactively (generates token)
  ${c.cyan}logout${c.reset}             Sign out and remove token
  ${c.cyan}whoami${c.reset}             Show current user
  ${c.cyan}init${c.reset}               Initialize project in current directory
  ${c.cyan}push${c.reset}               Push local files to server
  ${c.cyan}pull${c.reset}               Pull files from server to local
  ${c.cyan}status${c.reset}             Show connection and project status
  ${c.cyan}server${c.reset} <url>       Set or show server URL

${c.bold}GETTING STARTED${c.reset} ${c.dim}(copy these from your dashboard)${c.reset}
  ${c.dim}1.${c.reset} vpush server https://vpush.tech
  ${c.dim}2.${c.reset} vpush token <paste-token-from-dashboard>
  ${c.dim}3.${c.reset} cd your-project && vpush init
  ${c.dim}4.${c.reset} vpush push

${c.bold}FILES${c.reset}
  ${c.dim}.vpush.json${c.reset}     Project config (created by vpush init)
  ${c.dim}.vpushignore${c.reset}    Ignore patterns (like .gitignore)
  ${c.dim}~/.vpush/${c.reset}       Global config and token data
`);
}

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
      case "token":
        await cmdToken(args[1]);
        break;
      case "login":
        await cmdLogin();
        break;
      case "logout":
        await cmdLogout();
        break;
      case "whoami":
        await cmdWhoami();
        break;
      case "init":
        await cmdInit();
        break;
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
        error(`Unknown command: ${command}`);
        log(`${c.dim}Run 'vpush help' for usage${c.reset}`);
        process.exit(1);
    }
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

main();
