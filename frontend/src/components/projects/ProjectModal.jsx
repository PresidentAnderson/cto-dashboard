/**
 * ProjectModal Component
 * Create/edit project modal with form validation
 *
 * Features:
 * - Comprehensive form fields
 * - Validation
 * - Accessible (ARIA, focus management)
 * - Loading states
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateField } from '../../lib/utils';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  project,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    github_url: '',
    demo_url: '',
    language: '',
    tags: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        github_url: project.github_url || '',
        demo_url: project.demo_url || '',
        language: project.language || '',
        tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'active',
        github_url: '',
        demo_url: '',
        language: '',
        tags: '',
      });
    }
    setErrors({});
  }, [project, isOpen]);

  const validate = () => {
    const newErrors = {};

    const nameError = validateField(formData.name, { required: true, minLength: 3 });
    if (nameError) newErrors.name = nameError;

    const descError = validateField(formData.description, { required: true, minLength: 10 });
    if (descError) newErrors.description = descError;

    if (formData.github_url) {
      const urlError = validateField(formData.github_url, { url: true });
      if (urlError) newErrors.github_url = urlError;
    }

    if (formData.demo_url) {
      const urlError = validateField(formData.demo_url, { url: true });
      if (urlError) newErrors.demo_url = urlError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Convert tags string to array
    const submitData = {
      ...formData,
      tags: formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [],
    };

    await onSubmit(submitData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="My Awesome Project"
              error={errors.name}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe your project..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Language
              </label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                placeholder="JavaScript, Python, etc."
              />
            </div>
          </div>

          <div>
            <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 mb-1">
              GitHub URL
            </label>
            <Input
              id="github_url"
              type="url"
              value={formData.github_url}
              onChange={(e) => handleChange('github_url', e.target.value)}
              placeholder="https://github.com/username/repo"
              error={errors.github_url}
            />
            {errors.github_url && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.github_url}</p>
            )}
          </div>

          <div>
            <label htmlFor="demo_url" className="block text-sm font-medium text-gray-700 mb-1">
              Demo URL
            </label>
            <Input
              id="demo_url"
              type="url"
              value={formData.demo_url}
              onChange={(e) => handleChange('demo_url', e.target.value)}
              placeholder="https://demo.example.com"
              error={errors.demo_url}
            />
            {errors.demo_url && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.demo_url}</p>
            )}
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="react, typescript, api (comma-separated)"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate tags with commas
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
