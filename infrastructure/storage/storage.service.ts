import { Injectable } from '@nestjs/common';

/**
 * Storage provider abstraction. Concrete S3/GCS client wiring is added
 * when the KYC/document module is implemented.
 */
@Injectable()
export class StorageService {
  upload(_key: string, _buffer: Buffer): Promise<string> {
    return Promise.reject(new Error('Not implemented — Phase 1 foundation placeholder'));
  }

  getSignedUrl(_key: string): Promise<string> {
    return Promise.reject(new Error('Not implemented — Phase 1 foundation placeholder'));
  }
}
