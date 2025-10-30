'use client';

import React, { useState } from 'react';
import { useSession, signIn } from "next-auth/react";
import { useEffect} from "react";
import { Calendar, MessageSquare, Mail, BarChart3, Clock, Menu, X, Send, User, Lock, ArrowRight, CheckCircle, Bell, Settings, LogOut } from 'lucide-react';

export default function AstraApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your Astra assistant. How can I help you today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Auth Pages
  const LoginPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Log in to your Astra account</p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); setCurrentPage('dashboard'); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700">Forgot password?</a>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
            >
              Log In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
        
        <p className="text-center mt-6 text-gray-600">
          Don&apos;t have an account? 
          <button onClick={() => setCurrentPage('signup')} className="text-indigo-600 hover:text-indigo-700 font-medium ml-1">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );

  const SignupPage = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-600 mt-2">Join Astra and boost your productivity</p>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); setCurrentPage('dashboard'); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>
            
            <label className="flex items-start">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-1" required />
              <span className="ml-2 text-sm text-gray-600">I agree to the Terms of Service and Privacy Policy</span>
            </label>
            
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
        
        <p className="text-center mt-6 text-gray-600">
          Already have an account? 
          <button onClick={() => setCurrentPage('login')} className="text-indigo-600 hover:text-indigo-700 font-medium ml-1">
            Log in
          </button>
        </p>
      </div>
    </div>
  );

  // Home/Landing Page
  const HomePage = () => (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AT</span>
              </div>
              <span className="text-xl font-bold text-gray-800">Astra</span>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setCurrentPage('login')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Log In
              </button>
              <button 
                onClick={() => setCurrentPage('signup')}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Digital Twin for<br />Smarter Work Management
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Astra uses AI to manage your tasks, emails, meetings, and decisions—so you can focus on what matters most.
          </p>
          <button 
            onClick={() => setCurrentPage('signup')}
            className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-lg inline-flex items-center gap-2"
          >
            Start Your Free Trial <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Smart Calendar</h3>
            <p className="text-gray-600">AI analyzes your schedule and suggests optimal times for focused work and meetings.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Email Assistant</h3>
            <p className="text-gray-600">Auto-summarize emails and draft replies in your personal tone and style.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Weekly insights and recommendations based on your productivity patterns.</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to get started?</h2>
          <p className="text-gray-600 mb-6">Join thousands of professionals who trust Astra</p>
          <button 
            onClick={() => setCurrentPage('signup')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Create Free Account
          </button>
        </div>
      </div>
    </div>
  );

  // Dashboard Sidebar
  const Sidebar = () => (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AT</span>
            </div>
            <span className="font-bold text-gray-800">Astra</span>
          </div>
        )}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {[
            { icon: MessageSquare, label: 'Chat Assistant', page: 'dashboard' },
            { icon: Calendar, label: 'Calendar', page: 'calendar' },
            { icon: Mail, label: 'Email Hub', page: 'email' },
            { icon: BarChart3, label: 'Analytics', page: 'analytics' },
            { icon: Clock, label: 'Task Manager', page: 'tasks' }
          ].map((item) => (
            <button
              key={item.page}
              onClick={() => setCurrentPage(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                currentPage === item.page 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition">
          <Settings className="w-5 h-5" />
          {sidebarOpen && <span>Settings</span>}
        </button>
        <button 
          onClick={() => { setIsLoggedIn(false); setCurrentPage('home'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
        >
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

 const ChatInterface = () => {
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    setChatMessages([...chatMessages, { role: "user", content: inputMessage }]);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I understand you need help with that. Let me analyze your schedule and provide recommendations.",
        },
      ]);
    }, 1000);

    setInputMessage("");
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Chat Assistant</h2>
          <p className="text-sm text-gray-600">Your AI-powered productivity companion</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-2xl rounded-2xl px-6 py-4 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-800"
              }`}
            >
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask Astra anything..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

  // Calendar View
 const CalendarView = () => {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      if (!session) return;
      setLoading(true);
      try {
        const res = await fetch("/api/calendar/events");
        const data = await res.json();
        if (data.items) setEvents(data.items);
      } catch (err) {
        console.error("Error fetching calendar events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [session]);

  // If user not logged in with Google
  if (!session) {
    return (
      <div className="flex-1 bg-gray-50 p-6 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Calendar Co-Pilot</h2>
        <p className="text-gray-600 mb-6">
          Connect your Google Calendar to see real-time events and AI insights.
        </p>
        <button
          onClick={() => signIn("google")}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          Connect Google Calendar
        </button>
      </div>
    );
  }

  // Once user is logged in
  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Calendar Co-Pilot</h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
              <button
  onClick={async () => {
    const event = {
      summary: "Test Event from Work Twin",
      start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    };

    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ Event created: " + data.event.summary);
      window.location.reload();
    } else {
      alert("❌ Failed to create event: " + data.error);
    }
  }}
  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
  + New Event
</button>

            </div>
          </div>

          {/* Week View */}
          <div className="grid md:grid-cols-7 gap-2 mb-6">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
              <div
                key={day}
                className={`text-center p-4 rounded-lg ${
                  idx === new Date().getDay() - 1
                    ? "bg-indigo-50 border-2 border-indigo-600"
                    : "border border-gray-200"
                }`}
              >
                <div className="text-sm text-gray-600">{day}</div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    idx === new Date().getDay() - 1 ? "text-indigo-600" : "text-gray-800"
                  }`}
                >
                  {new Date().getDate() - (new Date().getDay() - 1) + idx}
                </div>
              </div>
            ))}
          </div>

          {/* AI Suggestion */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-900">AI Suggestion</h4>
                <p className="text-blue-700 text-sm mt-1">
                  You have {events.length || "no"} meetings coming up. Consider blocking 2–4 PM for deep work.
                </p>
              </div>
            </div>
          </div>

          {/* Events Section */}
          <h3 className="font-bold text-gray-800 mb-4">Today&apos;s Schedule</h3>

          {loading ? (
            <p className="text-gray-600">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-gray-600">No upcoming events found.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event, idx) => {
                const start = event.start?.dateTime || event.start?.date;
                const type =
                  event.summary?.toLowerCase().includes("meet") ? "meeting" :
                  event.summary?.toLowerCase().includes("break") ? "break" :
                  event.summary?.toLowerCase().includes("focus") ? "focus" :
                  "task";

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="text-sm font-medium text-gray-600 w-24">
                      {start ? new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                    </div>
                    <div
                      className={`w-1 h-12 rounded ${
                        type === "meeting"
                          ? "bg-blue-500"
                          : type === "focus"
                          ? "bg-green-500"
                          : type === "break"
                          ? "bg-yellow-500"
                          : "bg-purple-500"
                      }`}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{event.summary || "Untitled Event"}</h4>
                      <p className="text-sm text-gray-600 capitalize">{type}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

  // Render based on current page
  if (!isLoggedIn) {
    if (currentPage === 'login') return <LoginPage />;
    if (currentPage === 'signup') return <SignupPage />;
    return <HomePage />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      {currentPage === 'dashboard' && <ChatInterface />}
      {currentPage === 'calendar' && <CalendarView />}
      {currentPage === 'email' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Email Hub</h3>
            <p className="text-gray-600">Coming soon</p>
          </div>
        </div>
      )}
      {currentPage === 'analytics' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Analytics Dashboard</h3>
            <p className="text-gray-600">Coming soon</p>
          </div>
        </div>
      )}
      {currentPage === 'tasks' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Task Manager</h3>
            <p className="text-gray-600">Coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}