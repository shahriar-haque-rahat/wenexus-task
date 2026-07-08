import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';

/** Returns the set of DTO properties that failed validation. */
async function failingProps(payload: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateBookingDto, payload);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('CreateBookingDto validation', () => {
  const valid = {
    requestId: 'req-1',
    eventId: 1,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    seats: 2,
  };

  it('accepts a valid payload', async () => {
    expect(await failingProps(valid)).toEqual([]);
  });

  it('accepts the assignment sample non-UUID requestId', async () => {
    expect(await failingProps({ ...valid, requestId: '7f3c2a10-9b1e-4d5a-8c6f-booking-001' })).toEqual(
      [],
    );
  });

  it('rejects an invalid email', async () => {
    expect(await failingProps({ ...valid, customerEmail: 'not-an-email' })).toContain(
      'customerEmail',
    );
  });

  it('rejects fewer than 1 seat', async () => {
    expect(await failingProps({ ...valid, seats: 0 })).toContain('seats');
  });

  it('rejects a non-integer seat count', async () => {
    expect(await failingProps({ ...valid, seats: 1.5 })).toContain('seats');
  });

  it('rejects an empty requestId', async () => {
    expect(await failingProps({ ...valid, requestId: '' })).toContain('requestId');
  });

  it('rejects a missing customer name', async () => {
    const { customerName: _omitted, ...rest } = valid;
    expect(await failingProps(rest)).toContain('customerName');
  });

  it('rejects a non-integer eventId', async () => {
    expect(await failingProps({ ...valid, eventId: 1.5 })).toContain('eventId');
  });
});
