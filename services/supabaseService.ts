import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ProjectState, Expense, LogEntry, DesignItem, ChatMessage, TimelineMilestone } from '../types';

const PROJECT_ID = 'default-project'; // For now, single project. Can be extended later.

// Check if Supabase is configured
const checkSupabase = (): void => {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  }
};

// Projects table operations
export const getProject = async (): Promise<ProjectState | null> => {
  checkSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', PROJECT_ID)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Project doesn't exist, create default
      return await createDefaultProject();
    }
    console.error('Error fetching project:', error);
    return null;
  }

  // Fetch all related data
  const [expenses, logs, designs, messages, timeline] = await Promise.all([
    getExpenses(),
    getLogs(),
    getDesigns(),
    getMessages(),
    getTimeline(),
  ]);

  return {
    projectName: data.name || 'Modern Loft Project',
    totalBudget: data.total_budget || 50000,
    expenses: expenses || [],
    logs: logs || [],
    designs: designs || [],
    messages: messages || [],
    timeline: timeline || [],
  };
};

const createDefaultProject = async (): Promise<ProjectState | null> => {
  const defaultProject = {
    id: PROJECT_ID,
    name: 'Modern Loft Project',
    total_budget: 50000,
  };

  const { error } = await supabase
    .from('projects')
    .insert(defaultProject);

  if (error) {
    console.error('Error creating default project:', error);
    return null;
  }

  return {
    projectName: defaultProject.name,
    totalBudget: defaultProject.total_budget,
    expenses: [],
    logs: [],
    designs: [],
    messages: [],
    timeline: [],
  };
};

export const updateProject = async (updates: { projectName?: string; totalBudget?: number }): Promise<boolean> => {
  const { error } = await supabase
    .from('projects')
    .update({
      name: updates.projectName,
      total_budget: updates.totalBudget,
    })
    .eq('id', PROJECT_ID);

  if (error) {
    console.error('Error updating project:', error);
    return false;
  }
  return true;
};

// Expenses operations
export const getExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return data.map((e: any) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    category: e.category,
    date: e.date,
    author: e.author,
    notes: e.notes,
  }));
};

export const addExpense = async (expense: Expense): Promise<boolean> => {
  const { error } = await supabase
    .from('expenses')
    .insert({
      id: expense.id,
      project_id: PROJECT_ID,
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      author: expense.author,
      notes: expense.notes,
    });

  if (error) {
    console.error('Error adding expense:', error);
    return false;
  }
  return true;
};

export const deleteExpense = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('project_id', PROJECT_ID);

  if (error) {
    console.error('Error deleting expense:', error);
    return false;
  }
  return true;
};

// Logs operations
export const getLogs = async (): Promise<LogEntry[]> => {
  const { data, error } = await supabase
    .from('site_logs')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }

  return data.map((l: any) => ({
    id: l.id,
    author: l.author,
    timestamp: l.timestamp,
    content: l.content,
    type: l.type,
  }));
};

export const addLog = async (log: LogEntry): Promise<boolean> => {
  const { error } = await supabase
    .from('site_logs')
    .insert({
      id: log.id,
      project_id: PROJECT_ID,
      author: log.author,
      timestamp: log.timestamp,
      content: log.content,
      type: log.type,
    });

  if (error) {
    console.error('Error adding log:', error);
    return false;
  }
  return true;
};

// Design items (Moodboard) operations
export const getDesigns = async (): Promise<DesignItem[]> => {
  const { data, error } = await supabase
    .from('moodboard')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching designs:', error);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    url: d.image_url || d.url, // Support both field names
    caption: d.caption,
    timestamp: d.timestamp,
    author: d.author,
  }));
};

