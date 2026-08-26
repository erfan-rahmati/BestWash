import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { VehicleType } from '../src/generated/prisma/enums';
import { hash } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const vehicleClasses = [
  {
    code: 'HATCHBACK',
    nameFa: 'هاچ‌بک',
    nameEn: 'Hatchback',
    vehicleType: VehicleType.CAR,
    sortOrder: 10,
  },
  {
    code: 'SEDAN',
    nameFa: 'سدان',
    nameEn: 'Sedan',
    vehicleType: VehicleType.CAR,
    sortOrder: 20,
  },
  {
    code: 'CROSSOVER',
    nameFa: 'کراس‌اوور',
    nameEn: 'Crossover',
    vehicleType: VehicleType.CAR,
    sortOrder: 30,
  },
  {
    code: 'SUV',
    nameFa: 'شاسی‌بلند',
    nameEn: 'SUV',
    vehicleType: VehicleType.CAR,
    sortOrder: 40,
  },
  {
    code: 'PICKUP',
    nameFa: 'وانت',
    nameEn: 'Pickup',
    vehicleType: VehicleType.CAR,
    sortOrder: 50,
  },
  {
    code: 'VAN',
    nameFa: 'ون',
    nameEn: 'Van',
    vehicleType: VehicleType.CAR,
    sortOrder: 60,
  },
  {
    code: 'LUXURY',
    nameFa: 'لوکس و ویژه',
    nameEn: 'Luxury',
    vehicleType: VehicleType.CAR,
    sortOrder: 70,
  },
  {
    code: 'OTHER_CAR',
    nameFa: 'سایر خودروها',
    nameEn: 'Other Car',
    vehicleType: VehicleType.CAR,
    sortOrder: 90,
  },
  {
    code: 'MOTORCYCLE',
    nameFa: 'موتورسیکلت',
    nameEn: 'Motorcycle',
    vehicleType: VehicleType.MOTORCYCLE,
    sortOrder: 100,
  },
] as const;

