import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SafeUser } from '../users/interfaces/safe-user.interface';
import { LinkTelegramGroupDto } from './dto/link-telegram-group.dto';
import { TelegramService } from './telegram.service';

@Controller({ path: 'telegram', version: '1' })
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('link/request')
  @HttpCode(HttpStatus.OK)
  requestLink(@CurrentUser() user: SafeUser): Promise<{ deepLink: string; expiresAt: Date }> {
    return this.telegramService.requestLinkToken(user.id);
  }

  @Get('link/status')
  async linkStatus(@CurrentUser() user: SafeUser): Promise<{ linked: boolean }> {
    // Deliberately a narrow projection, not the full TelegramLink row — a
    // student checking "am I linked yet" has no need to see their own
    // stored telegramUserId/username back in an API response.
    const linked = await this.telegramService.isLinked(user.id);
    return { linked };
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Post('admin/link-group')
  @HttpCode(HttpStatus.CREATED)
  linkGroup(@Body() dto: LinkTelegramGroupDto): Promise<{ id: string }> {
    return this.telegramService.linkCourseGroupToChat(
      dto.courseGroupId,
      BigInt(dto.telegramChatId),
      dto.title,
    );
  }
}
