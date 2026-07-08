import { DataSourceOptions } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Event } from '../entities/event.entity';

/**
 * Builds the TypeORM connection options from a PostgreSQL connection string.
 *
 * Shared by the NestJS `TypeOrmModule` (runtime) and the standalone
 * `AppDataSource` used by the TypeORM CLI (migrations) and the seed script,
 * so both always agree on entities and connection settings.
 *
 * `synchronize` is deliberately `false` — the schema is owned by explicit
 * migrations, never auto-generated.
 */
export function buildDataSourceOptions(databaseUrl: string | undefined): DataSourceOptions {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env.');
  }

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [Event, Booking],
    synchronize: false,
    migrationsRun: false,
    logging: process.env.DB_LOGGING === 'true',
  };
}
