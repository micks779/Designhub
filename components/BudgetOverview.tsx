
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ProjectState } from '../types';

interface BudgetOverviewProps {
  project: ProjectState;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ project }) => {
  const totalSpent = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = Math.max(0, project.totalBudget - totalSpent);
  const percentSpent = project.totalBudget > 0 ? (totalSpent / project.totalBudget) * 100 : 0;

  const data = [
    { name: 'Spent', value: totalSpent, color: '#6366f1' },
    { name: 'Remaining', value: remaining, color: '#e5e7eb' },
  ];

  if (totalSpent > project.totalBudget) {
    data[1] = { name: 'Over Budget', value: totalSpent - project.totalBudget, color: '#ef4444' };
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center">
      <h3 className="text-gray-500 text-sm font-medium mb-4 self-start">Budget Allocation</h3>
      
      <div className="w-full h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{Math.round(percentSpent)}%</span>
          <span className="text-xs text-gray-400">Used</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-4 mt-4">
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Budget</p>
          <p className="text-lg font-semibold text-gray-800">£{project.totalBudget.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Remaining</p>
          <p className={`text-lg font-semibold ${remaining < 0 ? 'text-red-500' : 'text-green-600'}`}>
            £{remaining.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetOverview;
