import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Public content')
@Controller('content')
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('public')
  async publicContent() {
    const [content, settings] = await Promise.all([
      this.prisma.businessContent.findMany({ where: { isPublic: true } }),
      this.prisma.businessSetting.findMany({ where: { isPublic: true } }),
    ]);
    return {
      data: {
        content: Object.fromEntries(
          content.map((item) => [item.key, item.value]),
        ),
        settings: Object.fromEntries(
          settings.map((item) => [item.key, item.value]),
        ),
      },
    };
  }

  @Get('blog')
  async blog() {
    return {
      data: await this.prisma.blogPost.findMany({
        where: { isPublished: true, publishedAt: { lte: new Date() } },
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          coverImageAlt: true,
          category: true,
          readingMinutes: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),
    };
  }

  @Get('blog/:slug')
  async blogPost(@Param('slug') slug: string) {
    return {
      data: await this.prisma.blogPost.findFirst({
        where: { slug, isPublished: true, publishedAt: { lte: new Date() } },
      }),
    };
  }

  @Get('home')
  async home() {
    const now = new Date();
    const [hero, promo, content, settings, reviews] = await Promise.all([
      this.prisma.heroSlide.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.promoBanner.findFirst({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.businessContent.findMany({ where: { isPublic: true } }),
      this.prisma.businessSetting.findMany({ where: { isPublic: true } }),
      this.prisma.review.findMany({
        where: { status: 'APPROVED', isFeatured: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      data: {
        hero,
        promo,
        content: Object.fromEntries(
          content.map((item) => [item.key, item.value]),
        ),
        settings: Object.fromEntries(
          settings.map((item) => [item.key, item.value]),
        ),
        reviews,
      },
    };
  }

  @Get('services/:code')
  async service(@Param('code') code: string) {
    return {
      data: await this.prisma.service.findFirst({
        where: { code, isActive: true },
        include: {
          category: true,
          packageItems: { include: { package: true } },
        },
      }),
    };
  }
}
