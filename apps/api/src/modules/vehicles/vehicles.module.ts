import { Module } from '@nestjs/common';
import { VehicleCatalogController } from './vehicle-catalog.controller';
import { VehicleCatalogService } from './vehicle-catalog.service';
import { VehicleClassesController } from './vehicle-classes.controller';

@Module({
  controllers: [VehicleCatalogController, VehicleClassesController],
  providers: [VehicleCatalogService],
})
export class VehiclesModule {}
