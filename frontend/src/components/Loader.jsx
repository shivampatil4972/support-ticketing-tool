const Loader = ({ size = 'medium', className = '' }) => {
  const sizes = {
    small: 'h-5 w-5 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-10 ${className}`}>
      <div className={`${sizes[size]} animate-spin rounded-full border-primary-500 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]`} />
      <span className="mt-4 text-sm font-medium text-slate-400 animate-pulse-soft tracking-wider uppercase text-xs">Loading</span>
    </div>
  );
};

export default Loader;
