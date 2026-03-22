// Shows a user's avatar image, or their initials on a colored background as fallback
const COLORS = [
  "bg-violet-600",
  "bg-indigo-600",
  "bg-blue-600",
  "bg-teal-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
];

const getColor = (name = "") => {
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
};

const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const sizeMap = {
  xs:  "w-6 h-6 text-xs",
  sm:  "w-8 h-8 text-sm",
  md:  "w-10 h-10 text-sm",
  lg:  "w-12 h-12 text-base",
  xl:  "w-16 h-16 text-lg",
  "2xl": "w-20 h-20 text-xl",
};

const Avatar = ({ user, size = "md", className = "" }) => {
  const name = user?.name || "User";
  const sizeClass = sizeMap[size] || sizeMap.md;

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${getColor(name)} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
