import React from 'react';
import Header from './Header';

interface LayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    className?: string;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    showHeader = true,
    className = ''
}) => {
    return (
        <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 transition-colors duration-300 ${className}`}>
            {showHeader && <Header />}
            <main className="flex-1 relative">
                {children}
            </main>
        </div>
    );
};

export default Layout;