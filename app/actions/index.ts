/**
 * Server Actions Index
 * CTO Dashboard v2.0 - Next.js 14
 *
 * Central export for all server actions
 */

// Project Actions
export {
  addProjectAction,
  updateProjectAction,
  deleteProjectAction,
  toggleProjectStatusAction,
  getProjectAction,
  listProjectsAction,
} from './projects'

// Bug Actions
export {
  createBugAction,
  updateBugAction,
  updateBugStatusAction,
  updateBugSeverityAction,
  deleteBugAction,
  getBugAction,
  listBugsAction,
} from './bugs'

// Sync Actions
export {
  syncGitHubNowAction,
  importCSVAction,
  getSyncStatusAction,
  getImportHistoryAction,
} from './sync'

// Metrics Actions
export {
  generateMetricsAction,
  getDashboardMetricsAction,
  getProjectMetricsAction,
} from './metrics'

// Types
export type { ActionResponse } from './types'
export { success, error } from './types'
