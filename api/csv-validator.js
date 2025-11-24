/**
 * CSV Validation Utilities
 * Reusable validation functions for CSV import
 */

// Valid project statuses
const VALID_STATUSES = ['active', 'shipped', 'archived', 'deferred', 'cancelled'];

// Maximum field lengths
const MAX_LENGTHS = {
  name: 200,
  description: 5000,
  url: 2000,
  language: 50,
  tags: 500,
};

/**
 * Validate URL format
 */
function isValidUrl(urlString) {
  if (!urlString || urlString.trim() === '') return true; // Optional field

  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email || email.trim() === '') return true; // Optional field

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate number format
 */
function isValidNumber(value) {
  if (!value || value === '') return true; // Optional field
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Validate integer format
 */
function isValidInteger(value) {
  if (!value || value === '') return true; // Optional field
  return Number.isInteger(Number(value));
}

/**
 * Sanitize string (remove dangerous characters)
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate project data
 */
function validateProject(project, rowIndex) {
  const errors = [];
  const warnings = [];

  // Required: name
  if (!project.name || project.name.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'Name is required',
      severity: 'error'
    });
  } else if (project.name.length > MAX_LENGTHS.name) {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: `Name exceeds maximum length of ${MAX_LENGTHS.name} characters`,
      severity: 'error'
    });
  }

  // Optional: description
  if (project.description && project.description.length > MAX_LENGTHS.description) {
    errors.push({
      row: rowIndex,
      field: 'description',
      message: `Description exceeds maximum length of ${MAX_LENGTHS.description} characters`,
      severity: 'error'
    });
  }

  // Optional: github_url
  if (project.github_url && !isValidUrl(project.github_url)) {
    errors.push({
      row: rowIndex,
      field: 'github_url',
      message: 'Invalid GitHub URL format. Must start with http:// or https://',
      severity: 'error'
    });
  }

  // Optional: demo_url
  if (project.demo_url && !isValidUrl(project.demo_url)) {
    errors.push({
      row: rowIndex,
      field: 'demo_url',
      message: 'Invalid demo URL format. Must start with http:// or https://',
      severity: 'error'
    });
  }

  // Optional: stars
  if (project.stars && !isValidInteger(project.stars)) {
    errors.push({
      row: rowIndex,
      field: 'stars',
      message: 'Stars must be a valid integer number',
      severity: 'error'
    });
  } else if (project.stars && parseInt(project.stars) < 0) {
    errors.push({
      row: rowIndex,
      field: 'stars',
      message: 'Stars cannot be negative',
      severity: 'error'
    });
  }

  // Optional: status
  if (project.status) {
    const status = project.status.toLowerCase().trim();
    if (!VALID_STATUSES.includes(status)) {
      errors.push({
        row: rowIndex,
        field: 'status',
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        severity: 'error'
      });
    }
  }

  // Optional: language
  if (project.language && project.language.length > MAX_LENGTHS.language) {
    errors.push({
      row: rowIndex,
      field: 'language',
      message: `Language exceeds maximum length of ${MAX_LENGTHS.language} characters`,
      severity: 'error'
    });
  }

  // Optional: tags
  if (project.tags && project.tags.length > MAX_LENGTHS.tags) {
    errors.push({
      row: rowIndex,
      field: 'tags',
      message: `Tags exceed maximum length of ${MAX_LENGTHS.tags} characters`,
      severity: 'error'
    });
  }

  // Warnings for best practices
  if (project.name && project.name.length < 3) {
    warnings.push({
      row: rowIndex,
      field: 'name',
      message: 'Project name is very short. Consider using a more descriptive name.',
      severity: 'warning'
    });
  }

  if (!project.description || project.description.trim() === '') {
    warnings.push({
      row: rowIndex,
      field: 'description',
      message: 'No description provided. Adding a description improves discoverability.',
      severity: 'warning'
    });
  }

  if (!project.github_url && !project.demo_url) {
    warnings.push({
      row: rowIndex,
      field: 'urls',
      message: 'No URLs provided. Consider adding GitHub or demo URL.',
      severity: 'warning'
    });
  }

  return { errors, warnings };
}

