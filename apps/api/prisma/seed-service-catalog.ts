import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const services = [
  {
    code: 'EXTERIOR_WASH',
    nameFa: 'شست‌وشوی بدنه',
    nameEn: 'Exterior Wash',
    descriptionFa: 'شست‌وشوی کامل بخش بیرونی خودرو',
    sortOrder: 10,
  },
  {
    code: 'WHEEL_CLEAN',
    nameFa: 'شست‌وشوی رینگ',
    nameEn: 'Wheel Cleaning',
    descriptionFa: 'تمیزکاری رینگ و بخش بیرونی چرخ‌ها',
    sortOrder: 20,
  },
  {
    code: 'DRYING',
    nameFa: 'خشک‌کردن بدنه',
    nameEn: 'Drying',
    descriptionFa: 'خشک‌کردن اصولی بدنه پس از شست‌وشو',
    sortOrder: 30,
  },
  {
    code: 'INTERIOR_VACUUM',
    nameFa: 'جارو داخل کابین',
    nameEn: 'Interior Vacuum',
    descriptionFa: 'نظافت و جارو فضای داخلی خودرو',
    sortOrder: 40,
  },
  {
    code: 'DASHBOARD_CLEAN',
    nameFa: 'نظافت داشبورد',
    nameEn: 'Dashboard Cleaning',
    descriptionFa: 'تمیزکاری داشبورد و بخش‌های داخلی',
    sortOrder: 50,
  },
  {
    code: 'GLASS_CLEAN',
    nameFa: 'شیشه‌شویی',
    nameEn: 'Glass Cleaning',
    descriptionFa: 'تمیزکاری شیشه‌های داخل و خارج خودرو',
    sortOrder: 60,
  },
  {
    code: 'TIRE_SHINE',
    nameFa: 'براق‌کننده تایر',
    nameEn: 'Tire Shine',
    descriptionFa: 'تمیزکاری و براق‌کردن تایرها',
    sortOrder: 70,
  },
  {
    code: 'DETAILING_CARE',
    nameFa: 'دیتیلینگ سبک',
    nameEn: 'Light Detailing',
    descriptionFa: 'مراقبت تکمیلی و جزئیات بیشتر در نظافت خودرو',
    sortOrder: 80,
  },
] as const;

const packages = [
  {
    code: 'ECONOMY',
    nameFa: 'اقتصادی',
    nameEn: 'Economy',
    descriptionFa: 'شست‌وشوی ضروری و سریع خودرو',
    badgeFa: 'اقتصادی',
    durationMinutes: 25,
    sortOrder: 10,
    isFeatured: false,
    services: ['EXTERIOR_WASH', 'WHEEL_CLEAN', 'DRYING'],
  },
  {
    code: 'FULL',
    nameFa: 'کامل',
    nameEn: 'Full',
    descriptionFa: 'شست‌وشوی کامل بیرون و نظافت اولیه کابین',
    badgeFa: 'پرفروش',
    durationMinutes: 40,
    sortOrder: 20,
    isFeatured: true,
    services: [
      'EXTERIOR_WASH',
      'WHEEL_CLEAN',
      'DRYING',
      'INTERIOR_VACUUM',
      'DASHBOARD_CLEAN',
      'GLASS_CLEAN',
    ],
  },
  {
    code: 'VIP',
    nameFa: 'VIP',
    nameEn: 'VIP',
    descriptionFa: 'شست‌وشوی کامل همراه با خدمات مراقبتی بیشتر',
    badgeFa: 'ویژه',
    durationMinutes: 55,
    sortOrder: 30,
    isFeatured: false,
    services: [
      'EXTERIOR_WASH',
      'WHEEL_CLEAN',
      'DRYING',
      'INTERIOR_VACUUM',
      'DASHBOARD_CLEAN',
      'GLASS_CLEAN',
      'TIRE_SHINE',
    ],
  },
  {
    code: 'DETAILING',
    nameFa: 'دیتیلینگ',
    nameEn: 'Detailing',
    descriptionFa: 'پکیج کامل‌تر برای نظافت دقیق‌تر خودرو',
    badgeFa: 'پریمیوم',
    durationMinutes: 75,
    sortOrder: 40,
    isFeatured: false,
    services: [
      'EXTERIOR_WASH',
      'WHEEL_CLEAN',
      'DRYING',
      'INTERIOR_VACUUM',
      'DASHBOARD_CLEAN',
      'GLASS_CLEAN',
      'TIRE_SHINE',
      'DETAILING_CARE',
    ],
  },
] as const;

