import React from 'react';

const DocumentationPlaceholder: React.FC = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 px-4 py-20 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-md">
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="mt-4 text-white/80">
          Structured chapters and theoretical guides are coming soon. We are preparing complete docs for onboarding,
          operations, and advanced usage.
        </p>
      </div>
    </main>
  );
};

export default DocumentationPlaceholder;
