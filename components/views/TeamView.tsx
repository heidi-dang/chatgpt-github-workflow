import React from 'react';
import { TeamMember } from '../../types';
import { User, CheckCircle2, AlertTriangle, FileText, Loader2 } from 'lucide-react';

interface TeamViewProps {
  members: TeamMember[];
}

export const TeamView: React.FC<TeamViewProps> = ({ members }) => {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
         <div>
            <h2 className="text-lg font-semibold text-text">Dev Pipeline</h2>
            <p className="text-xs text-muted">Planner &rarr; Runner &rarr; Reviewer &rarr; Auditor</p>
         </div>
         <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 bg-green-900/20 text-green-400 rounded border border-green-800">
                <CheckCircle2 className="w-3 h-3" /> Gating Passed
            </span>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map((member) => (
          <div key={member.name} className="bg-panel border border-border rounded-lg p-4 relative overflow-hidden group hover:border-accent transition-colors">
            {/* Status Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${
                member.status === 'active' ? 'bg-accent animate-pulse' : 
                member.status === 'blocked' ? 'bg-danger' : 
                'bg-muted'
            }`}></div>

            <div className="flex items-start justify-between mb-4">
               <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center text-text font-bold">
                       {member.name.substring(0,2).toUpperCase()}
                   </div>
                   <div>
                       <h3 className="text-sm font-medium text-text">{member.name}</h3>
                       <p className="text-xs text-muted">{member.role}</p>
                   </div>
               </div>
               {member.status === 'active' && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
               {member.status === 'blocked' && <AlertTriangle className="w-4 h-4 text-danger" />}
            </div>

            <div className="space-y-3">
                <div className="bg-canvas/50 rounded p-2 border border-border">
                    <span className="text-[10px] uppercase text-muted font-bold block mb-1">Current Phase</span>
                    <p className="text-sm text-text">{member.phase}</p>
                </div>

                {member.lastArtifact && (
                    <div className="flex items-center gap-2 text-xs text-accent hover:underline cursor-pointer">
                        <FileText className="w-3 h-3" />
                        {member.lastArtifact}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                <span className="text-[10px] text-muted uppercase font-bold">Worklog</span>
                <span className="text-[10px] text-success">Updated 2m ago</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Governance Footer */}
      <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg flex items-start gap-3">
         <div className="p-2 bg-blue-900/20 rounded-full text-blue-400">
             <User className="w-4 h-4" />
         </div>
         <div>
             <h4 className="text-sm font-medium text-blue-200">Governance Rule: PR Description Quality</h4>
             <p className="text-xs text-blue-300/70 mt-1">
                 All PRs must include a "Why", "What", and "How" section. 
                 <br/>Current Score: <span className="font-bold text-success">A+</span>
             </p>
         </div>
      </div>
    </div>
  );
};