import React from 'react';
import { FiGithub, FiTwitter, FiMail } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              🏙️ CivicFix
            </h3>
            <p className="text-gray-400">
              From Street to System — Intelligent Urban Infrastructure Reporting
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/report" className="hover:text-white transition-colors">Report Issue</a></li>
              <li><a href="/admin" className="hover:text-white transition-colors">Admin Dashboard</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Connect With Us</h4>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">
                <FiGithub className="text-xl" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">
                <FiTwitter className="text-xl" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">
                <FiMail className="text-xl" />
              </a>
            </div>
            <p className="text-gray-400 mt-4 text-sm">
              Made with ❤️ for Hackathon 2026
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>© 2024 CivicFix. All rights reserved.</p>
          <p className="mt-1">Using Google Gemini AI & Google Cloud Platform</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;