/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional GitHub Personal Access Token used by the GitHub panel.
   * Unset → requests are anonymous (60 req/hour, fine for a 60-minute refresh).
   * Set   → raises the limit to 5,000 req/hour.
   *
   * Never commit a token. Put it in a local, git-ignored `.env.local`:
   *   VITE_GITHUB_TOKEN=ghp_xxx
   * (Vite only exposes vars prefixed with VITE_ to the app.)
   */
  readonly VITE_GITHUB_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
