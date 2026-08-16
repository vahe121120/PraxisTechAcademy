import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { AppConfigService } from '../../config/app-config.service';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(): { host: ArgumentsHost; jsonMock: jest.Mock; statusMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const request = { method: 'GET', originalUrl: '/api/v1/test', requestId: 'req-123' };
  const response = { status: statusMock };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, jsonMock, statusMock };
}

describe('AllExceptionsFilter', () => {
  function buildFilter(isProduction: boolean): AllExceptionsFilter {
    const config = { isProduction } as AppConfigService;
    return new AllExceptionsFilter(config);
  }

  it('passes through a standard HttpException with its own status and message', () => {
    const filter = buildFilter(false);
    const { host, jsonMock, statusMock } = createHost();

    filter.catch(new HttpException('Course not found', HttpStatus.NOT_FOUND), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Course not found',
        requestId: 'req-123',
      }),
    );
  });

  it('maps a Prisma unique constraint violation (P2002) to 409 Conflict', () => {
    const filter = buildFilter(false);
    const { host, jsonMock, statusMock } = createHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['email'] },
    });

    filter.catch(prismaError, host);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: expect.stringContaining('email'),
      }),
    );
  });

  it('maps a Prisma "record not found" (P2025) to 404', () => {
    const filter = buildFilter(false);
    const { host, jsonMock } = createHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });

    filter.catch(prismaError, host);

    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('hides the real error message behind a generic one in production', () => {
    const filter = buildFilter(true);
    const { host, jsonMock } = createHost();

    filter.catch(new Error('leaked internal detail: connection string password xyz'), host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: expect.not.stringContaining('leaked internal detail'),
      }),
    );
  });

  it('surfaces the real error message in non-production for debuggability', () => {
    const filter = buildFilter(false);
    const { host, jsonMock } = createHost();

    filter.catch(new Error('helpful debug detail'), host);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'helpful debug detail' }),
    );
  });
});
