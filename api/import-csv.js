/**
 * CSV Import API - Production-Grade
 * Handles CSV file upload, validation, preview, and bulk import
 * Supports 200+ rows efficiently with batch processing
 */

const { Pool } = require('pg');
const Papa = require('papaparse');
const multiparty = require('multiparty');

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Increased for batch operations
    });
  }
  return pool;
}

async function query(text, params) {
  const client = getPool();
  return await client.query(text, params);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Validation rules for project fields
const VALID_STATUSES = ['active', 'shipped', 'archived', 'deferred', 'cancelled'];
const MAX_NAME_LENGTH = 200;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate a URL format
 */
function isValidUrl(urlString) {
  if (!urlString) return true; // Optional field
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

/**
 * Validate a single project row
 */
function validateProject(project, rowIndex) {
  const errors = [];

  // Required field: name
  if (!project.name || project.name.trim() === '') {
    errors.push(`Row ${rowIndex}: Name is required`);
  } else if (project.name.length > MAX_NAME_LENGTH) {
    errors.push(`Row ${rowIndex}: Name exceeds ${MAX_NAME_LENGTH} characters`);
  }

  // Validate GitHub URL if provided
  if (project.github_url && !isValidUrl(project.github_url)) {
    errors.push(`Row ${rowIndex}: Invalid GitHub URL format`);
  }

  // Validate Demo URL if provided
  if (project.demo_url && !isValidUrl(project.demo_url)) {
    errors.push(`Row ${rowIndex}: Invalid demo URL format`);
  }

  // Validate stars (must be a number)
  if (project.stars && isNaN(parseInt(project.stars))) {
    errors.push(`Row ${rowIndex}: Stars must be a valid number`);
  }

  // Validate status
  if (project.status && !VALID_STATUSES.includes(project.status.toLowerCase())) {
    errors.push(`Row ${rowIndex}: Status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

/**
 * Parse CSV string into array of objects
 */
function parseCSV(csvString) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Process file upload and return parsed CSV data
 */
function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form({
      maxFilesSize: MAX_FILE_SIZE,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(new Error('Failed to parse form data: ' + err.message));
      }

      if (!files.file || !files.file[0]) {
        return reject(new Error('No file uploaded'));
      }

      const file = files.file[0];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return reject(new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`));
      }

      // Check file type
      if (!file.originalFilename.endsWith('.csv')) {
        return reject(new Error('Only CSV files are supported'));
      }

      const fs = require('fs');
      const csvContent = fs.readFileSync(file.path, 'utf8');

      resolve(csvContent);
    });
  });
}

/**
 * Insert projects in batches for performance
 */
async function batchInsertProjects(projects) {
  const BATCH_SIZE = 50; // Process 50 at a time
  const results = {
    imported: [],
    failed: [],
  };

  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const batch = projects.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (project, batchIndex) => {
        const rowIndex = i + batchIndex + 2; // +2 for header and 1-based index

        try {
          // Check for duplicate by name
          const duplicateCheck = await query(
            'SELECT id FROM projects WHERE LOWER(name) = LOWER($1)',
            [project.name]
          );

          if (duplicateCheck.rows.length > 0) {
            results.failed.push({
              row: rowIndex,
              name: project.name,
              error: 'Duplicate entry - project with this name already exists',
            });
            return;
          }

          // Parse tags (comma-separated string to array)
          const tags = project.tags ? project.tags.split(',').map(t => t.trim()).filter(t => t) : [];

          // Insert project
          const result = await query(`
            INSERT INTO projects (
              name,
              description,
              status,
              complexity,
              client_appeal,
              arr,
              year1_revenue,
              year3_revenue,
              roi_score,
              tam,
              sam,
              som_year3,
              traction_mrr,
              margin_percent,
              dcf_valuation,
              monthly_infra_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
          `, [
            project.name,
            project.description || '',
            project.status ? project.status.toLowerCase() : 'active',
            parseInt(project.complexity || 3),
            parseInt(project.client_appeal || 5),
            parseFloat(project.arr || 0),
            parseFloat(project.year1_revenue || 0),
            parseFloat(project.year3_revenue || 0),
            parseFloat(project.roi_score || 0),
            parseFloat(project.tam || 0),
            parseFloat(project.sam || 0),
            parseFloat(project.som_year3 || 0),
            parseFloat(project.traction_mrr || 0),
            parseFloat(project.margin_percent || 70),
            parseFloat(project.dcf_valuation || 0),
            parseFloat(project.monthly_infra_cost || 0),
          ]);

          results.imported.push({
            row: rowIndex,
            name: project.name,
            id: result.rows[0].id,
          });

          // Log import
          await query(
            'INSERT INTO import_logs (entity_type, entity_id, status, metadata) VALUES ($1, $2, $3, $4)',
            ['project', result.rows[0].id, 'success', JSON.stringify({ source: 'csv_import', row: rowIndex })]
          );

        } catch (error) {
          results.failed.push({
            row: rowIndex,
            name: project.name,
            error: error.message,
          });

          // Log failed import
          try {
            await query(
              'INSERT INTO import_logs (entity_type, status, error_message, metadata) VALUES ($1, $2, $3, $4)',
              ['project', 'failed', error.message, JSON.stringify({ source: 'csv_import', row: rowIndex, name: project.name })]
            );
          } catch (logError) {
            console.error('Failed to log error:', logError);
          }
        }
      })
    );
  }

  return results;
}

/**
 * Main handler
 */
module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.keys(corsHeaders).forEach(key => res.setHeader(key, corsHeaders[key]));
    return res.status(200).json({ ok: true });
  }

  Object.keys(corsHeaders).forEach(key => res.setHeader(key, corsHeaders[key]));

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Parse form data and get CSV content
    const csvContent = await parseFormData(req);

    // Parse CSV
    const projects = await parseCSV(csvContent);

    if (projects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty or invalid',
      });
    }

    // Validate all rows
    const validationErrors = [];
    projects.forEach((project, index) => {
      const errors = validateProject(project, index + 2); // +2 for header and 1-based
      validationErrors.push(...errors);
    });

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validation_errors: validationErrors,
        total_rows: projects.length,
        failed_rows: validationErrors.length,
      });
    }

    // Preview mode - return first 10 rows without importing
    const isPreview = req.query.preview === 'true' || req.url.includes('preview=true');

    if (isPreview) {
      return res.status(200).json({
        success: true,
        preview: true,
        data: projects.slice(0, 10),
        total_rows: projects.length,
        message: `Preview of ${Math.min(10, projects.length)} of ${projects.length} rows`,
      });
    }

    // Import all valid rows
    const results = await batchInsertProjects(projects);

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${results.imported.length} projects`,
      total_rows: projects.length,
      imported_count: results.imported.length,
      failed_count: results.failed.length,
      imported: results.imported,
      failed: results.failed,
    });

  } catch (error) {
    console.error('CSV Import error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during import',
    });
  }
};
