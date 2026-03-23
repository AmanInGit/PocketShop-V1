/**
 * About Us Page Component
 *
 * About page for PocketShop - Magicpin-inspired layout with tagline,
 * keyword highlights, light content section, team grid, contact, and footer CTA.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Github, Mail } from 'lucide-react';
import Logo from '@/features/common/components/Logo';
import { ROUTES } from '@/constants/routes';

// Highlight keywords in text (Magicpin-style) - rose-600 for light bg, rose-400 for dark
const Highlight: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <span className={light ? 'text-rose-600 font-semibold' : 'text-rose-400 font-semibold'}>
    {children}
  </span>
);

// Core team (top row) - did most of the building
const coreTeam = [
  { name: 'Aman', role: 'Project Lead & Full-Stack Developer', linkedin: 'https://www.linkedin.com/in/aman2904', github: 'https://github.com/AmanInGitDev' },
  { name: 'Prathamesh', role: 'Full-Stack Developer', linkedin: '#', github: '#' },
];
// Project support (bottom row)
const supportTeam = [
  { name: 'Pratik', role: 'Research & Documentation', linkedin: '#', github: '#' },
  { name: 'Vipul', role: 'Testing & QA', linkedin: '#', github: '#' },
  { name: 'Pranav', role: 'Product Research', linkedin: '#', github: '#' },
];

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 relative overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-purple-900/10 backdrop-blur-[12px] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/">
              <Logo size="md" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-white/90 hover:text-white text-sm font-medium transition-colors">
                Home
              </Link>
              <Link to="/business" className="text-white/90 hover:text-white text-sm font-medium transition-colors">
                Business
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Title + Tagline */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-3">
            About Us
          </h1>
          <p className="text-xl text-white/90 text-center mb-12 max-w-2xl mx-auto">
            <strong>Virtual storefronts for local businesses. One QR code at a time.</strong>
          </p>

          {/* Light Content Section - Magicpin style */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-12">
            {/* Our Mission */}
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-6">
              We are transforming the humble <Highlight light>QR code</Highlight> from a simple payment tool
              into a comprehensive virtual storefront and business intelligence platform.
            </p>
            <p className="text-gray-700 text-base leading-relaxed">
              Our mission is to bridge the critical gap between basic payments and complex enterprise
              solutions, empowering even the smallest vendors with the data-driven tools they need to grow.
            </p>

            {/* Our Story */}
            <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">Our Story</h2>
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              <Highlight light>PocketShop</Highlight> began as a final-year project for a team of five
              engineering students from <Highlight light>D.Y. Patil College of Engineering, Kolhapur</Highlight>.
            </p>
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              We saw a gap: the <Highlight light>local shops</Highlight> and cafes we loved were using QR codes,
              but only for payments. We saw the <Highlight light>Static QR Paradox</Highlight> firsthand—manual
              ordering, miscommunication, and vendors &apos;data-blind&apos; in a digital world.
            </p>
            <p className="text-gray-700 text-base leading-relaxed">
              We decided to build the solution. <Highlight light>PocketShop</Highlight> is our answer to empower
              these local businesses with the same powerful tools as large corporations, starting with
              the QR code they already have.
            </p>

            {/* The Problem + Solution - Side by Side */}
            <div className="grid md:grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">The &quot;Static QR Paradox&quot;</h2>
                <p className="text-gray-700 text-base leading-relaxed">
                  In today&apos;s digital-first economy, most small businesses use QR codes for one thing: payments.
                  This ignores inefficiencies in ordering and customer management, leaving vendors
                  &apos;data-blind&apos; and forced to rely on intuition rather than data.
                </p>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">The PocketShop Ecosystem</h2>
                <p className="text-gray-700 text-base leading-relaxed mb-4">
                  <Highlight light>PocketShop</Highlight> resolves this paradox with PWA technology for a frictionless,
                  app-less experience.
                </p>
                <p className="text-gray-700 text-base leading-relaxed mb-2">
                  <strong className="text-rose-500">For Customers:</strong> A simple scan provides instant
                  access to a digital menu—seamless ordering, payment, and real-time tracking.
                </p>
                <p className="text-gray-700 text-base leading-relaxed">
                  <strong className="text-rose-500">For Vendors:</strong> A smart dashboard for live order
                  management and AI-powered analytics on sales trends, best sellers, and peak hours.
                </p>
              </div>
            </div>

            {/* Our Vision */}
            <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">Democratizing Digital Tools</h2>
            <p className="text-gray-700 text-base leading-relaxed">
              We believe sophisticated digital tools shouldn&apos;t be reserved for large corporations.
              By building upon the <Highlight light>QR code</Highlight> that vendors already understand,{' '}
              <Highlight light>PocketShop</Highlight> democratizes access to technology—ensuring even the smallest
              local cafe or food stall can enhance customer satisfaction and compete in the data-driven economy.
            </p>
          </div>

          {/* Our Team - Magicpin-style */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-4">Our Team</h2>
            <p className="text-white/80 text-center max-w-2xl mx-auto mb-10 text-base leading-relaxed">
              From a college project to a full platform—<Highlight>PocketShop</Highlight>&apos;s journey has been
              led by a team on a mission to empower local businesses with enterprise-grade digital tools.
            </p>
            {/* Core team - top row */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto mb-6">
              {coreTeam.map((member, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transition-shadow"
                >
                  <div className="w-20 h-20 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center grayscale">
                    <span className="text-gray-600 text-2xl font-bold">{member.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{member.role}</p>
                  <div className="flex justify-center gap-3">
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-rose-500 transition-colors"
                      aria-label={`${member.name}'s LinkedIn`}
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-rose-500 transition-colors"
                      aria-label={`${member.name}'s GitHub`}
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {/* Project support - bottom row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
              {supportTeam.map((member, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transition-shadow"
                >
                  <div className="w-20 h-20 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center grayscale">
                    <span className="text-gray-600 text-2xl font-bold">{member.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{member.role}</p>
                  <div className="flex justify-center gap-3">
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-rose-500 transition-colors"
                      aria-label={`${member.name}'s LinkedIn`}
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-rose-500 transition-colors"
                      aria-label={`${member.name}'s GitHub`}
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Us - Magicpin-style grid */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">Contact Us</h2>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Support</p>
                  <a href="mailto:support@pocketshop.in" className="text-gray-600 hover:text-rose-500">
                    support@pocketshop.in
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Partners</p>
                  <a href="mailto:partners@pocketshop.in" className="text-gray-600 hover:text-rose-500">
                    partners@pocketshop.in
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="font-semibold text-gray-900 mb-2">Our Home Base</p>
              <p className="text-gray-700 font-medium">D.Y. Patil College of Engineering, Kolhapur</p>
              <p className="text-gray-600 text-sm">Kolhapur, Maharashtra, India</p>
            </div>
          </div>

          {/* Built At / Trust Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
            <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Built at</p>
            <p className="text-xl font-semibold text-white">
              D.Y. Patil College of Engineering, Kolhapur
            </p>
            <p className="text-white/60 text-sm mt-1">Final Year Engineering Project • 2026</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* CTA - Magicpin style */}
          <div className="flex flex-col items-center text-center mb-12">
            <Link
              to="/business"
              className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create your virtual storefront — free
            </Link>
            <p className="text-white/60 text-sm mt-3">No credit card required • Setup in minutes</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <Logo size="lg" />
              <p className="text-white/80 text-lg font-medium mt-4 mb-3">Discover Local, Shop Offline</p>
              <p className="text-white/60 text-sm leading-relaxed max-w-md mb-6">
                Get handpicked nearby deals, discover stores that match your plans, and shop offline with confidence.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-white/70 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.487.535 6.624 0 11.99-5.367 11.99-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Platform</h3>
              <ul className="space-y-3">
                <li><Link to="/" className="text-white/70 hover:text-white text-sm">Home</Link></li>
                <li><Link to="/business" className="text-white/70 hover:text-white text-sm">For Business</Link></li>
                <li><Link to="/about-us" className="text-white/70 hover:text-white text-sm">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link to={ROUTES.BLOG} className="text-white/70 hover:text-white text-sm">Blog</Link></li>
                <li><Link to={ROUTES.HELP_CENTER} className="text-white/70 hover:text-white text-sm">Help Center</Link></li>
                <li><Link to={ROUTES.DOCUMENTATION} className="text-white/70 hover:text-white text-sm">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link to="/about-us" className="text-white/70 hover:text-white text-sm">About</Link></li>
                <li><a href="#" className="text-white/70 hover:text-white text-sm">Privacy Policy</a></li>
                <li><a href="#" className="text-white/70 hover:text-white text-sm">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/60 text-sm">© 2026 PocketShop. All rights reserved.</p>
              <p className="text-white/60 text-sm">
                Made with <span className="text-rose-500">❤️</span> for local businesses
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
