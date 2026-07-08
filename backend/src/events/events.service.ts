import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventResponseDto } from './dto/event-response.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  /** Returns all events (soonest first) with their remaining seat counts. */
  async findAll(): Promise<EventResponseDto[]> {
    const events = await this.eventsRepository.find({ order: { date: 'ASC' } });
    return events.map((event) => EventResponseDto.fromEntity(event));
  }
}
