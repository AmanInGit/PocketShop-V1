import React from 'react';

const HelpCenterPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-20 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="mt-4 text-white/80">
          Need help with PocketShop? Reach out directly at{' '}
          <a className="font-semibold text-pink-300 underline underline-offset-4" href="mailto:mominaman718@gmail.com">
            mominaman718@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
};

export default HelpCenterPage;
