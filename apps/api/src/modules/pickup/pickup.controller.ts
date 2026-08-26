import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { UpdateDelegateDto } from './pickup.dto';
import { PickupService } from './pickup.service';

@ApiTags('Pickup')
@ApiBearerAuth()
@UseGuards(CustomerAuthGuard)
@Controller('pickup')
export class PickupController {
  constructor(private readonly pickup: PickupService) {}

  @Get(':bookingId/code')
  async code(
    @Req() request: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return {
      data: await this.pickup.codeForCustomer(
        bookingId,
        request.auth.customerId,
      ),
    };
  }

  @Put(':bookingId/delegate')
  async delegate(
    @Req() request: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateDelegateDto,
  ) {
    return {
      data: await this.pickup.updateDelegate(
        bookingId,
        request.auth.customerId,
        dto,
      ),
    };
  }
}
