/**
 * Generate Swagger documentation without requiring app to run
 * Extracts endpoint information from controller decorators
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './apps/mobile-api/src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateDocs() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Kudi AI Bank - Mobile API')
    .setDescription('Complete banking platform with 72+ endpoints')
    .setVersion('1.0.0')
    .addTag('Identity', 'Authentication and user management')
    .addTag('Accounts', 'Account management and wallets')
    .addTag('Transfers', 'Money transfer operations')
    .addTag('Cards', 'Debit and credit card services')
    .addTag('Compliance', 'KYC and compliance checks')
    .addTag('Funding', 'Deposits and virtual accounts')
    .addTag('Ledger', 'Accounting and transaction history')
    .addTag('Bills', 'Bill payment services')
    .addTag('Loans', 'Loan management and disbursement')
    .addTag('Rewards', 'Rewards program')
    .addTag('Savings', 'Savings goals and accounts')
    .addTag('Notifications', 'Push and email notifications')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Save as JSON
  fs.writeFileSync(
    path.join(process.cwd(), 'swagger-docs.json'),
    JSON.stringify(document, null, 2)
  );

  // Save as YAML
  const YAML = require('js-yaml');
  fs.writeFileSync(
    path.join(process.cwd(), 'swagger-docs.yaml'),
    YAML.dump(document)
  );

  console.log('✅ Swagger docs generated:');
  console.log('   - swagger-docs.json');
  console.log('   - swagger-docs.yaml');

  await app.close();
}

generateDocs().catch(console.error);
