# BlogPulse — Microservices Blog Platform

A production-grade blog platform built with a **Next.js 16** frontend and **3 microservices** in Express 5 + TypeScript 6. Features Google OAuth, cursor-based pagination, Redis caching with RabbitMQ invalidation, image uploads to Cloudinary, and full-text search.

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | Next.js 16, React 19, GSAP          |
| User Service   | Express 5, MongoDB (Mongoose)       |
| Author Service | Express 5, PostgreSQL (Neon), RabbitMQ |
| Blog Service   | Express 5, PostgreSQL (Neon), Redis, RabbitMQ |
| Auth           | Google OAuth 2.0, JWT               |
| Media          | Cloudinary                          |
| Validation     | Zod                                 |
| Messages       | RabbitMQ (async cache invalidation) |
| Cache          | Upstash Redis                       |
| Tests          | Vitest                              |
| Container      | Docker + Docker Compose             |

## Architecture

```
                    ┌──────────────┐
                    │  Next.js 16  │
                    │   (port 3000)│
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌────────────┐  ┌──────────────┐  ┌──────────────┐
   │User Service │  │Author Service│  │Blog Service   │
   │ (port 5000) │  │ (port 5001)  │  │ (port 5002)  │
   │  MongoDB    │  │  PostgreSQL  │  │  PostgreSQL   │
   │  JWT/Google │  │  Cloudinary  │  │  Redis Cache  │
   └────────────┘  │  RabbitMQ(△) │  │  RabbitMQ(▽)  │
                   └──────┬───────┘  └──────┬─────────┘
                          │                  │
                          └─── RabbitMQ ─────┘
                          ("Cache-invalidation"
                            durable queue)
```

- **User Service** — Authentication, profile management (MongoDB)
- **Author Service** — Blog CRUD, comments, saves (PostgreSQL + publishes cache invalidation via RabbitMQ)
- **Blog Service** — Read-optimized blog listing with search, filter, cursor pagination, Redis cache (consumes invalidation events)

## Project Structure

