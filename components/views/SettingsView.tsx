import React from 'react';
import { ToggleLeft, ToggleRight, Shield, LogOut } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-y-auto max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-text mb-6">Settings</h2>
      
      <div className="space-y-6">
        <section className="bg-panel border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-text mb-4 uppercase tracking-wider">General</h3>
            <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                    <p className="text-sm text-text">Auto-Refresh</p>
                    <p className="text-xs text-muted">Poll GitHub for updates every 15s</p>
                </div>
                <button className="text-accent"><ToggleRight className="w-8 h-8" /></button>
            </div>
             <div className="flex items-center justify-between py-2 pt-4">
                <div>
                    <p className="text-sm text-text">Post Alerts to Chat</p>
                    <p className="text-xs text-muted">Notify when CI fails or review is requested</p>
                </div>
                <button className="text-accent"><ToggleRight className="w-8 h-8" /></button>
            </div>
        </section>

        <section className="bg-panel border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-text mb-4 uppercase tracking-wider">Privacy & Permissions</h3>
             <div className="flex items-start gap-3 mb-4">
                <Shield className="w-5 h-5 text-success mt-0.5" />
                <div>
                    <p className="text-sm text-text">Read-Only Mode Active</p>
                    <p className="text-xs text-muted mt-1">
                        This widget operates in read-only mode. It fetches PR metadata and Check statuses from GitHub.
                        It does not store your code or tokens persistently.
                    </p>
                </div>
            </div>
            <div className="mt-2 p-3 bg-canvas rounded border border-border text-xs text-muted font-mono">
                Scope: repo:read, checks:read, user:read
            </div>
        </section>

        <section className="pt-4 border-t border-border">
            <button className="flex items-center gap-2 text-danger hover:text-red-400 transition-colors text-sm font-medium">
                <LogOut className="w-4 h-4" />
                Disconnect GitHub Account
            </button>
        </section>
      </div>
    </div>
  );
};