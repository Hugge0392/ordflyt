# Overview

This project is a comprehensive Swedish grammar learning game application focused on teaching word classes (ordklasser) through interactive sentence exercises. It features an educational system with multiple game modes, including individual practice, timed tests, and a comprehensive exam. Users can identify grammatical categories within sentences, receive guidance from an animated character, and track their progress. The application is a full-stack web application with a React frontend and an Express backend, designed to provide an engaging and effective learning experience. It also includes a robust system for creating and publishing reading comprehension lessons and managing content.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with **React 18**, utilizing **Vite** for fast development, and **TypeScript** for type safety. **Wouter** handles lightweight client-side routing, supporting a category-based navigation structure for the main landing page, grammar section, and future subjects. **TanStack Query** manages server state and API caching, while **Tailwind CSS** with **shadcn/ui** and **Radix UI** primitives are used for styling and accessible UI components. The design follows a component-driven approach with reusable UI elements.

## Backend Architecture

The backend uses **Express.js** with TypeScript in ESM format, implementing a **RESTful API** for managing word classes, sentences, and game progress. **Drizzle ORM** is configured for PostgreSQL, and session-based state management is handled with middleware. The system supports both development and production environments.

## Data Layer

The database schema (PostgreSQL with Drizzle ORM) includes tables for `word_classes`, `sentences`, and `game_progresses`. **Zod validation** ensures type-safe data handling, with shared schema definitions between frontend and backend.

## Game Logic Architecture

The application incorporates a comprehensive educational system with various game modes. Core mechanics include dynamic target selection, interactive sentence parsing with visual feedback, persistent progress tracking, and immediate feedback. Educational features include an animated guide character, multiple practice modes (individual, free, timed tests, comprehensive exam), and an advanced scoring system with base points, time bonuses, exponential penalties, and a grade system. Navigation is managed through a main menu, a specialized test interface, and character-guided learning. Game state is managed via React Query mutations.

## Content Management System

The application features a robust admin interface for content creation, including:
- **Lesson Builder**: Comprehensive tool for creating lessons with templates, validation, save/load, export, and moment duplication.
- **Reading Comprehension Admin**: Allows creation of reading lessons with rich text content, various question types (multiple choice, true/false, open), word definitions, and pre-reading questions.
- **RichTextEditor**: A blog-style editor supporting text blocks, images, headings, quotes, and lists, with integrated object storage for images.
- **Publishing System**: Streamlined system to save lessons to the database and make them accessible via shareable links, with controls for publishing/unpublishing.
- **Page Break System**: Allows content creators to split long texts into manageable pages for improved readability.
- **Admin Management Tabs**: Organized tabs for "Alla lektioner", "Publicerade", and "Utkast" with specialized controls.

## Authentication System

An enterprise-grade, security-first authentication system supports three user roles (ELEV/student, LÄRARE/teacher, ADMIN/admin). It includes Argon2id password hashing, server-side sessions with secure cookies, CSRF protection, rate limiting, role-based access control (RBAC), audit logging, session rotation, security headers, and device fingerprinting. A complete teacher registration workflow with one-time codes and email integration is also implemented.

## UI/UX Design

The application features a responsive two-column layout for reading lessons on larger screens, with a sticky questions panel. An accessibility sidebar is included, offering reading adjustments such as background/text color combinations and text size control. A "Förhandsgranska" (Preview) button system allows content creators to view formatted lesson content prior to publishing.

# External Dependencies

## Core Framework Dependencies
- `@neondatabase/serverless`: Neon PostgreSQL serverless driver
- `drizzle-orm` & `drizzle-kit`: Type-safe ORM and migration tools
- `@tanstack/react-query`: Server state management and caching
- `express`: Node.js web framework

## UI and Styling
- `@radix-ui/*`: Headless UI primitives
- `tailwindcss`: Utility-first CSS framework
- `class-variance-authority` & `clsx`: Conditional CSS class utilities
- `lucide-react`: Icon library

## Form and Data Handling
- `react-hook-form` & `@hookform/resolvers`: Form state management and validation
- `zod`: Schema validation library
- `date-fns`: Date manipulation utilities

## Additional Features
- `wouter`: Lightweight React router
- `embla-carousel-react`: Carousel component
- `cmdk`: Command palette functionality
- `connect-pg-simple`: PostgreSQL session store for Express sessions
- `Postmark`: Email service for registration and confirmations.