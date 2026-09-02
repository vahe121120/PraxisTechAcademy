import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Course, CourseStatus, Currency, Prisma } from '@prisma/client';

import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AdminQueryCoursesDto } from './dto/admin-query-courses.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { slugify } from './utils/slugify';

const DEFAULT_CURRENCY: Currency = Currency.AMD;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Student / public-facing reads — PUBLISHED only, always
  // ---------------------------------------------------------------------

  async findPublished(query: QueryCoursesDto): Promise<PaginatedResult<Course>> {
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      ...(query.track ? { track: query.track } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    return this.paginate(where, query.page ?? 1, query.limit ?? 20);
  }

  /**
   * Throws 404 — not 403 — for a course that exists but isn't PUBLISHED.
   * A student has no legitimate reason to learn a draft/archived course
   * exists at all, so "forbidden" (which confirms existence) is the wrong
   * signal; "not found" is both more honest from the client's perspective
   * and doesn't leak the catalog's unpublished contents.
   */
  async findOnePublished(idOrSlug: string): Promise<Course> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const course = await this.prisma.course.findFirst({
      where: isUuid
        ? { id: idOrSlug, status: CourseStatus.PUBLISHED }
        : { slug: idOrSlug, status: CourseStatus.PUBLISHED },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  // ---------------------------------------------------------------------
  // Admin reads — every status, unless filtered
  // ---------------------------------------------------------------------

  async findAllAdmin(query: AdminQueryCoursesDto): Promise<PaginatedResult<Course>> {
    const where: Prisma.CourseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.track ? { track: query.track } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    return this.paginate(where, query.page ?? 1, query.limit ?? 20);
  }

  async findOneAdmin(id: string): Promise<Course> {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  // ---------------------------------------------------------------------
  // Admin writes
  // ---------------------------------------------------------------------

  async create(dto: CreateCourseDto): Promise<Course> {
    const slug = dto.slug ?? slugify(dto.title);
    await this.assertSlugAvailable(slug);

    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        track: dto.track,
        monthlyPrice: dto.monthlyPrice,
        currency: dto.currency ?? DEFAULT_CURRENCY,
        durationDays: dto.durationDays,
        status: dto.status ?? CourseStatus.DRAFT,
      },
    });
  }

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided to update the course.');
    }

    await this.findOneAdmin(id); // 404s cleanly if the course doesn't exist

    if (dto.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.track !== undefined ? { track: dto.track } : {}),
        ...(dto.monthlyPrice !== undefined ? { monthlyPrice: dto.monthlyPrice } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOneAdmin(id); // 404s cleanly if the course doesn't exist

    const groupCount = await this.prisma.courseGroup.count({ where: { courseId: id } });
    if (groupCount > 0) {
      // The database's own FK (CourseGroup.courseId, onDelete: Restrict)
      // would reject this anyway — this pre-check exists purely to give a
      // much clearer, actionable error than a raw P2003 conflict message.
      throw new ConflictException(
        `Cannot delete this course: it has ${groupCount} course group(s) referencing it. ` +
          'Set its status to ARCHIVED instead to retire it while preserving history.',
      );
    }

    await this.prisma.course.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async assertSlugAvailable(slug: string, excludingId?: string): Promise<void> {
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    if (existing && existing.id !== excludingId) {
      throw new ConflictException(`A course with the slug "${slug}" already exists.`);
    }
  }

  private async paginate(
    where: Prisma.CourseWhereInput,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Course>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
