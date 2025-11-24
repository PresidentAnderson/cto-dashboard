import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '' : 'http://localhost:5000'
);

export default function ImportModal({ type, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const parseGitHubReposCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const projects = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line (handle quoted values)
      const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      if (!matches || matches.length < 4) continue;

      const [name, visibility, createdDate, gitUrl, websiteUrl, description] = matches.map(m =>
        m.replace(/^"(.*)"$/, '$1').trim()
      );

      // Determine status based on visibility
      let status = 'active';
      if (visibility === 'PRIVATE' || visibility === 'INTERNAL') {
        status = 'active';
      } else if (visibility === 'PUBLIC') {
        status = 'shipped';
      }

      // Calculate complexity based on description length and keywords
      let complexity = 3; // default
      const desc = (description || '').toLowerCase();
      if (desc.includes('enterprise') || desc.includes('platform') || desc.includes('ai')) {
        complexity = 5;
      } else if (desc.includes('system') || desc.includes('management')) {
        complexity = 4;
      } else if (desc.includes('simple') || desc.includes('basic')) {
        complexity = 2;
      }

      // Calculate client appeal based on description quality
      let clientAppeal = 5;
      if (description && description.length > 100) {
        clientAppeal = 8;
      } else if (description && description.length > 50) {
        clientAppeal = 6;
      }
      if (websiteUrl && websiteUrl.includes('vercel.app')) {
        clientAppeal += 1;
      }

      projects.push({
        name: name || 'Unnamed Project',
        description: description || 'GitHub repository',
        status: status,
        complexity: complexity,
        client_appeal: clientAppeal,
        current_milestone: visibility === 'PUBLIC' ? 5 : 3,
        total_milestones: 5,
        arr: 0,
        year1_revenue: 0,
        year3_revenue: 0,
        roi_score: 0,
        tam: 0,
        sam: 0,
        som_year3: 0,
        traction_mrr: 0,
        margin_percent: 70,
        dcf_valuation: 0,
        monthly_infra_cost: visibility === 'PUBLIC' ? 0 : 50
      });
    }

    return projects;
  };

  const parseStandardCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      items.push(obj);
    }

    return items;
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          let dataToImport;

          // Check if this looks like GitHub repos CSV
          if (text.includes('git@github.com') || text.includes('PUBLIC') || text.includes('PRIVATE')) {
            dataToImport = parseGitHubReposCSV(text);
            console.log('Parsed GitHub repos:', dataToImport.length);
          } else {
            dataToImport = parseStandardCSV(text);
          }

          // Determine endpoint based on type
          const endpoint = type === 'bugs' ? '/api/import/bugs' : '/api/import/projects';

          // Send to backend
          const response = await axios.post(`${API_URL}${endpoint}`, {
            format: 'json',
            [type]: dataToImport
          });

          setResult(response.data);
          setLoading(false);

          // Notify parent to refresh
          if (onImportComplete) {
            setTimeout(() => {
              onImportComplete();
            }, 1500);
          }
        } catch (err) {
          console.error('Import error:', err);
          setError(err.response?.data?.error || err.message || 'Import failed');
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (err) {
      console.error('File read error:', err);
      setError('Failed to process file');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Import {type === 'bugs' ? 'Bugs' : 'Projects'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Supported Formats:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ GitHub repositories CSV (auto-detected)</li>
                <li>✓ Standard CSV with headers</li>
                <li>✓ JSON array</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
                  `Import ${type === 'bugs' ? 'Bugs' : 'Projects'}`
                )}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-full p-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Import Successful!</h3>
                  <p className="text-sm text-green-700">
                    {result.imported} {type} imported successfully
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-900 mb-2">
                    {result.errors.length} items had errors:
                  </p>
                  <ul className="text-xs text-yellow-800 space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>
                        {err.bug || err.project}: {err.error}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="font-medium">...and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
