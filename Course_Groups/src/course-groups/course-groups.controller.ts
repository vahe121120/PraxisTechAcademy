import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { CourseGroupsService } from './course-groups.service';
import { AdminQueryCourseGroupsDto } from './dto/admin-query-course-groups.dto';
import { CreateCourseGroupDto } from './dto/create-course-group.dto';
import { QueryCourseGroupsDto } from './dto/query-course-groups.dto';
import { UpdateCourseGroupDto } from './dto/update-course-group.dto';
import { CourseGroupResponse } from './interfaces/course-group-response.interface';

/**
 * Route ordering matters, same reasoning as CoursesController: literal
 * segments (`admin`, `admin/:id`, `teaching`) are registered before the
 * generic `:id` GET route so they're never swallowed as a course-group id.
 */
@Controller({ path: 'course-groups', version: '1' })
export class CourseGroupsController {
  constructor(private readonly courseGroupsService: CourseGroupsService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCourseGroupDto): Promise<CourseGroupResponse> {
    return this.courseGroupsService.create(dto);
  }

  // --- Admin reads (must precede the public ':id' route below) ---------

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin')
  findAllAdmin(
    @Query() query: AdminQueryCourseGroupsDto,
  ): Promise<PaginatedResult<CourseGroupResponse>> {
    return this.courseGroupsService.findAllAdmin(query);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string): Promise<CourseGroupResponse> {
    return this.courseGroupsService.findOneAdmin(id);
  }

  // --- Teacher self-service ----------------------------------------------
  // ADMIN included deliberately: Praxis's founder (ADMIN) also personally
  // teaches some courses — see the schema comment on CourseGroup.teacherId.

  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('teaching')
  findTeaching(@CurrentUser() user: SafeUser): Promise<CourseGroupResponse[]> {
    return this.courseGroupsService.findTeaching(user.id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseGroupDto,
  ): Promise<CourseGroupResponse> {
    return this.courseGroupsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.courseGroupsService.remove(id);
  }

  // --- Public / student reads --------------------------------------------
  // @Public(): same reasoning as CoursesController — group schedules are
  // exactly the information a prospective student needs to decide whether
  // to enroll, and gating that behind a login would hurt conversion for no
  // security benefit. "Students can only view available groups" is
  // enforced in the service layer (published course + non-cancelled group),
  // not by requiring authentication to view at all.

  @Public()
  @Get()
  findPublished(
    @Query() query: QueryCourseGroupsDto,
  ): Promise<PaginatedResult<CourseGroupResponse>> {
    return this.courseGroupsService.findPublished(query);
  }

  @Public()
  @Get(':id')
  findOnePublished(@Param('id', ParseUUIDPipe) id: string): Promise<CourseGroupResponse> {
    return this.courseGroupsService.findOnePublished(id);
  }
}
