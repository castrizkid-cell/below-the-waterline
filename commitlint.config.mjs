// Conventional Commits: feat, fix, chore, docs, refactor, test, perf, ci, build, style, revert.
// Breaking changes: "feat!: ..." or a "BREAKING CHANGE:" footer.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: { "header-max-length": [2, "always", 100] },
};
