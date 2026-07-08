import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hard database backstop for seat availability. The application already prevents
 * overselling via an atomic conditional UPDATE, but these CHECK constraints
 * guarantee at the storage layer that availability can never go negative or
 * exceed the event's total capacity — even in the face of a future code bug.
 */
export class AddAvailabilityCheck1720000001000 implements MigrationInterface {
  name = 'AddAvailabilityCheck1720000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "CHK_events_available_non_negative" CHECK ("available_seats" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD CONSTRAINT "CHK_events_available_within_total" CHECK ("available_seats" <= "total_seats")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "CHK_events_available_within_total"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT "CHK_events_available_non_negative"`,
    );
  }
}
