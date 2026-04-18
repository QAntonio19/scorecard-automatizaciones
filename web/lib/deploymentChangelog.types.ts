export interface DeploymentRelease {
  version: string;
  /** Fecha del despliegue o del corte de cambios (YYYY-MM-DD). */
  date: string;
  /** Fecha y hora ISO 8601 (UTC) del registro del despliegue; opcional. */
  releasedAt?: string;
  changes: string[];
  /** Enlace opcional a Compare en GitHub (tags o ramas). */
  githubCompareUrl?: string;
}

export interface DeploymentChangelogFile {
  repository: {
    owner: string;
    name: string;
    defaultBranch: string;
  };
  /** Orden: más reciente primero. */
  releases: DeploymentRelease[];
}
