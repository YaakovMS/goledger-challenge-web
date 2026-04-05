import { Link, useNavigate } from 'react-router-dom';
import { Tv, Film, Clapperboard, List, ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { useData } from '@/providers';
import { Card, CardContent, PageLoader, TvShowPoster } from '@/components/common';
import type { TvShow } from '@/types';

const features = [
  {
    icon: Tv,
    title: 'TV Shows',
    description: 'Browse and manage your favorite TV shows collection',
    path: '/tv-shows',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    icon: Film,
    title: 'Seasons',
    description: 'Explore seasons and track your progress',
    path: '/seasons',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Clapperboard,
    title: 'Episodes',
    description: 'Dive into individual episodes and details',
    path: '/episodes',
    color: 'from-orange-500 to-red-600',
  },
  {
    icon: List,
    title: 'Watchlist',
    description: 'Create and manage your personal watchlists',
    path: '/watchlist',
    color: 'from-pink-500 to-rose-600',
  },
];

export function HomePage() {
  const navigate = useNavigate();

  // Use centralized data from DataProvider
  const { 
    tvShows, 
    seasons, 
    episodes, 
    watchlists, 
    isLoading,
    getShowSeasons,
    getShowEpisodesCount,
  } = useData();

  // Get total episodes for a TV show
  const getShowTotalEpisodes = (showKey: string): number => {
    return getShowEpisodesCount(showKey);
  };

  // Only show loading on initial load when no data is cached
  if (isLoading && (!tvShows || tvShows.length === 0)) return <PageLoader message="Loading StreamDB..." />;

  return (
    <div className="space-y-12">
      
      {/* Hero Section */}
      <section className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
          Blockchain-powered streaming catalog
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Welcome to{' '}
          <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            StreamDB
          </span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          Your decentralized TV show catalog. Browse, discover, and manage your favorite
          series with blockchain-backed data integrity.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/tv-shows"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
          >
            Explore TV Shows
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/watchlist"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-all border border-slate-300 dark:border-slate-700"
          >
            View Watchlist
          </Link>
        </div>
      </section>

      {/* TV Shows Carousel */}
      {tvShows && tvShows.length > 0 && (
        <section className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Popular TV Shows</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Discover the latest series in our catalog</p>
            </div>
            <Link 
              to="/tv-shows" 
              className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium transition-colors"
            >
              View All
              <ArrowRight className="w-2 h-2" />
            </Link>
          </div>
          
          {/* Swiper Carousel */}
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={24}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            loop={true}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="tv-shows-swiper"
          >
            {tvShows.slice(0, 6).map((show: TvShow) => {
              const showSeasons = getShowSeasons(show['@key']);
              const totalEpisodes = getShowTotalEpisodes(show['@key']);
              return (
                <SwiperSlide key={show['@key']}>
                  <div
                    onClick={() => navigate(`/tv-shows/${show['@key']}`)}
                    className="cursor-pointer group/card"
                  >
                    <div className="relative overflow-hidden rounded-2xl aspect-3/4 shadow-xl shadow-indigo-500/10 group-hover/card:shadow-indigo-500/30 transition-all duration-300 group-hover/card:scale-[1.02]">
                      {/* TV Show Poster */}
                      <TvShowPoster
                        title={show.title}
                        aspectRatio="poster"
                        className="absolute inset-0 rounded-2xl"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/40 to-transparent" />

                      {/* Age Badge */}
                      <div className="absolute top-4 right-4 px-2.5 py-1 bg-amber-500/90 rounded-full text-xs font-bold text-white">
                        {show.recommendedAge}+
                      </div>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover/card:text-indigo-200 transition-colors">
                          {show.title}
                        </h3>
                        <p className="text-sm text-slate-300 line-clamp-2 mb-3">
                          {show.description}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400">
                            {showSeasons.length} seasons
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400">
                            {totalEpisodes} eps
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      )}



      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.path} to={feature.path}>
              <Card hoverable className="h-full">
                <CardContent className="py-6">
                  <div
                    className={`w-12 h-12 rounded-xl bg-linear-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Stats Section - Real Data */}
      <section className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700/50">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6 text-center">
          Platform Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {tvShows?.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">TV Shows</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {seasons?.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Seasons</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {episodes?.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Episodes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
              {watchlists?.length || 0}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Watchlists</div>
          </div>
        </div>
      </section>
    </div>
  );
}
