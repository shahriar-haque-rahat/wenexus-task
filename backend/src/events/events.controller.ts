import { Controller, Get } from '@nestjs/common';
import { EventResponseDto } from './dto/event-response.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(): Promise<EventResponseDto[]> {
    return this.eventsService.findAll();
  }
}
