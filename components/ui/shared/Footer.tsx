'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter, Linkedin, ExternalLink } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-16">
        {/* Main CTA Section */}
        <div className="text-center mb-16">
          <div className="bg-white/10 rounded-lg p-8 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Turn your hiring ideas into reality today
            </h2>
            <p className="text-gray-300 mb-6">
              Start your 14-day Pro trial today. No credit card required.
            </p>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Start building for free →
            </button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Product */}
          <div>
            <h3 className="font-bold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/auth/signin" className="text-gray-300 hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/landing/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/landing/features" className="text-gray-300 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/landing/changelog" className="text-gray-300 hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="/landing/docs" className="text-gray-300 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/landing/api-docs" className="text-gray-300 hover:text-white transition-colors">API Docs</Link></li>
              <li><Link href="/landing/contact" className="text-gray-300 hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/landing/about" className="text-gray-300 hover:text-white transition-colors">About</Link></li>
              <li><Link href="/landing/contact" className="text-gray-300 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/landing/privacy" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/landing/terms" className="text-gray-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#gradient)" />
              <path d="M8 16C8 13.5 9.5 12 12 12H20C22.5 12 24 13.5 24 16V20C24 22.5 22.5 24 20 24H12C9.5 24 8 22.5 8 20V16Z" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-xl font-bold">gradii</span>
          </div>

          {/* Social Links & Copyright */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
            <div className="text-sm text-gray-400">
              © Gradii 2024
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};