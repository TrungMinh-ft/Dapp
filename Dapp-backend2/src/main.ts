import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { env } from "./config/env";

// --- FIX LỖI BIGINT: Chuyển BigInt sang String khi gửi JSON về Frontend ---
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  // --- FIX LỖI CORS: Cho phép tất cả các cổng localhost gọi vào Backend ---
  app.enableCors({
    origin: true, // Tự động chấp nhận origin đang gọi tới (Rất tốt cho Demo)
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Cấu hình Validation cho DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // --- CẤU HÌNH SWAGGER ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Private Voting DApp API")
    .setDescription("API backend cho hệ thống bỏ phiếu kín trên Oasis Sapphire")
    .setVersion("1.0")
    .addApiKey(
      {
        type: "apiKey",
        name: "x-admin-token",
        in: "header",
      },
      "admin-token",
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, swaggerDocument);

  // Chạy Server
  await app.listen(env.port);

  const baseUrl = `http://localhost:${env.port}`;
  const swaggerUrl = `${baseUrl}/api`;

  logger.log(`🚀 Server đang chạy tại: ${baseUrl}`);
  logger.log(`📚 Tài liệu API (Swagger): ${swaggerUrl}`);
}

bootstrap();
