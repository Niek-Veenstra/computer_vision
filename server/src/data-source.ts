import { DataSource } from 'typeorm';
import { User } from './users/users.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'app',
  password: 'app',
  entities: [User],
  migrations: ['src/migrations/*.ts'],
});
