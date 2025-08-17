# Overview

This is a comprehensive Swedish grammar learning game application that teaches word classes (ordklasser) through interactive sentence exercises. The application features a complete educational system with multiple game modes: individual word class practice, timed tests with scoring algorithms, and a comprehensive exam covering all word classes. Students can click on words in sentences to identify their grammatical categories (verb, noun, adjective, etc.), receive guidance from an animated character, and track their progress through various difficulty levels. The application is built as a full-stack web application with a React frontend and Express backend.

## Recent Issues Resolved (August 2025)
- **Database Query Bug**: Fixed critical issue where Drizzle-ORM queries returned wrong word class sentences due to incorrect `.where()` chaining, resolved by using `and()` operator
- **Duplicate Sentence Prevention**: Enhanced bulk creation functionality with duplicate detection and prevention to avoid unintended sentence multiplication
- **Admin Duplicate Detection**: Added "Sök dubbletter" button in admin panel for manual duplicate identification
- **Simplified Data Model**: Removed "difficulty" column from sentences table, keeping only "level" for simplified management
- **Removed Drag-and-Drop Game**: Eliminated the "ordklassdrak" (word class dragon) drag-and-drop functionality per user request
- **Restructured to 4 Levels**: System now uses exactly 4 levels (1, 2, 3, 4) where level 4 is the timed final exam
- **Enhanced Level 3 & 4**: Both levels combine two types of sentences: (1) sentences without the target word class and (2) sentences with multiple instances of the target word class
- **Level 4 Final Exam**: Former level 5 is now level 4, combining level 3 mechanics with timer and 5-star scoring
- **Question Limits & Error System**: Implemented exact question limits per level (10 for levels 1-3, 15 for level 4) with random selection from question bank and level restart after 3 mistakes
- **Admin Panel Consistency**: Limited admin interface to levels 1-3 for content creation, maintaining system consistency where database stores 1-3, players see 1-4
- **Object Storage Integration**: Fully implemented image upload system with automatic fallback for failed images
- **Character Library**: Added visual character selection library with custom pirate character and emoji options for pratbubbla moments
- **Lesson Builder UX**: Improved memory creation with input boxes instead of complex text areas, and specific target word selection for ordklass exercises
- **Comprehensive Lesson Builder**: Major overhaul with lesson templates, validation system, save/load functionality, export capabilities, moment duplication, and enhanced UI
- **Expanded Game Library**: Added 25+ interactive activity types including ordracet, quiz maker, word guessing, rhyme games, synonyms, spelling, interactive stories, crosswords, and advanced language exercises
- **Categorized Game Selection**: Organized activities into themed categories (Popular Games, Language Games, Storytelling, Word Class Games, Advanced Games) for better user experience
- **Simplified Lesson Publishing (August 2025)**: Implemented streamlined publishing system where lessons are saved to database and accessible via shareable links, integrated into word class menu without opening new tabs
- **New Landing Page Architecture (August 2025)**: Created beautiful category-based homepage at root with ordflyt.se branding, moved word classes to /grammatik as grammar subsection, added placeholder pages for future development (reading comprehension, writing, speaking, Nordic languages, source criticism)
- **Reading Comprehension Admin Tool (August 2025)**: Built comprehensive admin interface for creating reading lessons with text content, multiple question types (multiple choice, true/false, open questions), word definitions, and pre-reading questions ("Innan du läser") that activate prior knowledge before reading
- **Blog-Style Content Editor (August 2025)**: Transformed reading comprehension admin into intuitive blog-like editor with RichTextEditor component supporting text blocks, images, headings, quotes, and lists. Added ObjectUploader for seamless image integration with featured image support and rich formatting capabilities
- **Functional Object Storage Integration (August 2025)**: Fixed image upload errors by implementing proper object storage API calls, replacing mock data with real presigned URLs from Google Cloud Storage bucket, ensuring persistent image storage for lessons
- **Complete Lesson Publishing System (August 2025)**: Added dedicated reading exercises page showing all published lessons with search/filtering, individual lesson viewer with full content display, clear publish/unpublish controls in admin panel, and seamless integration between content creation and student access
- **Page Break System for Reading Lessons (August 2025)**: Implemented comprehensive page navigation system allowing content creators to split long texts into manageable pages using "Ny sida" button, with automatic page splitting, numbered navigation, and "Föregående/Nästa sida" controls in lesson viewer
- **Admin Lesson Management Tabs (August 2025)**: Added organized tab system in admin panel with separate views for "Alla lektioner", "Publicerade", and "Utkast", featuring specialized controls for each category including view, edit, unpublish, and delete functionality for published lessons

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side is built with **React 18** using a modern component-based architecture with multi-page routing:

- **Vite** as the build tool and development server for fast hot module replacement
- **TypeScript** for type safety throughout the application
- **Wouter** for lightweight client-side routing with category-based navigation:
  - `/` - Main landing page with subject categories
  - `/grammatik` - Grammar section (word classes and lessons)
  - Placeholder routes for future subjects (/lasforstaelse, /skrivande, etc.)
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