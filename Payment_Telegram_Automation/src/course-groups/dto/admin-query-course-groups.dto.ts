import { CourseGroupStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { QueryCourseGroupsDto } from './query-course-groups.dto';

export class AdminQueryCourseGroupsDto extends QueryCourseGroupsDto {
  @IsOptional()
  @IsEnum(CourseGroupStatus)
  status?: CourseGroupStatus;

  @IsOptional()
  @IsUUID('4', { message: 'teacherId must be a valid user id' })
  teacherId?: string;
}
