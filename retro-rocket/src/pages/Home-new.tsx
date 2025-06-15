import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Legacy Home component - redirects to dashboard
const Home: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to dashboard for authenticated users
        navigate('/mis-tableros', { replace: true });
    }, [navigate]);

    return null;
};

export default Home;
