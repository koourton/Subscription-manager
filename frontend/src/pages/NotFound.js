import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found">
      <h2>404</h2>
      <p>Oops! The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="link-btn">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