const packagePrices: Record<string, Record<string, number>> = {
  ECONOMY: {
    HATCHBACK: 1_500_000,
    SEDAN: 1_700_000,
    CROSSOVER: 2_000_000,
    SUV: 2_300_000,
    PICKUP: 2_500_000,
    VAN: 2_800_000,
    LUXURY: 2_500_000,
    OTHER_CAR: 2_000_000,
    MOTORCYCLE: 1_000_000,
  },
  FULL: {
    HATCHBACK: 2_400_000,
    SEDAN: 2_700_000,
    CROSSOVER: 3_100_000,
    SUV: 3_500_000,
    PICKUP: 3_800_000,
    VAN: 4_200_000,
    LUXURY: 4_000_000,
    OTHER_CAR: 3_000_000,
    MOTORCYCLE: 1_600_000,
  },
  VIP: {
    HATCHBACK: 3_200_000,
    SEDAN: 3_600_000,
    CROSSOVER: 4_100_000,
    SUV: 4_600_000,
    PICKUP: 5_000_000,
    VAN: 5_500_000,
    LUXURY: 5_500_000,
    OTHER_CAR: 4_000_000,
    MOTORCYCLE: 2_200_000,
  },
  DETAILING: {
    HATCHBACK: 5_500_000,
    SEDAN: 6_000_000,
    CROSSOVER: 6_800_000,
    SUV: 7_500_000,
    PICKUP: 8_000_000,
    VAN: 8_500_000,
    LUXURY: 9_000_000,
    OTHER_CAR: 6_500_000,
    MOTORCYCLE: 3_500_000,
  },
};

const addons = [
  {
    code: 'NANO_WAX',
    nameFa: 'واکس نانو',
    nameEn: 'Nano Wax',
    descriptionFa: 'لایه محافظ و براق‌کننده بدنه',
    durationMinutes: 10,
    sortOrder: 10,
    isRecommended: true,
    prices: {
      HATCHBACK: 900_000,
      SEDAN: 1_000_000,
      CROSSOVER: 1_100_000,
      SUV: 1_200_000,
      PICKUP: 1_300_000,
      VAN: 1_400_000,
      LUXURY: 1_400_000,
      OTHER_CAR: 1_100_000,
      MOTORCYCLE: 600_000,
    },
  },
  {
    code: 'TIRE_POLISH',
    nameFa: 'براق‌کننده تایر',
    nameEn: 'Tire Polish',
    descriptionFa: 'تمیزکاری و براق‌کردن تایرها',
    durationMinutes: 5,
    sortOrder: 20,
    isRecommended: false,
    prices: {
      HATCHBACK: 400_000,
      SEDAN: 400_000,
      CROSSOVER: 500_000,
      SUV: 500_000,
      PICKUP: 600_000,
      VAN: 600_000,
      LUXURY: 700_000,
      OTHER_CAR: 500_000,
      MOTORCYCLE: 300_000,
    },
  },
  {
    code: 'DEEP_VACUUM',
    nameFa: 'جارو و نظافت تکمیلی',
    nameEn: 'Deep Vacuum',
    descriptionFa: 'نظافت دقیق‌تر فضای داخلی خودرو',
    durationMinutes: 15,
    sortOrder: 30,
    isRecommended: false,
    prices: {
      HATCHBACK: 800_000,
      SEDAN: 900_000,
      CROSSOVER: 1_000_000,
      SUV: 1_100_000,
      PICKUP: 1_100_000,
      VAN: 1_200_000,
      LUXURY: 1_200_000,
      OTHER_CAR: 1_000_000,
      MOTORCYCLE: 500_000,
    },
  },
] as const;

