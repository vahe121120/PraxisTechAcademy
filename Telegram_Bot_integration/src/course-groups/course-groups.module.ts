import { Module } from '@nestjs/common';

import { CourseGroupsController } from './course-groups.controller';
import { CourseGroupsService } from './course-groups.service';

@Module({
  controllers: [CourseGroupsController],
  providers: [CourseGroupsService],
  exports: [CourseGroupsService],
})
export class CourseGroupsModule {}
