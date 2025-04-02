import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cors from 'cors';

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);

    // CORS 설정
    app.use(cors());

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

  return app.getHttpAdapter().getInstance();
}

export default bootstrap;
