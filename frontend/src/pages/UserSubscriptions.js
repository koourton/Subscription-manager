import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const UserSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/subscriptions');
      setSubscriptions(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      setError('Failed to load your subscriptions. Please try again later.');
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await api.delete(`/subscriptions/${id}`);
      
      setSubscriptions(subscriptions.map(sub => 
        sub.id === id ? { ...sub, is_active: false } : sub
      ));
      
    } catch (err) {
      console.error("Error canceling subscription:", err);
      setError('Failed to cancel subscription. Please try again later.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await api.delete(`/subscriptions/${id}`);
      
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
      
    } catch (err) {
      console.error("Error deleting subscription:", err);
      setError('Failed to delete subscription. Please try again later.');
    }
  };

  if (loading) return <div className="loading">Loading your subscriptions...</div>;

  return (
    <div className="subscriptions-container">
      <h2>My Subscriptions</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {subscriptions.length === 0 ? (
        <div className="no-subscriptions">
          <p>You don't have any subscriptions yet.</p>
          <button 
            onClick={() => navigate('/plans')} 
            className="submit-btn" 
            style={{ maxWidth: '250px', margin: '20px auto' }}
          >
            Browse Subscription Plans
          </button>
        </div>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map(subscription => (
            <div className="subscription-card" key={subscription.id}>
              <h3>{subscription.plan_name}</h3>
              
              <div className="subscription-dates">
                <div><strong>Start:</strong> {new Date(subscription.start_date).toLocaleDateString()}</div>
                <div><strong>End:</strong> {new Date(subscription.end_date).toLocaleDateString()}</div>
              </div>
              
              <div className="subscription-status">
                <span className={subscription.is_active ? 'status-active' : 'status-inactive'}>
                  {subscription.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="subscription-actions">
                {subscription.is_active ? (
                  <button 
                    onClick={() => handleCancel(subscription.id)} 
                    className="cancel-btn"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <div className="subscription-actions-row">
                    <button 
                      onClick={() => handleDelete(subscription.id)} 
                      className="delete-btn"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => navigate('/plans')} 
                      className="subscribe-btn"
                    >
                      Subscribe Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSubscriptions;