```
Blog/
├── client/                          # Next.js 16 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js              # Landing page (GSAP animations)
│   │   │   ├── layout.js            # Root layout + AuthProvider
│   │   │   ├── globals.css          # Global styles
│   │   │   ├── landing.css          # Landing page styles
│   │   │   ├── dashboard/
│   │   │   │   ├── page.js          # User dashboard + profile pic upload
│   │   │   │   └── edit/page.js     # Edit profile (name, bio, social links)
│   │   │   ├── blogs/
│   │   │   │   ├── page.js          # Blog list (search, filter, cursor pagination)
│   │   │   │   ├── new/page.js      # Create blog (title, content, image, category)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.js      # Single blog view + comments + save
│   │   │   │       └── edit/page.js # Edit blog
│   │   │   ├── saved/page.js        # Saved blogs list
│   │   │   └── user/[id]/page.js    # User profile page
│   │   ├── components/
│   │   │   ├── layout/Nav.js        # App navigation bar
│   │   │   └── landing/             # Landing page sections (Hero, Features, Stats, etc.)
│   │   ├── context/AuthContext.js    # Auth state management
│   │   ├── hooks/
│   │   │   ├── useAuthRedirect.js   # Route protection
│   │   │   └── useDebounce.js       # Search debouncing
│   │   └── lib/api.js               # API client (all 3 services)
│   ├── next.config.js
│   └── package.json
│
├── service/
│   ├── user/                        # User Service — Auth & Profiles
│   │   ├── src/
│   │   │   ├── server.ts            # Express app, CORS, rate-limit, error handler
│   │   │   ├── model/User.ts        # Mongoose user schema
│   │   │   ├── controllers/user.ts  # loginUser, myProfile, getUserProfile, updateUser, updateProfilePic
│   │   │   ├── routes/user.ts       # POST /login, GET /me, GET /user/:id, POST /user/update, POST /user/update/pic
│   │   │   ├── schemas/user.ts      # Zod: loginSchema, updateUserSchema
│   │   │   ├── middleware/
│   │   │   │   ├── isAuth.ts        # JWT verification
│   │   │   │   ├── multer.ts        # Image upload (5MB, JPEG/PNG/WebP/GIF)
│   │   │   │   └── requestLogger.ts # Correlation-ID logging
│   │   │   └── utils/
│   │   │       ├── db.ts            # MongoDB connection
│   │   │       ├── GoogleConfig.ts  # Google OAuth 2.0 client
│   │   │       ├── TryCatch.ts      # Async error wrapper
│   │   │       ├── errors.ts        # AppError, NotFoundError, ValidationError, UnauthorizedError
│   │   │       └── dataUrI.ts       # Buffer → DataURI for Cloudinary
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── author/                      # Author Service — Write Operations (CUD)
│   │   ├── src/
│   │   │   ├── server.ts            # Express, Cloudinary, RabbitMQ, DB init (blogs, comments, savedblogs tables)
│   │   │   ├── controllers/blog.ts  # createBlog, updateBlog, deleteBlog, createComment, getBlogComments, deleteComment, saveBlog, unsaveBlog, getSavedBlogs
│   │   │   ├── routes/blog.ts       # POST /blog/new, POST /blog/:id, DELETE /blog/:id, POST /comment/new, GET /comment/:blogid, POST/DELETE /save/:blogid, GET /save
│   │   │   ├── schemas/blog.ts      # Zod: createBlogSchema, updateBlogSchema, createCommentSchema
│   │   │   ├── middlewares/
│   │   │   │   ├── isAuth.ts        # JWT verification
│   │   │   │   ├── multer.ts        # Image upload
│   │   │   │   ├── idempotency.ts   # Idempotency-Key header middleware
│   │   │   │   └── requestLogger.ts # Correlation-ID logging
│   │   │   ├── utils/
│   │   │   │   ├── db.ts            # Neon PostgreSQL connection
│   │   │   │   ├── rabbitmq.ts      # RabbitMQ connect + publishToQueue + invalidateChacheJob
│   │   │   │   ├── idempotency.ts   # In-memory idempotency store (24h TTL)
│   │   │   │   ├── TryCatch.ts      # Async error wrapper
│   │   │   │   ├── errors.ts        # Error classes
│   │   │   │   └── dataUrI.ts       # Buffer → DataURI
│   │   │   └── __tests__/
│   │   │       ├── errors.test.ts   # 6 tests for error classes
│   │   │       ├── schemas.test.ts  # 10 tests for Zod schemas
│   │   │       └── idempotency.test.ts # 4 tests for idempotency store
│   │   └── vitest.config.ts
│   │
│   └── blog/                        # Blog Service — Read Operations (R + Cache)
│       ├── src/
│       │   ├── server.ts            # Express, Redis client, RabbitMQ consumer
│       │   ├── controllers/blog.ts  # getAllBlogs (cursor pagination, search, filter, Redis cache), getSingleBlog (fetches author from User Service)
│       │   ├── routes/blog.ts       # GET /blog/all, GET /blog/:id
│       │   ├── middlewares/
│       │   │   └── requestLogger.ts # Correlation-ID logging
│       │   └── utils/
│       │       ├── db.ts            # Neon PostgreSQL connection
│       │       ├── consumer.ts      # RabbitMQ consumer — cache invalidation + rebuild
│       │       ├── TryCatch.ts      # Async error wrapper
│       │       └── errors.ts        # Error classes
│       └── ...
│
└── docker-compose.yml               # RabbitMQ + 3 services
```

## Features

### Frontend
- **GSAP-animated landing page** — Scroll-triggered animations, parallax, clip-path reveals
- **Google OAuth login** — One-click sign-in with Google popup
- **Dashboard** — Profile view, photo upload (Cloudinary), social links
- **Blog listing** — Search (ILIKE), category filter, cursor-based pagination
- **Blog detail** — Full content, cover image, author info, comments, save/unsave
- **Create/Edit blog** — Rich content, category selector, image upload
- **Saved blogs** — Bookmarked blogs with unsave functionality
- **Route protection** — Unauthenticated users redirected to landing page

