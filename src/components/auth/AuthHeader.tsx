
import React from 'react';
import { BookOpen } from 'lucide-react';

const AuthHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-2 mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
          Study Hub
        </span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="text-gray-600">Sign in to your account or create a new one</p>
    </div>
  );
};

export default AuthHeader;
