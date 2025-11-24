import React, { useState, useEffect } from 'react';

/**
 * GitHub Sync Button Component
 *
 * Allows users to trigger GitHub repository sync and monitor progress
 *
 * Usage:
 *   <GitHubSyncButton username="PresidentAnderson" apiUrl="http://localhost:5000" />
 */
const GitHubSyncButton = ({
  username = 'PresidentAnderson',
  apiUrl = 'http://localhost:5000',
  onSyncComplete = null
}) => {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  // Poll for sync status
  useEffect(() => {
    let interval = null;

    if (syncing) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `${apiUrl}/api/sync-github/status?username=${username}`
          );
          const data = await response.json();

          if (data.success && data.activeSync) {
            setProgress(data.activeSync.stats);

            // Check if completed
            if (data.activeSync.completedAt) {
              setSyncing(false);
              setStatus(data.activeSync.result);

              if (onSyncComplete) {
                onSyncComplete(data.activeSync.result);
              }
            }
          } else if (data.success && !data.activeSync) {
            // Sync completed but no active sync found
            setSyncing(false);
          }
        } catch (err) {
          console.error('Error polling sync status:', err);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncing, username, apiUrl, onSyncComplete]);

  const handleSync = async () => {
    setError(null);
    setStatus(null);
    setProgress(null);
    setSyncing(true);

    try {
      const response = await fetch(`${apiUrl}/api/sync-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to start sync');
        setSyncing(false);
      }
    } catch (err) {
      setError(err.message || 'Network error');
      setSyncing(false);
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(`${apiUrl}/api/sync-github/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      setSyncing(false);
      setProgress(null);
    } catch (err) {
      console.error('Error cancelling sync:', err);
    }
  };

  const getProgressPercentage = () => {
    if (!progress || !progress.total) return 0;
    const processed = (progress.imported || 0) + (progress.updated || 0) + (progress.failed || 0);
    return Math.round((processed / progress.total) * 100);
  };

  return (
    <div className="github-sync-component" style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>GitHub Repository Sync</h3>
        <span style={styles.username}>@{username}</span>
      </div>

      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={syncing}
        style={{
          ...styles.button,
          ...(syncing ? styles.buttonDisabled : styles.buttonActive)
        }}
      >
        {syncing ? (
          <>
            <span style={styles.spinner}>⟳</span>
            Syncing...
          </>
        ) : (
          <>
            <span style={styles.icon}>⟳</span>
            Sync GitHub Repos
          </>
        )}
      </button>

      {/* Progress Bar */}
      {syncing && progress && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${getProgressPercentage()}%`
              }}
            />
          </div>
          <div style={styles.progressText}>
            {getProgressPercentage()}% - Processing {progress.total || 0} repositories
          </div>
        </div>
      )}

      {/* Stats */}
      {progress && (
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Total:</span>
            <span style={styles.statValue}>{progress.total || 0}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Imported:</span>
            <span style={{ ...styles.statValue, color: '#10b981' }}>
              {progress.imported || 0}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Updated:</span>
            <span style={{ ...styles.statValue, color: '#3b82f6' }}>
              {progress.updated || 0}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Failed:</span>
            <span style={{ ...styles.statValue, color: '#ef4444' }}>
              {progress.failed || 0}
            </span>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {syncing && (
        <button
          onClick={handleCancel}
          style={styles.cancelButton}
        >
          Cancel Sync
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {/* Success Message */}
      {status && status.success && !syncing && (
        <div style={styles.success}>
          <span style={styles.successIcon}>✓</span>
          Sync completed successfully!
          <div style={styles.successStats}>
            {status.stats.imported} imported, {status.stats.updated} updated
            {status.stats.failed > 0 && `, ${status.stats.failed} failed`}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827'
  },
  username: {
    fontSize: '14px',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  buttonActive: {
    backgroundColor: '#3b82f6',
    color: 'white'
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    color: 'white',
    cursor: 'not-allowed'
  },
  icon: {
    fontSize: '20px'
  },
  spinner: {
    fontSize: '20px',
    animation: 'spin 1s linear infinite',
    display: 'inline-block'
  },
  progressContainer: {
    marginTop: '16px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease'
  },
  progressText: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827'
  },
  cancelButton: {
    marginTop: '12px',
    width: '100%',
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  error: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#991b1b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  errorIcon: {
    fontSize: '18px'
  },
  success: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    color: '#166534'
  },
  successIcon: {
    fontSize: '18px',
    marginRight: '8px'
  },
  successStats: {
    marginTop: '4px',
    fontSize: '14px',
    color: '#15803d'
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}

export default GitHubSyncButton;
