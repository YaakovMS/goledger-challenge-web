# GoLedger Challenge - StreamDB

A web interface for a blockchain-based TV Show catalog application (IMDB-like), built with React, TypeScript, and Tailwind CSS.

## Features

- **TV Shows**: Create, read, update, and delete TV shows with details like name, description, genre, release year, and rating
- **Seasons**: Manage seasons for each TV show
- **Episodes**: Track individual episodes 
- **Watchlist**: Create personalized watchlists to organize shows you want to watch

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query (React Query)** for data fetching and caching
- **Axios** for HTTP requests
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YaakovMS/goledger-challenge-web.git
cd goledger-challenge-web
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Edit the `.env` file and add your API credentials:
```env
VITE_API_USERNAME=your-username-here
VITE_API_PASSWORD=your-password-here
```

### Running the Application

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
+-- components/
�   +-- common/         # Reusable UI components (Button, Modal, Card, etc.)
�   +-- layout/         # Layout components (Header, Sidebar, Layout)
+-- pages/              # Page components (Home, TvShows, Seasons, Episodes, Watchlist)
+-- services/           # API services for each entity
+-- types/              # TypeScript type definitions
+-- App.tsx             # Main app with routes
+-- main.tsx            # Entry point
+-- index.css           # Global styles with Tailwind
```

## API Integration

The application connects to the GoLedger blockchain API at:
- **Base URL**: `http://ec2-50-19-36-138.compute-1.amazonaws.com`
- **Swagger Docs**: `http://ec2-50-19-36-138.compute-1.amazonaws.com/api-docs/index.html`

Authentication is done via Basic Auth using credentials provided by email.

---

# Original Challenge Description

In this challenge you will create a web interface to a blockchain application. In this application you must implement a imdb-like interface, to catalogue TV Shows, with series, seasons, episodes and watchlist registration.

## Requirements

- Your application should be able to add/remove/edit and show all tv shows, seasons, episodes and watchlists;
- Use **React** or **Next.js** (all UI libraries are allowed);

## Server

The data are obtained using a rest server at this address: `http://ec2-50-19-36-138.compute-1.amazonaws.com`

Also, a Swagger with the endpoints specifications for the operations is provided at this address: `http://ec2-50-19-36-138.compute-1.amazonaws.com/api-docs/index.html`.

Note: The API is protected with Basic Auth. The credentials were sent to you by email.
