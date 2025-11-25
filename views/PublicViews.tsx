import React, { useState } from 'react';
import { Shield, Zap, Globe, MessageCircle, Award, Check, Smartphone, ArrowRight } from 'lucide-react';
import { Button, Card, Badge } from '../components/UI';
import { UserRole, PlanType } from '../types';

interface AuthProps {
  mode: 'login' | 'signup';
  onAuth: (userData: any) => void;
  onSwitch: () => void;
}

export const AuthView: React.FC<AuthProps> = ({ mode, onAuth, onSwitch }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API Call
    setTimeout(() => {
      const isAdmin = email.toLowerCase() === 'admin@bhashagpt.com';
      
      onAuth({
        id: isAdmin ? 'admin_01' : 'u123',
        name: isAdmin ? 'Super Admin' : (mode === 'signup' ? 'New User' : 'Rahul Sharma'),
        email: email,
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
        plan: isAdmin ? PlanType.PREMIUM : PlanType.FREE,
        dailyUsageMinutes: 0,
        xp: isAdmin ? 9999 : 100,
        streak: isAdmin ? 365 : 1,
        joinDate: new Date().toISOString(),
        referralCode: isAdmin ? 'ADMIN' : 'rahul123'
      });
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md glass p-8 animate-slide-up">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">{mode === 'login' ? 'Welcome Back' : 'Join BhashaGPT'}</h2>
          <p className="text-slate-500 dark:text-slate-400">Your personal Indian AI Assistant</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Rahul Sharma" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="rahul@example.com" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
          </div>
          
          <Button type="submit" className="w-full py-3 text-lg" isLoading={isLoading}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={onSwitch} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
             <p className="text-xs text-slate-400">Admin Demo: Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">admin@bhashagpt.com</code></p>
        </div>
      </Card>
    </div>
  );
};

export const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="text-center pt-10 lg:pt-20 relative">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
          Now with Voice Mode & Regional Support
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight animate-slide-up">
          The AI that speaks <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Your Language</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          BhashaGPT is India's most advanced personal AI assistant. It understands your emotions, speaks Hinglish, and helps you grow.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button size="lg" onClick={onGetStarted} className="px-8 h-14 text-lg shadow-indigo-500/30">Start Chatting Free</Button>
          <Button size="lg" variant="outline" className="h-14 text-lg px-8">View Features</Button>
        </div>
        
        {/* Hero Image / UI Mockup */}
        <div className="mt-16 relative max-w-5xl mx-auto transform hover:scale-[1.01] transition-transform duration-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-20"></div>
          <div className="glass rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden p-2 md:p-4">
             <div className="bg-slate-900 rounded-3xl aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                <img src="https://picsum.photos/1200/675" alt="App Interface" className="object-cover w-full h-full opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center">
                        <p className="text-white/80 text-lg mb-2">AI generating script...</p>
                        <div className="flex gap-2 justify-center">
                           <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                           <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                           <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
           <h2 className="text-3xl font-bold mb-4">Why Choose BhashaGPT?</h2>
           <p className="text-slate-500">More than just a chatbot. A complete productivity suite.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
           {[
             { icon: MessageCircle, title: 'Regional Voice AI', desc: 'Talk in Hindi, English, or Hinglish naturally.' },
             { icon: Award, title: 'Exam & Job Prep', desc: 'Mock interviews, resume builder, and study notes.' },
             { icon: Globe, title: 'Emotional Intelligence', desc: 'An AI that understands your mood and context.' },
             { icon: Shield, title: 'Private & Secure', desc: 'Enterprise-grade encryption for your chats.' },
             { icon: Zap, title: 'Lightning Fast', desc: 'Powered by Gemini Flash for instant responses.' },
             { icon: Smartphone, title: 'Works Everywhere', desc: 'Optimized for mobile, tablet, and foldables.' },
           ].map((feature, i) => (
             <Card key={i} className="hover:shadow-lg transition-shadow">
               <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                 <feature.icon size={24} />
               </div>
               <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
               <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
             </Card>
           ))}
        </div>
      </section>

      {/* Founder Teaser */}
      <section className="max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] p-8 md:p-16 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 blur-[100px] opacity-30"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white/10 overflow-hidden shrink-0">
               <img src="https://picsum.photos/300/300" alt="Founder RJ" className="w-full h-full object-cover" />
            </div>
            <div className="text-center md:text-left">
               <Badge color="gold">MEET THE CREATOR</Badge>
               <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4">Hi, I'm RJ.</h2>
               <p className="text-indigo-200 text-lg mb-6">"I built BhashaGPT because India deserves an AI that understands our culture, our languages, and our emotions. Not just a tool, but a companion."</p>
               <Button variant="secondary" onClick={onGetStarted}>Connect with Founder</Button>
            </div>
         </div>
      </section>
    </div>
  );
};

export const PricingView: React.FC<{ onSubscribe: () => void }> = ({ onSubscribe }) => {
    return (
        <div className="max-w-5xl mx-auto py-10 px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-500 mb-12">One plan. Unlimited possibilities.</p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
                {/* Free Plan */}
                <Card className="relative opacity-80 scale-95 hover:scale-100 transition-transform">
                    <h3 className="text-2xl font-bold">Starter</h3>
                    <div className="text-4xl font-bold my-4">₹0<span className="text-base font-normal text-slate-500">/mo</span></div>
                    <ul className="text-left space-y-3 mb-8">
                        <li className="flex items-center"><Check size={16} className="mr-2 text-green-500"/> 30 mins Daily Chat</li>
                        <li className="flex items-center"><Check size={16} className="mr-2 text-green-500"/> Basic Text Generation</li>
                        <li className="flex items-center"><Check size={16} className="mr-2 text-green-500"/> 5 AI Tools</li>
                    </ul>
                    <Button variant="outline" className="w-full">Current Plan</Button>
                </Card>

                {/* Premium Plan */}
                <div className="relative group">
                     <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                     <Card className="relative bg-white dark:bg-slate-900 border-0">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">RECOMMENDED</div>
                        <h3 className="text-2xl font-bold text-indigo-600">Premium</h3>
                        <div className="text-5xl font-bold my-4">₹99<span className="text-base font-normal text-slate-500">/mo</span></div>
                        <p className="text-sm text-slate-400 mb-6">Less than a cup of coffee.</p>
                        
                        <ul className="text-left space-y-4 mb-8">
                            <li className="flex items-center"><Check size={20} className="mr-2 text-indigo-500"/> <strong>Unlimited</strong> AI Chatting</li>
                            <li className="flex items-center"><Check size={20} className="mr-2 text-indigo-500"/> Voice Chat & Text-to-Speech</li>
                            <li className="flex items-center"><Check size={20} className="mr-2 text-indigo-500"/> Access to 25+ AI Tools</li>
                            <li className="flex items-center"><Check size={20} className="mr-2 text-indigo-500"/> Emotional Camera AI</li>
                            <li className="flex items-center"><Check size={20} className="mr-2 text-indigo-500"/> Mood-based Themes</li>
                        </ul>
                        <Button onClick={onSubscribe} className="w-full py-4 text-lg shadow-xl shadow-indigo-500/30">Upgrade Now</Button>
                     </Card>
                </div>
            </div>
        </div>
    );
};