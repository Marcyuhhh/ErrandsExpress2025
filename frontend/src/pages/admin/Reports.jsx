import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import '../../styles/shared-styles.css';
import './admin.css';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, reviewed

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axiosInstance.get('/reports');
      setReports(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch reports');
      setLoading(false);
    }
  };

  const reviewReport = async (reportId, decision) => {
    try {
      let payload;
      if (decision === 'approve') {
        // Approve = remove the reported post
        payload = {
          status: 'resolved',
          action: 'remove_post'
        };
      } else if (decision === 'reject') {
        // Reject = dismiss the report, no action taken
        payload = {
          status: 'dismissed',
          action: 'no_action'
        };
      }
      
      await axiosInstance.patch(`/reports/${reportId}/review`, payload);
      setSuccess(`Report ${decision === 'approve' ? 'approved and post removed' : 'rejected'} successfully`);
      fetchReports(); // Refresh the list
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Review error:', err.response?.data);
      setError(`Failed to ${decision} report: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'pending') return report.status === 'pending';
    if (filter === 'reviewed') return report.status !== 'pending';
    return true; // all
  });

  if (loading) return <div className="admin-loading">Loading reports...</div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Reports Management</h1>
        <p>Review and handle user reports</p>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      <div className="admin-filters">
        <button 
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          All Reports ({reports.length})
        </button>
        <button 
          className={filter === 'pending' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('pending')}
        >
          Pending ({reports.filter(r => r.status === 'pending').length})
        </button>
        <button 
          className={filter === 'reviewed' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('reviewed')}
        >
          Reviewed ({reports.filter(r => r.status !== 'pending').length})
        </button>
      </div>

      <div className="admin-content">
        {filteredReports.length === 0 ? (
          <div className="admin-empty">
            <h3>No reports found</h3>
            <p>No reports match the current filter</p>
          </div>
        ) : (
          <div className="reports-list">
            {filteredReports.map(report => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <h3>Report #{report.id}</h3>
                  <span className={`status-badge ${report.status}`}>
                    {report.status === 'pending' ? '⏳ Pending' : 
                     report.status === 'resolved' ? '✅ Resolved' : 
                     report.status === 'dismissed' ? '❌ Dismissed' : 
                     report.status === 'reviewed' ? '👁️ Reviewed' : report.status}
                  </span>
                </div>
                
                <div className="report-details">
                  <div className="report-info">
                    <p><strong>Type:</strong> {report.type}</p>
                    <p><strong>Reporter:</strong> {report.reporter?.name || 'Unknown'}</p>
                    <p><strong>Reported User:</strong> {report.reported_user?.name || 'Unknown'}</p>
                    <p><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="report-description">
                    <p><strong>Description:</strong></p>
                    <p className="description-text">{report.description}</p>
                  </div>
                  
                  {report.post && (
                    <div className="related-post">
                      <p><strong>Related Post:</strong></p>
                      <p className="post-content">"{report.post.content}"</p>
                    </div>
                  )}
                </div>
                
                {report.status === 'pending' && (
                  <div className="report-actions">
                    <button 
                      className="btn-approve"
                      onClick={() => reviewReport(report.id, 'approve')}
                    >
                      ✅ Approve Report
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => reviewReport(report.id, 'reject')}
                    >
                      ❌ Reject Report
                    </button>
                  </div>
                )}
                
                {report.status !== 'pending' && (
                  <div className="report-resolved">
                    <p><strong>Reviewed on:</strong> {new Date(report.updated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
