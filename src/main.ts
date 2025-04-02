import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AbstractHttpAdapter } from '@nestjs/core';

let app: INestApplication;

async function bootstrap(): Promise<INestApplication> {
  if (!app) {
    app = await NestFactory.create(AppModule);

    // CORS 설정
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // Validation Pipe
    app.useGlobalPipes(new ValidationPipe());

    // Swagger 설정
    const config = new DocumentBuilder()
      .setTitle('Fine Dust API')
      .setDescription('미세먼지 정보 제공 API')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.init();
  }
  return app;
}

export default async function handler(req: Request, res: Response) {
  try {
    const nestApp = await bootstrap();
    const httpAdapter = nestApp.getHttpAdapter() as AbstractHttpAdapter;
    await httpAdapter.getInstance()(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
