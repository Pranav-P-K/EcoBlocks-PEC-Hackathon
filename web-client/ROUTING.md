# Routing Setup

This application now uses React Router for navigation between the landing page and dashboard.

## Routes

- `/` - Landing page with animated background and "Try Demo" button
- `/dashboard` - Main application dashboard with Cesium 3D viewer and simulation tools
- `*` - Any unknown routes redirect to the landing page

## Navigation Flow

1. Users start at the landing page (`/`)
2. Clicking "Try Demo" navigates to `/dashboard` 
3. The dashboard contains the full Cesium-based simulation interface

## File Structure

- `src/App.tsx` - Main router component with route definitions
- `src/components/LandingPage.tsx` - Landing page component
- `src/components/DashboardPage.tsx` - Dashboard component (moved from App.tsx)
- `src/main.tsx` - Updated to include BrowserRouter wrapper

## Key Changes Made

1. Wrapped the app in `BrowserRouter` in `main.tsx`
2. Created new `App.tsx` with route definitions
3. Moved original App logic to `DashboardPage.tsx`
4. Added 404 redirect to landing page
5. Maintained all existing functionality and Auth0 integration