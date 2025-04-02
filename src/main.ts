import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(3000);
  console.log('NestJS 서버가 시작되었습니다. http://localhost:3000');
}

bootstrap().catch((error) => {
  console.error('서버 시작 중 오류가 발생했습니다:', error);
});
