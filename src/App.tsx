import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings as SettingsIcon, MessageSquare, Bell, Search, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Sidebar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: MessageSquare, label: "Live Logs", path: "/logs" },
    { icon: Users, label: "Leads", path: "/leads" },
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
  ];

  return (
    <div className={cn("bg-[#141414] text-[#E4E3E0] h-screen transition-all duration-300 flex flex-col", isOpen ? "w-64" : "w-20")}>
      <div className="p-6 flex items-center justify-between border-b border-[#2A2A2A]">
        {isOpen && <h1 className="font-serif italic text-xl font-bold tracking-tight">Ansury</h1>}
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-[#2A2A2A] rounded">
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav className="flex-1 py-6">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center px-6 py-4 transition-colors hover:bg-[#2A2A2A]",
              location.pathname === item.path && "bg-[#2A2A2A] border-r-4 border-[#F27D26]"
            )}
          >
            <item.icon size={20} className={cn(location.pathname === item.path ? "text-[#F27D26]" : "text-[#8E9299]")} />
            {isOpen && <span className="ml-4 font-sans text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>
      <div className="p-6 border-t border-[#2A2A2A]">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-[#F27D26] flex items-center justify-center text-xs font-bold">AS</div>
          {isOpen && (
            <div className="ml-3">
              <p className="text-xs font-bold">Admin User</p>
              <p className="text-[10px] text-[#8E9299]">System Architect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Header = () => (
  <header className="h-16 border-b border-[#E4E3E0] bg-white flex items-center justify-between px-8">
    <div className="flex items-center bg-[#F5F5F5] px-3 py-1.5 rounded-md w-96">
      <Search size={16} className="text-[#8E9299]" />
      <input type="text" placeholder="Search conversations or leads..." className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full" />
    </div>
    <div className="flex items-center space-x-4">
      <button className="p-2 hover:bg-[#F5F5F5] rounded-full relative">
        <Bell size={20} className="text-[#141414]" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-[#F27D26] rounded-full border-2 border-white"></span>
      </button>
      <div className="h-8 w-px bg-[#E4E3E0]"></div>
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono text-[#F27D26] bg-[#F27D26]/10 px-2 py-0.5 rounded">SYSTEM ONLINE</span>
      </div>
    </div>
  </header>
);

// --- Pages ---

const DashboardPage = () => {
  const stats = [
    { label: "Active Threads", value: "128", change: "+12%" },
    { label: "Conversion Rate", value: "24.5%", change: "+3.2%" },
    { label: "Avg Response Time", value: "1.2s", change: "-0.4s" },
    { label: "Total Leads", value: "1,429", change: "+84" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 border border-[#E4E3E0] rounded-lg shadow-sm">
            <p className="text-xs font-serif italic text-[#8E9299] uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-mono font-bold">{stat.value}</h3>
              <span className={cn("text-xs font-bold px-2 py-1 rounded", stat.change.startsWith("+") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-[#E4E3E0] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#E4E3E0] flex justify-between items-center bg-[#F9F9F9]">
            <h3 className="font-serif italic text-sm font-bold">Recent Lead Activity</h3>
            <Link to="/leads" className="text-xs text-[#F27D26] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#E4E3E0]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5] transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded bg-[#141414] text-white flex items-center justify-center font-mono text-xs">LD</div>
                  <div className="ml-4">
                    <p className="text-sm font-bold">Lead #{i * 123}</p>
                    <p className="text-xs text-[#8E9299]">Captured via WhatsApp • 2m ago</p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">QUALIFIED</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E4E3E0] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#E4E3E0] flex justify-between items-center bg-[#F9F9F9]">
            <h3 className="font-serif italic text-sm font-bold">System Health</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span>API LATENCY</span>
                <span>45ms</span>
              </div>
              <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#F27D26] w-[15%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span>DATABASE LOAD</span>
                <span>22%</span>
              </div>
              <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#141414] w-[22%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span>WHATSAPP WEBHOOK</span>
                <span className="text-green-600">ACTIVE</span>
              </div>
              <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/logs")
      .then(res => res.json())
      .then(data => setLogs(data));
  }, []);

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif italic font-bold">Real-time AI Logs</h2>
          <p className="text-sm text-[#8E9299]">Monitoring live interactions across all agents.</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1.5 text-xs font-mono border border-[#E4E3E0] rounded bg-white hover:bg-[#F5F5F5]">PAUSE STREAM</button>
          <button className="px-3 py-1.5 text-xs font-mono bg-[#141414] text-white rounded hover:bg-black">EXPORT CSV</button>
        </div>
      </div>
      
      <div className="flex-1 bg-white border border-[#E4E3E0] rounded-lg overflow-hidden flex flex-col shadow-sm">
        <div className="grid grid-cols-[100px_150px_1fr_100px] p-3 bg-[#F9F9F9] border-b border-[#E4E3E0] text-[10px] font-mono text-[#8E9299] uppercase tracking-wider">
          <div>TIMESTAMP</div>
          <div>SENDER</div>
          <div>MESSAGE</div>
          <div>AGENT</div>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-[#E4E3E0]">
          {logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[100px_150px_1fr_100px] p-4 hover:bg-[#F5F5F5] transition-colors items-center">
              <div className="text-[#8E9299]">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
              <div className="font-bold">{log.from}</div>
              <div className="pr-4">{log.message}</div>
              <div>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold",
                  log.agent === "Sales" ? "bg-orange-100 text-orange-700" : 
                  log.agent === "Support" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                )}>
                  {log.agent}
                </span>
              </div>
            </div>
          ))}
          {/* Mocking streaming logs */}
          {[...Array(10)].map((_, i) => (
            <div key={`mock-${i}`} className="grid grid-cols-[100px_150px_1fr_100px] p-4 hover:bg-[#F5F5F5] transition-colors items-center opacity-50">
              <div className="text-[#8E9299]">14:22:0{i}</div>
              <div className="font-bold">WhatsApp User</div>
              <div className="pr-4 italic">Processing incoming message...</div>
              <div><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">PENDING</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LeadsPage = () => {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/leads")
      .then(res => res.json())
      .then(data => setLeads(data));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-serif italic font-bold">Lead Management</h2>
        <p className="text-sm text-[#8E9299]">Captured contact information from AI interactions.</p>
      </div>

      <div className="bg-white border border-[#E4E3E0] rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F9F9F9] border-b border-[#E4E3E0]">
            <tr>
              <th className="p-4 text-[10px] font-mono text-[#8E9299] uppercase tracking-wider">NAME</th>
              <th className="p-4 text-[10px] font-mono text-[#8E9299] uppercase tracking-wider">CONTACT</th>
              <th className="p-4 text-[10px] font-mono text-[#8E9299] uppercase tracking-wider">STATUS</th>
              <th className="p-4 text-[10px] font-mono text-[#8E9299] uppercase tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E3E0]">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-[#F5F5F5] transition-colors">
                <td className="p-4">
                  <p className="text-sm font-bold">{lead.name}</p>
                </td>
                <td className="p-4">
                  <p className="text-xs">{lead.email}</p>
                  <p className="text-[10px] text-[#8E9299]">{lead.phone}</p>
                </td>
                <td className="p-4">
                  <span className="text-[10px] font-mono bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                    {lead.status}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-xs text-[#F27D26] hover:underline font-bold">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    salesPrompt: "",
    marketingPrompt: "",
    supportPrompt: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  const handleSave = () => {
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }).then(() => alert("Settings saved successfully!"));
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-serif italic font-bold">AI Configuration</h2>
        <p className="text-sm text-[#8E9299]">Define the personality and logic for each agent.</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white p-6 border border-[#E4E3E0] rounded-lg shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic font-bold">Sales Agent Prompt</h3>
            <span className="text-[10px] font-mono bg-orange-100 text-orange-700 px-2 py-1 rounded">ACTIVE</span>
          </div>
          <textarea
            className="w-full h-32 p-4 text-sm font-mono border border-[#E4E3E0] rounded focus:ring-1 focus:ring-[#F27D26] focus:border-[#F27D26]"
            value={settings.salesPrompt}
            onChange={(e) => setSettings({ ...settings, salesPrompt: e.target.value })}
          />
          <p className="text-[10px] text-[#8E9299]">This prompt is used when the 'agent_type' flag is set to 'sales' in the database.</p>
        </div>

        <div className="bg-white p-6 border border-[#E4E3E0] rounded-lg shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic font-bold">Marketing Agent Prompt</h3>
            <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded">ACTIVE</span>
          </div>
          <textarea
            className="w-full h-32 p-4 text-sm font-mono border border-[#E4E3E0] rounded focus:ring-1 focus:ring-[#F27D26] focus:border-[#F27D26]"
            value={settings.marketingPrompt}
            onChange={(e) => setSettings({ ...settings, marketingPrompt: e.target.value })}
          />
        </div>

        <div className="bg-white p-6 border border-[#E4E3E0] rounded-lg shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic font-bold">Customer Support Prompt</h3>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">ACTIVE</span>
          </div>
          <textarea
            className="w-full h-32 p-4 text-sm font-mono border border-[#E4E3E0] rounded focus:ring-1 focus:ring-[#F27D26] focus:border-[#F27D26]"
            value={settings.supportPrompt}
            onChange={(e) => setSettings({ ...settings, supportPrompt: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-[#141414] text-white font-bold rounded hover:bg-black transition-colors shadow-lg"
          >
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#F5F5F5] text-[#141414]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><DashboardPage /></motion.div>} />
                <Route path="/logs" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><LogsPage /></motion.div>} />
                <Route path="/leads" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><LeadsPage /></motion.div>} />
                <Route path="/settings" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><SettingsPage /></motion.div>} />
              </Routes>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </Router>
  );
}
