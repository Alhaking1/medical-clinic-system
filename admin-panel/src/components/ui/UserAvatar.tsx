import { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  iconClassName?: string;
}

export default function UserAvatar({
  src,
  name = '',
  className = 'w-10 h-10',
  iconClassName = 'w-5 h-5',
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const getFullUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') 
      : 'http://localhost:8000';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const finalUrl = getFullUrl(src);

  if (finalUrl && !hasError) {
    return (
      <img
        src={finalUrl}
        alt={name || 'صورة المستخدم'}
        onError={() => setHasError(true)}
        className={`${className} rounded-full object-cover ring-2 ring-teal-500/20 shadow-xs flex-shrink-0`}
      />
    );
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : '';

  return (
    <div
      className={`${className} rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-bold flex items-center justify-center shadow-xs flex-shrink-0 ring-2 ring-teal-500/20`}
    >
      {initial ? (
        <span className="text-sm font-semibold">{initial}</span>
      ) : (
        <User className={`${iconClassName} text-white/90`} />
      )}
    </div>
  );
}
