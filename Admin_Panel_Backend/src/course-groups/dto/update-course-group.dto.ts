import { CourseGroupStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

import { IsOnOrAfter } from '../../common/validators/is-on-or-after.validator';

export class UpdateCourseGroupDto {
  // Deliberately no `courseId` here: moving a group to a different course
  // after creation — possibly with live enrollments and payments already
  // tied to it — is not a "field update," it's a data-integrity hazard.
  // If a group was genuinely created under the wrong course, the correct
  // fix is deleting and recreating it (blocked automatically once real
  // enrollments exist, via the same FK-restrict pattern used elsewhere).

  @IsOptional()
  @IsString()
  @Length(3, 150, { message: 'name must be between 3 and 150 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date (e.g. 2026-09-01)' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date (e.g. 2026-12-15)' })
  @IsOnOrAfter('startDate', {
    message: 'endDate must be on or after startDate (when both are provided in the same request)',
  })
  endDate?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255, { message: 'schedule must be between 3 and 255 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  schedule?: string;

  // `null` explicitly unassigns the teacher; omitting the key leaves it
  // untouched — same convention as UpdateProfileDto's telegramUsername.
  @IsOptional()
  @IsUUID('4', { message: 'teacherId must be a valid user id' })
  teacherId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  @Max(1000, { message: 'capacity must be 1000 or fewer' })
  capacity?: number;

  @IsOptional()
  @IsEnum(CourseGroupStatus)
  status?: CourseGroupStatus;
}
