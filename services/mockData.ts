import { PRCard, PRStatus, CheckStatus, CommitNode, CheckRun, TeamMember } from '../types';

export const generatePRs = (): PRCard[] => {
  return [
    {
      id: 50,
      title: 'feat: Implement Workflow Monitor',
      author: 'heidi-dev',
      status: PRStatus.InReview,
      ciStatus: CheckStatus.Success,
      headBranch: 'feat/monitor-ui',
      baseBranch: 'main',
      sha: 'a1b2c3d',
      lastUpdated: '2m ago',
      comments: 3
    },
    {
      id: 48,
      title: 'fix: Database connection pool',
      author: 'db-admin',
      status: PRStatus.CIFailing,
      ciStatus: CheckStatus.Failure,
      headBranch: 'fix/db-pool',
      baseBranch: 'main',
      sha: 'e5f6g7h',
      lastUpdated: '1h ago',
      comments: 5
    },
    {
      id: 51,
      title: 'chore: Bump version',
      author: 'release-bot',
      status: PRStatus.Mergeable,
      ciStatus: CheckStatus.Success,
      headBranch: 'release/v1.1',
      baseBranch: 'main',
      sha: '9i8j7k6',
      lastUpdated: '5m ago',
      comments: 0
    }
  ];
};

export const generateCommits = (): CommitNode[] => {
  return [
    { 
      sha: 'a1b2c3d', 
      message: 'feat: finalize UI layout', 
      author: 'heidi-dev', 
      date: '2025-05-10T10:05:00Z',
      status: CheckStatus.Success, 
      isMerge: false, 
      branch: 'feat/monitor-ui',
      stats: { additions: 245, deletions: 12 },
      checksSummary: { passed: 12, failed: 0, running: 0, total: 12, state: CheckStatus.Success },
      fileChanges: [
        { path: 'src/App.tsx', additions: 45, deletions: 5, status: 'modified' },
        { path: 'src/components/views/GraphView.tsx', additions: 120, deletions: 2, status: 'added' },
        { path: 'README.md', additions: 10, deletions: 0, status: 'modified' }
      ]
    },
    { 
      sha: 'f4e3d2c', 
      message: 'style: tailwind configuration', 
      author: 'heidi-dev', 
      date: '2025-05-10T09:45:00Z',
      status: CheckStatus.Failure, 
      isMerge: false,
      stats: { additions: 56, deletions: 0 },
      checksSummary: { 
          passed: 10, 
          failed: 1, 
          running: 0, 
          total: 11, 
          state: CheckStatus.Failure,
          failingNames: ['lint-check']
      },
      fileChanges: [
        { path: 'tailwind.config.js', additions: 40, deletions: 0, status: 'modified' },
        { path: 'index.html', additions: 16, deletions: 0, status: 'modified' }
      ]
    },
    { 
      sha: 'b2c3d4e', 
      message: 'fix: merge main into feature', 
      author: 'heidi-dev', 
      date: '2025-05-10T09:30:00Z',
      status: CheckStatus.Success, 
      isMerge: true,
      stats: { additions: 0, deletions: 0 },
      checksSummary: { passed: 8, failed: 0, running: 0, total: 8, state: CheckStatus.Success }
    },
    { 
      sha: '8877665', 
      message: 'feat: initial commit', 
      author: 'heidi-dev', 
      date: '2025-05-09T14:20:00Z',
      status: CheckStatus.Running, 
      isMerge: false,
      stats: { additions: 1024, deletions: 0 },
      checksSummary: { 
          passed: 5, 
          failed: 0, 
          running: 2, 
          total: 7, 
          state: CheckStatus.Running 
      },
      fileChanges: [
        { path: 'package.json', additions: 45, deletions: 0, status: 'added' },
        { path: 'tsconfig.json', additions: 20, deletions: 0, status: 'added' }
      ]
    },
    { 
      sha: '1122334', 
      message: 'chore: setup project', 
      author: 'admin', 
      date: '2025-05-08T11:00:00Z',
      status: CheckStatus.Success, 
      isMerge: false, 
      branch: 'main',
      stats: { additions: 5, deletions: 0 },
      checksSummary: { passed: 1, failed: 0, running: 0, total: 1, state: CheckStatus.Success },
      fileChanges: [
        { path: '.gitignore', additions: 5, deletions: 0, status: 'added' }
      ]
    },
  ];
};

export const generateChecks = (): CheckRun[] => {
  return [
    {
      id: 101,
      name: 'build-and-test',
      status: CheckStatus.Success,
      duration: '4m 12s',
      startedAt: '10:06 AM',
      steps: [
        { name: 'Checkout', status: CheckStatus.Success },
        { name: 'Install Deps', status: CheckStatus.Success },
        { name: 'Lint', status: CheckStatus.Success },
        { name: 'Test', status: CheckStatus.Success }
      ]
    },
    {
      id: 102,
      name: 'e2e-cypress',
      status: CheckStatus.Running,
      duration: '1m 45s',
      startedAt: '10:10 AM',
      steps: [
        { name: 'Setup', status: CheckStatus.Success },
        { name: 'Run Specs', status: CheckStatus.Running }
      ]
    },
    {
      id: 103,
      name: 'security-scan',
      status: CheckStatus.Failure,
      duration: '2m 10s',
      startedAt: '10:07 AM',
      steps: [
        { name: 'Static Analysis', status: CheckStatus.Success },
        { name: 'Vuln Check', status: CheckStatus.Failure, log: 'Error: Critical vulnerability found in package-lock.json' }
      ]
    }
  ];
};

export const generateTeam = (): TeamMember[] => {
  return [
    { name: 'Alice', role: 'Planner', phase: 'Spec Review', status: 'waiting', lastArtifact: 'spec-v2.md' },
    { name: 'Bob', role: 'Runner', phase: 'Implementation', status: 'active', lastArtifact: 'build-882.zip' },
    { name: 'Charlie', role: 'Reviewer', phase: 'Code Review', status: 'blocked' },
    { name: 'Heidi-CLI', role: 'Auditor', phase: 'Compliance Check', status: 'active', lastArtifact: 'audit-report.json' }
  ];
};