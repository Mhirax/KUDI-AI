import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Object storage abstraction (S3-compatible) for KYC documents,
 * statements, and audit exports.
 */
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
