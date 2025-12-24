
import { ProjectState } from "../types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const getProjectInsights = async (project: ProjectState): Promise<string> => {
  const totalSpent = project.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = project.totalBudget - totalSpent;
  const recentLogs = project.logs.slice(-5).map(l => `[${l.type}] ${l.author}: ${l.content}`).join('\n');
  const timelineSummary = project.timeline.map(m => `- ${m.title}: ${m.status} (Ends: ${m.endDate})`).join('\n');

  const prompt = `
    As an expert Interior Design and Construction Project Manager, analyze this project status and provide 3 concise, actionable insights.
    
    Project: ${project.projectName}
    Budget: £${project.totalBudget} | Spent: £${totalSpent} | Remaining: £${remaining}
    
    Current Construction Timeline:
    ${timelineSummary || 'No milestones set.'}
    
    Recent Site Logs:
    ${recentLogs || 'No logs yet.'}
    
    Analyze if the budget matches the timeline progress. If there are 'delayed' milestones, suggest recovery steps.
    Format as clear bullet points.
  `;

  try {
    // Use Supabase Edge Function if configured, otherwise fallback to direct API (for local dev)
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { prompt }
      });

      if (error) {
        console.error("Gemini Proxy Error:", error);
        return "The Design AI is taking a short break. Please try again later.";
      }

      return data?.text || "I couldn't generate insights at this moment. Keep up the great work!";
    } else {
      // Fallback for local development without Supabase
      // This will only work if GEMINI_API_KEY is set in .env
      const geminiKey = import.meta.env.GEMINI_API_KEY;
      if (!geminiKey || geminiKey === 'your_key') {
        return "Gemini API not configured. Please set up Supabase Edge Function or configure GEMINI_API_KEY for local development.";
      }

      // Direct API call (only for local dev - not recommended for production)
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "I couldn't generate insights at this moment. Keep up the great work!";
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The Design AI is taking a short break. Please try again later.";
  }
};
