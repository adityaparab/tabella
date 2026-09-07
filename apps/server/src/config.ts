export interface Config {
  host: string;
  port: number;
  databaseUrl: string;
  /** true = reflect any origin (dev/demo); a string = that single origin. */
  corsOrigin: boolean | string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    host: env.HOST ?? '0.0.0.0',
    port: Number(env.PORT ?? 3001),
    // Local default matches compose.yaml (postgres:16 on 5433).
    databaseUrl: env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/tabella',
    corsOrigin: env.CORS_ORIGIN ? (env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN) : true,
  };
}
