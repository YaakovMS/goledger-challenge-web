import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { PageLoader } from '@/components/common';
import { DataProvider } from '@/providers';
import '@/stores/themeStore'; // Initialize theme store

// Import main pages directly for instant navigation (small bundle impact)
import { HomePage } from '@/pages/Home';
import { TvShowsPage } from '@/pages/TvShows';
import { WatchlistPage } from '@/pages/Watchlist';

// Lazy load heavy/less-used pages
const TvShowDetailsPage = lazy(() => import('@/pages/TvShowDetails'));
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data stays fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - cache retention
      refetchOnMount: false, // Don't refetch, use cache
      refetchOnWindowFocus: false, // Don't refetch on focus
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path='/' element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path='tv-shows' element={<TvShowsPage />} />
                <Route path='tv-shows/:key' element={<TvShowDetailsPage />} />
                <Route path='watchlist' element={<WatchlistPage />} />
              </Route>
              <Route path='/admin' element={<Admin />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
