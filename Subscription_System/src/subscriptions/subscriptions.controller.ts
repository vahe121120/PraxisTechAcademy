import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Order, UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { AdminQuerySubscriptionsDto } from './dto/admin-query-subscriptions.dto';
import { SubscriptionResponse } from './interfaces/subscription-response.interface';
import { SubscriptionsService } from './subscriptions.service';

/** Route ordering: 'me' and 'admin' precede the generic ':id' route, same reasoning as every other module in this codebase. */
@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  findMine(@CurrentUser() user: SafeUser): Promise<SubscriptionResponse[]> {
    return this.subscriptionsService.findMine(user.id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin')
  findAllAdmin(
    @Query() query: AdminQuerySubscriptionsDto,
  ): Promise<PaginatedResult<SubscriptionResponse>> {
    return this.subscriptionsService.findAllAdmin(query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.findById(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<SubscriptionResponse> {
    return this.subscriptionsService.cancel(id, user);
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.CREATED)
  renew(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser): Promise<Order> {
    return this.subscriptionsService.initiateRenewal(id, user);
  }

  /**
   * Manual trigger for the same logic the 02:00 cron runs — useful for
   * ops/support ("did last night's sweep actually run?") and for exercising
   * the expiration path without waiting for the clock. ADMIN-only: this
   * changes real billing/access state, not a read.
   */
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post('admin/run-expiration-check')
  @HttpCode(HttpStatus.OK)
  runExpirationCheck(): Promise<{ checked: number; expired: number }> {
    return this.subscriptionsService.expireOverdueSubscriptions();
  }
}
