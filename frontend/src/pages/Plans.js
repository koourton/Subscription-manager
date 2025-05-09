import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState({ loading: false, planId: null, error: '' });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansResponse = await api.get('/plans');
        setPlans(plansResponse.data);
        
        if (isAuthenticated) {
          try {
            const subscriptionsResponse = await api.get('/subscriptions');
            setUserSubscriptions(subscriptionsResponse.data);
          } catch (err) {
            console.error("Error fetching user subscriptions:", err);
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load plans. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const existingSubscription = userSubscriptions.find(
      sub => sub.plan_id === planId && sub.is_active
    );
    
    if (existingSubscription) {
      setSubscribeStatus({ 
        loading: false, 
        planId, 
        error: 'You already have an active subscription to this plan.' 
      });
      return;
    }

    setSubscribeStatus({ loading: true, planId, error: '' });

    try {
      console.log(`Subscribing to plan ${planId}...`);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("You need to log in first");
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.post('/subscriptions', { plan_id: planId });
      
      console.log('Subscription created:', response.data);
      setSubscribeStatus({ loading: false, planId: null, error: '' });
      
      const planName = plans.find(plan => plan.id === planId)?.name || 'selected plan';
      alert(`Successfully subscribed to ${planName}!`);
      
      navigate('/subscriptions');
    } catch (err) {
      console.error('Error creating subscription:', err);
      let errorMsg = 'Failed to create subscription';
      
      if (err.response && err.response.data && err.response.data.message) {
        errorMsg = err.response.data.message;
      }
      
      setSubscribeStatus({ loading: false, planId, error: errorMsg });
    }
  };

  // Check if a user has an active subscription to a plan
  const hasActiveSubscription = (planId) => {
    return userSubscriptions.some(sub => sub.plan_id === planId && sub.is_active);
  };

  if (loading) return <div className="loading">Loading plans...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="plans-container">
      <h2>Subscription Plans</h2>
      {subscribeStatus.error && (
        <div className="error-message">{subscribeStatus.error}</div>
      )}
      <div className="plans-grid">
        {plans.map((plan) => {
          const isSubscribed = hasActiveSubscription(plan.id);
          
          return (
            <div className="plan-card" key={plan.id}>
              <h3>{plan.name}</h3>
              <div className="plan-price">${plan.price.toFixed(2)}</div>
              <div className="plan-duration">per {plan.duration_days} days</div>
              <p className="plan-description">{plan.description}</p>
              
              <div className="plan-features">
                <strong>Features:</strong>
                <ul>
                  {plan.features.split(',').map((feature, index) => (
                    <li key={index} className="feature-item">{feature.trim()}</li>
                  ))}
                </ul>
              </div>
              
              {isSubscribed ? (
                <button 
                  className="subscribe-btn" 
                  disabled={true}
                  style={{ backgroundColor: 'var(--success)', opacity: 0.8 }}
                >
                  Already Subscribed
                </button>
              ) : (
                <button 
                  className="subscribe-btn" 
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribeStatus.loading && subscribeStatus.planId === plan.id}
                >
                  {subscribeStatus.loading && subscribeStatus.planId === plan.id 
                    ? 'Processing...' 
                    : 'Subscribe Now'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;
