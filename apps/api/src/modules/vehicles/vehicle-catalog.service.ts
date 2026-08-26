import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VehicleCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findClasses() {
    return this.prisma.vehicleClass.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          vehicleType: 'asc',
        },
        {
          sortOrder: 'asc',
        },
        {
          nameFa: 'asc',
        },
      ],
      select: {
        id: true,
        code: true,
        nameFa: true,
        nameEn: true,
        vehicleType: true,
      },
    });
  }

  findBrands() {
    return this.prisma.vehicleBrand.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          nameFa: 'asc',
        },
      ],
      select: {
        id: true,
        nameFa: true,
        nameEn: true,
        slug: true,
      },
    });
  }

  async findModelsByBrand(brandId: string) {
    const brand = await this.prisma.vehicleBrand.findFirst({
      where: {
        id: brandId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!brand) {
      throw new NotFoundException('Vehicle brand not found.');
    }

    return this.prisma.vehicleModel.findMany({
      where: {
        brandId,
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          nameFa: 'asc',
        },
      ],
      select: {
        id: true,
        nameFa: true,
        nameEn: true,
        slug: true,
        aliases: true,
        vehicleClass: {
          select: {
            id: true,
            code: true,
            nameFa: true,
            nameEn: true,
            vehicleType: true,
          },
        },
      },
    });
  }
}
