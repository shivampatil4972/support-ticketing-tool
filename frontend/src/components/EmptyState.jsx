import React from 'react';
import { FaInbox } from 'react-icons/fa';

const EmptyState = ({ 
  title = "No Data Found", 
  message = "There's nothing here yet.", 
  action = null,
  icon = <FaInbox className="w-12 h-12 text-slate-300 dark:text-slate-600" />
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 dark:border-slate-700/50 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
      <div className="mb-4 flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">{message}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
