import React from 'react';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900">
          <img src="/logo.png" alt="CivicFix Logo" className="h-8 w-8" />
            CivicFix
        </div>
      </div>
    </header>
  );
};

export default Header;