
---

## 📜 NestJS Authentication and Attendance Services with RabbitMQ Integration

### Overview

This document outlines the implementation of two NestJS microservices: **Authentication** and **Attendance**. The Authentication service handles user management and JWT token issuance, while the Attendance service manages attendance records, ensuring that only authorized users can create or access attendance data by validating JWT tokens against the Authentication service via RabbitMQ.

### 🛠️ Prerequisites

Before starting, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or later)
- [NestJS CLI](https://docs.nestjs.com/cli/overview) 
- [TypeORM](https://typeorm.io/) (for database interactions)
- [PostgreSQL](https://www.postgresql.org/) or any preferred database
- [RabbitMQ](https://www.rabbitmq.com/) (for microservice communication)
- [Docker](https://www.docker.com/) (optional, for running RabbitMQ)

### 📦 Installation

1. **Create a NestJS Project:**
   ```bash
   nest new authentication-app
   nest new attendance-app
   ```

2. **Install Required Packages:**
   For both applications, run the following commands:
   ```bash
   cd authentication-app
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/microservices typeorm @nestjs/typeorm pg
   ```

   ```bash
   cd attendance-app
   npm install @nestjs/microservices @nestjs/typeorm typeorm pg
   ```

3. **Set Up RabbitMQ:**
   You can run RabbitMQ locally using Docker:
   ```bash
   docker run -d --hostname my-rabbit --name some-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

### 🔧 Code Implementation

#### Authentication Service

**1. AuthController:**
Handles user signup, login, token validation, and user retrieval.

```typescript
import { Controller, Post, UseGuards, Request, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './localAuth.guard';
import { JwtAuthGuard } from './jwtAuth.guard';
import { UserService } from '../user/user.service';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private userService: UserService) {}

  @Post('signup')
  async signup(@Body() createUserDto: any) {
    return this.authService.signup(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getAllUsers() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  async validateToken(@Request() req) {
    return req.user;
  }

  @EventPattern('verify_token')
  async handleVerifyToken(@Payload() data: { token: string }) {
    return this.authService.verifyToken(data.token);
  }
}
```

**2. AuthService:**
Manages user validation, login, signup, and token verification.

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService, private readonly jwtService: JwtService) {}

  async validateUser(username: string, password: string): Promise<any> {
    return await this.userService.validateUser(username, password);
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return { access_token: this.jwtService.sign(payload), payload };
  }

  async signup(user: any) {
    return this.userService.create(user);
  }

  verifyToken(token: string): boolean {
    try {
      jwt.verify(token, "1216192127");
      return true;
    } catch (e) {
      return false;
    }
  }
}
```

**3. Microservice Configuration:**
Connects the authentication service to RabbitMQ.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const microserviceOptions: MicroserviceOptions = {
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'auth_queue',
      queueOptions: { durable: false },
    },
  };

  app.connectMicroservice(microserviceOptions);
  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();
```

#### Attendance Service

**1. AttendanceService:**
Handles attendance records and token validation.

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Student } from 'src/student/entities/student.entity';
import { Teacher } from 'src/teacher/entities/teacher.entity';
import { CreateAttendanceDto } from './dto/create-attendance.input';
import { UpdateAttendanceInput } from './dto/update-attendance.input';
import { NotFoundException } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class AttendanceService {
  private client: ClientProxy;

  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Student) private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher) private readonly teacherRepository: Repository<Teacher>,
  ) {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://localhost:5672'],
        queue: 'auth_queue',
        queueOptions: { durable: false },
      },
    });
  }

  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    // Check if the student and teacher exist before creating attendance
    // Implement your logic here...
  }

  async checkAttendance(token: string) {
    const isValidToken = await this.client.send<boolean>('verify_token', { token }).toPromise();
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

**2. JwtAuthGuard:**
Validates JWT tokens in the Attendance service.

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly attendanceService: AttendanceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) return false;

    await this.attendanceService.checkAttendance(token);
    return true;
  }
}
```

### ⚡ Running the Services

1. **Start RabbitMQ** (if using Docker):
   ```bash
   docker start some-rabbit
   ```

2. **Run the Authentication Service:**
   ```bash
   cd authentication-app
   npm run start:dev
   ```

3. **Run the Attendance Service:**
   ```bash
   cd attendance-app
   npm run start:dev
   ```

### 🚀 Testing the Services

You can use **Postman** or any API client to test the endpoints:
- **Authentication Endpoints:**
  - `POST /auth/signup` - Register a new user
  - `POST /auth/login` - Log in to receive a JWT token
  - `GET /auth/users` - Get all users (requires JWT token)
  - `GET /auth/validate` - Validate token (requires JWT token)

- **Attendance Endpoints:**
  - Create, read, update, and delete attendance records (ensure you pass the JWT token in the Authorization header).

### 📢 Conclusion

This project demonstrates how to effectively integrate two NestJS microservices using RabbitMQ for communication. The Authentication service provides secure token management, while the Attendance service relies on token verification to restrict access.

Feel free to contribute, fork, or suggest improvements to enhance this project!

---

You can adjust the content based on your target audience and preferences. Happy sharing!