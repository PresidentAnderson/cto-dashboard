/**
 * Utility functions for CTO Dashboard
 * Inspired by ShadCN UI design patterns
 */

import { clsx } from 'clsx';

/**
 * Merge class names with clsx
 */
export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Format currency
 */
export function formatCurrency(value, decimals = 0) {
  if (!value && value !== 0) return '$0';
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format large numbers with k/M/B suffix
 */
export function formatNumber(value, decimals = 1) {
  if (!value && value !== 0) return '0';
  const absValue = Math.abs(value);

  if (absValue >= 1000000000) {
    return `${(value / 1000000000).toFixed(decimals)}B`;
  }
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k`;
  }
  return value.toString();
}

/**
 * Format date
 */
export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get status color
 */
export function getStatusColor(status) {
  const colors = {
    active: 'bg-green-100 text-green-800 border-green-300',
    shipped: 'bg-teal-100 text-teal-800 border-teal-300',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
    planning: 'bg-purple-100 text-purple-800 border-purple-300',
    deferred: 'bg-gray-100 text-gray-800 border-gray-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Validate form field
 */
export function validateField(value, rules) {
  if (rules.required && (!value || value.trim() === '')) {
    return 'This field is required';
  }
  if (rules.minLength && value.length < rules.minLength) {
    return `Minimum ${rules.minLength} characters required`;
  }
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Maximum ${rules.maxLength} characters allowed`;
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || 'Invalid format';
  }
  if (rules.url && value) {
    try {
      new URL(value);
    } catch {
      return 'Please enter a valid URL';
    }
  }
  return null;
}

/**
 * Extract error message from API response
 */
export function getErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
