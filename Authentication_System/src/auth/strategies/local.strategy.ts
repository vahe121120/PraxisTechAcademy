import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    // passport-local defaults to `username`/`password` body fields; this
    // API authenticates by email, so the field name is remapped here
    // rather than asking clients to send an odd `username` field that
    // actually means email.
    super({ usernameField: 'email', passwordField: 'password' });
  }

  validate(email: string, password: string): Promise<User> {
    return this.authService.validateCredentials(email, password);
  }
}
