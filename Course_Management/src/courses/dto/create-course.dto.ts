import { CourseStatus, CourseTrack, Currency } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateCourseDto {
  @IsString()
  @Length(3, 150, { message: 'title must be between 3 and 150 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  title!: string;

  // Optional: auto-generated from `title` (see slugify util) when omitted.
  // Accepted explicitly so an admin can set a clean, stable URL that
  // survives a later title edit.
  @IsOptional()
  @IsString()
  @Length(3, 120)
  @Matches(SLUG_PATTERN, {
    message:
      'slug must be lowercase letters, numbers, and single hyphens only (e.g. "qa-automation")',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  slug?: string;

  @IsString()
  @Length(20, 5000, { message: 'description must be between 20 and 5000 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description!: string;

  @IsEnum(CourseTrack, { message: 'track must be one of the defined course tracks' })
  track!: CourseTrack;

  // Integer minor units (e.g. AMD*100 or USD cents) — never a float. A
  // reasonable upper bound guards against a data-entry error (e.g. typing
  // the price in major units where minor units were expected) producing a
  // course that silently costs 100x what was intended.
  @IsInt({ message: 'monthlyPrice must be an integer number of minor currency units' })
  @Min(1)
  @Max(100_000_000)
  monthlyPrice!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsInt()
  @Min(1, { message: 'durationDays must be at least 1' })
  @Max(730, { message: 'durationDays must be 730 or fewer (about 2 years)' })
  durationDays!: number;

  // Defaults to DRAFT in the service when omitted — a newly created course
  // shouldn't become visible to students until an admin deliberately
  // publishes it.
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