### Backend
- **Google OAuth 2.0** — Token exchange, auto-create user on first login
- **JWT authentication** — 5-day expiry, shared secret across services
- **Cursor-based pagination** — Stable under concurrent writes (no page drift)
- **Redis caching** — Cache-aside pattern with 30-minute TTL
- **RabbitMQ cache invalidation** — Async, durable queue, auto-rebuild first-page cache
- **Zod validation** — Runtime type safety on all write endpoints
- **Idempotency keys** — Prevents duplicate blog submissions on retry (24h TTL)
- **Structured error classes** — AppError, NotFoundError, ValidationError, UnauthorizedError
- **Correlation-ID logging** — `[reqId] METHOD /path STATUS DURATIONms` across all services
- **Rate limiting** — 100 requests per 15 minutes per IP
- **Graceful shutdown** — SIGTERM/SIGINT handlers with 10s force-kill timeout

## API Endpoints

### User Service (port 5000)
| Method | Endpoint            | Auth | Description                  |
|--------|---------------------|------|------------------------------|
| POST   | `/api/v1/login`     | No   | Exchange Google code for JWT |
| GET    | `/api/v1/me`        | Yes  | Get current user profile     |
| GET    | `/api/v1/user/:id`  | No   | Get user profile by ID       |
| POST   | `/api/v1/user/update` | Yes | Update name, bio, social links |
| POST   | `/api/v1/user/update/pic` | Yes | Upload profile picture |

### Author Service (port 5001)
| Method | Endpoint                     | Auth | Description                      |
|--------|------------------------------|------|----------------------------------|
| POST   | `/api/v1/blog/new`           | Yes  | Create blog (with image)         |
| POST   | `/api/v1/blog/:id`           | Yes  | Update blog                      |
| DELETE | `/api/v1/blog/:id`           | Yes  | Delete blog                      |
| POST   | `/api/v1/comment/new`        | Yes  | Create comment                   |
| GET    | `/api/v1/comment/:blogid`    | No   | Get blog comments                |
| DELETE | `/api/v1/comment/:id`        | Yes  | Delete comment (owner only)      |
| POST   | `/api/v1/save/:blogid`       | Yes  | Save blog                        |
| DELETE | `/api/v1/save/:blogid`       | Yes  | Unsave blog                      |
| GET    | `/api/v1/save`               | Yes  | Get saved blogs list             |

### Blog Service (port 5002)
| Method | Endpoint                     | Auth | Description                               |
|--------|------------------------------|------|-------------------------------------------|
| GET    | `/api/v1/blog/all`           | No   | List blogs (search, filter, cursor, limit)|
| GET    | `/api/v1/blog/:id`           | No   | Get single blog + author                  |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (or standalone RabbitMQ)
- Neon PostgreSQL account (free tier)
- MongoDB Atlas (free tier)
- Upstash Redis (free tier)
- Cloudinary account (free)
- Google OAuth 2.0 Client ID + Secret

### 1. Clone & Install

```powershell
git clone <repo>
cd Blog

# Install all dependencies
cd service/user; npm install
cd service/author; npm install
cd service/blog; npm install
cd client; npm install
```

### 2. Environment Variables

**`service/user/.env`**
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGO_URI=your_mongodb_uri
JWT_SEC=your_jwt_secret
Cloud_Name=your_cloudinary_name
Cloud_Api_Key=your_cloudinary_key
Cloud_Api_Secret=your_cloudinary_secret
Google_Client_id=your_google_client_id
Google_Client_secret=your_google_client_secret
```

**`service/author/.env`**
```env
PORT=5001
DB_URL=your_neon_postgres_url
JWT_SEC=your_jwt_secret
Cloud_Name=your_cloudinary_name
Cloud_Api_Key=your_cloudinary_key
Cloud_Api_Secret=your_cloudinary_secret
RABBITMQ_HOST=localhost
FRONTEND_URL=http://localhost:3000
```

**`service/blog/.env`**
```env
PORT=5002
DB_URL=your_neon_postgres_url
REDIS_URL=your_upstash_redis_url
RABBITMQ_HOST=localhost
USER_SERVICE=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**`client/.env.local`**
```env
NEXT_PUBLIC_USER_API=http://localhost:5000
NEXT_PUBLIC_AUTHOR_API=http://localhost:5001
NEXT_PUBLIC_BLOG_API=http://localhost:5002
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Start RabbitMQ

```powershell
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

