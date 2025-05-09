import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    plans: 0,
    activeSubscriptions: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        // In a real application, we would have an endpoint to fetch admin stats
        // This is just a placeholder that we'll adjust as needed
        const [usersResponse, plansResponse, subscriptionsResponse] = await Promise.all([
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/plans').catch(() => ({ data: [] })),
          api.get('/subscriptions/all').catch(() => ({ data: [] }))
        ]);
        
        const activeSubscriptions = subscriptionsResponse.data.filter(sub => sub.is_active) || [];
        
        // Calculate total revenue
        const revenue = activeSubscriptions.reduce((total, sub) => {
          const plan = plansResponse.data.find(p => p.id === sub.plan_id);
          return total + (plan ? plan.price : 0);
        }, 0);
        
        setStats({
          users: usersResponse.data.length || 0,
          plans: plansResponse.data.length || 0,
          activeSubscriptions: activeSubscriptions.length || 0,
          revenue: revenue || 0
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        setError('Failed to fetch admin statistics');
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  if (loading) return <div className="loading">Loading dashboard data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-value">{stats.users}</div>
        </div>
        <div className="stat-card">
          <h3>Subscription Plans</h3>
          <div className="stat-value">{stats.plans}</div>
        </div>
        <div className="stat-card">
          <h3>Active Subscriptions</h3>
          <div className="stat-value">{stats.activeSubscriptions}</div>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <div className="stat-value">${stats.revenue.toFixed(2)}</div>
        </div>
      </div>
      
      <div className="admin-actions">
        <h3>Management</h3>
        <div className="action-links">
          <Link to="/admin/users" className="action-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Manage Users
          </Link>
          <Link to="/admin/plans" className="action-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
              <line x1="16" y1="8" x2="2" y2="22"></line>
              <line x1="17.5" y1="15" x2="9" y2="15"></line>
            </svg>
            Manage Subscription Plans
          </Link>
          <Link to="/all-subscriptions" className="action-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            View All Subscriptions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
