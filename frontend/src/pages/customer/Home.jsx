import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import Postbox from '../../components/customer/postbox';
import PostCard from '../../components/customer/postcard';
import { useOutletContext } from 'react-router-dom';


function Home() {
  const [showModal, setShowModal] = useState(false);
  const { posts, setPosts } = useOutletContext();
  const [userPoints, setUserPoints] = useState(0);
  const [otherPosts, setOtherPosts] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);

  const fetchUserPoints = async () => {
    try {
      // Don't fetch points for customer home page
      // Points are only relevant in runner mode
      setUserPoints(0);
    } catch (error) {
      console.error('Error fetching user points:', error);
      setUserPoints(0);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await axiosInstance.get('/stats/user');
      setCompletedCount(response.data.completed_errands || 0);
      // Customer home doesn't show points - they're only relevant in runner mode
      setUserPoints(0);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setCompletedCount(0);
      setUserPoints(0);
    }
  };

  // Fetch posts on first render
  useEffect(() => {
    fetchPostsFromBackend();
    fetchOtherPosts();
    fetchUserStats(); // Fetch stats including completed count

    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchPostsFromBackend();
      fetchUserPoints();
    }, 30000);

    // Make stats refresh function globally available
    window.refreshUserStats = fetchUserStats;

    // Cleanup interval on component unmount
    return () => {
      clearInterval(interval);
      delete window.refreshUserStats;
    };
  }, []);

  const fetchPostsFromBackend = async () => {
    try {
      const response = await axiosInstance.get('/posts/user');
      const postsData = response.data || [];
      
      // Filter out archived posts (additional safety measure)
      const activePosts = postsData.filter(post => !post.archived);
      setPosts(activePosts);
    } catch (error) {
      console.error('Error fetching posts from backend:', error);
      setPosts([]);
    }
  };

  const fetchOtherPosts = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await axiosInstance.get('/posts');
      // Filter out current user's posts and only show pending posts
      const otherUserPosts = res.data.filter(post => 
        post.user_id !== currentUser.id && post.status === 'pending'
      );
      setOtherPosts(otherUserPosts);
    } catch (err) {
      console.error('Error fetching other posts:', err);
    }
  };

  const handlePost = async (newPost) => {
    try {
      const response = await axiosInstance.post('/posts', {
        content: newPost.content,
        deadline_date: newPost.deadlineDate,
        deadline_time: newPost.deadlineTime,
        destination: newPost.destination,
        image_url: newPost.imageUrl || null,
      });

      // Extract the post from the response (backend returns { message, post })
      const createdPost = response.data.post || response.data;
      
      // Ensure the post has the default status if not present
      if (!createdPost.status) {
        createdPost.status = 'pending';
      }
      
      // Ensure the post has user information (fallback to current user from localStorage)
      if (!createdPost.user) {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        createdPost.user = currentUser;
      }
      
      // Add the new post to the beginning of the posts array for immediate display
      setPosts([createdPost, ...posts]);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelPost = async (index) => {
    // Optionally send a delete request to backend here
    setPosts(posts.filter((_, idx) => idx !== index));
  };

  const handleConfirmComplete = async (indexToConfirm) => {
    const post = posts[indexToConfirm];
    if (!post) return;

    try {
      const response = await axiosInstance.patch(`/posts/${post.id}/confirm-complete`);
      
      // Remove the archived post from the list since it's now archived
      const updatedPosts = posts.filter((_, idx) => idx !== indexToConfirm);
      setPosts(updatedPosts);
      
      // Refresh user stats from backend to get accurate completed count
      await fetchUserStats();
      
      // Show success message
      alert(`Errand completion confirmed! The errand has been completed and archived. Runner ${response.data.post_data?.runner_name || 'Unknown'} has been awarded 1 point.`);
      
    } catch (error) {
      console.error('Error confirming completion:', error);
      alert('Failed to confirm completion: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAcceptErrand = async (postId) => {
    try {
      await axiosInstance.patch(`/posts/${postId}/accept`);
      // Refresh both user posts and other posts
      fetchPostsFromBackend();
      fetchOtherPosts();
      alert('Errand accepted successfully! You can now view it in your accepted errands.');
    } catch (error) {
      console.error('Error accepting errand:', error);
      alert('Failed to accept errand: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Your Errands</h1>
        <p className="page-subtitle">Manage your tasks and connect with trusted runners in your campus community</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-overview grid gap-lg mb-2xl" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card animate-scale-in">
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">📋</div>
            <h3 className="text-lg font-semibold">Total Errands</h3>
            <p className="text-2xl font-bold text-gold">{posts.length}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">⏳</div>
            <h3 className="text-lg font-semibold">Pending</h3>
            <p className="text-2xl font-bold text-warning">{posts.filter(p => p.status === 'accepted' || p.status === 'runner_completed').length}</p>
          </div>
        </div>
        <div className="card animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-body text-center">
            <div className="text-3xl mb-sm">✅</div>
            <h3 className="text-lg font-semibold">Completed</h3>
            <p className="text-2xl font-bold text-success">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Create Errand Section */}
      <div className="card create-errand-card mb-2xl">
        <div className="card-body">
          <div className="flex items-center gap-md">
            <div className="text-2xl">✨</div>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Need a quick errand? Click here to get started..."
              onFocus={() => setShowModal(true)}
              readOnly
            />
            <button 
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              Create Errand
            </button>
          </div>
        </div>
      </div>

      <Postbox
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handlePost}
      />

      {/* Errands Grid */}
      <div className="errands-section">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-2xl font-bold">Your Errands</h2>
          {posts.length > 0 && (
            <div className="flex gap-sm">
              <span className="status-badge status-pending">{posts.filter(p => p.status === 'accepted' || p.status === 'runner_completed').length} Pending</span>
              <span className="status-badge status-completed">{Math.max(completedCount, posts.filter(p => p.status === 'completed' && p.archived).length)} Completed</span>
            </div>
          )}
        </div>

        <div className="errands-grid scrollable-content">
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <h3 className="empty-state-title">No errands yet</h3>
              <p className="empty-state-description">
                Create your first errand by clicking the button above. Connect with trusted runners in your campus community and get things done efficiently.
              </p>
            </div>
          ) : (
            <div className="grid grid-auto gap-lg">
              {posts.map((post, index) => (
                <div key={post.id ? `post-${post.id}` : `temp-post-${index}-${Date.now()}`} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <PostCard
                    post={post}
                    index={index}
                    onCancel={handleCancelPost}
                    onConfirmComplete={handleConfirmComplete}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Other Errands Section */}
      <div className="errands-section">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-2xl font-bold">Other Errands</h2>
          {otherPosts.length > 0 && (
            <div className="flex gap-sm">
              <span className="status-badge status-pending">{otherPosts.length} Available</span>
            </div>
          )}
        </div>

        <div className="errands-grid scrollable-content">
          {otherPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌟</div>
              <h3 className="empty-state-title">No other errands available</h3>
              <p className="empty-state-description">
                Check back later to see errands from other users in your campus community.
              </p>
            </div>
          ) : (
            <div className="grid grid-auto gap-lg">
              {otherPosts.map((post, index) => (
                <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <PostCard
                    post={post}
                    index={index}
                    isOtherUser={true}
                    onAccept={handleAcceptErrand}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
