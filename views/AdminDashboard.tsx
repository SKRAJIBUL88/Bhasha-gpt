import React from 'react';
import { Card } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, MessageSquare, AlertTriangle } from 'lucide-react';

export const AdminDashboard = () => {
  const data = [
    { name: 'Jan', users: 400, rev: 2400 },
    { name: 'Feb', users: 300, rev: 1398 },
    { name: 'Mar', users: 2000, rev: 9800 },
    { name: 'Apr', users: 2780, rev: 3908 },
    { name: 'May', users: 1890, rev: 4800 },
    { name: 'Jun', users: 2390, rev: 3800 },
  ];

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card>
       <div className="flex items-center justify-between">
          <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
              <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={24} className="text-white" />
          </div>
       </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <StatCard title="Total Users" value="12,345" icon={Users} color="bg-blue-500" />
         <StatCard title="Revenue" value="₹4.2L" icon={DollarSign} color="bg-green-500" />
         <StatCard title="Chats Today" value="8,932" icon={MessageSquare} color="bg-purple-500" />
         <StatCard title="Support Tickets" value="14" icon={AlertTriangle} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
              <h3 className="font-bold mb-6">User Growth & Revenue</h3>
              <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="rev" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
          </Card>

          <Card>
              <h3 className="font-bold mb-4">Recent Signups</h3>
              <div className="space-y-4">
                 {[1,2,3,4,5].map(i => (
                     <div key={i} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                             <div>
                                 <p className="font-medium text-sm">User {i}</p>
                                 <p className="text-xs text-slate-500">user{i}@gmail.com</p>
                             </div>
                         </div>
                         <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Active</span>
                     </div>
                 ))}
              </div>
          </Card>
      </div>
    </div>
  );
};
