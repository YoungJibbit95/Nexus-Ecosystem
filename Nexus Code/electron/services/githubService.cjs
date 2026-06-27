"use strict";

const { TOKEN_SERVICE } = require("./githubAuthService.cjs");

const GITHUB_API_BASE = "https://api.github.com";
const USER_AGENT = "Nexus-Code-Electron";

const normalizePerPage = (value) => {
  const number = Number(value ?? 50);
  if (!Number.isFinite(number)) return 50;
  return Math.min(100, Math.max(1, Math.trunc(number)));
};

const normalizePage = (value) => {
  const number = Number(value ?? 1);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.trunc(number));
};

const assertRelativeApiPath = (apiPath) => {
  const text = String(apiPath || "").trim();
  if (!text.startsWith("/") || text.includes("\0")) {
    throw new Error("GitHub API path is not allowed.");
  }
  return text;
};

const createGithubService = ({ tokenStore }) => {
  const request = async (apiPath, options = {}) => {
    const token = await tokenStore.getToken(TOKEN_SERVICE);
    if (!token) throw new Error("GitHub is not authenticated.");

    const url = new URL(assertRelativeApiPath(apiPath), GITHUB_API_BASE);
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `GitHub API request failed with ${response.status}.`);
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    async getViewer() {
      const user = await request("/user");
      return {
        id: user.id,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
      };
    },

    async listRepositories(options = {}) {
      const repos = await request("/user/repos", {
        query: {
          visibility: options.visibility || "all",
          affiliation: options.affiliation || "owner,collaborator,organization_member",
          sort: options.sort || "updated",
          direction: options.direction || "desc",
          per_page: normalizePerPage(options.perPage),
          page: normalizePage(options.page),
        },
      });

      return {
        repositories: repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          defaultBranch: repo.default_branch,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          updatedAt: repo.updated_at,
        })),
      };
    },

    async getRateLimit() {
      return request("/rate_limit");
    },
  };
};

module.exports = {
  createGithubService,
};
