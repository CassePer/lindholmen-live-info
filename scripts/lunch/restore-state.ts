import { mkdir, writeFile } from "node:fs/promises";

// Read the last immutable private artifact through the job's short-lived token.
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repo || !token) throw new Error("GitHub-jobbet saknar behörighet.");
const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" };
const response = await fetch(`https://api.github.com/repos/${repo}/actions/artifacts?name=lunch-state&per_page=100`, { headers });
if (!response.ok) throw new Error("Tidigare jobbstatus kunde inte läsas.");
const data = await response.json();
const artifact = data.artifacts.find((a: { expired: boolean; workflow_run?: { head_branch?: string } }) => !a.expired && a.workflow_run?.head_branch === process.env.GITHUB_REF_NAME);
if (artifact) {
  const file = await fetch(`https://api.github.com/repos/${repo}/actions/artifacts/${artifact.id}/zip`, { headers });
  if (!file.ok) throw new Error("Tidigare jobbstatus kunde inte återställas.");
  await mkdir(".lunch-state", { recursive: true });
  await writeFile(".lunch-state/restore.zip", Buffer.from(await file.arrayBuffer()));
  console.log("Tidigare privat jobbstatus återställd.");
}