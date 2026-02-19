export enum Tab {
  Board = 'Board',
  Graph = 'Graph',
  Checks = 'Checks',
  Team = 'Team',
  Settings = 'Settings',
  ChatGptUi = 'ChatGPT UI'
}

export enum PRStatus {
  Open = 'Open',
  InReview = 'In Review',
  ChangesRequested = 'Changes Requested',
  CIFailing = 'CI Failing',
  Mergeable = 'Mergeable',
  Merged = 'Merged'
}

export enum CheckStatus {
  Queued = 'queued',
  Running = 'running',
  Success = 'success',
  Failure = 'failure'
}

export interface PRCard {
  id: number;
  title: string;
  author: string;
  status: PRStatus;
  ciStatus: CheckStatus;
  headBranch: string;
  baseBranch: string;
  sha: string;
  lastUpdated: string;
  comments: number;
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}

export interface CommitNode {
  sha: string;
  message: string;
  author: string;
  date: string;
  status: CheckStatus;
  isMerge: boolean;
  branch?: string; // If it's a tip
  fileChanges?: FileChange[];
  stats?: { additions: number; deletions: number };
  checksSummary?: { 
    passed: number; 
    failed: number;
    running: number;
    total: number; 
    state: CheckStatus;
    failingNames?: string[];
  };
}

export interface CheckRun {
  id: number;
  name: string;
  status: CheckStatus;
  duration: string;
  startedAt: string;
  steps: { name: string; status: CheckStatus; log?: string }[];
}

export interface TeamMember {
  name: string;
  role: 'Planner' | 'Runner' | 'Reviewer' | 'Auditor';
  phase: string;
  status: 'active' | 'waiting' | 'blocked';
  lastArtifact?: string;
}

export type ViewMode = 'compact' | 'expanded';