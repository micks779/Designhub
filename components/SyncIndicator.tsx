import React from 'react';

interface SyncIndicatorProps {
  isSyncing: boolean;
  isOnline: boolean;
  lastSynced?: Date;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ isSyncing, isOnline, lastSynced }) => {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></span>
        <p className="text-gray-400 text-xs font-medium">Offline • Changes saved locally</p>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse"></div>
        <p className="text-gray-400 text-xs font-medium">Syncing...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
      <p className="text-gray-400 text-xs font-medium">
        Synced{lastSynced ? ` • ${lastSynced.toLocaleTimeString()}` : ''}
      </p>
    </div>
  );
};

export default SyncIndicator;

