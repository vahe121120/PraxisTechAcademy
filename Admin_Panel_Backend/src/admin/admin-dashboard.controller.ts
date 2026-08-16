import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardStats } from './interfaces/dashboard-stats.interface';

@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  getStats(): Promise<DashboardStats> {
    return this.dashboardService.getStats();
  }
}
