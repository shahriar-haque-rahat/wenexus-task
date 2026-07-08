import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: `events` and `bookings`.
 *
 * Notes:
 * - `bookings.id` is a UUID (server-generated via `gen_random_uuid()`, native
 *   to PostgreSQL 13+, no extension required) and serves as the booking reference.
 * - `bookings.request_id` is UNIQUE — the database-level guarantee behind
 *   idempotent booking creation.
 * - The `available_seats >= 0` CHECK backstop is added later, in the Phase 5
 *   migration, alongside the concurrency-safe deduction logic it protects.
 */
export class InitSchema1720000000000 implements MigrationInterface {
  name = 'InitSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(200) NOT NULL,
        "date" timestamptz NOT NULL,
        "total_seats" integer NOT NULL,
        "available_seats" integer NOT NULL,
        "price_cents" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" varchar(200) NOT NULL,
        "event_id" integer NOT NULL,
        "customer_name" varchar(200) NOT NULL,
        "customer_email" varchar(320) NOT NULL,
        "seats" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "failure_reason" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_bookings_seats_positive" CHECK ("seats" > 0),
        CONSTRAINT "CHK_bookings_status" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'FAILED')),
        CONSTRAINT "FK_bookings_event" FOREIGN KEY ("event_id")
          REFERENCES "events" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bookings_request_id" ON "bookings" ("request_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_bookings_event_id" ON "bookings" ("event_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_bookings_status" ON "bookings" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
