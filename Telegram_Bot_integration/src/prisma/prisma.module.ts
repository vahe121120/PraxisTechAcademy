import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global: nearly every feature module will eventually need `PrismaService`.
 * Marking it `@Global()` avoids re-importing `PrismaModule` in every single
 * feature module while keeping the provider itself defined in exactly one
 * place.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
