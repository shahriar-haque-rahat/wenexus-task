import 'dotenv/config';
import { AppDataSource } from '../data-source';
import { Event } from '../entities/event.entity';

/**
 * Idempotent seed script: inserts a few sample events, but only when the
 * `events` table is empty, so it can be re-run safely without creating
 * duplicates or disturbing existing bookings.
 */
const SEED_EVENTS: Array<Pick<Event, 'name' | 'date' | 'totalSeats' | 'availableSeats' | 'priceCents'>> = [
  {
    name: 'Tech Conference 2026',
    date: new Date('2026-09-15T09:00:00Z'),
    totalSeats: 100,
    availableSeats: 100,
    priceCents: 15000,
  },
  {
    name: 'Live Jazz Night',
    date: new Date('2026-08-20T19:30:00Z'),
    totalSeats: 50,
    availableSeats: 50,
    priceCents: 4500,
  },
  {
    name: 'Startup Pitch Day',
    date: new Date('2026-10-05T13:00:00Z'),
    totalSeats: 20,
    availableSeats: 20,
    priceCents: 0,
  },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  try {
    const repo = AppDataSource.getRepository(Event);
    const existing = await repo.count();
    if (existing > 0) {
      console.log(`Seed skipped: ${existing} event(s) already present.`);
      return;
    }

    const events = repo.create(SEED_EVENTS);
    await repo.save(events);
    console.log(`Seeded ${events.length} events:`);
    for (const event of events) {
      console.log(`  #${event.id} ${event.name} (${event.availableSeats} seats)`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
