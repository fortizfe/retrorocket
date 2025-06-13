import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingIndicator } from '../../types/typing';

interface TypingPreviewProps {
    typingUsers: TypingIndicator[];
    className?: string;
}

/**
 * Component to show who is currently typing in a column
 */
const TypingPreview: React.FC<TypingPreviewProps> = ({
    typingUsers,
    className = ''
}) => {
    if (typingUsers.length === 0) {
        return null;
    }

    const formatTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].username} está escribiendo`;
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].username} y ${typingUsers[1].username} están escribiendo`;
        } else {
            return `${typingUsers[0].username} y ${typingUsers.length - 1} más están escribiendo`;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 0.8
                }}
                className={`
          bg-gradient-to-r from-blue-50 to-indigo-50 
          border border-blue-200/50 
          rounded-xl p-3 
          shadow-sm shadow-blue-100/50
          backdrop-blur-sm
          ${className}
        `}
            >
                <div className="flex items-center space-x-2">
                    {/* Animated avatars */}
                    <div className="flex -space-x-1">
                        {typingUsers.slice(0, 3).map((user, index) => (
                            <motion.div
                                key={user.userId}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="
                  relative inline-flex items-center justify-center 
                  w-6 h-6 
                  bg-gradient-to-br from-blue-400 to-indigo-500
                  text-white text-xs font-medium 
                  rounded-full 
                  ring-2 ring-white
                  shadow-sm
                "
                                title={user.username}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </motion.div>
                        ))}
                        {typingUsers.length > 3 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="
                  relative inline-flex items-center justify-center 
                  w-6 h-6 
                  bg-gradient-to-br from-gray-400 to-gray-500
                  text-white text-xs font-medium 
                  rounded-full 
                  ring-2 ring-white
                  shadow-sm
                "
                                title={`+${typingUsers.length - 3} más`}
                            >
                                +{typingUsers.length - 3}
                            </motion.div>
                        )}
                    </div>

                    {/* Typing text with animated dots */}
                    <div className="flex items-center">
                        <span className="text-sm text-blue-700 font-medium">
                            {formatTypingText()}
                        </span>
                        <TypingDots />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * Animated typing dots component
 */
const TypingDots: React.FC = () => {
    return (
        <div className="flex items-center space-x-1 ml-1">
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: index * 0.2,
                        ease: "easeInOut",
                    }}
                    className="w-1 h-1 bg-blue-500 rounded-full"
                />
            ))}
        </div>
    );
};

export default TypingPreview;
