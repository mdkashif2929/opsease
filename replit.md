# OpsEase - Manufacturing Operations Management System

## Overview

OpsEase is a unified web application designed for small-scale export manufacturers, particularly garment exporters. The application helps streamline day-to-day operations by centralizing order management, production planning, expense tracking, stock management, employee attendance, payments, invoicing, and ledger management in a single platform.

## System Architecture

The application follows a full-stack TypeScript architecture with:

- **Frontend**: React with TypeScript using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Authentication**: Replit's OpenID Connect authentication system
- **State Management**: TanStack Query for server state management

## Key Components

### 1. Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with custom theme variables
- **Component Library**: shadcn/ui components with Radix UI primitives
- **State Management**: TanStack Query for API state management
- **Build Tool**: Vite with custom configuration for development and production

### 2. Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database Access**: Drizzle ORM with Neon serverless PostgreSQL
- **Authentication**: Passport.js with OpenID Connect strategy for Replit auth
- **Session Management**: express-session with PostgreSQL store

### 3. Database Schema
The application uses PostgreSQL with the following core entities:
- **Users**: Authentication and profile management
- **Orders**: Customer orders with product details and status tracking
- **Production Plans**: Production stages, targets, and team assignments
- **Expenses**: Daily cash expenditure tracking by category
- **Stock**: Inventory management with reorder levels
- **Employees**: Worker profiles with payment types
- **Attendance**: Daily attendance tracking with status
- **Payments**: Worker payment records and calculations
- **Invoices**: Customer billing with tax calculations
- **Ledger**: Buyer/supplier account tracking

### 4. Authentication & Authorization
- **Provider**: Replit OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions
- **Middleware**: Protected routes requiring authentication
- **User Management**: Automatic user creation and profile management

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit OIDC, sessions stored in PostgreSQL
2. **API Requests**: Frontend makes authenticated requests to Express API endpoints
3. **Database Operations**: Drizzle ORM handles database queries with type safety
4. **Real-time Updates**: TanStack Query manages cache invalidation and refetching
5. **UI Updates**: React components automatically re-render based on query state

## External Dependencies

### Production Dependencies
- **Database**: Neon serverless PostgreSQL (`@neondatabase/serverless`)
- **ORM**: Drizzle ORM for type-safe database operations
- **UI Components**: Radix UI primitives for accessible components
- **Validation**: Zod for runtime type validation
- **Date Handling**: date-fns for date manipulation
- **Authentication**: Passport.js with OpenID Connect strategy

### Development Tools
- **Build**: Vite with React plugin and runtime error overlay
- **TypeScript**: Full type coverage with strict mode
- **Database Migrations**: Drizzle Kit for schema management
- **Code Quality**: ESBuild for production bundling

## Deployment Strategy

### Development
- **Server**: tsx for TypeScript execution in development
- **Frontend**: Vite dev server with HMR
- **Database**: Drizzle push for schema updates
- **Environment**: NODE_ENV=development with error overlays

### Production
- **Build Process**: 
  1. Vite builds React frontend to `dist/public`
  2. ESBuild bundles Express server to `dist/index.js`
- **Startup**: Node.js serves bundled application
- **Static Files**: Express serves built React assets
- **Database**: Production PostgreSQL connection via DATABASE_URL

### Configuration Requirements
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit)

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 07, 2025. Initial setup
- July 08, 2025. Added contact info fields (phone/email) to invoices and invoice view dialog functionality
- July 08, 2025. Fixed critical API parameter order bug affecting all CRUD operations. Added customer dropdown to invoice creation for streamlined billing process.
- July 08, 2025. Enhanced Orders module with complete CRUD functionality: view, edit, delete buttons now working. Added status dropdown in edit form with color-coded status badges (planning, in_progress, completed, delayed, cancelled).
- July 08, 2025. Created comprehensive Employee Management page with full CRUD functionality. Added "Employees" to navigation menu and routes. Fixed schema mismatches between frontend forms and backend validation (employeeType, rate fields, date formats). Fixed attendance timestamp validation by converting time inputs to proper ISO format.
- July 08, 2025. Updated timezone system to use IST (Indian Standard Time) consistently across all time displays. Modified attendance module to store timestamps with +05:30 offset and display all times in IST format. Updated both attendance page and dashboard components for consistent timezone handling.
- July 08, 2025. Created comprehensive deployment package with support for Coolify and manual Linux deployment. Added health check endpoint, PM2 ecosystem configuration, Docker setup, nginx configuration, and automated deployment script. All deployment configurations ready for Cloud VPS 20 hosting.
- July 09, 2025. Updated deployment configuration for external PostgreSQL database (maketrack.zaf-tech.io:5432). Fixed Vite build entry module resolution issue. Removed local database setup requirements. Created final clean deployment package with only essential files for production deployment.