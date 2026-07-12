const path = require("path");
const { fileURLToPath } = require("url");

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const isSameOrChildPath = (candidate, root) => {
  const normalizedCandidate = path.resolve(candidate);
  const normalizedRoot = path.resolve(root);
  const relative = path.relative(normalizedRoot, normalizedCandidate);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
};

const createNavigationPolicy = ({ dev, devUrl, distRoot }) => {
  const parsedDevUrl = new URL(devUrl);
  const trustedDistRoot = path.resolve(distRoot);

  return {
    isAllowedNavigation(rawUrl) {
      if (typeof rawUrl !== "string" || rawUrl.length === 0) return false;

      let parsed;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return false;
      }

      if (dev) {
        if (parsed.origin !== parsedDevUrl.origin) return false;
        if (parsed.username || parsed.password) return false;
        if (parsed.protocol === "https:") return true;
        return parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname);
      }

      if (parsed.protocol !== "file:" || parsed.hostname) return false;
      try {
        return isSameOrChildPath(fileURLToPath(parsed), trustedDistRoot);
      } catch {
        return false;
      }
    },
  };
};

module.exports = {
  createNavigationPolicy,
  isSameOrChildPath,
};
