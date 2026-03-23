import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const BlogPlaceholder: React.FC = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 px-4 py-20 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200">PocketShop Blog</p>
        <h1 className="text-3xl font-bold">Coming Soon</h1>
        <p className="mt-4 text-white/80">
          We are working on stories, product updates, and local shopping guides for you.
        </p>
        <Link
          to={ROUTES.HOME}
          className="mt-8 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-900 transition-colors hover:bg-white/90"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
};

export default BlogPlaceholder;
