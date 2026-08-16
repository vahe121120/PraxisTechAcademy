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
import { Course, UserRole } from '@prisma/client';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CoursesService } from './courses.service';
import { AdminQueryCoursesDto } from './dto/admin-query-courses.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { QueryCoursesDto } from './dto/query-courses.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

/**
 * Route ordering matters here: `admin` and `admin/:id` are registered
 * before the generic `:id` GET route so the literal segment `admin` is
 * never swallowed as a course id — see the class body for the exact order.
 */
@Controller({ path: 'courses', version: '1' })
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCourseDto): Promise<Course> {
    return this.coursesService.create(dto);
  }

  // --- Admin reads (must precede the public ':id' route below) ---------

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin')
  findAllAdmin(@Query() query: AdminQueryCoursesDto): Promise<PaginatedResult<Course>> {
    return this.coursesService.findAllAdmin(query);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseUUIDPipe) id: string): Promise<Course> {
    return this.coursesService.findOneAdmin(id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto): Promise<Course> {
    return this.coursesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.coursesService.remove(id);
  }

  // --- Public / student reads — PUBLISHED courses only ------------------
  // Marked @Public() deliberately: a course catalog is marketing surface
  // area (landing pages, SEO), not something that should require a login.
  // "Students can only view available courses" is satisfied by the service
  // layer always filtering to PUBLISHED here, regardless of whether the
  // caller is authenticated at all.

  @Public()
  @Get()
  findPublished(@Query() query: QueryCoursesDto): Promise<PaginatedResult<Course>> {
    return this.coursesService.findPublished(query);
  }

  @Public()
  @Get(':id')
  findOnePublished(@Param('id', ParseUUIDPipe) id: string): Promise<Course> {
    return this.coursesService.findOnePublished(id);
  }
}
