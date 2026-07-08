import * as crypto from 'crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaginatedResponse } from '../common/dto/paginated-response.dto';
import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** Accepts a booking request and returns 202 with the booking reference. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateBookingDto): Promise<BookingResponseDto> {
    const requestId = crypto.randomUUID();
    return this.bookingsService.create(dto, requestId);
  }

  @Get()
  findAll(@Query() query: QueryBookingsDto): Promise<PaginatedResponse<BookingResponseDto>> {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BookingResponseDto> {
    return this.bookingsService.findOne(id);
  }
}

