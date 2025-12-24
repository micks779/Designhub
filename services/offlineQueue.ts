// Offline queue for local-first approach
// Stores operations that need to be synced when connection is restored

interface QueuedOperation {
  id: string;
  type: 'expense' | 'log' | 'message' | 'design' | 'milestone' | 'project';
  action: 'add' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

const QUEUE_KEY = 'designhub_offline_queue';

export const addToQueue = (operation: Omit<QueuedOperation, 'id' | 'timestamp'>): void => {
  const queue = getQueue();
  const newOperation: QueuedOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  queue.push(newOperation);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = (): QueuedOperation[] => {
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const clearQueue = (): void => {
  localStorage.removeItem(QUEUE_KEY);
};

export const processQueue = async (): Promise<{ success: number; failed: number }> => {
  const queue = getQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: QueuedOperation[] = [];

  // Import here to avoid circular dependencies
  const {
    addExpense,
    addLog,
    addMessage,
    uploadDesignImage,
    addMilestone,
    updateProject,
    deleteExpense,
  } = await import('./supabaseService');

  for (const op of queue) {
    try {
      switch (op.type) {
        case 'expense':
          if (op.action === 'add') {
            await addExpense(op.data);
            success++;
          } else if (op.action === 'delete') {
            await deleteExpense(op.data.id);
            success++;
          }
          break;
        case 'log':
          if (op.action === 'add') {
            await addLog(op.data);
            success++;
          }
          break;
        case 'message':
          if (op.action === 'add') {
            await addMessage(op.data);
            success++;
          }
          break;
        case 'design':
          if (op.action === 'add') {
            // Note: For designs, we'd need the file blob, which might not be in queue
            // This is a simplified version - you might want to handle this differently
            failed++;
            remaining.push(op);
          }
          break;
        case 'milestone':
          if (op.action === 'add') {
            await addMilestone(op.data);
            success++;
          }
          break;
        case 'project':
          if (op.action === 'update') {
            await updateProject(op.data);
            success++;
          }
          break;
      }
    } catch (error) {
      console.error('Error processing queued operation:', error);
      failed++;
      remaining.push(op);
    }
  }

  // Save remaining operations
  if (remaining.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    clearQueue();
  }

  return { success, failed };
};

