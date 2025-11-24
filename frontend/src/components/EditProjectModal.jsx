/**
 * EditProjectModal Component
 * Modal form for editing existing projects
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Input, Textarea, Select, FormField } from './ui/Input';
import { validateField, getErrorMessage } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''
    : 'http://localhost:5000'
);

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'Ruby',
  'PHP', 'C#', 'C++', 'Swift', 'Kotlin', 'Dart', 'Elixir', 'Other'
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'planning', label: 'Planning' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function EditProjectModal({ open, onClose, project, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    github_url: '',
    demo_url: '',
    language: '',
    status: 'active',
    tags: '',
    stars: 0,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Populate form when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        github_url: project.github_url || '',
        demo_url: project.demo_url || '',
        language: project.language || '',
        status: project.status || 'active',
        tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
        stars: project.stars || 0,
      });
      setErrors({});
      setApiError(null);
      setSuccessMessage(null);
    }
  }, [project]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    setApiError(null);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    const nameError = validateField(formData.name, { required: true, minLength: 2, maxLength: 100 });
    if (nameError) newErrors.name = nameError;

    // Description validation
    const descError = validateField(formData.description, { maxLength: 500 });
    if (descError) newErrors.description = descError;

    // GitHub URL validation
    if (formData.github_url) {
      const urlError = validateField(formData.github_url, { url: true });
      if (urlError) newErrors.github_url = urlError;
    }

    // Demo URL validation
    if (formData.demo_url) {
      const urlError = validateField(formData.demo_url, { url: true });
      if (urlError) newErrors.demo_url = urlError;
    }

    // Stars validation
    if (formData.stars < 0) {
      newErrors.stars = 'Stars must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Parse tags from comma-separated string
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const payload = {
        ...formData,
        tags,
        stars: parseInt(formData.stars) || 0,
      };

      const response = await axios.put(`${API_URL}/api/projects/${project.id}`, payload);

      if (response.data.success) {
        setSuccessMessage('Project updated successfully!');
        setTimeout(() => {
          onSuccess(response.data.data);
          handleClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setApiError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (loading) return;
    setErrors({});
    setApiError(null);
    setSuccessMessage(null);
    onClose();
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the details of your project
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Success Message */}
            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {apiError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {apiError}
              </div>
            )}

            {/* Name */}
            <FormField label="Project Name" required error={errors.name}>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Awesome Project"
                error={errors.name}
              />
            </FormField>

            {/* Description */}
            <FormField label="Description" error={errors.description}>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="A brief description of your project..."
                rows={3}
                error={errors.description}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </FormField>

            {/* Language and Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Language" error={errors.language}>
                <Select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  error={errors.language}
                >
                  <option value="">Select language</option>
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Status" required error={errors.status}>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  error={errors.status}
                >
                  {STATUSES.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {/* GitHub URL */}
            <FormField label="GitHub URL" error={errors.github_url}>
              <Input
                type="url"
                value={formData.github_url}
                onChange={(e) => handleChange('github_url', e.target.value)}
                placeholder="https://github.com/username/repo"
                error={errors.github_url}
              />
            </FormField>

            {/* Demo URL */}
            <FormField label="Demo URL" error={errors.demo_url}>
              <Input
                type="url"
                value={formData.demo_url}
                onChange={(e) => handleChange('demo_url', e.target.value)}
                placeholder="https://myproject.com"
                error={errors.demo_url}
              />
            </FormField>

            {/* Tags */}
            <FormField label="Tags" error={errors.tags}>
              <Input
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="react, nodejs, api (comma-separated)"
                error={errors.tags}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate tags with commas
              </p>
            </FormField>

            {/* Stars */}
            <FormField label="Stars" error={errors.stars}>
              <Input
                type="number"
                min="0"
                value={formData.stars}
                onChange={(e) => handleChange('stars', e.target.value)}
                placeholder="0"
                error={errors.stars}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Update Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
