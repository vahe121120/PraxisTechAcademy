import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseGroupStatus, CourseStatus, Prisma, UserRole, UserStatus } from '@prisma/client';

import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AdminQueryCourseGroupsDto } from './dto/admin-query-course-groups.dto';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { QueryCourseGroupsDto } from './dto/query-course-groups.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';
import {
  CourseGroupResponse,
  CourseGroupWithTelegram,
  toCourseGroupResponse,
} from './interfaces/course-group-response.interface';

// Every read includes this so the response mapper can derive
// `telegramGroupId` without a second round trip — see
// course-group-response.interface.ts for why it's derived, not stored.
const TELEGRAM_GROUP_INCLUDE = { telegramGroup: { select: { id: true } } } as const;

@Injectable()
export class CourseGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Public / student reads
  // ---------------------------------------------------------------------

  async findPublished(query: QueryCourseGroupsDto): Promise<PaginatedResult<CourseGroupResponse>> {
    const where: Prisma.CourseGroupWhereInput = {
      status: { not: CourseGroupStatus.CANCELLED },
      course: { status: CourseStatus.PUBLISHED },
      ...(query.courseId ? { courseId: query.courseId } : {}),
    };

    return this.paginate(where, query.page ?? 1, query.limit ?? 20);
  }

  /** 404, not 403, for a group whose course isn't published or that's cancelled — mirrors CoursesService.findOnePublished's reasoning: don't confirm existence of something the requester has no legitimate reason to know about. */
  async findOnePublished(id: string): Promise<CourseGroupResponse> {
    const group = await this.prisma.courseGroup.findFirst({
      where: {
        id,
        status: { not: CourseGroupStatus.CANCELLED },
        course: { status: CourseStatus.PUBLISHED },
      },
      include: TELEGRAM_GROUP_INCLUDE,
    });

    if (!group) {
      throw new NotFoundException('Course group not found.');
    }

    return toCourseGroupResponse(group);
  }

  // ---------------------------------------------------------------------
  // Admin reads
  // ---------------------------------------------------------------------

  async findAllAdmin(
    query: AdminQueryCourseGroupsDto,
  ): Promise<PaginatedResult<CourseGroupResponse>> {
    const where: Prisma.CourseGroupWhereInput = {
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
    };

    return this.paginate(where, query.page ?? 1, query.limit ?? 20);
  }

  async findOneAdmin(id: string): Promise<CourseGroupResponse> {
    const group = await this.findRawOrThrow(id);
    return toCourseGroupResponse(group);
  }

  /** A teacher's own teaching schedule. Always scoped to the given teacherId server-side — never trust a client-supplied filter for "show me my groups," or any teacher could pass someone else's id. */
  async findTeaching(teacherId: string): Promise<CourseGroupResponse[]> {
    const groups = await this.prisma.courseGroup.findMany({
      where: { teacherId },
      include: TELEGRAM_GROUP_INCLUDE,
      orderBy: { startDate: 'desc' },
    });
    return groups.map(toCourseGroupResponse);
  }

  // ---------------------------------------------------------------------
  // Admin writes
  // ---------------------------------------------------------------------

  async create(dto: CreateCourseGroupDto): Promise<CourseGroupResponse> {
    await this.assertCourseExists(dto.courseId);

    if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }

    if (dto.teacherId) {
      await this.assertValidTeacher(dto.teacherId);
    }

    const group = await this.prisma.courseGroup.create({
      data: {
        courseId: dto.courseId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        schedule: dto.schedule,
        teacherId: dto.teacherId ?? null,
        capacity: dto.capacity ?? null,
      },
      include: TELEGRAM_GROUP_INCLUDE,
    });

    return toCourseGroupResponse(group);
  }

  async update(id: string, dto: UpdateCourseGroupDto): Promise<CourseGroupResponse> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided to update the course group.',
      );
    }

    const existing = await this.findRawOrThrow(id);

    // Validated against the *merged* state, not just whichever of the two
    // date fields happens to be present in this particular PATCH — a
    // request that only sends a new `endDate` still needs checking against
    // the row's existing `startDate`, and vice versa.
    const mergedStart = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const mergedEndRaw = dto.endDate !== undefined ? dto.endDate : existing.endDate;
    const mergedEnd = mergedEndRaw ? new Date(mergedEndRaw) : null;
    if (mergedEnd && mergedEnd < mergedStart) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }

    if (dto.teacherId) {
      await this.assertValidTeacher(dto.teacherId);
    }

    const group = await this.prisma.courseGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.schedule !== undefined ? { schedule: dto.schedule } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: TELEGRAM_GROUP_INCLUDE,
    });

    return toCourseGroupResponse(group);
  }

  async remove(id: string): Promise<void> {
    await this.findRawOrThrow(id);

    const enrollmentCount = await this.prisma.enrollment.count({ where: { courseGroupId: id } });
    if (enrollmentCount > 0) {
      throw new ConflictException(
        `Cannot delete this course group: it has ${enrollmentCount} enrollment(s). ` +
          'Set its status to CANCELLED instead to retire it while preserving enrollment history.',
      );
    }

    // Any remaining dependents (Session, TelegramGroup) are still protected
    // by their own FK (onDelete: Restrict) — a real, if less common, edge
    // case (e.g. sessions scheduled with zero enrollments yet) surfaces as
    // a clean 409 via AllExceptionsFilter's Prisma P2003 mapping rather
    // than a custom message here.
    await this.prisma.courseGroup.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async findRawOrThrow(id: string): Promise<CourseGroupWithTelegram> {
    const group = await this.prisma.courseGroup.findUnique({
      where: { id },
      include: TELEGRAM_GROUP_INCLUDE,
    });
    if (!group) {
      throw new NotFoundException('Course group not found.');
    }
    return group;
  }

  private async assertCourseExists(courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found.`);
    }
  }

  /**
   * Mirrors the database trigger in constraints.sql — this check exists to
   * give a clear, immediate validation error from the API; the trigger is
   * the backstop for any write path that isn't this service.
   */
  private async assertValidTeacher(teacherId: string): Promise<void> {
    const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } });

    if (!teacher) {
      throw new BadRequestException(`teacherId ${teacherId} does not reference an existing user.`);
    }
    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new BadRequestException('teacherId must reference a user with role TEACHER or ADMIN.');
    }
    if (teacher.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('The selected teacher account is not active.');
    }
  }

  private async paginate(
    where: Prisma.CourseGroupWhereInput,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CourseGroupResponse>> {
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.courseGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: TELEGRAM_GROUP_INCLUDE,
      }),
      this.prisma.courseGroup.count({ where }),
    ]);

    return {
      data: rows.map(toCourseGroupResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
