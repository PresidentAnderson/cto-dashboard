/**
 * BugModal Component
 * Create/edit bug modal with form validation
 *
 * Features:
 * - Form validation
 * - Accessible (ARIA, focus management)
 * - Loading states
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import SeverityBadge from '../core/SeverityBadge';
import { validateField } from '../../lib/utils';

const severityOptions = ['low', 'medium', 'high', 'critical'];
const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function BugModal({
  isOpen,
  onClose,
  onSubmit,
  bug,
  projects = [],
  loading = false,
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    projectId: '',
    stepsToReproduce: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (bug) {
      setFormData({
        title: bug.title || '',
        description: bug.description || '',
        severity: bug.severity || 'medium',
        status: bug.status || 'open',
        projectId: bug.projectId || '',
        stepsToReproduce: bug.stepsToReproduce || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        projectId: '',
        stepsToReproduce: '',
      });
    }
    setErrors({});
  }, [bug, isOpen]);

  const validate = () => {
    const newErrors = {};

    const titleError = validateField(formData.title, { required: true, minLength: 3 });
    if (titleError) newErrors.title = titleError;

    const descError = validateField(formData.description, { required: true, minLength: 10 });
    if (descError) newErrors.description = descError;

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {bug ? 'Edit Bug' : 'Create New Bug'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of the bug"
              error={errors.title}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.title}</p>
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
              placeholder="Detailed description of the bug"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-gray-700 mb-1">
              Steps to Reproduce
            </label>
            <textarea
              id="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={(e) => handleChange('stepsToReproduce', e.target.value)}
              placeholder="1. Go to...\n2. Click on...\n3. Observe..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                Severity *
              </label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => handleChange('severity', sev)}
                    className={formData.severity === sev ? 'ring-2 ring-blue-500 rounded-full' : ''}
                  >
                    <SeverityBadge severity={sev} />
                  </button>
                ))}
              </div>
            </div>

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
          </div>

          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              id="projectId"
              value={formData.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-red-600" role="alert">{errors.projectId}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {bug ? 'Update Bug' : 'Create Bug'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
