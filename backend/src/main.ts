import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow the frontend dev server (and any origin) to call the API.
  app.enableCors();

  // Validate and coerce all inputs; reject unknown properties.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Consistent JSON error shape for every unhandled exception.
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 8000;
  await app.listen(port);
}
void bootstrap();
