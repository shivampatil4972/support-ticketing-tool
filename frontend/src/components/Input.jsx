import React, { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <label className="block w-full">
    {label && (
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
    )}
    <input
      ref={ref}
      className={`input-premium ${error ? '!border-red-500 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''} ${className}`}
      {...props}
    />
    {error && (
      <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500 animate-fade-in">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </span>
    )}
  </label>
));

Input.displayName = 'Input';

export default Input;
