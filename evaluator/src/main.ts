/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure body parser with environment variable or default to 10mb
  const bodySizeLimit = process.env.EVALUATOR_BODY_SIZE_LIMIT || '10mb';
  app.use(bodyParser.json({ limit: bodySizeLimit }));
  app.use(bodyParser.urlencoded({ limit: bodySizeLimit, extended: true }));
  
  // Enable CORS for Angular frontend
  app.enableCors({
    origin: ['http://localhost:3002', 'http://127.0.0.1:3002'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  });
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.EVALUATOR_PORT || process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
