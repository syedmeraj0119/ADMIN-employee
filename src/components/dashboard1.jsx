import React from 'react';
// Debug helper: confirm this module is loaded by the dev server in the browser console
console.log('[debug] src/components/dashboard1.jsx loaded');
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Bell, Globe, BarChart2, Users, FileText, Settings, HelpCircle } from 'lucide-react';

const COLORS = ['#4ade80', '#facc15', '#d1d5db'];

const data = [
  { name: 'Approved', value: 69 },
  { name: 'Pending', value: 29 },
  { name: 'Completed', value: 2 },
];

// Simple Notifications panel used on the dashboard
function NotificationsPanel({ initial = [] }){
  const [items, setItems] = React.useState(() => initial.length ? initial : [
    { id: 1, type: 'approval', text: 'Pending Approval: Trip to London for Jillian Dee', meta: 'Jillian Dee • London', read: false },
    { id: 2, type: 'advisory', text: 'Travel Advisory: Typhoon warning for Tokyo', meta: 'Tokyo • Weather', read: false },
    { id: 3, type: 'reminder', text: 'Expense Report due for Sept', meta: 'Finance • Due in 3 days', read: false },
  ]);

  const unread = items.filter(i => !i.read).length;

  function markRead(id){
    setItems(items.map(i => i.id === id ? { ...i, read: true } : i));
  }

  function remove(id){
    setItems(items.filter(i => i.id !== id));
  }

  function approve(id){
    // mark as read and remove (demo)
    setItems(items.map(i => i.id === id ? { ...i, read: true, text: i.text + ' — Approved' } : i));
    setTimeout(() => remove(id), 1200);
  }

  function reject(id){
    setItems(items.map(i => i.id === id ? { ...i, read: true, text: i.text + ' — Rejected' } : i));
    setTimeout(() => remove(id), 1200);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Notifications</h3>
        <div className="text-xs text-muted">{unread} unread</div>
      </div>
      <ul className="space-y-3 text-sm">
        {items.length === 0 && <li className="text-xs text-gray-500">No notifications</li>}
        {items.map(item => (
          <li key={item.id} className={`p-3 border rounded-lg ${item.read ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{item.text}</div>
                <div className="text-xs text-gray-500 mt-1">{item.meta}</div>
              </div>
              <div className="ml-4 flex-shrink-0 text-right">
                {item.type === 'approval' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => approve(item.id)} className="px-2 py-1 text-xs bg-green-500 text-white rounded">Approve</button>
                    <button onClick={() => reject(item.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Reject</button>
                  </div>
                )}
                {item.type !== 'approval' && (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => markRead(item.id)} className="px-2 py-1 text-xs bg-gray-100 rounded">Mark read</button>
                    <button onClick={() => remove(item.id)} className="px-2 py-1 text-xs text-red-600">Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Dashboard = () => {
  return (
    <div className="min-h-screen app-root p-8 font-sans text-gray-800">
      <div className="flex gap-6 max-w-[1400px] mx-auto">
        {/* Sidebar (themed) */}
        <aside className="sidebar w-60 bg-white rounded-lg p-4 shadow-md flex flex-col sticky top-8 self-start">
          <div className="sidebar-top p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-900 text-white w-8 h-8 flex items-center justify-center">TD</div>
              <div className="nav-label font-semibold">Travel</div>
            </div>
          </div>

          <nav className="space-y-3 mt-3">
            <SidebarItem icon={BarChart2} text="Dashboard" active />
            <SidebarItem icon={FileText} text="Trips" />
            <SidebarItem icon={Users} text="Travelers" />
            <SidebarItem icon={FileText} text="Reports" />
            <SidebarItem icon={Settings} text="Settings" />
            <SidebarItem icon={HelpCircle} text="Help" />
          </nav>
        </aside>

        {/* Main Content (card wrapper to match TravelDashboard) */}
        <main className="flex-1">
          <div className="max-w-[1160px] mx-auto bg-white/80 rounded-2xl p-6 shadow-lg border border-gray-100">
            <header className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-serif text-slate-800">Travel dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-64 p-2 border rounded-md focus:outline-none"
                />
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <div className="flex items-center space-x-2">
                    <img
                      src="https://via.placeholder.com/40"
                      alt="avatar"
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium">Alex Chen</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-6">
          {/* Trip Overview */}
          <Card title="Trip Overview">
            <p className="text-sm">Upcoming Trips: 3 | Ongoing: 1 | Completed: 1</p>
          </Card>

          {/* Trip Status Pie */}
          <Card title="Trip Status">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={data} dataKey="value" outerRadius={50} fill="#8884d8">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-sm mt-2">Approved 69% | Pending 29% | Completed 2%</div>
          </Card>

          {/* Budget Utilization */}
          <Card title="Budget Utilization">
            <p className="text-sm mb-2">77% utilized</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '77%' }}></div>
            </div>
            <p className="text-xs text-gray-500">$11,400 spent of $23,000 allocated</p>
            <button className="mt-3 bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm">
              View Budget Details
            </button>
          </Card>

          {/* Safety Alerts */}
          <Card title="Safety & Risk Alerts">
            <ul className="text-sm space-y-2">
              <li>High-Risk Zone: Paris, France - Civil Unrest Advisory</li>
              <li>Weather Advisory: Tokyo, Japan - Typhoon Warning</li>
            </ul>
          </Card>

          {/* Carbon Footprint */}
          <Card title="Carbon Footprint Summary">
            <p className="text-lg font-semibold">1.2T CO₂</p>
            <p className="text-sm text-gray-500">Carbon tracked for trips under 300 miles</p>
          </Card>

          {/* ESG/Green Travel */}
          <Card title="ESG / Green Travel Options">
            <p className="text-sm">Can save 15% carbon for trips under 300 miles</p>
          </Card>

          {/* Notifications */}
          <Card title="Notifications">
            <NotificationsPanel />
          </Card>

          {/* Recent Activity */}
          <Card title="Recent Activity">
            <p className="text-sm">You approved a trip request for Jane Smith to Brussels.</p>
            <p className="text-xs text-gray-500 mt-1">5 mins ago</p>
          </Card>
          </div>
            </div>
      </main>
    </div>
  </div>
  );
};

const SidebarItem = ({ icon: Icon, text, active }) => (
  <div
    className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-green-50 ${
      active ? 'bg-green-100 text-green-600 font-semibold' : 'text-gray-700'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span>{text}</span>
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
    <h2 className="font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

export default Dashboard;