// Railway/Railpack requires a start command detectable at the repo root, but this is a
// shared pnpm monorepo (services import packages/shared), so each deployed service builds
// from the full workspace. This dispatcher routes the root start command to whichever
// service the deployment targets via TABELLA_SERVICE (server | web).
import { spawnSync } from 'node:child_process';

const service = process.env.TABELLA_SERVICE ?? 'server';
const result = spawnSync('pnpm', ['--filter', `@tabella/${service}`, 'start'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
