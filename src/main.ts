import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Private Voting DApp API")
    .setDescription("API backend cho hệ thống bỏ phiếu kín trên Oasis")
    .setVersion("1.0")
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, swaggerDocument);

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);

  const baseUrl = `http://localhost:${port}`;
  const swaggerUrl = `${baseUrl}/api`;

  logger.log(`Server running at: ${baseUrl}`);
  logger.log(`Swagger docs: ${swaggerUrl}`);

  console.log(`Server running at: ${baseUrl}`);
  console.log(`Swagger docs: ${swaggerUrl}`);
}

bootstrap();