export const uploadDesignImage = async (file: File, caption: string, author: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `moodboard/${PROJECT_ID}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('moodboard-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('moodboard-images')
    .getPublicUrl(filePath);

  // Store metadata in database
  const designId = crypto.randomUUID();
  const { error: dbError } = await supabase
    .from('moodboard')
    .insert({
      id: designId,
      project_id: PROJECT_ID,
      image_url: publicUrl,
      caption,
      author,
      timestamp: new Date().toISOString(),
    });

  if (dbError) {
    console.error('Error saving design metadata:', dbError);
    return null;
  }

  return publicUrl;
};

export const deleteDesign = async (id: string, imageUrl: string): Promise<boolean> => {
  // Extract file path from URL
  const urlParts = imageUrl.split('/moodboard-images/');
  if (urlParts.length > 1) {
    const filePath = `moodboard/${PROJECT_ID}/${urlParts[1].split('/').pop()}`;
    await supabase.storage
      .from('moodboard-images')
      .remove([filePath]);
  }

  const { error } = await supabase
    .from('moodboard')
    .delete()
    .eq('id', id)
    .eq('project_id', PROJECT_ID);

  if (error) {
    console.error('Error deleting design:', error);
    return false;
  }
  return true;
};

// Chat messages operations
export const getMessages = async (): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data.map((m: any) => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    audioUrl: m.audio_url,
    type: m.type,
    timestamp: m.timestamp,
  }));
};

export const addMessage = async (message: ChatMessage): Promise<boolean> => {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      id: message.id,
      project_id: PROJECT_ID,
      sender: message.sender,
      text: message.text,
      audio_url: message.audioUrl,
      type: message.type,
      timestamp: message.timestamp,
    });

  if (error) {
    console.error('Error adding message:', error);
    return false;
  }
  return true;
};

export const uploadVoiceNote = async (audioBlob: Blob, sender: string, messageId: string): Promise<string | null> => {
  const fileName = `${crypto.randomUUID()}.webm`;
  const filePath = `voice-notes/${PROJECT_ID}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('voice-notes')
    .upload(filePath, audioBlob, {
      contentType: 'audio/webm',
    });

  if (uploadError) {
    console.error('Error uploading voice note:', uploadError);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('voice-notes')
    .getPublicUrl(filePath);

  // Save message to database
  const { error: dbError } = await supabase
    .from('chat_messages')
    .insert({
      id: messageId,
      project_id: PROJECT_ID,
      sender: sender,
      audio_url: publicUrl,
      type: 'audio',
      timestamp: new Date().toISOString(),
    });

  if (dbError) {
    console.error('Error saving voice note message:', dbError);
    return null;
  }

  return publicUrl;
};

// Timeline operations
export const getTimeline = async (): Promise<TimelineMilestone[]> => {
  const { data, error } = await supabase
    .from('timeline')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching timeline:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    title: t.title,
    startDate: t.start_date,
    endDate: t.end_date,
    status: t.status,
    description: t.description,
  }));
};

export const addMilestone = async (milestone: TimelineMilestone): Promise<boolean> => {
  const { error } = await supabase
    .from('timeline')
    .insert({
      id: milestone.id,
      project_id: PROJECT_ID,
      title: milestone.title,
      start_date: milestone.startDate,
      end_date: milestone.endDate,
      status: milestone.status,
      description: milestone.description,
    });

  if (error) {
    console.error('Error adding milestone:', error);
    return false;
  }
  return true;
};

export const updateMilestone = async (id: string, status: TimelineMilestone['status']): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('timeline')
    .update({ status })
    .eq('id', id)
    .eq('project_id', PROJECT_ID);

  if (error) {
    console.error('Error updating milestone:', error);
    return false;
  }
  return true;
};

export const deleteMilestone = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { error } = await supabase
    .from('timeline')
    .delete()
    .eq('id', id)
    .eq('project_id', PROJECT_ID);

  if (error) {
    console.error('Error deleting milestone:', error);
    return false;
  }
  return true;
};

// Real-time subscriptions
export const subscribeToExpenses = (callback: (expense: Expense) => void) => {
  return supabase
    .channel('expenses-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'expenses',
      filter: `project_id=eq.${PROJECT_ID}`,
    }, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const e = payload.new as any;
        callback({
          id: e.id,
          name: e.name,
          amount: e.amount,
          category: e.category,
          date: e.date,
          author: e.author,
          notes: e.notes,
        });
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // Handle deletion if needed
      }
    })
    .subscribe();
};

export const subscribeToLogs = (callback: (log: LogEntry) => void) => {
  return supabase
    .channel('logs-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'site_logs',
      filter: `project_id=eq.${PROJECT_ID}`,
    }, (payload) => {
      if (payload.new) {
        const l = payload.new as any;
        callback({
          id: l.id,
          author: l.author,
          timestamp: l.timestamp,
          content: l.content,
          type: l.type,
        });
      }
    })
    .subscribe();
};

export const subscribeToMessages = (callback: (message: ChatMessage) => void) => {
  return supabase
    .channel('messages-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `project_id=eq.${PROJECT_ID}`,
    }, (payload) => {
      if (payload.new) {
        const m = payload.new as any;
        callback({
          id: m.id,
          sender: m.sender,
          text: m.text,
          audioUrl: m.audio_url,
          type: m.type,
          timestamp: m.timestamp,
        });
      }
    })
    .subscribe();
};

export const subscribeToDesigns = (callback: (design: DesignItem) => void) => {
  return supabase
    .channel('designs-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'moodboard',
      filter: `project_id=eq.${PROJECT_ID}`,
    }, (payload) => {
      if (payload.new) {
        const d = payload.new as any;
        callback({
          id: d.id,
          url: d.image_url || d.url,
          caption: d.caption,
          timestamp: d.timestamp,
          author: d.author,
        });
      }
    })
    .subscribe();
};

export const subscribeToTimeline = (callback: (milestone: TimelineMilestone) => void) => {
  return supabase
    .channel('timeline-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'timeline',
      filter: `project_id=eq.${PROJECT_ID}`,
    }, (payload) => {
      if (payload.new) {
        const t = payload.new as any;
        callback({
          id: t.id,
          title: t.title,
          startDate: t.start_date,
          endDate: t.end_date,
          status: t.status,
          description: t.description,
        });
      }
    })
    .subscribe();
};

