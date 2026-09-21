import { getDatabaseConfig } from './database.config';

const env = {
  DB_TYPE: 'postgres',
  DB_HOST: 'database.internal',
  DB_PORT: '5433',
  DB_USERNAME: 'example-user',
  DB_PASSWORD: 'example-password',
  DB_DATABASE: 'example-db',
};

describe('getDatabaseConfig', () => {
  it('reads the database connection from the environment', () => {
    expect(getDatabaseConfig(env)).toEqual({
      type: 'postgres',
      host: 'database.internal',
      port: 5433,
      username: 'example-user',
      password: 'example-password',
      database: 'example-db',
    });
  });

  it('rejects an invalid database port', () => {
    expect(() => getDatabaseConfig({ ...env, DB_PORT: 'invalid' })).toThrow(
      'DB_PORT must be an integer between 1 and 65535.',
    );
  });
});
