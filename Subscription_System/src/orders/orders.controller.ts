import {
  Body,
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
import { AdminQueryOrdersDto } from './dto/admin-query-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

/** Route ordering: 'me' and 'admin' precede the generic ':id' route for the same reason as CoursesController/CourseGroupsController. */
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateOrderDto): Promise<Order> {
    return this.ordersService.create(user.id, dto.courseGroupId);
  }

  @Get('me')
  findMine(@CurrentUser() user: SafeUser): Promise<Order[]> {
    return this.ordersService.findMine(user.id);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin')
  findAllAdmin(@Query() query: AdminQueryOrdersDto): Promise<PaginatedResult<Order>> {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser): Promise<Order> {
    return this.ordersService.findById(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser): Promise<Order> {
    return this.ordersService.cancel(id, user);
  }
}
