# Overview

This is a comprehensive Swedish grammar learning game application that teaches word classes (ordklasser) through interactive sentence exercises. The application features a complete educational system with multiple game modes: individual word class practice, timed tests with scoring algorithms, and a comprehensive exam covering all word classes. Students can click on words in sentences to identify their grammatical categories (verb, noun, adjective, etc.), receive guidance from an animated character, and track their progress through various difficulty levels. The application is built as a full-stack web application with a React frontend and Express backend.

## Recent Issues Resolved (August 2025)
- **Database Query Bug**: Fixed critical issue where Drizzle-ORM queries returned wrong word class sentences due to incorrect `.where()` chaining, resolved by using `and()` operator
- **Duplicate Sentence Prevention**: Enhanced bulk creation functionality with duplicate detection and prevention to avoid unintended sentence multiplication
- **Admin Duplicate Detection**: Added "Sök dubbletter" button in admin panel for manual duplicate identification
- **Simplified Data Model**: Removed "difficulty" column from sentences table, keeping only "level" for simplified management
- **Removed Drag-and-Drop Game**: Eliminated the "ordklassdrak" (word class dragon) drag-and-drop functionality per user request
- **Removed Level 4**: Eliminated level 4 completely, now progression goes directly from level 3 to level 5 (final exam)
- **Enhanced Level 3**: Restructured level 3 to combine two types of sentences: (1) sentences without the target word class and (2) sentences with multiple instances of the target word class

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

The application now features a comprehensive educational system with multiple game modes:

### Core Game Mechanics
- **Random target selection** - Dynamically chooses word classes to identify from available sentence content
- **Interactive sentence parsing** - Words are clickable with visual feedback for correct/incorrect selections
- **Progress tracking** - Persistent scoring system with levels and completion statistics
- **Feedback system** - Immediate visual and textual feedback for learning reinforcement

### Educational Features (Added August 2025)
- **Word Class Guide Character** - "Lilla Grammatik" animated character provides explanations and encouragement
- **Multiple Practice Modes**:
  - Individual word class practice (focus on specific grammar categories)
  - Free practice (mixed word classes)
  - Timed tests with scoring algorithms
  - Comprehensive exam covering all word classes
- **Advanced Scoring System**:
  - Base points for correct answers
  - Time-based bonus multipliers
  - Exponential time penalties for wrong answers (5s, 10s, 20s, 40s...)
  - Grade system (A-F) based on performance

### Navigation and User Experience
- **Main Menu System** - Choose between different practice modes and tests
- **Specialized Test Interface** - Timer display, progress tracking, and performance analytics
- **Character-Guided Learning** - Contextual explanations and mood-based feedback

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