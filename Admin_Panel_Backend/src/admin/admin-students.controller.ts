import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PaymentResponse } from '../payments/interfaces/payment-response.interface';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionResponse } from '../subscriptions/interfaces/subscription-response.interface';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SafeUser, toSafeUser } from '../users/interfaces/safe-user.interface';
import { UsersService } from '../users/users.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SearchStudentsDto } from './dto/search-students.dto';

@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Controller({ path: 'admin/students', version: '1' })
export class AdminStudentsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  async search(@Query() query: SearchStudentsDto): Promise<PaginatedResult<SafeUser>> {
    const result = await this.usersService.search(query);
    return { ...result, data: result.data.map(toSafeUser) };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SafeUser> {
    const user = await this.usersService.findById(id);
    if (!user || user.role !== UserRole.STUDENT) {
      // Scoped to students deliberately, matching search() above — this
      // endpoint's contract is "student management," not general user
      // lookup, so a teacher/admin id 404s here rather than leaking their
      // profile through the wrong resource.
      throw new NotFoundException('Student not found.');
    }
    return toSafeUser(user);
  }

  @Get(':id/payments')
  findPayments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<PaymentResponse>> {
    return this.paymentsService.findByUser(id, query.page, query.limit);
  }

  @Get(':id/subscriptions')
  findSubscriptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<SubscriptionResponse>> {
    return this.subscriptionsService.findAllAdmin({
      userId: id,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Account-level lockout (User.status), not a specific subscription's
   * access — see UsersService.suspend's doc comment for why this
   * deliberately does not cascade into cancelling subscriptions. For
   * revoking access to one specific course, use
   * POST /admin/subscriptions/:id/deactivate instead.
   */
  @Post(':id/suspend')
  async suspend(@Param('id', ParseUUIDPipe) id: string): Promise<SafeUser> {
    const user = await this.usersService.suspend(id);
    return toSafeUser(user);
  }

  @Post(':id/reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<SafeUser> {
    const user = await this.usersService.reactivate(id);
    return toSafeUser(user);
  }
}
