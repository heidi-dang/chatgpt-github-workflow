import React, { useState, useEffect } from 'react';
import { PRCard, CommitNode, CheckRun, PRStatus, CheckStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { AlertOctagon, ExternalLink, RefreshCw, CheckCircle2, PlayCircle, XCircle, ArrowRight } from 'lucide-react';

interface ChatGptUiViewProps {
  prs: PRCard[];
  commits: CommitNode[];
  checks: CheckRun[];
  repo: string;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const ChatGptUiView: React.FC<ChatGptUiViewProps> = ({ 
  prs, 
  commits, 
  checks, 
  repo,
  lastUpdated,
  onRefresh,
  isRefreshing
}) => {
  const [focusedPrId, setFocusedPrId] = useState<number | null>(prs[0]?.id || null);
  const [autoRefreshRate, setAutoRefreshRate] = useState<number>(30); // 0 = off

  // Filter Data based on focused PR
  // In a real app, commits and checks would be fetched specific to the PR. 
  // Here we mock filter or just return all if no specific mapping exists in mock data.
  const focusedPR = prs.find(p => p.id === focusedPrId) || prs[0];
  
  // Mocking context-aware data
  // If PR is failing, show failing checks. If passing, show passing checks.
  const currentChecks = focusedPR?.ciStatus === CheckStatus.Failure 
    ? checks 
    : checks.filter(c => c.status !== CheckStatus.Failure);

  // Group PRs for the Left Board
  const columns = [
    PRStatus.Open,
    PRStatus.InReview,
    PRStatus.ChangesRequested,
    PRStatus.CIFailing,
    PRStatus.Mergeable
  ];

  return (
    <div className="flex flex-col h-full bg-canvas text-text">
      {/* Header Bar */}
      <div className="flex-none p-3 border-b border-border bg-panel flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
           <div className="flex items-center gap-2 bg-canvas border border-border rounded px-2 py-1">
              <span className="text-muted text-xs">Repo:</span>
              <span className="text-sm font-semibold truncate">{repo}</span>
           </div>
           {focusedPR && (
              <div className="flex items-center gap-2 bg-canvas border border-border rounded px-2 py-1">
                  <span className="text-muted text-xs">PR:</span>
                  <span className="text-sm font-mono">#{focusedPR.id}</span>
              </div>
           )}
        </div>

        <div className="flex items-center gap-3">
           <span className="text-xs text-muted hidden sm:inline">Last updated: {lastUpdated}</span>
           
           {/* Auto Refresh Toggle */}
           <div className="flex items-center bg-canvas border border-border rounded-lg p-0.5">
              {[0, 30, 60].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setAutoRefreshRate(rate)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                        autoRefreshRate === rate 
                        ? 'bg-panel text-text shadow-sm' 
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {rate === 0 ? 'Off' : `${rate}s`}
                  </button>
              ))}
           </div>

           <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1.5 hover:bg-border rounded text-muted hover:text-text transition-colors disabled:opacity-50"
             >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Body: 3 Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          
          {/* Left: Board (3 cols width on desktop) */}
          <div className="md:col-span-3 lg:col-span-3 flex flex-col overflow-hidden bg-panel/30">
              <div className="p-2 bg-panel/50 border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                  PR Board
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-4">
                  {columns.map(status => {
                      const statusPrs = prs.filter(p => p.status === status);
                      if (statusPrs.length === 0) return null;
                      
                      return (
                          <div key={status}>
                              <h4 className="text-[10px] font-bold text-muted mb-2 px-1 flex items-center justify-between">
                                  {status}
                                  <span className="bg-border px-1.5 rounded-full text-text">{statusPrs.length}</span>
                              </h4>
                              <div className="space-y-2">
                                  {statusPrs.map(pr => (
                                      <div 
                                        key={pr.id}
                                        onClick={() => setFocusedPrId(pr.id)}
                                        className={`p-2.5 rounded border cursor-pointer transition-all hover:shadow-md
                                            ${focusedPrId === pr.id 
                                                ? 'bg-panel border-accent ring-1 ring-accent' 
                                                : 'bg-canvas border-border hover:border-muted'
                                            }
                                        `}
                                      >
                                          <div className="flex justify-between items-start mb-1.5">
                                              <span className="font-mono text-xs text-muted">#{pr.id}</span>
                                              <Badge status={pr.ciStatus} size="sm" />
                                          </div>
                                          <p className="text-xs font-medium text-text line-clamp-2 mb-2">{pr.title}</p>
                                          <div className="flex items-center gap-1 text-[10px] text-muted mb-1.5">
                                              <span className="font-mono max-w-[80px] truncate">{pr.headBranch}</span>
                                              <ArrowRight className="w-2.5 h-2.5" />
                                              <span className="font-mono">{pr.baseBranch}</span>
                                          </div>
                                          <div className="flex justify-between items-center text-[10px] text-muted pt-1.5 border-t border-border/50">
                                              <span className="font-mono">{pr.sha.substring(0, 6)}</span>
                                              <span>{pr.lastUpdated}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          {/* Middle: Graph List (6 cols width on desktop) */}
          <div className="md:col-span-6 lg:col-span-6 flex flex-col overflow-hidden bg-canvas">
              <div className="p-2 bg-panel/50 border-b border-border flex justify-between items-center">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      Commits {focusedPR ? `for #${focusedPR.id}` : ''}
                  </span>
                  <span className="text-[10px] text-muted">{commits.length} commits</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="divide-y divide-border">
                      {commits.map(commit => (
                          <div key={commit.sha} className="p-3 hover:bg-panel/50 transition-colors flex items-center gap-3 group">
                              <div className="flex-none">
                                  {commit.status === CheckStatus.Success && <CheckCircle2 className="w-4 h-4 text-success" />}
                                  {commit.status === CheckStatus.Failure && <XCircle className="w-4 h-4 text-danger" />}
                                  {commit.status === CheckStatus.Running && <PlayCircle className="w-4 h-4 text-warning" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text truncate group-hover:text-accent transition-colors">
                                      {commit.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                                      <span className="font-medium text-text/80">{commit.author}</span>
                                      <span>•</span>
                                      <span>{commit.date}</span>
                                  </div>
                              </div>
                              <div className="flex-none">
                                  <span className="font-mono text-[10px] bg-panel border border-border px-1.5 py-0.5 rounded text-muted group-hover:border-accent/50 transition-colors">
                                      {commit.sha.substring(0, 7)}
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Right: Checks Rollup (3 cols width on desktop) */}
          <div className="md:col-span-3 lg:col-span-3 flex flex-col overflow-hidden bg-panel/30">
              <div className="p-2 bg-panel/50 border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                  Checks Rollup
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  
                  {/* Summary Counters */}
                  <div className="grid grid-cols-3 gap-2">
                      <div className="bg-canvas border border-border rounded p-2 text-center">
                          <div className="text-lg font-bold text-success">
                              {currentChecks.filter(c => c.status === CheckStatus.Success).length}
                          </div>
                          <div className="text-[9px] uppercase text-muted">Passed</div>
                      </div>
                      <div className="bg-canvas border border-border rounded p-2 text-center">
                          <div className="text-lg font-bold text-danger">
                              {currentChecks.filter(c => c.status === CheckStatus.Failure).length}
                          </div>
                          <div className="text-[9px] uppercase text-muted">Failed</div>
                      </div>
                      <div className="bg-canvas border border-border rounded p-2 text-center">
                          <div className="text-lg font-bold text-warning">
                              {currentChecks.filter(c => c.status === CheckStatus.Running).length}
                          </div>
                          <div className="text-[9px] uppercase text-muted">Running</div>
                      </div>
                  </div>

                  {/* Failing Checks List */}
                  {currentChecks.some(c => c.status === CheckStatus.Failure) && (
                      <div className="space-y-2">
                          <h4 className="text-xs font-bold text-danger flex items-center gap-1.5">
                              <AlertOctagon className="w-3.5 h-3.5" /> Failing Checks
                          </h4>
                          <div className="space-y-1.5">
                              {currentChecks
                                .filter(c => c.status === CheckStatus.Failure)
                                .slice(0, 3)
                                .map(check => (
                                    <div key={check.id} className="flex items-center justify-between text-xs bg-danger/10 border border-danger/20 rounded px-2 py-1.5 text-danger-200">
                                        <span className="truncate">{check.name}</span>
                                        <a href="#" className="text-[10px] hover:underline opacity-70 hover:opacity-100 flex items-center gap-0.5">
                                            Log <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                ))
                              }
                          </div>
                      </div>
                  )}

                  {/* CTA */}
                  <div className="pt-4 border-t border-border">
                      <button className="w-full flex items-center justify-center gap-2 py-2 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded transition-colors shadow-sm">
                          View PR #{focusedPR?.id} on GitHub
                      </button>
                      <p className="text-[10px] text-muted text-center mt-2">
                          Opens in new browser tab
                      </p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};