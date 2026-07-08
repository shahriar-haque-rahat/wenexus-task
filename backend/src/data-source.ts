import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './config/data-source-options';
import { AddAvailabilityCheck1720000001000 } from './migrations/1720000001000-AddAvailabilityCheck';
import { InitSchema1720000000000 } from './migrations/1720000000000-InitSchema';

/**
 * Standalone DataSource used by the TypeORM CLI (migrations) and the seed
 * script. Migrations are listed explicitly (rather than via a filesystem glob)
 * so resolution is reliable across platforms, including Windows.
 */
export const AppDataSource = new DataSource({
  ...buildDataSourceOptions(process.env.DATABASE_URL),
  migrations: [InitSchema1720000000000, AddAvailabilityCheck1720000001000],
});