const brands = [
  {
    slug: 'iran-khodro',
    nameFa: 'ایران خودرو',
    nameEn: 'Iran Khodro',
    sortOrder: 10,
    models: [
      ['peugeot-206', 'پژو ۲۰۶', 'Peugeot 206', 'HATCHBACK'],
      ['peugeot-207', 'پژو ۲۰۷', 'Peugeot 207', 'HATCHBACK'],
      ['dena', 'دنا', 'Dena', 'SEDAN'],
      ['dena-plus', 'دنا پلاس', 'Dena Plus', 'SEDAN'],
      ['tara', 'تارا', 'Tara', 'SEDAN'],
      ['runa-plus', 'رانا پلاس', 'Runna Plus', 'SEDAN'],
      ['samand', 'سمند', 'Samand', 'SEDAN'],
      ['soren-plus', 'سورن پلاس', 'Soren Plus', 'SEDAN'],
    ],
  },
  {
    slug: 'saipa',
    nameFa: 'سایپا',
    nameEn: 'Saipa',
    sortOrder: 20,
    models: [
      ['pride-111', 'پراید ۱۱۱', 'Pride 111', 'HATCHBACK'],
      ['pride-131', 'پراید ۱۳۱', 'Pride 131', 'SEDAN'],
      ['tiba', 'تیبا', 'Tiba', 'SEDAN'],
      ['tiba-2', 'تیبا ۲', 'Tiba 2', 'HATCHBACK'],
      ['saina', 'ساینا', 'Saina', 'SEDAN'],
      ['quick', 'کوییک', 'Quick', 'HATCHBACK'],
      ['shahin', 'شاهین', 'Shahin', 'SEDAN'],
      ['atlas', 'اطلس', 'Atlas', 'HATCHBACK'],
    ],
  },
  {
    slug: 'modiran-khodro',
    nameFa: 'مدیران خودرو',
    nameEn: 'Modiran Khodro',
    sortOrder: 30,
    models: [
      ['mvm-315', 'ام‌وی‌ام ۳۱۵', 'MVM 315', 'HATCHBACK'],
      ['mvm-x22', 'ام‌وی‌ام X22', 'MVM X22', 'CROSSOVER'],
      ['mvm-x33', 'ام‌وی‌ام X33', 'MVM X33', 'CROSSOVER'],
      ['mvm-x55', 'ام‌وی‌ام X55', 'MVM X55', 'CROSSOVER'],
    ],
  },
  {
    slug: 'kerman-motor',
    nameFa: 'کرمان موتور',
    nameEn: 'Kerman Motor',
    sortOrder: 40,
    models: [
      ['jac-j4', 'جک J4', 'JAC J4', 'SEDAN'],
      ['jac-s3', 'جک S3', 'JAC S3', 'CROSSOVER'],
      ['jac-s5', 'جک S5', 'JAC S5', 'CROSSOVER'],
      ['kmc-j7', 'کی‌ام‌سی J7', 'KMC J7', 'SEDAN'],
      ['kmc-k7', 'کی‌ام‌سی K7', 'KMC K7', 'CROSSOVER'],
      ['kmc-t8', 'کی‌ام‌سی T8', 'KMC T8', 'PICKUP'],
    ],
  },
  {
    slug: 'bahman-motor',
    nameFa: 'بهمن موتور',
    nameEn: 'Bahman Motor',
    sortOrder: 50,
    models: [
      ['dignity-prime', 'دیگنیتی پرایم', 'Dignity Prime', 'CROSSOVER'],
      ['fidelity-prime', 'فیدلیتی پرایم', 'Fidelity Prime', 'CROSSOVER'],
      ['respect', 'ریسپکت', 'Respect', 'SEDAN'],
    ],
  },
  {
    slug: 'hyundai',
    nameFa: 'هیوندای',
    nameEn: 'Hyundai',
    sortOrder: 60,
    models: [
      ['accent', 'اکسنت', 'Accent', 'SEDAN'],
      ['elantra', 'النترا', 'Elantra', 'SEDAN'],
      ['sonata', 'سوناتا', 'Sonata', 'SEDAN'],
      ['tucson', 'توسان', 'Tucson', 'CROSSOVER'],
      ['santa-fe', 'سانتافه', 'Santa Fe', 'SUV'],
    ],
  },
  {
    slug: 'kia',
    nameFa: 'کیا',
    nameEn: 'Kia',
    sortOrder: 70,
    models: [
      ['cerato', 'سراتو', 'Cerato', 'SEDAN'],
      ['optima', 'اپتیما', 'Optima', 'SEDAN'],
      ['rio', 'ریو', 'Rio', 'SEDAN'],
      ['sportage', 'اسپورتیج', 'Sportage', 'CROSSOVER'],
      ['sorento', 'سورنتو', 'Sorento', 'SUV'],
    ],
  },
  {
    slug: 'toyota',
    nameFa: 'تویوتا',
    nameEn: 'Toyota',
    sortOrder: 80,
    models: [
      ['corolla', 'کرولا', 'Corolla', 'SEDAN'],
      ['camry', 'کمری', 'Camry', 'SEDAN'],
      ['rav4', 'راوفور', 'RAV4', 'CROSSOVER'],
      ['prado', 'پرادو', 'Prado', 'SUV'],
      ['land-cruiser', 'لندکروزر', 'Land Cruiser', 'SUV'],
      ['hilux', 'هایلوکس', 'Hilux', 'PICKUP'],
    ],
  },
  {
    slug: 'renault',
    nameFa: 'رنو',
    nameEn: 'Renault',
    sortOrder: 90,
    models: [
      ['logan', 'تندر ۹۰', 'Logan', 'SEDAN'],
      ['sandero', 'ساندرو', 'Sandero', 'HATCHBACK'],
      ['megane', 'مگان', 'Megane', 'SEDAN'],
      ['duster', 'داستر', 'Duster', 'CROSSOVER'],
    ],
  },
  {
    slug: 'mercedes-benz',
    nameFa: 'مرسدس بنز',
    nameEn: 'Mercedes-Benz',
    sortOrder: 100,
    models: [
      ['c-class', 'کلاس C', 'C-Class', 'LUXURY'],
      ['e-class', 'کلاس E', 'E-Class', 'LUXURY'],
      ['s-class', 'کلاس S', 'S-Class', 'LUXURY'],
      ['glc', 'GLC', 'GLC', 'LUXURY'],
    ],
  },
  {
    slug: 'bmw',
    nameFa: 'بی‌ام‌و',
    nameEn: 'BMW',
    sortOrder: 110,
    models: [
      ['3-series', 'سری ۳', '3 Series', 'LUXURY'],
      ['5-series', 'سری ۵', '5 Series', 'LUXURY'],
      ['x1', 'X1', 'X1', 'LUXURY'],
      ['x3', 'X3', 'X3', 'LUXURY'],
      ['x5', 'X5', 'X5', 'LUXURY'],
    ],
  },
] as const;

