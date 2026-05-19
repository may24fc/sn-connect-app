// Minimal ambient declaration for Node's `process.env` so we can read
// environment variables from a package that does not depend on @types/node.
declare const process: {
  env: Record<string, string | undefined>;
};
