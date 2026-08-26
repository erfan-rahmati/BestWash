import { Controller, Get, Param } from '@nestjs/common';
import { VehicleCatalogService } from './vehicle-catalog.service';

@Controller('vehicle-brands')
export class VehicleCatalogController {
  constructor(private readonly vehicleCatalogService: VehicleCatalogService) {}

  @Get()
  async getBrands() {
    return {
      data: await this.vehicleCatalogService.findBrands(),
    };
  }

  @Get(':brandId/models')
  async getModels(@Param('brandId') brandId: string) {
    return {
      data: await this.vehicleCatalogService.findModelsByBrand(brandId),
    };
  }
}
