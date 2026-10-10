import React from 'react';

const Skeleton = ({ className = '', variant = 'rectangular', ...props }) => {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700/50';
  
  const variants = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md',
  };

  return (
    <div 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
