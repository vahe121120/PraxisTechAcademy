import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubscriptionResponse } from '../subscriptions/interfaces/subscription-response.interface';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';

/**
 * "Manually activate/deactivate access" from the admin spec, at the
 * subscription (course-access) level — distinct from
 * AdminStudentsController's suspend/reactivate, which is account-level
 * (can this person log in at all). See UsersService.suspend's doc comment
 * for why those two are kept as separate, explicit actions rather than one
 * cascading into the other.
 */
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Controller({ path: 'admin/subscriptions', version: '1' })
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateSubscriptionDto,
    @CurrentUser() admin: SafeUser,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.manuallyActivate(
      id,
      admin.id,
      dto.expireDate ? new Date(dto.expireDate) : undefined,
    );
  }

  /** Deliberately delegates to the existing SubscriptionsService.cancel() — see that method's doc comment for why "deactivate" isn't a separate implementation. */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: SafeUser,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.cancel(id, admin);
  }
}
