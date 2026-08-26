import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

function parseInteger(
  value: string | undefined,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new BadRequestException(`${field} must be an integer.`);
  }

  return parsed;
}

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('days')
  getDays(
    @Query('from')
    from: string | undefined,

    @Query('days')
    daysRaw: string | undefined,

    @Query('durationMinutes')
    durationRaw: string | undefined,
  ) {
    const durationMinutes = parseInteger(durationRaw, 'durationMinutes');

    if (durationMinutes === undefined) {
      throw new BadRequestException('durationMinutes is required.');
    }

    return this.availabilityService
      .getDays(from, parseInteger(daysRaw, 'days'), durationMinutes)
      .then((data) => ({
        data,
      }));
  }

  @Get('slots')
  getSlots(
    @Query('date')
    date: string | undefined,

    @Query('durationMinutes')
    durationRaw: string | undefined,
  ) {
    if (!date) {
      throw new BadRequestException('date is required.');
    }

    const durationMinutes = parseInteger(durationRaw, 'durationMinutes');

    if (durationMinutes === undefined) {
      throw new BadRequestException('durationMinutes is required.');
    }

    return this.availabilityService
      .getSlots(date, durationMinutes)
      .then((data) => ({
        data,
      }));
  }
}
