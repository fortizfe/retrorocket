import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
    user: {
        name: string;
        photoURL?: string | null;
    };
    size?: 'sm' | 'md' | 'lg';
    showName?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
};

const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
};

const textSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
};

const UserAvatar: React.FC<UserAvatarProps> = ({
    user,
    size = 'md',
    showName = false,
    className = ''
}) => {
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const renderImageAvatar = () => (
        <img
            src={user.photoURL!}
            alt={`Avatar de ${user.name}`}
            className={`${sizeClasses[size]} rounded-full border-2 border-white dark:border-slate-700 shadow-sm object-cover ${className}`}
        />
    );

    const renderInitialsAvatar = () => (
        <div
            className={`${sizeClasses[size]} bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-700 text-white font-medium ${className}`}
            title={user.name}
        >
            {user.name.length > 0 ? (
                <span className={textSizes[size]}>
                    {getInitials(user.name)}
                </span>
            ) : (
                <User className={iconSizes[size]} />
            )}
        </div>
    );

    const avatarElement = user.photoURL ? renderImageAvatar() : renderInitialsAvatar();

    if (showName) {
        return (
            <div className="flex items-center gap-2">
                {avatarElement}
                <span className={`font-medium text-slate-700 dark:text-slate-300 ${textSizes[size]}`}>
                    {user.name}
                </span>
            </div>
        );
    }

    return avatarElement;
};

export default UserAvatar;
