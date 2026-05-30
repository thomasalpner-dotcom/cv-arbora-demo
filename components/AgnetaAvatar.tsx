import React from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  url?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  gradient?: string;
}

export const AgnetaAvatar: React.FC<Props> = ({ url, size = 'md', className = "", gradient }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16'
  };

  const containerClass = `rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${sizeClasses[size]} ${className}`;

  if (url) {
    return (
      <div className={containerClass}>
        <img
          src={url}
          alt="AI Avatar"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Default AI Star visual
  const defaultGradient = gradient || "bg-gradient-to-br from-brand-400 to-brand-600";
  return (
    <div className={`${containerClass} ${defaultGradient} text-white shadow-lg`}>
      <Sparkles className={iconSizes[size]} />
    </div>
  );
};
