# Smart Grocer - KumoAI Hackathon Demo 2025

## Overview

Smart Grocer is a demo application built for the KumoAI Hackathon Demo 2025 that showcases a hyper-personalized shopping cart system. The application predicts what users will buy based on their persona and shopping history, featuring an interactive frontend with user switching, cart management, product recommendations, and recipe inspiration. The project follows a "scaffold first, predict later" approach, prioritizing a fully functional and visually polished interface. Performance has been optimized with batch processing and caching, reducing substitution rate loading from 30-90 seconds to under 2 seconds.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React-based single-page application (SPA) architecture with TypeScript. The frontend leverages Vite for development and build tooling, providing fast development server and optimized production builds. The UI is built with shadcn/ui components on top of Radix UI primitives and styled with Tailwind CSS using a custom design system with CSS variables for theming.

### State Management
Global application state is managed through React Context API via the AppProvider component. The primary state includes the active user ID for personalization, user profiles loaded from CSV data, shopping cart items, product recommendations, and recipe data. All components access this centralized state to provide consistent user experience across the application.

### Backend Architecture
The backend follows an Express.js REST API architecture with TypeScript. The server includes middleware for logging, error handling, and development-time features. Routes are organized in a modular structure with a storage abstraction layer that currently uses in-memory storage but can be easily swapped for database persistence.

### Component Architecture
The frontend uses a component-based architecture with reusable UI components:
- ProductCard: Displays recommended products with add-to-cart functionality
- CartItem: Manages individual cart items with quantity controls
- RecipeCard: Shows recipe suggestions with missing ingredient lists
- CheckoutView: Enhanced checkout modal with delivery time selection and substitution preferences
- Modal dialogs for checkout and recipe inspiration
- User profile switcher for demo personalization

### Data Management
The application combines CSV data with PostgreSQL database persistence and real-time AI predictions. User personas and product catalogs are loaded from CSV files in the public directory for deployment compatibility. The database stores user preferences including delivery method history. Enhanced RAG + KumoRFM integration provides personalized ingredient recommendations with 3 ranked options per missing ingredient. Recipe generation is limited to 2 recipes for optimal user experience. Product substitution preferences are calculated using KumoAI predictions with intelligent batch processing and in-memory caching for optimal performance.

### Routing and Navigation
Client-side routing is handled by Wouter, a lightweight routing library. The application currently has a single main route with modal-based navigation for additional features like checkout and recipe inspiration.

## External Dependencies

### UI and Styling
- **Radix UI**: Provides accessible, unstyled UI primitives for all interactive components
- **shadcn/ui**: Component library built on Radix UI with consistent design system
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **Lucide React**: Icon library for consistent iconography

### Data and State Management
- **TanStack React Query**: Client-side data fetching and caching (configured but minimal usage in current implementation)
- **Papa Parse**: CSV parsing library for loading user data from CSV files
- **React Hook Form**: Form handling with validation (included but not actively used)

### Development Tools
- **Vite**: Build tool and development server with React plugin
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds

### Database and ORM
- **Drizzle ORM**: Type-safe SQL ORM configured for PostgreSQL
- **Neon Database**: Serverless PostgreSQL database service
- **Drizzle Kit**: Database migration and introspection tools
- **User Preferences**: Persistent storage for delivery method preferences per user

### Backend Framework
- **Express.js**: Web application framework for the REST API
- **Connect PG Simple**: PostgreSQL session store for Express sessions
- **tsx**: TypeScript execution environment for development

## Recent Performance Optimizations (January 2025)

### Batch Substitution Rate Processing
- **Problem**: Individual API calls for substitution rates caused 30-90 second loading times
- **Solution**: Implemented batch processing with in-memory caching
- **Result**: Reduced loading time to under 2 seconds with instant cache hits
- **Implementation**: 
  - Added batch API endpoint `/api/products/substitution-rates`
  - Updated Python script to handle comma-separated product IDs
  - Added Map-based caching in AIService and AppContext
  - Modified CartItem component to use context-based rates

### User Experience Improvements
- **Recommendations Clearing**: Recommendations now clear when switching users for cleaner transitions
- **Performance Monitoring**: Cache serves subsequent requests in 0-1ms vs 2000ms+ for uncached
- **CSV Deployment Fix**: Moved CSV files to public directory for proper deployment serving

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional CSS class name utility
- **class-variance-authority**: CSS variant management for component styling
- **nanoid**: Unique ID generation