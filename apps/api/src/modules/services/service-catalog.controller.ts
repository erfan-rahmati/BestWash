import { Controller, Get, Param } from '@nestjs/common';
import { ServiceCatalogService } from './service-catalog.service';

@Controller('service-catalog')
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Get('vehicle-classes/:vehicleClassId')
  async getCatalog(
    @Param('vehicleClassId')
    vehicleClassId: string,
  ) {
    return {
      data: await this.serviceCatalogService.findForVehicleClass(
        vehicleClassId,
      ),
    };
  }
}
