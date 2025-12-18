import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import './mapComponent.css';

function MapComponent() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchPosts();
    getUserLocation();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axiosInstance.get('/posts/runner');
      setPosts(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Set empty array on error to prevent crashes
      setPosts([]);
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to default location (Manila)
          setUserLocation({ lat: 14.5995, lng: 120.9842 });
        }
      );
    } else {
      // Fallback to default location
      setUserLocation({ lat: 14.5995, lng: 120.9842 });
    }
  };

  const handleAcceptTask = async (postId) => {
    try {
      await axiosInstance.patch(`/posts/${postId}/accept`);
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, status: 'accepted' } : post
      ));
      setSelectedPost(null);
    } catch (error) {
      console.error('Error accepting task:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not specified';
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(hours, minutes);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="map-container">
        <div className="loading">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-section">
        <div className="map-placeholder" ref={mapRef}>
          <div className="map-center">
            📍 Interactive Map
            <p>Showing {posts.length} available errands</p>
            <small>Map integration coming soon</small>
          </div>
          
          {/* Simulate map markers */}
          <div className="map-markers">
            {posts.slice(0, 5).map((post, index) => (
              <div 
                key={post.id}
                className="map-marker"
                style={{
                  top: `${20 + (index * 15)}%`,
                  left: `${30 + (index * 10)}%`
                }}
                onClick={() => setSelectedPost(post)}
              >
                📍
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="map-sidebar">
        <h3>Available Errands</h3>
        <div className="errands-list">
          {posts.length === 0 ? (
            <div className="no-errands">
              <p>No available errands in your area</p>
            </div>
          ) : (
            posts.map((post) => (
              <div 
                key={post.id} 
                className={`errand-item ${selectedPost?.id === post.id ? 'selected' : ''}`}
                onClick={() => setSelectedPost(post)}
              >
                <div className="errand-header">
                  <h4>{post.content.substring(0, 50)}...</h4>
                  <span className="errand-status">{post.status}</span>
                </div>
                <p className="errand-destination">📍 {post.destination}</p>
                <div className="errand-time">
                  🕒 {formatDate(post.deadline_date)} at {formatTime(post.deadline_time)}
                </div>
                <div className="errand-user">
                  👤 {post.user?.firstname || 'Unknown'} {post.user?.lastname || ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPost && (
        <div className="errand-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Errand Details</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedPost(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-info">
                <div className="user-avatar">
                  {selectedPost.user?.firstname?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4>{selectedPost.user?.firstname} {selectedPost.user?.lastname}</h4>
                  <p>Posted {new Date(selectedPost.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="errand-details">
                <h4>Description</h4>
                <p>{selectedPost.content}</p>

                <h4>Destination</h4>
                <p>📍 {selectedPost.destination}</p>

                <h4>Deadline</h4>
                <p>🕒 {formatDate(selectedPost.deadline_date)} at {formatTime(selectedPost.deadline_time)}</p>

                {selectedPost.image_url && (
                  <>
                    <h4>Attached Image</h4>
                    <img 
                      src={selectedPost.image_url} 
                      alt="Errand attachment" 
                      className="errand-image"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {selectedPost.status === 'pending' ? (
                <button 
                  className="accept-btn"
                  onClick={() => handleAcceptTask(selectedPost.id)}
                >
                  Accept This Errand
                </button>
              ) : (
                <button className="status-btn" disabled>
                  {selectedPost.status === 'accepted' ? 'Already Accepted' : 'Completed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapComponent; 