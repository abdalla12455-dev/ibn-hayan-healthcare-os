import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/index.js';
import { DatabaseModule } from '../../infrastructure/database/index.js';

import { PlatformAdminAccessService } from './platform-admin-access.service.js';
import { PlatformAdminController } from './platform-admin.controller.js';

/**
 * Platform-wide administration.
 *
 * This module is independent of ClinicAdminModule and
 * tenant-scoped role authorization.
 */
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminAccessService],
})
export class PlatformAdminModule {}
