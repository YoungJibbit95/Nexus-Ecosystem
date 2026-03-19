import React from "react";
import { AlertCircle, AlertTriangle, Info, XCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProblemsPanel({ problems, onSelectProblem }) {
  const [filter, setFilter] = React.useState("all"); // all, error, warning

  const filteredProblems = problems.filter(p => {
    if (filter === "error") return p.severity === 8; // Monaco Error severity
    if (filter === "warning") return p.severity === 4; // Monaco Warning severity
    return true;
  });

  const errorCount = problems.filter(p => p.severity === 8).length;
  const warningCount = problems.filter(p => p.severity === 4).length;

  // Group by file
  const grouped = filteredProblems.reduce((acc, p) => {
    // Monaco resource can be a URI object
    const file = (p.resource && p.resource.path) ? p.resource.path : (p.resource || "Unknown File");
    if (!acc[file]) acc[file] = [];
    acc[file].push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header / Filter Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 shrink-0 bg-black/20">
        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 px-2 py-1 rounded" onClick={() => setFilter("all")}>
          <div className={`w-1.5 h-1.5 rounded-full ${filter === 'all' ? 'bg-purple-500 shadow-[0_0_8px_#8b5cf6]' : 'bg-gray-600'}`} />
          <span className={`text-[11px] font-semibold ${filter === 'all' ? 'text-white' : 'text-gray-500'}`}>ALL ({problems.length})</span>
        </div>
        
        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 px-2 py-1 rounded" onClick={() => setFilter("error")}>
          <XCircle size={12} className={errorCount > 0 ? "text-red-500" : "text-gray-600"} />
          <span className={`text-[11px] font-semibold ${filter === 'error' ? 'text-white' : 'text-gray-500'}`}>ERRORS ({errorCount})</span>
        </div>

        <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 px-2 py-1 rounded" onClick={() => setFilter("warning")}>
          <AlertTriangle size={12} className={warningCount > 0 ? "text-yellow-500" : "text-gray-600"} />
          <span className={`text-[11px] font-semibold ${filter === 'warning' ? 'text-white' : 'text-gray-500'}`}>WARNINGS ({warningCount})</span>
        </div>

        <div className="ml-auto relative">
           <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
           <input 
             type="text" 
             placeholder="Filter problems..." 
             className="bg-white/5 border border-white/10 rounded-md pl-7 pr-2 py-1 text-[10px] w-48 outline-none focus:border-purple-500/50 transition-all text-gray-300"
           />
        </div>
      </div>

      {/* Problems List */}
      <div className="flex-1 overflow-y-auto p-2">
        {problems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50">
             <AlertCircle size={32} strokeWidth={1} />
             <span className="text-xs tracking-widest uppercase">Keine Fehler gefunden</span>
          </div>
        ) : (
          Object.entries(grouped).map(([file, fileProblems]) => (
            <div key={file} className="mb-4 last:mb-0">
               <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-gray-400 font-medium opacity-80 mb-1 sticky top-0 bg-[#060614]/80 backdrop-blur-md rounded">
                  <span className="truncate">{file.split(/[\\/]/).pop()}</span>
                  <span className="text-[9px] text-gray-600 font-normal">({fileProblems.length})</span>
               </div>
               
               <div className="space-y-0.5">
                  {fileProblems.map((p, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 4, background: "rgba(255,255,255,0.03)" }}
                      onClick={() => onSelectProblem(p)}
                      className="flex items-start gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-colors group"
                    >
                       <div className="mt-0.5">
                          {p.severity === 8 ? (
                            <XCircle size={14} className="text-red-500" />
                          ) : p.severity === 4 ? (
                            <AlertTriangle size={14} className="text-yellow-500" />
                          ) : (
                            <Info size={14} className="text-blue-500" />
                          )}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-gray-300 group-hover:text-white transition-colors leading-tight mb-0.5">
                             {p.message}
                          </p>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] text-gray-600 font-mono">Ln {p.startLineNumber}, Col {p.startColumn}</span>
                             <span className="text-[10px] text-gray-600/60 truncate">{p.source || 'nexus'}</span>
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
