import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServiceCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findForVehicleClass(vehicleClassId: string) {
    const vehicleClass = await this.prisma.vehicleClass.findFirst({
      where: {
        id: vehicleClassId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        nameFa: true,
        nameEn: true,
        vehicleType: true,
      },
    });

    if (!vehicleClass) {
      throw new NotFoundException('Vehicle class not found.');
    }

    const packages = await this.prisma.servicePackage.findMany({
      where: {
        isActive: true,
        prices: {
          some: {
            vehicleClassId,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        code: true,
        nameFa: true,
        nameEn: true,
        descriptionFa: true,
        badgeFa: true,
        durationMinutes: true,
        isFeatured: true,
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            service: {
              select: {
                id: true,
                code: true,
                nameFa: true,
                nameEn: true,
              },
            },
          },
        },
        prices: {
          where: {
            vehicleClassId,
          },
          select: {
            amountRial: true,
          },
        },
      },
    });

    const addons = await this.prisma.serviceAddon.findMany({
      where: {
        isActive: true,
        prices: {
          some: {
            vehicleClassId,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        code: true,
        nameFa: true,
        nameEn: true,
        descriptionFa: true,
        durationMinutes: true,
        isRecommended: true,
        prices: {
          where: {
            vehicleClassId,
          },
          select: {
            amountRial: true,
          },
        },
      },
    });

    return {
      vehicleClass,
      packages: packages.map(({ prices, items, ...item }) => ({
        ...item,
        amountRial: prices[0]?.amountRial ?? 0,
        services: items.map((packageItem) => packageItem.service),
      })),
      addons: addons.map(({ prices, ...addon }) => ({
        ...addon,
        amountRial: prices[0]?.amountRial ?? 0,
      })),
    };
  }
}
