import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_OPTIONS = {
  payloadPath: "examples/outputs/pr/pr-payload.json",
  dryRun: false,
  repo: process.env.GITHUB_REPO || null,
  head: null,
  baseBranch: null,
  bodyPath: null,
  title: null,
  requestOutputPath: null
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toPosixPath(value) {
  return value.replaceAll("\\", "/");
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  const valueFlags = new Map([
    ["--payload", "payloadPath"],
    ["--repo", "repo"],
    ["--head", "head"],
    ["--base-branch", "baseBranch"],
    ["--body", "bodyPath"],
    ["--title", "title"],
    ["--request-output", "requestOutputPath"]
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const key = valueFlags.get(flag);
    if (!key) throw new Error(`Unknown argument: ${flag}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for argument: ${flag}`);
    options[key] = value;
    index += 1;
  }

  return options;
}

async function readJson(root, relativePath, label) {
  const absolutePath = path.join(root, relativePath);
  const content = await readFile(absolutePath, "utf8");
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Unable to parse ${label} at ${relativePath}: ${error.message}`);
  }
}

function inferRepoFromOrigin(root) {
  const result = spawnSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return null;

  const remote = (result.stdout || result.stderr || "").trim();
  if (!remote) return null;

  const patterns = [
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
    /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i
  ];

  for (const pattern of patterns) {
    const match = remote.match(pattern);
    if (match) return `${match[1]}/${match[2]}`;
  }

  return null;
}

async function readText(root, relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function buildRequestSummary({ repo, endpoint, requestBody, payloadPath, bodyPath }) {
  return {
    mode: "DRY_RUN",
    repo,
    endpoint,
    payloadPath,
    bodyPath,
    requestBody,
    prerequisites: [
      "The head branch must already exist on GitHub before a non-dry-run call.",
      "Set GITHUB_TOKEN before creating a live draft PR.",
      "Dry-run output is advisory; deterministic evidence artifacts remain authoritative."
    ]
  };
}

async function maybeWriteRequestOutput(root, requestOutputPath, content) {
  if (!requestOutputPath) return;
  const relativePath = toPosixPath(requestOutputPath);
  await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
  await writeFile(path.join(root, relativePath), `${JSON.stringify(content, null, 2)}\n`);
}

async function postDraftPr(endpoint, token, requestBody) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "contextseal-draft-pr",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify(requestBody)
  });
  const responseText = await response.text();
  let payload;
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = { message: responseText };
  }

  if (!response.ok) {
    throw new Error(`GitHub draft PR request failed (${response.status}): ${payload.message || responseText || "Unknown error"}`);
  }

  return payload;
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(".");
const payloadPath = toPosixPath(options.payloadPath);
const payload = await readJson(root, payloadPath, "PR payload");
assert(payload.draftPrSupported, `Draft PR creation is not marked supported in ${payloadPath}`);

const repo = options.repo || inferRepoFromOrigin(root);
assert(repo, "GitHub repository could not be inferred. Provide --repo owner/name or set GITHUB_REPO.");

const bodyPath = toPosixPath(options.bodyPath || payload.bodyPath);
const body = await readText(root, bodyPath);
const title = options.title || payload.title;
const baseBranch = options.baseBranch || payload.baseBranch;
const head = options.head || payload.branchName;

assert(title, "PR title is required.");
assert(baseBranch, "Base branch is required.");
assert(head, "Head branch is required.");

const requestBody = {
  title,
  body,
  head,
  base: baseBranch,
  draft: true,
  maintainer_can_modify: false
};
const endpoint = `https://api.github.com/repos/${repo}/pulls`;

if (options.dryRun) {
  const summary = buildRequestSummary({ repo, endpoint, requestBody, payloadPath, bodyPath });
  await maybeWriteRequestOutput(root, options.requestOutputPath, summary);
  console.log(`PASS draft-pr dry-run ${payload.runId}: prepared POST ${endpoint} for ${head} -> ${baseBranch}`);
} else {
  const token = process.env.GITHUB_TOKEN;
  assert(token, "GITHUB_TOKEN is required unless --dry-run is used.");
  const created = await postDraftPr(endpoint, token, requestBody);
  await maybeWriteRequestOutput(root, options.requestOutputPath, {
    mode: "LIVE",
    repo,
    endpoint,
    requestBody,
    response: {
      number: created.number,
      html_url: created.html_url,
      url: created.url,
      draft: created.draft
    }
  });
  console.log(`PASS draft-pr ${payload.runId}: created draft PR #${created.number} ${created.html_url}`);
}