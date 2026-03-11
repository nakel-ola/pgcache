import { Injectable, NotFoundException } from "@nestjs/common";
import { PgCacheService } from "@pgcache/nest";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserDto {
  name: string;
  email: string;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
}

@Injectable()
export class UsersService {
  // In-memory database (simulating a real database)
  private users: Map<string, User> = new Map();
  private idCounter = 1;

  constructor(private readonly cache: PgCacheService) {
    // Seed some initial data
    this.seedUsers();
  }

  private seedUsers() {
    const users: User[] = [
      {
        id: "1",
        name: "Lekan Nunu",
        email: "lekan@example.com",
        createdAt: new Date(),
      },
      {
        id: "2",
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date(),
      },
      {
        id: "3",
        name: "Jane Smith",
        email: "jane@example.com",
        createdAt: new Date(),
      },
    ];

    for (const user of users) {
      this.users.set(user.id, user);
      this.idCounter = Math.max(this.idCounter, parseInt(user.id) + 1);
    }
  }

  /**
   * Get all users (with caching)
   */
  async findAll(): Promise<User[]> {
    const cacheKey = "users:all";

    // Try to get from cache
    const cached = await this.cache.get<User[]>(cacheKey);
    if (cached) {
      console.log("✅ Cache HIT: users:all");
      return cached;
    }

    console.log("❌ Cache MISS: users:all");

    // Simulate database query delay
    await this.delay(100);

    const users = Array.from(this.users.values());

    // Store in cache for 60 seconds
    await this.cache.set(cacheKey, users, { ttl: 60 });

    return users;
  }

  /**
   * Get user by ID (with caching)
   */
  async findOne(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Try to get from cache
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    // Simulate database query delay
    await this.delay(100);

    const user = this.users.get(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Store in cache for 5 minutes
    await this.cache.set(cacheKey, user, { ttl: 300 });

    return user;
  }

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user: User = {
      id: String(this.idCounter++),
      name: createUserDto.name,
      email: createUserDto.email,
      createdAt: new Date(),
    };

    this.users.set(user.id, user);

    // Invalidate the "all users" cache
    await this.cache.del("users:all");

    return user;
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = this.users.get(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      ...updateUserDto,
    };

    this.users.set(id, updatedUser);

    // Invalidate both the specific user cache and the "all users" cache
    await this.cache.del(`user:${id}`);
    await this.cache.del("users:all");

    return updatedUser;
  }

  /**
   * Delete a user
   */
  async remove(id: string): Promise<void> {
    const deleted = this.users.delete(id);

    if (!deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Invalidate both the specific user cache and the "all users" cache
    await this.cache.del(`user:${id}`);
    await this.cache.del("users:all");
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const allKeys = await this.cache.keys("user%");
    const stats = await this.cache.stats();

    return {
      userCacheKeys: allKeys,
      cacheStats: stats,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
