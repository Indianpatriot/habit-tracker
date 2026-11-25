import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../api';

/**
 * ProfilePage Component (/profile)
 * Allows users to view and update their name, age, email, and avatar picture.
 * Canvas resizes images to max 256x256 and exports as JPEG quality 0.8 before upload.
 */
const ProfilePage = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [picture, setPicture] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getProfile()
      .then((data) => {
        if (!isMounted) return;
        setName(data.name || '');
        setEmail(data.email || '');
        setAge(data.age !== null && data.age !== undefined ? String(data.age) : '');
        setPicture(data.picture || '');
        setCreatedAt(data.createdAt || '');
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load profile.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Selected file must be an image (PNG, JPEG, WebP).');
      return;
    }
    setFileError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Scale to at most 256x256 maintaining aspect ratio
        const maxDim = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG at quality 0.8
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPicture(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = () => {
    setPicture('');
    setFileError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFileError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 50) {
      setError('Name must be between 2 and 50 characters.');
      return;
    }

    let parsedAge = null;
    if (age !== '') {
      parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        setError('Age must be an integer between 10 and 100.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        age: parsedAge,
        picture: picture || ''
      };

      const updated = await updateProfile(payload);
      setName(updated.name);
      setEmail(updated.email);
      setAge(updated.age !== null && updated.age !== undefined ? String(updated.age) : '');
      setPicture(updated.picture || '');
      setMessage('Profile updated successfully!');
      // Dispatch event to inform Navbar to refresh avatar immediately
      window.dispatchEvent(new Event('user-profile-updated'));
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const initial = name ? name.trim().charAt(0).toUpperCase() : 'U';

  if (loading) {
    return <div className="card text-center text-muted">Loading profile details...</div>;
  }

  return (
    <div className="main-container" style={{ maxWidth: '640px', padding: '1rem 0 3rem 0' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">
            Manage your account settings, avatar, and personal details.
          </p>
        </div>
      </div>

      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        {/* Avatar Preview Section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          {picture ? (
            <img
              src={picture}
              alt={name || 'Profile'}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--primary)',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          ) : (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {initial}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <label
              htmlFor="picture-input"
              className="btn btn-sm btn-outline"
              style={{ cursor: 'pointer', display: 'inline-block', marginRight: '0.5rem' }}
            >
              Upload Picture
            </label>
            <input
              id="picture-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {picture && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleRemovePicture}
              >
                Remove Picture
              </button>
            )}

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              JPEG, PNG, or WebP. Auto-scaled to 256×256.
            </p>
            {fileError && (
              <span className="error-message" style={{ marginTop: '0.25rem' }}>
                {fileError}
              </span>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">
              Full Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              required
              minLength={2}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-email">
              Email Address <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="profile-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-age">
              Age (Optional, 10–100)
            </label>
            <input
              id="profile-age"
              type="number"
              className="form-input"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 21"
              min={10}
              max={100}
            />
          </div>

          {createdAt && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Member since: {new Date(createdAt).toLocaleDateString()}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;

