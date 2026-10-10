const Button = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = 'relative overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };

  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button
      className={`${baseClasses} ${selectedVariant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
