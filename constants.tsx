
import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  ClipboardList, 
  Settings, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle,
  Sparkles,
  Trash2,
  Calendar,
  Wallet,
  Image as ImageIcon,
  MessageCircle,
  Send,
  GanttChartSquare,
  Clock,
  Mic,
  Square,
  Play,
  Pause,
  Lock
} from 'lucide-react';

export const CATEGORIES = [
  'Furniture',
  'Lighting',
  'Flooring',
  'Wall Decor',
  'Fabrics',
  'Accessories',
  'Labor',
  'Consultancy',
  'Other'
];

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Expenses: <Receipt size={20} />,
  Logs: <ClipboardList size={20} />,
  Settings: <Settings size={20} />,
  Plus: <Plus size={18} />,
  Spending: <TrendingUp size={20} />,
  Savings: <TrendingDown size={20} />,
  Warning: <AlertCircle size={20} />,
  AI: <Sparkles size={20} />,
  Delete: <Trash2 size={18} />,
  Date: <Calendar size={16} />,
  Budget: <Wallet size={20} />,
  Design: <ImageIcon size={20} />,
  Chat: <MessageCircle size={20} />,
  Send: <Send size={18} />,
  Timeline: <GanttChartSquare size={20} />,
  Clock: <Clock size={16} />,
  Mic: <Mic size={20} />,
  Stop: <Square size={18} />,
  Play: <Play size={16} />,
  Pause: <Pause size={16} />,
  Lock: <Lock size={24} />
};