async function main(): Promise<void> {
  const classIds = new Map<string, string>();

  for (const item of vehicleClasses) {
    const vehicleClass = await prisma.vehicleClass.upsert({
      where: {
        code: item.code,
      },
      update: {
        nameFa: item.nameFa,
        nameEn: item.nameEn,
        vehicleType: item.vehicleType,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: {
        ...item,
        isActive: true,
      },
    });

    classIds.set(item.code, vehicleClass.id);
  }

  for (const brandData of brands) {
    const brand = await prisma.vehicleBrand.upsert({
      where: {
        slug: brandData.slug,
      },
      update: {
        nameFa: brandData.nameFa,
        nameEn: brandData.nameEn,
        sortOrder: brandData.sortOrder,
        isActive: true,
      },
      create: {
        slug: brandData.slug,
        nameFa: brandData.nameFa,
        nameEn: brandData.nameEn,
        sortOrder: brandData.sortOrder,
        isActive: true,
      },
    });

    for (let index = 0; index < brandData.models.length; index += 1) {
      const [slug, nameFa, nameEn, vehicleClassCode] = brandData.models[index];

      const vehicleClassId = classIds.get(vehicleClassCode);

      if (!vehicleClassId) {
        throw new Error(`Vehicle class "${vehicleClassCode}" was not found.`);
      }

      await prisma.vehicleModel.upsert({
        where: {
          brandId_slug: {
            brandId: brand.id,
            slug,
          },
        },
        update: {
          nameFa,
          nameEn,
          vehicleClassId,
          sortOrder: index + 1,
          isActive: true,
        },
        create: {
          brandId: brand.id,
          vehicleClassId,
          slug,
          nameFa,
          nameEn,
          aliases: [],
          sortOrder: index + 1,
          isActive: true,
        },
      });
    }
  }

  const resource = await prisma.resource.upsert({
    where: { code: 'AUTOMATIC_WASH_MACHINE' },
    update: {
      nameFa: 'خط شست‌وشوی اتوماتیک BestWash',
      capacity: 1,
      isActive: true,
    },
    create: {
      code: 'AUTOMATIC_WASH_MACHINE',
      nameFa: 'خط شست‌وشوی اتوماتیک BestWash',
      resourceType: 'AUTOMATIC_WASH_LINE',
      capacity: 1,
      bufferMinutes: 5,
    },
  });

  const tiers = [
    {
      code: 'NORMAL',
      nameFa: 'عادی',
      minPoints: 0,
      maxPoints: 499,
      sortOrder: 1,
    },
    {
      code: 'BRONZE',
      nameFa: 'برنزی',
      minPoints: 500,
      maxPoints: 999,
      sortOrder: 2,
    },
    {
      code: 'SILVER',
      nameFa: 'نقره‌ای',
      minPoints: 1000,
      maxPoints: 2999,
      sortOrder: 3,
    },
    {
      code: 'GOLD',
      nameFa: 'طلایی',
      minPoints: 3000,
      maxPoints: 6999,
      sortOrder: 4,
    },
    {
      code: 'VIP',
      nameFa: 'VIP',
      minPoints: 7000,
      maxPoints: null,
      sortOrder: 5,
      cashbackMultiplier: 1.25,
    },
  ];
  for (const tier of tiers) {
    await prisma.loyaltyTier.upsert({
      where: { code: tier.code },
      update: tier,
      create: tier,
    });
  }
  await prisma.loyaltyRule.upsert({
    where: { code: 'BOOKING_COMPLETED' },
    update: { points: 0, eventName: 'booking.completed', isActive: true },
    create: {
      code: 'BOOKING_COMPLETED',
      nameFa: 'تکمیل رزرو',
      eventName: 'booking.completed',
      points: 0,
    },
  });
  await prisma.loyaltyRule.upsert({
    where: { code: 'BOOKING_CONFIRMED' },
    update: { points: 30, eventName: 'booking.confirmed', isActive: true },
    create: {
      code: 'BOOKING_CONFIRMED',
      nameFa: 'ثبت و تأیید رزرو',
      eventName: 'booking.confirmed',
      points: 30,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'WELCOME' },
    update: {
      type: 'PERCENTAGE',
      value: 15,
      perCustomerUsage: 1,
      firstBookingOnly: false,
      minimumPriorBookings: 1,
      deliveryChannels: ['IN_APP', 'SMS'],
      displayPlacement: 'PAYMENT_SUCCESS',
      promotionFrequency: 'ONCE',
      isActive: true,
    },
    create: {
      code: 'WELCOME',
      type: 'PERCENTAGE',
      value: 15,
      perCustomerUsage: 1,
      firstBookingOnly: false,
      minimumPriorBookings: 1,
      deliveryChannels: ['IN_APP', 'SMS'],
      displayPlacement: 'PAYMENT_SUCCESS',
      promotionFrequency: 'ONCE',
      isActive: true,
    },
  });

  const templates = [
    'AUTH_OTP',
    'ADMIN_LOGIN_OTP',
    'ADMIN_BROADCAST',
    'PAYMENT_LINK',
    'WELCOME',
    'BOOKING_CONFIRMED',
    'PAYMENT_SUCCESS',
    'BOOKING_REMINDER',
    'BOOKING_RESCHEDULED',
    'BOOKING_CANCELLED',
    'CAR_CHECKED_IN',
    'CAR_IN_PROGRESS',
    'CAR_READY',
    'PICKUP_CODE_OWNER',
    'PICKUP_CODE_DELEGATE',
    'PICKUP_DELEGATE_CHANGED',
    'PICKUP_REMINDER_OWNER',
    'BOOKING_COMPLETED',
    'REVIEW_REQUEST',
    'CASHBACK_EARNED',
    'WALLET_CREDIT_EXPIRY_REMINDER',
    'LOYALTY_POINTS_EARNED',
    'LOYALTY_TIER_UPGRADE',
    'ABANDONED_BOOKING',
    'INACTIVE_CUSTOMER',
    'RETURNING_CUSTOMER',
    'VIP_CUSTOMER',
  ];
  const smsTemplateBodies: Record<string, string> = {
    AUTH_OTP: 'کد ورود شما به BestWash: #Code#',
    ADMIN_LOGIN_OTP: 'کد ورود مدیریت BestWash: #Code#',
    WELCOME:
      '#Name# عزیز، کد #Coupon# برای #Discount# درصد تخفیف رزرو بعدی شما فعال شد.\nBestWash',
    BOOKING_CONFIRMED:
      'رزرو #Booking# با موفقیت ثبت و تأیید شد.\nBestWash',
    BOOKING_REMINDER:
      'یادآوری: زمان مراجعه رزرو #Booking# نزدیک است.\nBestWash',
    BOOKING_CANCELLED:
      'رزرو #Booking# لغو شد. جزئیات بازپرداخت در برنامه قابل مشاهده است.\nBestWash',
    CAR_CHECKED_IN: 'خودروی رزرو #Booking# در مجموعه پذیرش شد.\nBestWash',
    CAR_IN_PROGRESS: 'خدمات خودروی رزرو #Booking# آغاز شد.\nBestWash',
    PICKUP_CODE_OWNER:
      'خودروی رزرو #Booking# آماده تحویل است. کد تحویل: #Code#\nBestWash',
    PICKUP_CODE_DELEGATE:
      'خودروی رزرو #Booking# آماده تحویل است. کد تحویل: #Code#\nBestWash',
    PICKUP_DELEGATE_CHANGED:
      'کد تحویل رزرو #Booking# تغییر کرد: #Code#\nBestWash',
    PICKUP_REMINDER_OWNER:
      'خودروی رزرو #Booking# آماده تحویل است. لطفاً مراجعه کنید.\nBestWash',
    BOOKING_COMPLETED:
      'رزرو #Booking# با موفقیت تکمیل شد. از انتخاب شما متشکریم.\nBestWash',
  };
  for (const code of templates) {
    const body =
      smsTemplateBodies[code] ??
      `BestWash | ${code} | {{code}} {{bookingNumber}}`;
    await prisma.notificationTemplate.upsert({
      where: { code },
      update: smsTemplateBodies[code] ? { body } : {},
      create: {
        code,
        body,
        isTransactional: ![
          'ABANDONED_BOOKING',
          'INACTIVE_CUSTOMER',
          'RETURNING_CUSTOMER',
          'VIP_CUSTOMER',
        ].includes(code),
      },
    });
  }

  const permissions = [
    'reports.read',
    'bookings.read',
    'bookings.manage',
    'bookings.cancel',
    'bookings.deliver',
    'customers.read',
    'customers.manage',
    'catalog.read',
    'catalog.manage',
    'vehicles.manage',
    'services.manage',
    'pricing.manage',
    'payments.read',
    'payments.manage',
    'payments.refund',
    'wallet.read',
    'wallet.adjust',
    'cashback.manage',
    'loyalty.manage',
    'content.manage',
    'marketing.manage',
    'sms.manage',
    'logs.read',
    'admin-users.manage',
    'roles.manage',
    'settings.manage',
  ];
  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code },
    });
  }
  const ownerRole = await prisma.role.upsert({
    where: { code: 'OWNER' },
    update: { nameFa: 'مالک', isSystem: true },
    create: { code: 'OWNER', nameFa: 'مالک', isSystem: true },
  });
  const permissionRows = await prisma.permission.findMany({
    where: { code: { in: permissions } },
  });
  for (const permission of permissionRows) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permission.id },
    });
  }

  if (
    process.env.ADMIN_INITIAL_USERNAME &&
    process.env.ADMIN_INITIAL_MOBILE &&
    process.env.ADMIN_INITIAL_PASSWORD
  ) {
    const username = process.env.ADMIN_INITIAL_USERNAME.trim().toLowerCase();
    const raw = process.env.ADMIN_INITIAL_MOBILE.replace(/^0/, '+98');
    const passwordHash = await hash(process.env.ADMIN_INITIAL_PASSWORD, 12);
    const existingOwner = await prisma.adminUser.findFirst({
      where: { OR: [{ username }, { mobile: raw }] },
    });
    const ownerData = {
      username,
      mobile: raw,
      displayName: 'مالک BestWash',
      email: process.env.ADMIN_INITIAL_EMAIL,
      passwordHash,
      status: 'ACTIVE' as const,
    };
    const owner = existingOwner
      ? await prisma.adminUser.update({
          where: { id: existingOwner.id },
          data: ownerData,
        })
      : await prisma.adminUser.create({ data: ownerData });
    await prisma.adminUserRole.upsert({
      where: {
        adminUserId_roleId: { adminUserId: owner.id, roleId: ownerRole.id },
      },
      update: {},
      create: { adminUserId: owner.id, roleId: ownerRole.id },
    });
  }

  const settings: Array<[string, unknown, boolean]> = [
    ['businessName', 'BestWash', true],
    ['businessCity', 'بابلسر', true],
    ['timezone', 'Asia/Tehran', true],
    ['cashbackPercent', 10, false],
    ['cashbackEnabled', true, true],
    ['cashbackExpiryDays', 90, false],
    ['bookingHoldMinutes', 8, false],
    ['cancellationDeadlineHours', 2, true],
    ['bookingConfirmationPoints', 30, true],
    ['bookingReminderMinutes', 10, false],
    ['walletEnabled', true, true],
    ['loyaltyEnabled', true, true],
    ['adminTwoFactorEnabled', true, false],
    ['supportPhone', '09354055150', true],
    ['supportBaleUsername', 'erfanrahmati', true],
  ];
  for (const [key, value, isPublic] of settings) {
    await prisma.businessSetting.upsert({
      where: { key },
      update: { value: value as never, isPublic },
      create: { key, value: value as never, isPublic },
    });
  }
  const contents: Array<[string, unknown]> = [
    [
      'contact',
      {
        eyebrow: 'راه‌های ارتباطی',
        title: 'تماس با ما',
        description:
          'برای پرسش‌های عمومی از راه‌های زیر با BestWash در ارتباط باشید.',
        phone: '09354055150',
        address: 'بابلسر، مجموعه کارواش اتوماتیک BestWash',
        mapUrl:
          'https://www.google.com/maps/search/?api=1&query=Babolsar%2C%20Iran',
        mapEmbedUrl:
          'https://www.google.com/maps?q=Babolsar%2C%20Iran&output=embed',
        workingHours: 'همه‌روزه از ساعت ۸ تا ۲۲',
        intro: 'پاسخ‌گویی شفاف و سریع، بخشی از تجربه BestWash است.',
        instagram: '',
        whatsapp: 'https://wa.me/989354055150',
        bale: 'https://ble.ir/erfanrahmati',
      },
    ],
    ['workingHoursDisplay', { today: '۸:۰۰ تا ۲۲:۰۰' }],
    ['marketingClaim', 'کارواش اتوماتیک BestWash بابلسر'],
    [
      'about',
      {
        eyebrow: 'داستان ما',
        title: 'درباره BestWash',
        description:
          'تجربه‌ای هوشمند، شفاف و قابل اعتماد برای مراقبت از خودرو.',
        subtitle: 'مراقبت حرفه‌ای از خودرو، دقیق و قابل برنامه‌ریزی',
        body: 'BestWash یک مجموعه تک‌شعبه‌ای در بابلسر است که با خط شست‌وشوی اتوماتیک، رزرو زمان‌دار و پیگیری مرحله‌به‌مرحله، مراقبت از خودرو را ساده‌تر و قابل پیش‌بینی می‌کند. هدف ما کاهش زمان انتظار، شفافیت قیمت و حفظ کیفیت پایدار در هر مراجعه است.',
        values: [
          'کیفیت پایدار و قابل سنجش',
          'احترام واقعی به زمان مشتری',
          'قیمت‌گذاری شفاف و پرداخت امن',
          'پاسخ‌گویی و پیگیری مرحله‌به‌مرحله',
        ],
        stats: ['رزرو کاملاً آنلاین', 'پیگیری مرحله‌به‌مرحله', 'پرداخت امن'],
      },
    ],
    [
      'rules',
      {
        eyebrow: 'شفاف و روشن',
        title: 'قوانین و شرایط استفاده',
        description: 'پیش از ثبت رزرو، شرایط ارائه خدمت و لغو را مطالعه کنید.',
        intro:
          'این قوانین برای حفظ زمان، امنیت و حقوق همه مشتریان تدوین شده‌اند.',
        items: [
          'برای ارائه به‌موقع خدمت، لطفاً در زمان رزرو در مجموعه حضور داشته باشید.',
          'لغو آنلاین تا مهلت نمایش‌داده‌شده در جزئیات رزرو امکان‌پذیر است.',
          'بازپرداخت رزرو پرداخت‌شده به اعتبار غیرقابل برداشت کیف پول انجام می‌شود.',
          'رزرو تنها پس از پرداخت موفق و تأیید مدیر قطعی است؛ اگر تا زمان مراجعه تأیید نشود مبلغ کامل به کیف پول بازمی‌گردد.',
          'مشتری مسئول صحت شماره موبایل، مشخصات خودرو، پلاک و اطلاعات تحویل‌گیرنده است.',
          'کد شش‌رقمی تحویل محرمانه است و فقط هنگام تحویل خودرو باید به مسئول مجموعه ارائه شود.',
          'اعتبار بازگشتی طبق تاریخ انقضای نمایش‌داده‌شده قابل مصرف است و امکان برداشت نقدی ندارد.',
          'خسارت یا ایراد ظاهری موجود پیش از پذیرش باید به مسئول مجموعه اعلام شود.',
          'ارسال پیام‌های ضروری رزرو و پرداخت برای اجرای خدمت لازم است؛ پیام‌های تبلیغاتی از تنظیمات حساب قابل کنترل‌اند.',
        ],
      },
    ],
    [
      'footer',
      {
        description:
          'رزرو آنلاین خدمات کارواش با زمان‌بندی شفاف، پرداخت امن و پیگیری لحظه‌ای وضعیت خودرو.',
        enamadLogoUrl: '',
        enamadVerifyUrl: '',
      },
    ],
    [
      'faq',
      [
        {
          question: 'چطور رزرو ثبت کنم؟',
          answer: 'خودرو، سرویس و زمان مناسب را انتخاب و پرداخت را تکمیل کنید.',
        },
        {
          question: 'کد تحویل چه زمانی ارسال می‌شود؟',
          answer:
            'پس از آماده‌شدن خودرو، کد تحویل برای مالک یا نماینده فعال ارسال می‌شود.',
        },
      ],
    ],
    [
      'seo',
      {
        title: 'BestWash | رزرو آنلاین کارواش اتوماتیک بابلسر',
        description: 'رزرو سریع و آنلاین خدمات کارواش BestWash در بابلسر',
      },
    ],
  ];
  for (const [key, value] of contents) {
    await prisma.businessContent.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never, isPublic: true },
    });
  }
  const posts = [
    {
      slug: 'automatic-carwash-care-guide',
      title: 'راهنمای مراقبت از خودرو بعد از کارواش',
      excerpt: 'چند نکته ساده برای ماندگاری بیشتر تمیزی و درخشندگی بدنه خودرو.',
      content:
        'پس از شست‌وشوی خودرو بهتر است تا خشک‌شدن کامل بدنه، آن را در محیطی دور از گردوغبار نگه دارید. استفاده منظم از خدمات استاندارد و پاک‌کردن سریع آلودگی‌های اسیدی به حفظ رنگ خودرو کمک می‌کند.',
      category: 'مراقبت از خودرو',
      readingMinutes: 3,
    },
    {
      slug: 'why-book-carwash-online',
      title: 'چرا رزرو آنلاین کارواش بهتر است؟',
      excerpt:
        'رزرو آنلاین چگونه زمان انتظار را کم و تجربه دریافت خدمات را شفاف‌تر می‌کند؟',
      content:
        'با رزرو آنلاین، زمان مراجعه و هزینه خدمت را پیش از حرکت می‌دانید. BestWash وضعیت خودرو را مرحله‌به‌مرحله نمایش می‌دهد و هنگام آماده‌شدن خودرو اطلاع‌رسانی می‌کند.',
      category: 'راهنمای رزرو',
      readingMinutes: 2,
    },
  ];
  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { ...post, isPublished: true },
      create: { ...post, isPublished: true, publishedAt: new Date() },
    });
  }
  const heroImages = [1, 2, 3];
  for (const index of heroImages) {
    const imageUrl = `/images/home/hero/hero-${index}.webp`;
    const existing = await prisma.heroSlide.findFirst({ where: { imageUrl } });
    if (!existing) {
      await prisma.heroSlide.create({
        data: {
          imageUrl,
          altText: `BestWash - اسلاید ${index}`,
          linkType: 'INTERNAL',
          linkValue: '/booking',
          sortOrder: index,
        },
      });
    }
  }
  const promoUrl = '/images/home/promo/promo-banner.webp';
  const promo = await prisma.promoBanner.findFirst({
    where: { imageUrl: promoUrl },
  });
  if (!promo) {
    await prisma.promoBanner.create({
      data: {
        imageUrl: promoUrl,
        altText: 'پیشنهاد ویژه BestWash',
        linkType: 'INTERNAL',
        linkValue: '/booking',
      },
    });
  }

  console.log(`BestWash platform seed completed (${resource.code}).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
