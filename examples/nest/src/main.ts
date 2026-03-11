import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 3001;

  await app.listen(port);

  console.log(`
🚀 PgCache NestJS Example Running!

Server: http://localhost:${port}

Available Endpoints:
  GET    /                        - Welcome message
  GET    /health                  - Health check with cache stats
  GET    /users                   - List all users (cached)
  GET    /users/:id               - Get user by ID (cached)
  POST   /users                   - Create user
  PUT    /users/:id               - Update user
  DELETE /users/:id               - Delete user
  POST   /cache/clear             - Clear all cache

Example Usage:
  curl http://localhost:${port}/users
  curl http://localhost:${port}/users/1
  `);
}

bootstrap();
