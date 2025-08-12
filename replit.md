# Overview

This is a Swedish grammar learning game application that teaches word classes (ordklasser) through interactive sentence exercises. Players click on words in sentences to identify their grammatical categories (verb, noun, adjective, etc.). The application is built as a full-stack web application with a React frontend and Express backend, featuring a clean, educational interface with progress tracking and scoring.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side is built with **React 18** using a modern component-based architecture:

- **Vite** as the build tool and development server for fast hot module replacement
- **TypeScript** for type safety throughout the application
- **Wouter** for lightweight client-side routing (single route to Game component)
- **TanStack Query** for server state management and API caching
- **Tailwind CSS** with **shadcn/ui** component library for styling
- **Radix UI** primitives for accessible UI components

The frontend follows a component-driven design with reusable UI components organized in `/client/src/components/ui/` and game-specific components for headers, instructions, sentence display, sidebar, and feedback.

## Backend Architecture

The server uses **Express.js** with TypeScript in ESM module format:

- **RESTful API** design with endpoints for word classes, sentences, and game progress
- **In-memory storage** implementation (`MemStorage` class) for development/demo purposes
- **Drizzle ORM** configured for PostgreSQL with schema definitions for production database
- **Session-based state management** with middleware for request logging
- **Development/production environment handling** with Vite integration for dev mode

## Data Layer

**Database Schema** (PostgreSQL with Drizzle ORM):
- `word_classes` - Stores grammatical categories with Swedish names, descriptions, and colors
- `sentences` - Contains practice sentences with embedded word metadata and difficulty levels  
- `game_progresses` - Tracks user progress including score, level, and completion status

**Type System**:
- Shared schema definitions between frontend and backend using Zod validation
- Strong typing for Word, Sentence, GameProgress, and WordClass entities
- Type-safe API responses and database operations

## Game Logic Architecture

The core game mechanics implement a word classification learning system:

- **Random target selection** - Dynamically chooses word classes to identify from available sentence content
- **Interactive sentence parsing** - Words are clickable with visual feedback for correct/incorrect selections
- **Progress tracking** - Persistent scoring system with levels and completion statistics
- **Feedback system** - Immediate visual and textual feedback for learning reinforcement

The game state is managed through React Query mutations for optimistic updates and automatic cache invalidation.

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless** - Neon PostgreSQL serverless driver for production database
- **drizzle-orm & drizzle-kit** - Type-safe ORM and migration tools for database management
- **@tanstack/react-query** - Server state management and caching
- **express** - Node.js web framework for the backend API

## UI and Styling
- **@radix-ui/** (multiple packages) - Headless UI primitives for accessibility
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority & clsx** - Conditional CSS class utilities
- **lucide-react** - Icon library

## Development Tools
- **vite** - Build tool and development server
- **@vitejs/plugin-react** - React support for Vite
- **@replit/vite-plugin-runtime-error-modal** - Development error handling
- **tsx** - TypeScript execution for Node.js development

## Form and Data Handling
- **react-hook-form & @hookform/resolvers** - Form state management and validation
- **zod** - Schema validation library
- **date-fns** - Date manipulation utilities

## Additional Features
- **wouter** - Lightweight React router
- **embla-carousel-react** - Carousel component for potential UI features
- **cmdk** - Command palette functionality
- **connect-pg-simple** - PostgreSQL session store for Express sessions