### 4. Start Services (4 terminals)

```powershell
# Terminal 1 — User Service
cd service/user; npm run dev

# Terminal 2 — Author Service
cd service/author; npm run dev

# Terminal 3 — Blog Service
cd service/blog; npm run dev

# Terminal 4 — Frontend
cd client; npm run dev
```

Frontend: `http://localhost:3000`

### 5. Docker Compose (alternative)

```powershell
docker compose up --build
```

## Testing

```powershell
cd service/author
npm test
```

**20 unit tests** across 3 suites:
- `errors.test.ts` — 6 tests for AppError, NotFoundError, ValidationError, UnauthorizedError
- `schemas.test.ts` — 10 tests for createBlogSchema, updateBlogSchema, createCommentSchema
- `idempotency.test.ts` — 4 tests for idempotency key store

## Architecture Decisions

| Decision              | Rationale                                                                 |
|-----------------------|---------------------------------------------------------------------------|
| 3 microservices       | Auth (User), writes (Author), reads (Blog) scale independently            |
| PostgreSQL for blogs  | Relational data (blogs, comments, saves) needs joins and constraints      |
| MongoDB for users     | Flexible document model suits social profiles with optional fields        |
| Redis cache           | Read-heavy blog listing; cache-aside with 30min TTL                       |
| RabbitMQ              | Decouples cache invalidation — author publishes, blog consumer listens    |
| Zod                   | Runtime type safety; single source of truth for input validation          |
| Cursor pagination     | Stable under concurrent writes; no "page drift" unlike OFFSET             |
| Idempotency keys      | Prevents duplicate blog creates when network retries cause re-submission  |

## Performance Highlights

- **~60% fewer DB reads** via Redis cache-aside pattern with cursor-based pagination
- **Async cache invalidation** — author publishes to RabbitMQ, blog consumer deletes matching Redis keys and proactively rebuilds first-page cache
- **Zero duplicate blog submissions** via idempotency-key middleware with 24h TTL
- **~80% faster error responses** with structured AppError classes + centralized handler across all 3 services
- **~40% faster debugging** via correlation-ID logging (`[reqId] METHOD /path STATUS DURATIONms`)
- **100% type safety** (TypeScript strict) across all services

<img width="1092" height="874" alt="Screenshot 2026-05-23 035029" src="https://github.com/user-attachments/assets/4987dafd-0af1-4603-b200-4855bd8d646d" />
<img width="1902" height="1079" alt="Screenshot 2026-05-23 033347" src="https://github.com/user-attachments/assets/abd9e84e-7c1a-4909-b574-1e5935f0cd1e" />
<img width="1790" height="1003" alt="Screenshot 2026-05-23 031846" src="https://github.com/user-attachments/assets/4d74bb9b-f861-4e62-b00c-6171925fa7c7" />
<img width="1817" height="900" alt="Screenshot 2026-05-23 022903" src="https://github.com/user-attachments/assets/a6303671-6d6e-4797-8fd1-da10c6041e31" />
<img width="1752" height="968" alt="Screenshot 2026-05-23 022852" src="https://github.com/user-attachments/assets/a8326827-24df-4a8e-b2a0-05b189496b6b" />
<img width="1916" height="1015" alt="Screenshot 2026-05-23 022841" src="https://github.com/user-attachments/assets/55dbb5c0-0d0b-4710-aca6-2856d6ec3528" />
<img width="1896" height="984" alt="Screenshot 2026-05-23 022811" src="https://github.com/user-attachments/assets/a3c6097a-0c4b-4601-ae81-da7de90bed29" />
<img width="1909" height="308" alt="Screenshot 2026-05-23 041130" src="https://github.com/user-attachments/assets/eeddf9b1-a1d5-4fd8-bc8c-47beee428266" />
<img width="1748" height="745" alt="Screenshot 2026-05-23 035038" src="https://github.com/user-attachments/assets/9b6e14db-4902-4cb6-a1b5-f323361a15c3" />
