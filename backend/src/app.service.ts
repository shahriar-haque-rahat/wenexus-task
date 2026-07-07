import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return { status: 'ok', service: 'event-booking-api' };
  }
}
