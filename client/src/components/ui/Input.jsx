const Input = ({ label, id, error, className = "", ...props }) => (
  <div className="w-full">
    {label && (
      <label htmlFor={id} className="field-label">{label}</label>
    )}
    <input
      id={id}
      className={`input-field ${error ? "ring-2 ring-red-500 border-transparent" : ""} ${className}`}
      {...props}
    />
    {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
  </div>
);

export default Input;
