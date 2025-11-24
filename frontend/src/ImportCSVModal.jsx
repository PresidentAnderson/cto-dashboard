import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' : 'http://localhost:5000'
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImportCSVModal({ onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [progress, setProgress] = useState(0);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFileSelection(droppedFile);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle file selection
  const handleFileSelection = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 5MB limit (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    setFile(selectedFile);
    setError('');
    setValidationErrors([]);
    setResult(null);
    setPreview(null);
  };

  const handleFileChange = (e) => {
    handleFileSelection(e.target.files[0]);
  };

  // Preview CSV data
  const handlePreview = async () => {
    if (!file) return;

    setValidating(true);
    setError('');
    setValidationErrors([]);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/api/import-csv?preview=true`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPreview(response.data);
      setValidating(false);
    } catch (err) {
      console.error('Preview error:', err);
      const errorData = err.response?.data;

      if (errorData?.validation_errors) {
        setValidationErrors(errorData.validation_errors);
        setError(`Validation failed: ${errorData.validation_errors.length} errors found`);
      } else {
        setError(errorData?.error || err.message || 'Failed to preview CSV');
      }
      setValidating(false);
    }
  };

  // Import CSV data
  const handleImport = async () => {
    if (!file || !preview) {
      setError('Please preview the file first');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (since we don't have real upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await axios.post(`${API_URL}/api/import-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      setResult(response.data);
      setLoading(false);

      // Notify parent to refresh
      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }
    } catch (err) {
      console.error('Import error:', err);
      const errorData = err.response?.data;

      if (errorData?.validation_errors) {
        setValidationErrors(errorData.validation_errors);
        setError(`Import failed: ${errorData.validation_errors.length} validation errors`);
      } else {
        setError(errorData?.error || err.message || 'Import failed');
      }

      setLoading(false);
      setProgress(0);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateContent = 'name,description,github_url,demo_url,tags,language,stars,status\nAwesome Project,A great project description,https://github.com/user/repo,https://demo.example.com,"react,typescript,api",TypeScript,42,active\nCool App,Another amazing app,https://github.com/user/app,https://app.example.com,"nodejs,express",JavaScript,128,shipped';

    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Reset to initial state
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setValidationErrors([]);
    setProgress(0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Projects from CSV</h2>
            <p className="text-sm text-gray-600 mt-1">Upload a CSV file to import multiple projects</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Result */}
          {result ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 rounded-full p-2">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900">Import Successful!</h3>
                    <p className="text-sm text-green-700">
                      {result.imported_count} of {result.total_rows} projects imported successfully
                    </p>
                  </div>
                </div>

                {/* Success Details */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{result.total_rows}</div>
                    <div className="text-xs text-gray-600">Total Rows</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{result.imported_count}</div>
                    <div className="text-xs text-gray-600">Imported</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{result.failed_count}</div>
                    <div className="text-xs text-gray-600">Failed</div>
                  </div>
                </div>

                {/* Failed Rows */}
                {result.failed && result.failed.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-medium text-yellow-900 mb-2">
                      {result.failed.length} rows failed:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.failed.map((fail, idx) => (
                        <div key={idx} className="text-xs text-yellow-800 font-mono bg-white p-2 rounded">
                          Row {fail.row}: {fail.name} - {fail.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload Area */}
              {!file && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-1">
                        Drag and drop your CSV file here
                      </p>
                      <p className="text-sm text-gray-600">or</p>
                    </div>
                    <label className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 cursor-pointer transition-colors">
                      Choose File
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={loading || validating}
                      />
                    </label>
                    <p className="text-xs text-gray-500">Maximum file size: 5MB</p>
                  </div>
                </div>
              )}

              {/* File Selected */}
              {file && !preview && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-2">Validation Errors:</h3>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {validationErrors.map((err, idx) => (
                      <div key={idx} className="text-sm text-red-700 font-mono bg-white p-2 rounded">
                        {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && !validationErrors.length && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Preview Table */}
              {preview && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-1">Preview</h3>
                    <p className="text-sm text-blue-700">
                      Showing first 10 of {preview.total_rows} rows
                    </p>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stars</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {preview.data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900 font-medium">{row.name}</td>
                              <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">{row.description}</td>
                              <td className="px-3 py-2 text-sm">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                  {row.status || 'active'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">{row.language || '-'}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{row.stars || '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Importing...</span>
                    <span className="text-gray-900 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>name</strong> (required): Project name (max 200 characters)</li>
                  <li>• <strong>description</strong>: Project description</li>
                  <li>• <strong>github_url</strong>: Valid GitHub URL</li>
                  <li>• <strong>demo_url</strong>: Valid demo/website URL</li>
                  <li>• <strong>tags</strong>: Comma-separated tags</li>
                  <li>• <strong>language</strong>: Programming language</li>
                  <li>• <strong>stars</strong>: Number of stars/likes</li>
                  <li>• <strong>status</strong>: active, shipped, archived, deferred, or cancelled</li>
                </ul>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 text-sm text-blue-700 font-medium hover:text-blue-800 underline"
                >
                  Download Template CSV
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!preview && file && (
                  <button
                    onClick={handlePreview}
                    disabled={validating}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {validating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Validating...
                      </span>
                    ) : (
                      'Preview & Validate'
                    )}
                  </button>
                )}
                {preview && (
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Importing...
                      </span>
                    ) : (
                      `Import ${preview.total_rows} Projects`
                    )}
                  </button>
                )}
                <button
                  onClick={onClose}
                  disabled={loading || validating}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
