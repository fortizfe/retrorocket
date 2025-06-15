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
        <div className={`min-h-screen ${className}`}>
            {showHeader && <Header />}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
};

export default Layout;