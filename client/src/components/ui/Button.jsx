const variantMap = {
  primary:   "btn-primary",
  secondary: "btn-secondary",
  ghost:     "btn-ghost",
  danger:    "btn-danger",
};

const sizeMap = {
  sm:  "text-sm px-3 py-1.5",
  md:  "",           // default — variant classes already have padding
  lg:  "text-base px-6 py-3",
  xl:  "text-lg px-8 py-4",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  ...props
}) => {
  return (
    <button
      className={`${variantMap[variant]} ${sizeMap[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