async function main() {
  const serviceByCode = new Map<string, string>();

  for (const service of services) {
    const record = await prisma.service.upsert({
      where: {
        code: service.code,
      },
      update: {
        nameFa: service.nameFa,
        nameEn: service.nameEn,
        descriptionFa: service.descriptionFa,
        sortOrder: service.sortOrder,
        isActive: true,
      },
      create: {
        ...service,
        isActive: true,
      },
    });

    serviceByCode.set(service.code, record.id);
  }

  const vehicleClasses = await prisma.vehicleClass.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      code: true,
    },
  });

  const vehicleClassByCode = new Map(
    vehicleClasses.map((vehicleClass) => [vehicleClass.code, vehicleClass.id]),
  );

  for (const packageDefinition of packages) {
    const packageRecord = await prisma.servicePackage.upsert({
      where: {
        code: packageDefinition.code,
      },
      update: {
        nameFa: packageDefinition.nameFa,
        nameEn: packageDefinition.nameEn,
        descriptionFa: packageDefinition.descriptionFa,
        badgeFa: packageDefinition.badgeFa,
        durationMinutes: packageDefinition.durationMinutes,
        sortOrder: packageDefinition.sortOrder,
        isFeatured: packageDefinition.isFeatured,
        isActive: true,
      },
      create: {
        code: packageDefinition.code,
        nameFa: packageDefinition.nameFa,
        nameEn: packageDefinition.nameEn,
        descriptionFa: packageDefinition.descriptionFa,
        badgeFa: packageDefinition.badgeFa,
        durationMinutes: packageDefinition.durationMinutes,
        sortOrder: packageDefinition.sortOrder,
        isFeatured: packageDefinition.isFeatured,
        isActive: true,
      },
    });

    for (const [
      serviceIndex,
      serviceCode,
    ] of packageDefinition.services.entries()) {
      const serviceId = serviceByCode.get(serviceCode);

      if (!serviceId) {
        throw new Error(`Unknown service: ${serviceCode}`);
      }

      await prisma.servicePackageItem.upsert({
        where: {
          packageId_serviceId: {
            packageId: packageRecord.id,
            serviceId,
          },
        },
        update: {
          sortOrder: (serviceIndex + 1) * 10,
        },
        create: {
          packageId: packageRecord.id,
          serviceId,
          sortOrder: (serviceIndex + 1) * 10,
        },
      });
    }

    const prices = packagePrices[packageDefinition.code];

    for (const [vehicleClassCode, amountRial] of Object.entries(prices)) {
      const vehicleClassId = vehicleClassByCode.get(vehicleClassCode);

      if (!vehicleClassId) {
        continue;
      }

      await prisma.servicePackagePrice.upsert({
        where: {
          packageId_vehicleClassId: {
            packageId: packageRecord.id,
            vehicleClassId,
          },
        },
        update: {
          amountRial,
        },
        create: {
          packageId: packageRecord.id,
          vehicleClassId,
          amountRial,
        },
      });
    }
  }

  for (const addonDefinition of addons) {
    const addon = await prisma.serviceAddon.upsert({
      where: {
        code: addonDefinition.code,
      },
      update: {
        nameFa: addonDefinition.nameFa,
        nameEn: addonDefinition.nameEn,
        descriptionFa: addonDefinition.descriptionFa,
        durationMinutes: addonDefinition.durationMinutes,
        sortOrder: addonDefinition.sortOrder,
        isRecommended: addonDefinition.isRecommended,
        isActive: true,
      },
      create: {
        code: addonDefinition.code,
        nameFa: addonDefinition.nameFa,
        nameEn: addonDefinition.nameEn,
        descriptionFa: addonDefinition.descriptionFa,
        durationMinutes: addonDefinition.durationMinutes,
        sortOrder: addonDefinition.sortOrder,
        isRecommended: addonDefinition.isRecommended,
        isActive: true,
      },
    });

    for (const [vehicleClassCode, amountRial] of Object.entries(
      addonDefinition.prices,
    )) {
      const vehicleClassId = vehicleClassByCode.get(vehicleClassCode);

      if (!vehicleClassId) {
        continue;
      }

      await prisma.serviceAddonPrice.upsert({
        where: {
          addonId_vehicleClassId: {
            addonId: addon.id,
            vehicleClassId,
          },
        },
        update: {
          amountRial,
        },
        create: {
          addonId: addon.id,
          vehicleClassId,
          amountRial,
        },
      });
    }
  }

  console.log('BestWash service catalog seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
