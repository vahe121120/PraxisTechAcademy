import { CourseStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { QueryCoursesDto } from './query-courses.dto';

export class AdminQueryCoursesDto extends QueryCoursesDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
