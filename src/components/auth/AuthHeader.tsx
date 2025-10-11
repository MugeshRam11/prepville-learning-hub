import React from 'react';
import logo from '@/assets/prep-ville-logo.svg';

const AuthHeader = () => {
  return <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <img 
          src={logo} 
          alt="The Prep Ville" 
          className="h-32 w-auto object-contain"
        />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="text-gray-600">Sign in to your account or create a new one</p>
    </div>;
};
export default AuthHeader;