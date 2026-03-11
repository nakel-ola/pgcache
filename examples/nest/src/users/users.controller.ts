import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return {
      success: true,
      data: users,
      count: users.length,
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }

  @Post()
  async create(
    @Body() body: { name: string; email: string }
  ) {
    const user = await this.usersService.create(body);
    return {
      success: true,
      data: user,
      message: "User created successfully",
    };
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: { name?: string; email?: string }
  ) {
    const user = await this.usersService.update(id, body);
    return {
      success: true,
      data: user,
      message: "User updated successfully",
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.usersService.remove(id);
  }

  @Get("cache/stats")
  async getCacheStats() {
    const stats = await this.usersService.getCacheStats();
    return {
      success: true,
      data: stats,
    };
  }
}
