import type { DeploymentChangelogFile } from "./deploymentChangelog.types";
import data from "@/data/deployment-changelog.json";

export type { DeploymentChangelogFile, DeploymentRelease } from "./deploymentChangelog.types";

export const deploymentChangelog = data as DeploymentChangelogFile;

/** Versión en uso: primer elemento de `releases` (la más reciente). */
export function getCurrentVersion(): string {
  const first = deploymentChangelog.releases[0];
  return first?.version ?? "0.0.0";
}

export function githubRepoUrl(repo = deploymentChangelog.repository): string {
  return `https://github.com/${repo.owner}/${repo.name}`;
}

export function githubCommitsUrl(branch: string, repo = deploymentChangelog.repository): string {
  return `${githubRepoUrl(repo)}/commits/${branch}`;
}
