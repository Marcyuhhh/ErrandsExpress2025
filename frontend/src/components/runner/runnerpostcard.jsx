import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import ContactModal from './ContactModal';
import ReportModal from './ReportModal';
import './runnerpostcard.css';

function RunnerPost({ onStatsUpdate }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactModal, setContactModal] = useState({ 
    show: false, 
    postId: null, 
    customerName: '',
    customerId: null
  });
  const [reportModal, setReportModal] = useState({ 
    show: false, 
    postId: null, 
    customerName: '',
    reportedUserId: null
  });

  useEffect(() => {
    fetchPosts();

    // Set up polling to refresh runner posts every 30 seconds
    const interval = setInterval(() => {
      fetchPosts();
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update stats when posts change
    if (onStatsUpdate) {
      const stats = {
        available: posts.filter(post => post.status === 'pending').length,
        accepted: posts.filter(post => post.status === 'accepted').length,
        completed: posts.filter(post => post.status === 'runner_completed' || post.status === 'completed').length
      };
      onStatsUpdate(stats);
    }
  }, [posts]); // Removed onStatsUpdate from deps to prevent infinite loop

  const fetchPosts = async () => {
    try {
      // Fetch both available posts (for browsing) and accepted posts (for stats)
      const [availableResponse, acceptedResponse] = await Promise.all([
        axiosInstance.get('/posts/runner'), // Available posts
        axiosInstance.get('/posts/runner/accepted') // Runner's accepted posts
      ]);
      
      console.log('Available posts:', availableResponse.data);
      console.log('Accepted posts:', acceptedResponse.data);
      
      // Filter out archived posts (additional safety measure)
      const activeAvailablePosts = (availableResponse.data || []).filter(post => !post.archived);
      const activeAcceptedPosts = (acceptedResponse.data || []).filter(post => !post.archived);
      
      // Combine both sets for complete stats calculation
      const allRunnerPosts = [...activeAvailablePosts, ...activeAcceptedPosts];
      setPosts(allRunnerPosts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Set empty array on error to prevent crashes
      setPosts([]);
      setError('Failed to load errands');
      setLoading(false);
    }
  };

  const handleAcceptTask = async (postId) => {
    try {
      await axiosInstance.patch(`/posts/${postId}/accept`);
      // Refresh the posts data to get updated stats
      fetchPosts();
    } catch (error) {
      console.error('Error accepting task:', error);
      setError('Failed to accept task');
    }
  };

  const handleCompleteTask = async (postId) => {
    try {
      await axiosInstance.patch(`/posts/${postId}/complete`);
      // Refresh the posts data to get updated stats
      fetchPosts();
    } catch (error) {
      console.error('Error completing task:', error);
      setError('Failed to complete task');
    }
  };



  const handleContactCustomer = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const getCustomerName = () => {
        if (post.user?.name) return post.user.name;
        if (post.user?.firstname && post.user?.lastname) return `${post.user.firstname} ${post.user.lastname}`;
        if (post.user?.firstname) return post.user.firstname;
        if (post.user?.lastname) return post.user.lastname;
        return 'Customer';
      };

      setContactModal({ 
        show: true, 
        postId, 
        customerName: getCustomerName(),
        customerId: post.user?.id
      });
    }
  };

  const closeContactModal = () => {
    setContactModal({ show: false, postId: null, customerName: '', customerId: null });
  };

  const handleReportPost = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const getCustomerName = () => {
        if (post.user?.name) return post.user.name;
        if (post.user?.firstname && post.user?.lastname) return `${post.user.firstname} ${post.user.lastname}`;
        if (post.user?.firstname) return post.user.firstname;
        if (post.user?.lastname) return post.user.lastname;
        return 'Customer';
      };

      setReportModal({ 
        show: true, 
        postId, 
        customerName: getCustomerName(),
        reportedUserId: post.user?.id
      });
    }
  };

  const closeReportModal = () => {
    setReportModal({ show: false, postId: null, customerName: '', reportedUserId: null });
  };



  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading errands...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h3 className="empty-state-title">Error Loading Errands</h3>
        <p className="empty-state-description">{error}</p>
      </div>
    );
  }

  // Show only available posts (pending status) for the main display
  // All posts are used for stats calculation in useEffect above
  const availablePosts = posts.filter(post => post.status === 'pending');

  const renderPost = (post) => {
    const dueTimeParts = post.deadline_time?.split(":") || [];
    const dueDateTime = new Date(post.deadline_date);
    if (dueTimeParts.length >= 2) {
      dueDateTime.setHours(dueTimeParts[0], dueTimeParts[1]);
    }

    const formattedDueTime = dueDateTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const formattedDueDate = new Date(post.deadline_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const getCreatorName = () => {
      if (!post.user) return 'User';
      if (post.user.name) return post.user.name;
      if (post.user.firstname && post.user.lastname) return `${post.user.firstname} ${post.user.lastname}`;
      if (post.user.firstname) return post.user.firstname;
      if (post.user.lastname) return post.user.lastname;
      return 'User';
    };
    const creatorName = getCreatorName();
    const firstLetter = creatorName.charAt(0).toUpperCase();
    const profilePicture = post.user?.profile_picture;

    return (
      <div key={post.id} className="card animate-fade-in" style={{ animationDelay: `${posts.indexOf(post) * 0.1}s` }}>
        <div className="card-body">
          <div className="flex items-start gap-md" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div className="profile-avatar" style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: profilePicture ? 'transparent' : 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-lg)',
              fontWeight: 'bold',
              color: 'white',
              overflow: 'hidden'
            }}>
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                firstLetter
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-xs)' }}>{creatorName}</h4>
              <p className="text-sm text-secondary">{new Date(post.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-sm">
              <button 
                className="report-btn"
                onClick={() => handleReportPost(post.id)}
                title="Report this post"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ⚠️
              </button>
            <span className="status-badge status-pending">Available</span>
            </div>
          </div>

          {post.image_url && (
            <img 
              src={post.image_url} 
              alt="Errand" 
              style={{
                width: '100%',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                maxHeight: '200px',
                objectFit: 'cover'
              }}
            />
          )}

          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <h4 className="font-semibold text-primary" style={{ marginBottom: 'var(--spacing-sm)' }}>Description</h4>
            <p className="text-secondary" style={{ lineHeight: 1.5 }}>{post.content}</p>
          </div>

          <div className="grid gap-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="flex items-center gap-sm">
              <span>📍</span>
              <span className="text-sm font-medium">Destination:</span>
              <span className="text-sm text-secondary">{post.destination}</span>
            </div>
            <div className="flex items-center gap-sm">
              <span>🕒</span>
              <span className="text-sm font-medium">Due Time:</span>
              <span className="text-sm text-secondary">{formattedDueTime}</span>
            </div>
            <div className="flex items-center gap-sm">
              <span>📅</span>
              <span className="text-sm font-medium">Due Date:</span>
              <span className="text-sm text-secondary">{formattedDueDate}</span>
            </div>
            <div className="flex items-center gap-sm">
              <span>💰</span>
              <span className="text-sm font-medium">Negotiable Payment:</span>
              <span className="text-sm text-secondary" style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                Contact for details
              </span>
            </div>
          </div>

          <div className="flex gap-sm">
            <button 
              className="btn btn-secondary"
              style={{ flex: '1' }}
              onClick={() => handleContactCustomer(post.id)}
            >
              💬 Contact Customer
            </button>
          <button 
            className="btn btn-primary"
              style={{ flex: '1' }}
            onClick={() => handleAcceptTask(post.id)}
          >
            ✅ Accept Errand
          </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="errands-grid scrollable-content">
      {availablePosts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">No available errands</h3>
          <p className="empty-state-description">
            Check back later for new errands in your area.
          </p>
        </div>
      ) : (
        <div className="grid grid-auto gap-lg">
          {availablePosts.map(renderPost)}
        </div>
      )}
    </div>

      {/* Contact Modal */}
      <ContactModal 
        show={contactModal.show}
        postId={contactModal.postId}
        customerName={contactModal.customerName}
        customerId={contactModal.customerId}
        onClose={closeContactModal}
      />

      {/* Report Modal */}
      <ReportModal 
        show={reportModal.show}
        postId={reportModal.postId}
        customerName={reportModal.customerName}
        reportedUserId={reportModal.reportedUserId}
        onClose={closeReportModal}
      />
    </>
  );
}

export default RunnerPost;
