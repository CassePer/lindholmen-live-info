import { mkdir, writeFile } from "node:fs/promises";

// Read the last immutable private artifact through the job's short-lived token.
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error("GitHub-jobbet saknar behörighet.");
const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" };
const response = await fetch(`https://api.github.com/repos/${repo}/actions/artifacts?name=lunch-state&per_page=100`, { headers });
if (!response.ok) throw new Error("Tidigare jobbstatus kunde inte läsas.");
const data = await response.json();
interface Artifact { id: number; expired: boolean; created_at: string; workflow_run?: { id: number; head_branch?: string } }
const candidates: Artifact[] = data.artifacts.filter((a: Artifact) => !a.expired && a.workflow_run?.head_branch === process.env.GITHUB_REF_NAME);
candidates.sort((a, b) => b.created_at.localeCompare(a.created_at));
let artifact: Artifact | undefined;
for (const candidate of candidates) {
  const runResponse = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${candidate.workflow_run?.id}`, { headers });
  if (!runResponse.ok) throw new Error("Jobbstatusens ursprung kunde inte kontrolleras.");
  const run = await runResponse.json();
  if (run.path === ".github/workflows/publish-lunch.yml") { artifact = candidate; break; }
}
if (artifact) {
  const file = await fetch(`https://api.github.com/repos/${repo}/actions/artifacts/${artifact.id}/zip`, { headers });
  if (!file.ok) throw new Error("Tidigare jobbstatus kunde inte återställas.");
  await mkdir(".lunch-state", { recursive: true });
  await writeFile(".lunch-state/restore.zip", Buffer.from(await file.arrayBuffer()));
  console.log("Tidigare privat jobbstatus återställd.");
}