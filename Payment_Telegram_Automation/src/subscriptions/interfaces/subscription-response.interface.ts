import type { Subscription, SubscriptionStatus } from '@prisma/client';

export interface SubscriptionWithContext extends Subscription {
  enrollment: {
    userId: string;
    courseGroup: {
      id: string;
      courseId: string;
    };
  };
}

export interface SubscriptionResponse {
  id: string;
  studentId: string;
  courseGroupId: string;
  courseId: string;
  status: SubscriptionStatus;
  startDate: Date | null;
  expireDate: Date | null;
  autoRenew: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSubscriptionResponse(
  subscription: SubscriptionWithContext,
): SubscriptionResponse {
  return {
    id: subscription.id,
    studentId: subscription.enrollment.userId,
    courseGroupId: subscription.enrollment.courseGroup.id,
    courseId: subscription.enrollment.courseGroup.courseId,
    status: subscription.status,
    startDate: subscription.startDate,
    expireDate: subscription.expireDate,
    autoRenew: subscription.autoRenew,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}
