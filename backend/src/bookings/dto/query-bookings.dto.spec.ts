import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryBookingsDto } from './query-bookings.dto';

async function build(payload: Record<string, unknown>) {
  const dto = plainToInstance(QueryBookingsDto, payload);
  const errors = await validate(dto);
  return { dto, failing: errors.map((e) => e.property) };
}

describe('QueryBookingsDto', () => {
  it('applies defaults when nothing is provided', async () => {
    const { dto, failing } = await build({});
    expect(failing).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.eventId).toBeUndefined();
    expect(dto.status).toBeUndefined();
  });

  it('treats empty filter params as "no filter" (no 400)', async () => {
    const { dto, failing } = await build({ status: '', eventId: '', page: '', limit: '' });
    expect(failing).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.eventId).toBeUndefined();
    expect(dto.status).toBeUndefined();
  });

  it('parses provided filters and pagination', async () => {
    const { dto, failing } = await build({ page: '2', limit: '5', eventId: '3', status: 'CONFIRMED' });
    expect(failing).toEqual([]);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);
    expect(dto.eventId).toBe(3);
    expect(dto.status).toBe('CONFIRMED');
  });

  it('rejects an invalid status', async () => {
    const { failing } = await build({ status: 'NOPE' });
    expect(failing).toContain('status');
  });

  it('rejects a limit over the maximum', async () => {
    const { failing } = await build({ limit: '500' });
    expect(failing).toContain('limit');
  });
});
