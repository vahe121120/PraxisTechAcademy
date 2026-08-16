import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class PasswordService {
  constructor(private readonly config: AppConfigService) {}

  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.config.bcryptSaltRounds);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