/**
 * Validate bug data
 */
function validateBug(bug, rowIndex) {
  const errors = [];
  const warnings = [];

  const VALID_BUG_SEVERITIES = ['critical', 'high', 'medium', 'low'];
  const VALID_BUG_STATUSES = ['pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred'];

  // Required: title
  if (!bug.title || bug.title.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'title',
      message: 'Title is required',
      severity: 'error'
    });
  }

  // Optional: severity
  if (bug.severity) {
    const severity = bug.severity.toLowerCase().trim();
    if (!VALID_BUG_SEVERITIES.includes(severity)) {
      errors.push({
        row: rowIndex,
        field: 'severity',
        message: `Invalid severity. Must be one of: ${VALID_BUG_SEVERITIES.join(', ')}`,
        severity: 'error'
      });
    }
  }

  // Optional: status
  if (bug.status) {
    const status = bug.status.toLowerCase().trim();
    if (!VALID_BUG_STATUSES.includes(status)) {
      errors.push({
        row: rowIndex,
        field: 'status',
        message: `Invalid status. Must be one of: ${VALID_BUG_STATUSES.join(', ')}`,
        severity: 'error'
      });
    }
  }

  // Optional: assigned_to_email
  if (bug.assigned_to_email && !isValidEmail(bug.assigned_to_email)) {
    errors.push({
      row: rowIndex,
      field: 'assigned_to_email',
      message: 'Invalid email format',
      severity: 'error'
    });
  }

  // Optional: estimated_hours
  if (bug.estimated_hours && !isValidNumber(bug.estimated_hours)) {
    errors.push({
      row: rowIndex,
      field: 'estimated_hours',
      message: 'Estimated hours must be a valid number',
      severity: 'error'
    });
  }

  // Optional: revenue_impact_daily
  if (bug.revenue_impact_daily && !isValidNumber(bug.revenue_impact_daily)) {
    errors.push({
      row: rowIndex,
      field: 'revenue_impact_daily',
      message: 'Revenue impact must be a valid number',
      severity: 'error'
    });
  }

  return { errors, warnings };
}

/**
 * Batch validate array of records
 */
function batchValidate(records, type = 'project') {
  const allErrors = [];
  const allWarnings = [];
  const validRecords = [];

  records.forEach((record, index) => {
    const rowIndex = index + 2; // +2 for header row and 1-based indexing

    let validation;
    if (type === 'project') {
      validation = validateProject(record, rowIndex);
    } else if (type === 'bug') {
      validation = validateBug(record, rowIndex);
    } else {
      throw new Error(`Unknown validation type: ${type}`);
    }

    if (validation.errors.length === 0) {
      validRecords.push({ ...record, rowIndex });
    } else {
      allErrors.push(...validation.errors);
    }

    allWarnings.push(...validation.warnings);
  });

  return {
    valid: validRecords,
    errors: allErrors,
    warnings: allWarnings,
    total: records.length,
    validCount: validRecords.length,
    errorCount: allErrors.length,
    warningCount: allWarnings.length,
  };
}

/**
 * Check for duplicate entries
 */
async function checkDuplicates(records, existingRecords, keyField = 'name') {
  const duplicates = [];
  const seen = new Set(existingRecords.map(r => r[keyField]?.toLowerCase()));

  records.forEach((record, index) => {
    const value = record[keyField]?.toLowerCase();
    if (value && seen.has(value)) {
      duplicates.push({
        row: index + 2,
        field: keyField,
        value: record[keyField],
        message: `Duplicate ${keyField}: "${record[keyField]}" already exists in database`,
      });
    }
    seen.add(value);
  });

  return duplicates;
}

module.exports = {
  validateProject,
  validateBug,
  batchValidate,
  checkDuplicates,
  isValidUrl,
  isValidEmail,
  isValidNumber,
  isValidInteger,
  sanitizeString,
  VALID_STATUSES,
  MAX_LENGTHS,
};
