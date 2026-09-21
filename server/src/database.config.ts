type DatabaseEnvironment = Record<string, string | undefined>;

export function getDatabaseConfig(env: DatabaseEnvironment) {
  const required = (name: string): string => {
    const value = env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  const type = required('DB_TYPE');
  if (type !== 'postgres') {
    throw new Error(`Unsupported DB_TYPE: ${type}. Expected postgres.`);
  }

  const port = Number(required('DB_PORT'));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535.');
  }

  return {
    type: 'postgres' as const,
    host: required('DB_HOST'),
    port,
    username: required('DB_USERNAME'),
    password: required('DB_PASSWORD'),
    database: required('DB_DATABASE'),
  };
}
