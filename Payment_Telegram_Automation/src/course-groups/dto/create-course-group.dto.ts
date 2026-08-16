import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

import { IsOnOrAfter } from '../../common/validators/is-on-or-after.validator';

export class CreateCourseGroupDto {
  @IsUUID('4', { message: 'courseId must be a valid course id' })
  courseId!: string;

  @IsString()
  @Length(3, 150, { message: 'name must be between 3 and 150 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date (e.g. 2026-09-01)' })
  startDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date (e.g. 2026-12-15)' })
  @IsOnOrAfter('startDate', { message: 'endDate must be on or after startDate' })
  endDate?: string;

  // Free-text weekly meeting summary — see the schema comment on
  // CourseGroup.schedule for why this isn't a structured day/time model.
  @IsString()
  @Length(3, 255, { message: 'schedule must be between 3 and 255 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  schedule!: string;

  // Optional: a group can be created before a teacher is assigned. When
  // provided, CourseGroupsService verifies this references a user with
  // role TEACHER or ADMIN (see the schema comment for why ADMIN qualifies).
  @IsOptional()
  @IsUUID('4', { message: 'teacherId must be a valid user id' })
  teacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  @Max(1000, { message: 'capacity must be 1000 or fewer' })
  capacity?: number;
}
