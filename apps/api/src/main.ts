import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
