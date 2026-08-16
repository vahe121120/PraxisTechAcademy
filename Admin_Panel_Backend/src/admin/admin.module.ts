import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminStudentsController } from './admin-students.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';

@Module({
  // Deliberately composes existing feature modules rather than
  // reimplementing student/payment/subscription logic in this module —
  // "admin" is a view and a set of privileged actions over data those
  // modules already own, not a parallel data-access layer.
  imports: [UsersModule, PaymentsModule, SubscriptionsModule],
  controllers: [AdminDashboardController, AdminStudentsController, AdminSubscriptionsController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
