import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const SeverityBadge = ({ severity }) => {
  const styles = {
    critical: 'bg-red-100 text-red-800 border border-red-300',
    high: 'bg-orange-100 text-orange-800 border border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    low: 'bg-green-100 text-green-800 border border-green-300',
  };
  const icons = {
    critical: '🔴',
    high: '🟡',
    medium: '🟠',
    low: '🟢',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[severity]}`}>
      {icons[severity]} {severity.toUpperCase()}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    verified: 'bg-green-100 text-green-700',
    shipped: 'bg-teal-100 text-teal-700',
    closed: 'bg-gray-200 text-gray-600',
    deferred: 'bg-purple-100 text-purple-700',
  };
  const icons = {
    pending: '⏳',
    in_progress: '🚀',
    verified: '✅',
    shipped: '🚢',
    closed: '🔒',
    deferred: '📋',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {icons[status]} {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

const KPICard = ({ title, value, subtitle, icon, color = 'blue' }) => {
  const colorClasses = {
    red: 'border-red-300 bg-red-50',
    orange: 'border-orange-300 bg-orange-50',
    yellow: 'border-yellow-300 bg-yellow-50',
    green: 'border-green-300 bg-green-50',
    blue: 'border-blue-300 bg-blue-50',
    purple: 'border-purple-300 bg-purple-50',
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );
};

// ============================================================================
// DASHBOARD OVERVIEW (Homepage)
// ============================================================================

const DashboardOverview = ({ kpis }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 shadow-lg">
        <h1 className="text-4xl font-bold mb-2">🛠️ CTO DASHBOARD</h1>
        <p className="text-lg opacity-90">Real-time visibility into bugs, projects, and portfolio metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="CRITICAL BUGS"
          value={kpis.critical_bugs || 0}
          icon="🔴"
          color="red"
        />
        <KPICard
          title="HIGH BUGS"
          value={kpis.high_bugs || 0}
          subtitle={kpis.sla_breached_count > 0 ? `${kpis.sla_breached_count} overdue` : null}
          icon="🟡"
          color="orange"
        />
        <KPICard
          title="PORTFOLIO VALUE"
          value={kpis.portfolio_value ? `$${(kpis.portfolio_value / 1000000).toFixed(0)}M` : '$0'}
          icon="📊"
          color="blue"
        />
        <KPICard
          title="YEAR-3 REVENUE"
          value={kpis.year3_revenue_total ? `$${(kpis.year3_revenue_total / 1000000).toFixed(0)}M` : '$0'}
          icon="💰"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="MEDIUM BUGS"
          value={kpis.medium_bugs || 0}
          icon="🟠"
          color="yellow"
        />
        <KPICard
          title="LOW BUGS"
          value={kpis.low_bugs || 0}
          subtitle="review quarterly"
          icon="🟢"
          color="green"
        />
      </div>
    </div>
  );
};

// ============================================================================
// BUG TRACKER VIEW
// ============================================================================

const BugTracker = () => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    blocker: false,
  });
  const [costAnalysis, setCostAnalysis] = useState(null);

  useEffect(() => {
    fetchBugs();
    fetchCostAnalysis();
  }, [filters]);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.status) params.append('status', filters.status);
      if (filters.blocker) params.append('is_blocker', 'true');

      const response = await axios.get(`${API_URL}/api/bugs?${params}`);
      setBugs(response.data.data);
    } catch (error) {
      console.error('Error fetching bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCostAnalysis = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bugs/analytics/cost`);
      setCostAnalysis(response.data.data);
    } catch (error) {
      console.error('Error fetching cost analysis:', error);
    }
  };

  const bugCounts = bugs.reduce((acc, bug) => {
    acc[bug.severity] = (acc[bug.severity] || 0) + 1;
    if (bug.is_blocker) acc.blockers = (acc.blockers || 0) + 1;
    if (bug.sla_breached) acc.overdue = (acc.overdue || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">🐛 Bug Tracker</h2>

      {/* Bug Status Overview */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <h3 className="text-xl font-semibold mb-4">Bug Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl mb-2">🔴</div>
            <div className="text-2xl font-bold text-red-700">{bugCounts.critical || 0}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl mb-2">🟡</div>
            <div className="text-2xl font-bold text-orange-700">{bugCounts.high || 0}</div>
            <div className="text-sm text-gray-600">High</div>
            {bugCounts.overdue > 0 && (
              <div className="text-xs text-red-600 mt-1">{bugCounts.overdue} overdue</div>
            )}
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl mb-2">🟠</div>
            <div className="text-2xl font-bold text-yellow-700">{bugCounts.medium || 0}</div>
            <div className="text-sm text-gray-600">Medium</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl mb-2">🟢</div>
            <div className="text-2xl font-bold text-green-700">{bugCounts.low || 0}</div>
            <div className="text-sm text-gray-600">Low</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl mb-2">🚫</div>
            <div className="text-2xl font-bold text-purple-700">{bugCounts.blockers || 0}</div>
            <div className="text-sm text-gray-600">Blockers</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-3">Filter & Sort</h3>
        <div className="flex flex-wrap gap-3">
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="verified">Verified</option>
            <option value="shipped">Shipped</option>
            <option value="deferred">Deferred</option>
          </select>

          <label className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.blocker}
              onChange={(e) => setFilters({ ...filters, blocker: e.target.checked })}
            />
            <span>Blockers Only</span>
          </label>
        </div>
      </div>

      {/* Bug List */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Detailed Bug List ({bugs.length} bugs)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Loading bugs...
                  </td>
                </tr>
              ) : bugs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No bugs found
                  </td>
                </tr>
              ) : (
                bugs.map((bug) => (
                  <tr key={bug.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm">{bug.bug_number}</div>
                      {bug.is_blocker && <div className="text-xs text-red-600">🚫 BLOCKER</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{bug.title}</div>
                      <div className="text-sm text-gray-500">{bug.business_impact}</div>
                      {bug.sla_breached && (
                        <div className="text-xs text-red-600 mt-1">⚠️ SLA BREACHED</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={bug.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={bug.status} />
                    </td>
                    <td className="px-4 py-3">
                      {bug.assigned_to_name ? (
                        <div>
                          <div className="font-medium">{bug.assigned_to_name}</div>
                          <div className="text-xs text-gray-500">@{bug.assigned_to_email?.split('@')[0]}</div>
                        </div>
                      ) : (
                        <div className="text-gray-400">Unassigned</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{bug.days_open}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Analysis */}
      {costAnalysis && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-4">Cost Analysis (This Month)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Total Eng Hours</div>
              <div className="text-3xl font-bold text-blue-700">
                {costAnalysis.summary?.total_eng_hours || 0}h
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Estimated Cost</div>
              <div className="text-3xl font-bold text-green-700">
                ${(costAnalysis.summary?.total_cost || 0).toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Revenue Impact</div>
              <div className="text-3xl font-bold text-red-700">
                ${(costAnalysis.summary?.total_revenue_impact || 0).toLocaleString()}/day
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROJECT PORTFOLIO VIEW
// ============================================================================

const ProjectPortfolio = () => {
  const [projects, setProjects] = useState([]);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix', 'table', 'valuation'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/projects`);
      setProjects(response.data.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const portfolioMetrics = projects.reduce(
    (acc, p) => {
      acc.totalProjects += 1;
      if (p.status === 'shipped') acc.shippedProjects += 1;
      acc.year3Revenue += parseFloat(p.year3_revenue || 0);
      acc.portfolioValue += parseFloat(p.dcf_valuation || 0);
      acc.monthlyInfraCost += parseFloat(p.monthly_infra_cost || 0);
      return acc;
    },
    { totalProjects: 0, shippedProjects: 0, year3Revenue: 0, portfolioValue: 0, monthlyInfraCost: 0 }
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">📁 Project Portfolio</h2>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="PROJECTS"
          value={portfolioMetrics.totalProjects}
          subtitle={`${portfolioMetrics.shippedProjects} shipped`}
          color="blue"
        />
        <KPICard
          title="YEAR-3 REVENUE"
          value={`$${(portfolioMetrics.year3Revenue / 1000000).toFixed(1)}M`}
          color="green"
        />
        <KPICard
          title="PORTFOLIO DCF"
          value={`$${(portfolioMetrics.portfolioValue / 1000000).toFixed(0)}M`}
          subtitle="valuation"
          color="purple"
        />
        <KPICard
          title="MONTHLY DEPS COST"
          value={`$${(portfolioMetrics.monthlyInfraCost / 1000).toFixed(1)}k`}
          subtitle="infrastructure"
          color="orange"
        />
      </div>

      {/* View Mode Selector */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="flex gap-3">
          <button
            className={`px-4 py-2 rounded ${viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setViewMode('matrix')}
          >
            📊 Prioritization Matrix
          </button>
          <button
            className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setViewMode('table')}
          >
            📋 Detailed Table
          </button>
          <button
            className={`px-4 py-2 rounded ${viewMode === 'valuation' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setViewMode('valuation')}
          >
            💰 Valuation & Market
          </button>
        </div>
      </div>

      {/* Prioritization Matrix */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-4">Prioritization Matrix</h3>
          <p className="text-sm text-gray-600 mb-6">Y-axis: Client Appeal (0-10) | X-axis: Complexity (1-5)</p>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="complexity"
                  name="Complexity"
                  domain={[0, 6]}
                  label={{ value: 'Complexity →', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="client_appeal"
                  name="Client Appeal"
                  domain={[0, 11]}
                  label={{ value: 'Client Appeal ↑', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm">Complexity: {data.complexity}/5</p>
                          <p className="text-sm">Appeal: {data.client_appeal}/10</p>
                          <p className="text-sm">ROI: ${(data.roi_score || 0).toFixed(0)}k</p>
                          <p className="text-sm">Year-3 Rev: ${((data.year3_revenue || 0) / 1000000).toFixed(1)}M</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={projects} fill="#3b82f6">
                  {projects.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.status === 'shipped' ? '#10b981' : entry.status === 'deferred' ? '#9ca3af' : '#3b82f6'}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 space-y-2">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {project.complexity <= 2 && project.client_appeal >= 7 ? '🎯' :
                     project.complexity >= 4 && project.client_appeal >= 6 ? '🚀' :
                     '💤'}
                  </span>
                  <div>
                    <div className="font-semibold">{project.name}</div>
                    <div className="text-sm text-gray-600">
                      Complexity: {project.complexity}/5, Appeal: {project.client_appeal}/10
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    ROI: ${(project.roi_score || 0).toFixed(0)}k
                  </div>
                  <div className="text-sm text-gray-600">
                    {project.complexity <= 2 && project.client_appeal >= 7 ? 'Build now' :
                     project.complexity >= 4 && project.client_appeal >= 6 ? 'Moonshot' :
                     'Skip/Defer'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Project Details & Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ARR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Complexity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Milestone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Appeal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Y3 Rev</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{project.name}</div>
                      {project.blocker_count > 0 && (
                        <div className="text-xs text-red-600">
                          🚫 {project.blocker_count} blockers
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3">${((project.arr || 0) / 1000).toFixed(0)}k</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {'▮'.repeat(project.complexity)}
                        {'░'.repeat(5 - project.complexity)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {project.complexity <= 2 ? 'EASY' : project.complexity >= 4 ? 'HARD' : 'MEDIUM'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {project.current_milestone}/{project.total_milestones}
                    </td>
                    <td className="px-4 py-3">
                      {project.client_appeal}/10
                    </td>
                    <td className="px-4 py-3">
                      ${((project.year3_revenue || 0) / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      {(project.roi_score || 0).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Valuation & Market */}
      {viewMode === 'valuation' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Market Opportunity & Valuation</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">TAM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SAM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">SOM (3yr)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Traction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Y3 Rev</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Margin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">DCF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{project.name}</div>
                      <div className="text-xs text-gray-500">
                        {project.status === 'shipped' ? '(proven)' :
                         project.complexity >= 4 ? '(enterprise)' :
                         '(niche)'}
                      </div>
                    </td>
                    <td className="px-4 py-3">${((project.tam || 0) / 1000000000).toFixed(1)}B</td>
                    <td className="px-4 py-3">${((project.sam || 0) / 1000000).toFixed(0)}M</td>
                    <td className="px-4 py-3">${((project.som_year3 || 0) / 1000000).toFixed(0)}M</td>
                    <td className="px-4 py-3">
                      {project.traction_mrr > 0 ? `$${(project.traction_mrr / 1000).toFixed(0)}k/mo` : '$0'}
                    </td>
                    <td className="px-4 py-3">${((project.year3_revenue || 0) / 1000000).toFixed(0)}M</td>
                    <td className="px-4 py-3">{project.margin_percent}%</td>
                    <td className="px-4 py-3 font-semibold text-purple-600">
                      ${((project.dcf_valuation || 0) / 1000000).toFixed(0)}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-blue-50 border-t">
            <h4 className="font-semibold mb-3">Funding Angles:</h4>
            <ul className="space-y-2 text-sm">
              {projects.map((project) => {
                if (project.status === 'shipped' && project.traction_mrr > 0) {
                  return (
                    <li key={project.id}>
                      <span className="font-medium">{project.name}</span> → Seed: "Proven product-market fit,
                      ${((project.arr || 0) / 1000).toFixed(0)}k ARR in 18mo"
                    </li>
                  );
                }
                if (project.complexity >= 4 && (project.tam || 0) > 5000000000) {
                  return (
                    <li key={project.id}>
                      <span className="font-medium">{project.name}</span> → Series A: "Enter
                      ${((project.tam || 0) / 1000000000).toFixed(0)}B market, enterprise tailwind"
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ANALYTICS VIEW
// ============================================================================

const Analytics = () => {
  const [monthlyMetrics, setMonthlyMetrics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [monthlyRes, recsRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/monthly?months=5`),
        axios.get(`${API_URL}/api/analytics/recommendations`)
      ]);

      setMonthlyMetrics(monthlyRes.data.data);
      setRecommendations(recsRes.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestMonth = monthlyMetrics[monthlyMetrics.length - 1] || {};
  const previousMonth = monthlyMetrics[monthlyMetrics.length - 2] || {};

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const severityData = latestMonth.total_bugs ? [
    { name: 'Critical', value: latestMonth.critical_bugs, color: '#dc2626' },
    { name: 'High', value: latestMonth.high_bugs, color: '#f97316' },
    { name: 'Medium', value: latestMonth.medium_bugs, color: '#eab308' },
    { name: 'Low', value: latestMonth.low_bugs, color: '#22c55e' },
  ] : [];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">📈 Analytics & Reporting</h2>

      {/* Bug Cost & Impact Analysis */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <h3 className="text-xl font-semibold mb-6">Bug Cost & Impact Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">This Month Cost</div>
            <div className="text-3xl font-bold text-gray-900">
              ${(latestMonth.total_cost || 0).toLocaleString()}
            </div>
            <div className={`text-sm mt-1 ${
              calculateChange(latestMonth.total_cost, previousMonth.total_cost) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              📈 {calculateChange(latestMonth.total_cost, previousMonth.total_cost) > 0 ? 'UP' : 'DOWN'} {Math.abs(calculateChange(latestMonth.total_cost, previousMonth.total_cost))}%
              vs. last month
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Bugs Created</div>
            <div className="text-3xl font-bold text-gray-900">
              {latestMonth.bugs_created || 0} bugs
            </div>
            <div className="text-sm text-gray-500 mt-1">
              (up {calculateChange(latestMonth.bugs_created, previousMonth.bugs_created)}% vs month)
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Eng Hours</div>
            <div className="text-3xl font-bold text-gray-900">
              {latestMonth.eng_hours || 0} hours
            </div>
            <div className="text-sm text-gray-500 mt-1">
              (up {calculateChange(latestMonth.eng_hours, previousMonth.eng_hours)}% vs month)
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-red-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Revenue Impact (if unresolved)</div>
          <div className="text-3xl font-bold text-red-700">
            ${(latestMonth.revenue_impact_daily || 0).toLocaleString()}/day
          </div>
          <div className="text-sm text-gray-600 mt-1">
            From {latestMonth.critical_bugs || 0} critical bugs
          </div>
        </div>
      </div>

      {/* Bugs by Severity */}
      {severityData.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-6">Bugs by Severity (This Month)</h3>
          <div className="space-y-4">
            {severityData.map((item) => {
              const total = severityData.reduce((sum, d) => sum + d.value, 0);
              const percentage = ((item.value / total) * 100).toFixed(0);
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-gray-600">
                      {item.value} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="h-6 rounded-full flex items-center px-2 text-white text-xs font-semibold"
                      style={{ width: `${percentage}%`, backgroundColor: item.color }}
                    >
                      {'█'.repeat(Math.floor(percentage / 5))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 12-Month Trend */}
      {monthlyMetrics.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-6">Trend Analysis</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_bugs"
                  stroke="#3b82f6"
                  name="Total Bugs"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="critical_bugs"
                  stroke="#dc2626"
                  name="Critical Bugs"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="total_cost"
                  stroke="#10b981"
                  name="Monthly Cost ($)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              Trend: Bugs and costs are UP. Recommend QA hiring or automation.
            </p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-semibold mb-6">💡 Recommendations</h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => {
              const severityColors = {
                critical: 'border-red-300 bg-red-50',
                high: 'border-orange-300 bg-orange-50',
                medium: 'border-yellow-300 bg-yellow-50',
              };

              return (
                <div
                  key={index}
                  className={`p-4 border-2 rounded-lg ${severityColors[rec.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {rec.severity === 'critical' ? '🚨' : rec.severity === 'high' ? '⚠️' : '💡'}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-700 mb-2">{rec.message}</p>
                      <p className="text-xs text-gray-600 italic">
                        Action: {rec.action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchKPIs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/kpis`);
      setKpis(response.data.data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-4">
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentTab('overview')}
            >
              🏠 Overview
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'bugs'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentTab('bugs')}
            >
              🐛 Bug Tracker
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'projects'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentTab('projects')}
            >
              📁 Projects
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCurrentTab('analytics')}
            >
              📈 Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {currentTab === 'overview' && <DashboardOverview kpis={kpis} />}
        {currentTab === 'bugs' && <BugTracker />}
        {currentTab === 'projects' && <ProjectPortfolio />}
        {currentTab === 'analytics' && <Analytics />}
      </div>

      {/* Footer */}
      <div className="bg-white border-t-2 border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          CTO Dashboard v1.0 - Real-time Bug Tracking & Portfolio Management
        </div>
      </div>
    </div>
  );
}

export default App;
