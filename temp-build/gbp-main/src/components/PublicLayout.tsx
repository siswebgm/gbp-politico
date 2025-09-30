import React from 'react';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50" style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {children}
    </div>
  );
};
