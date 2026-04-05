import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  const allowAnyOrigin = env.corsOrigins.includes("*");
  app.enableCors(
    allowAnyOrigin
      ? undefined
      : {
          origin: (origin, callback) => {
            if (!origin || env.corsOrigins.includes(origin)) {
              callback(null, true);
              return;
            }

            callback(new Error(`Origin ${origin} is not allowed by CORS.`));
          },
        },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Private Voting DApp API")
    .setDescription("API backend cho he thong bo phieu kin tren Oasis")
    .setVersion("1.0")
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, swaggerDocument);

  await app.listen(env.port);

  const baseUrl = `http://localhost:${env.port}`;
  const swaggerUrl = `${baseUrl}/api`;

  logger.log(`Server running at: ${baseUrl}`);
  logger.log(`Swagger docs: ${swaggerUrl}`);
}

bootstrap();
