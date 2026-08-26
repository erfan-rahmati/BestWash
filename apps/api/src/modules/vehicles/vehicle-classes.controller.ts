import { Controller, Get } from '@nestjs/common';
import { VehicleCatalogService } from './vehicle-catalog.service';

@Controller('vehicle-classes')
export class VehicleClassesController {
  constructor(private readonly vehicleCatalogService: VehicleCatalogService) {}

  @Get()
  async getClasses() {
    return {
      data: await this.vehicleCatalogService.findClasses(),
    };
  }
}
