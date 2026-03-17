import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Book, MessageSquare, PenTool, Users, Calendar, 
  Video, GraduationCap, Heart, User, Settings, Send, 
  Plus, ThumbsUp, Share2, MapPin, LogIn, LogOut, Search,
  Menu, X, ChevronRight, Play, Trash2, Camera, Mail, Lock, Bell, BellOff, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  serverTimestamp, doc, setDoc, getDoc, updateDoc, increment,
  where, getDocs, deleteDoc, getDocFromServer, limit
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, signInWithGoogle, logout, signUpWithEmail, loginWithEmail } from './firebase';
import { UserProfile, Post, ChurchEvent, PrayerRequest, ChurchConfig, DiscipleshipLesson } from './types';

// --- Icons ---

const Lion = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/1998/1998713.png" 
    alt="Lion" 
    className={cn("object-contain", className)}
    referrerPolicy="no-referrer"
  />
);

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64Str); // Fallback to original if error
  });
};
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---

const books = [
  { name: 'Gênesis', chapters: 50 }, { name: 'Êxodo', chapters: 40 }, { name: 'Levítico', chapters: 27 },
  { name: 'Números', chapters: 36 }, { name: 'Deuteronômio', chapters: 34 }, { name: 'Josué', chapters: 24 },
  { name: 'Juízes', chapters: 21 }, { name: 'Rute', chapters: 4 }, { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 }, { name: '1 Reis', chapters: 22 }, { name: '2 Reis', chapters: 25 },
  { name: '1 Crônicas', chapters: 29 }, { name: '2 Crônicas', chapters: 36 }, { name: 'Esdras', chapters: 10 },
  { name: 'Neemias', chapters: 13 }, { name: 'Ester', chapters: 10 }, { name: 'Jó', chapters: 42 },
  { name: 'Salmos', chapters: 150 }, { name: 'Provérbios', chapters: 31 }, { name: 'Eclesiastes', chapters: 12 },
  { name: 'Cantares', chapters: 8 }, { name: 'Isaías', chapters: 66 }, { name: 'Jeremias', chapters: 52 },
  { name: 'Lamentações', chapters: 5 }, { name: 'Ezequiel', chapters: 48 }, { name: 'Daniel', chapters: 12 },
  { name: 'Oseias', chapters: 14 }, { name: 'Joel', chapters: 3 }, { name: 'Amós', chapters: 9 },
  { name: 'Obadias', chapters: 1 }, { name: 'Jonas', chapters: 4 }, { name: 'Miqueias', chapters: 7 },
  { name: 'Naum', chapters: 3 }, { name: 'Habacuque', chapters: 3 }, { name: 'Sofonias', chapters: 3 },
  { name: 'Ageu', chapters: 2 }, { name: 'Zacarias', chapters: 14 }, { name: 'Malaquias', chapters: 4 },
  { name: 'Mateus', chapters: 28 }, { name: 'Marcos', chapters: 16 }, { name: 'Lucas', chapters: 24 },
  { name: 'João', chapters: 21 }, { name: 'Atos', chapters: 28 }, { name: 'Romanos', chapters: 16 },
  { name: '1 Coríntios', chapters: 16 }, { name: '2 Coríntios', chapters: 13 }, { name: 'Gálatas', chapters: 6 },
  { name: 'Efésios', chapters: 6 }, { name: 'Filipenses', chapters: 4 }, { name: 'Colossenses', chapters: 4 },
  { name: '1 Tessalonicenses', chapters: 5 }, { name: '2 Tessalonicenses', chapters: 3 }, { name: '1 Timóteo', chapters: 6 },
  { name: '2 Timóteo', chapters: 4 }, { name: 'Tito', chapters: 3 }, { name: 'Filemom', chapters: 1 },
  { name: 'Hebreus', chapters: 13 }, { name: 'Tiago', chapters: 5 }, { name: '1 Pedro', chapters: 5 },
  { name: '2 Pedro', chapters: 3 }, { name: '1 João', chapters: 5 }, { name: '2 João', chapters: 1 },
  { name: '3 João', chapters: 1 }, { name: 'Judas', chapters: 1 }, { name: 'Apocalipse', chapters: 22 }
];

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-[#D4AF37] text-black hover:bg-[#B8962E]",
      secondary: "bg-white text-black hover:bg-gray-100",
      outline: "border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black",
      ghost: "text-white hover:bg-white/10"
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    return (
      <button
        ref={ref}
        className={cn("rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2", variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn("bg-zinc-900 border border-zinc-800 rounded-2xl p-6", className)}
  >
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [churchConfig, setChurchConfig] = useState<ChurchConfig | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [activeNotification, setActiveNotification] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, `users/${user.uid}/reminders`), (snap) => {
      setReminders(snap.docs.map(doc => doc.id));
    });
    return () => unsub();
  }, [user]);

  // Notification Checker
  useEffect(() => {
    const checkReminders = async () => {
      if (!user || reminders.length === 0) return;
      
      const now = new Date();
      
      const q = query(collection(db, 'events'), where('__name__', 'in', reminders));
      const snap = await getDocs(q);
      
      snap.docs.forEach(doc => {
        const event = doc.data() as ChurchEvent;
        const eventDate = new Date(event.date);
        
        // Check if event is exactly 1 hour away (within a 1-minute window)
        const diffMinutes = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
        
        if (diffMinutes === 60) {
          setActiveNotification({
            title: "Lembrete de Culto",
            message: `O evento "${event.title}" começará em 1 hora!`
          });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, reminders]);

  // PWA Install Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'church'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Real-time profile listener
        const profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Membro',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              role: firebaseUser.email === 'duhgostozo@gmail.com' ? 'admin' : 'member',
              createdAt: new Date().toISOString()
            };
            setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        return () => profileUnsubscribe();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Fetch Church Config
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'church'));
        if (configDoc.exists()) {
          const config = configDoc.data() as ChurchConfig;
          setChurchConfig(config);
          checkAndUpdateDailyMessage(config);
        } else {
          const defaultConfig: ChurchConfig = {
            prayerEmail: 'contato@rugidoprofetico.com',
            pixKey: '000.000.000-00',
            pixQrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PIX_KEY_HERE'
          };
          await setDoc(doc(db, 'config', 'church'), defaultConfig);
          setChurchConfig(defaultConfig);
          checkAndUpdateDailyMessage(defaultConfig);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'config/church');
      }
    };
    fetchConfig();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const regenerateDailyMessage = async () => {
    if (!churchConfig) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Generate Message
      const msgResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: "Gere uma mensagem bíblica curta e inspiradora para o dia de hoje em português, com uma referência bíblica curta. Retorne apenas a mensagem e a referência, sem introduções.",
      });
      const text = msgResponse.text || "";
      
      const parts = text.split('\n').filter(p => p.trim());
      const messageText = parts[0]?.replace(/"/g, '') || "O Senhor é o meu pastor, nada me faltará.";
      const author = parts.length > 1 ? parts[parts.length - 1] : "Salmos 23:1";

      // Generate Image
      let imageUrl = churchConfig.dailyMessage?.imageUrl || "https://picsum.photos/seed/daily/800/400";
      try {
        const imgResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: { parts: [{ text: `Uma imagem cristã majestosa e inspiradora, estilo pintura artística ou fotografia cinematográfica, SEM NENHUM TEXTO, SEM LETRAS, SEM PALAVRAS. Foco em paisagens bíblicas, luz divina, ou símbolos sagrados. Tema: ${messageText}` }] },
        });
        
        if (imgResponse.candidates?.[0]?.content?.parts) {
          for (const part of imgResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              const rawImageUrl = `data:image/png;base64,${part.inlineData.data}`;
              imageUrl = await resizeImage(rawImageUrl, 800, 450);
              break;
            }
          }
        }
      } catch (imgError) {
        console.error("Image generation failed:", imgError);
      }

      const updatedDailyMessage = {
        text: messageText,
        author: author,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'config', 'church'), {
        dailyMessage: updatedDailyMessage
      });
      
      setChurchConfig(prev => prev ? { ...prev, dailyMessage: updatedDailyMessage } : null);
    } catch (error) {
      console.error("Error regenerating daily message:", error);
    }
  };

  const checkAndUpdateDailyMessage = async (config: ChurchConfig) => {
    const today = new Date().toISOString().split('T')[0];
    const lastUpdate = config.dailyMessage?.timestamp?.split('T')[0];

    if (lastUpdate !== today) {
      await regenerateDailyMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'bible', label: 'Bíblia', icon: Book },
    { id: 'ai', label: 'IA Bíblica', icon: MessageSquare },
    { id: 'sermons', label: 'Sermões IA', icon: PenTool },
    { id: 'community', label: 'Comunidade', icon: Users },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'live', label: 'Cultos Online', icon: Video },
    { id: 'discipleship', label: 'Discipulado', icon: GraduationCap },
    { id: 'donations', label: 'Ofertas', icon: Heart },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  if (profile?.role === 'admin' || profile?.role === 'pastor') {
    navItems.splice(4, 0, { id: 'admin', label: 'Painel Admin', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Notifications Overlay */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-4 right-4 z-[200] md:left-auto md:right-8 md:w-96"
          >
            <Card className="p-6 bg-[#D4AF37] text-black shadow-2xl border-none">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{activeNotification.title}</h4>
                  <p className="text-sm opacity-90">{activeNotification.message}</p>
                  <Button 
                    variant="ghost" 
                    className="mt-4 w-full bg-black/10 hover:bg-black/20 border-none font-bold"
                    onClick={() => setActiveNotification(null)}
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[100] p-4 bg-[#D4AF37] text-black flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <Lion className="w-8 h-8" />
              <div>
                <p className="font-bold text-sm">Instalar Igreja Profética Rugido</p>
                <p className="text-xs opacity-80">Acesse mais rápido direto da sua tela inicial</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="px-3 py-1.5 text-xs font-medium border border-black/20 rounded-lg"
              >
                Agora não
              </button>
              <button 
                onClick={handleInstall}
                className="px-4 py-1.5 text-xs font-bold bg-black text-white rounded-lg shadow-lg"
              >
                Instalar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-black z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#D4AF37] rounded-lg flex items-center justify-center">
            <Lion className="text-black w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Igreja Profética Rugido</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-zinc-800 p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <Lion className="text-black w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tighter">IGREJA PROFÉTICA RUGIDO</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-[#D4AF37] text-black font-semibold" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-black" : "group-hover:text-[#D4AF37]")} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-3 px-2 mb-4">
              <img src={profile?.photoURL} alt="" className="w-10 h-10 rounded-full border border-zinc-700" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.displayName}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">{profile?.role}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={logout}>
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </aside>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="fixed inset-0 bg-black z-40 lg:hidden p-4 pt-20"
            >
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg",
                      activeTab === item.id ? "bg-[#D4AF37] text-black" : "text-zinc-400"
                    )}
                  >
                    <item.icon />
                    {item.label}
                  </button>
                ))}
                <div className="pt-4 mt-4 border-t border-zinc-800">
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg text-red-400"
                  >
                    <LogOut />
                    Sair da Conta
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && <HomeView profile={profile} churchConfig={churchConfig} setActiveTab={setActiveTab} reminders={reminders} />}
              {activeTab === 'bible' && <BibleView profile={profile} />}
              {activeTab === 'ai' && <AIBibleView />}
              {activeTab === 'sermons' && <SermonGenView />}
              {activeTab === 'community' && <CommunityView profile={profile} />}
              {activeTab === 'events' && <EventsView profile={profile} reminders={reminders} />}
              {activeTab === 'live' && <LiveView churchConfig={churchConfig} />}
              {activeTab === 'discipleship' && <DiscipleshipView />}
              {activeTab === 'donations' && <DonationsView churchConfig={churchConfig} />}
              {activeTab === 'profile' && <ProfileView profile={profile} />}
              {activeTab === 'admin' && <AdminView churchConfig={churchConfig} setChurchConfig={setChurchConfig} regenerateDailyMessage={regenerateDailyMessage} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Views ---

function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'google' | 'email' | 'signup'>('google');
  
  // Email Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado. Por favor, permita pop-ups no seu navegador para entrar.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('O login foi cancelado.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Este domínio ainda não foi autorizado no Firebase. Por favor, siga as instruções abaixo para autorizar.');
      } else {
        setError('Erro ao conectar. Tente recarregar a página ou verifique se você está logado no Google.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Por favor, informe seu nome.');
        await signUpWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por e-mail/senha não está ativado no Firebase Console.');
      } else {
        setError(err.message || 'Erro ao realizar autenticação.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 inline-block"
        >
          <div className="w-24 h-24 bg-[#D4AF37] rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(212,175,55,0.2)]">
            <Lion className="text-black w-12 h-12" />
          </div>
        </motion.div>
        <h1 className="text-3xl font-bold mb-2 tracking-tighter">IGREJA PROFÉTICA</h1>
        <h2 className="text-[#D4AF37] text-2xl font-light mb-8 tracking-[0.2em]">RUGIDO</h2>
        
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl mb-8">
          <div className="flex bg-black/40 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setMode('google')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", mode === 'google' ? "bg-[#D4AF37] text-black" : "text-zinc-500")}
            >
              GOOGLE
            </button>
            <button 
              onClick={() => setMode('email')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", mode === 'email' || mode === 'signup' ? "bg-[#D4AF37] text-black" : "text-zinc-500")}
            >
              E-MAIL
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-xs text-left"
            >
              <div className="flex gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {mode === 'google' ? (
            <div className="space-y-6">
              <p className="text-zinc-300 text-sm">
                Entre com sua conta Google para acesso rápido.
              </p>
              <Button 
                onClick={handleGoogleLogin} 
                disabled={isLoggingIn}
                className="w-full py-4 text-lg rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                {isLoggingIn ? (
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                  />
                ) : (
                  <><LogIn className="w-5 h-5" /> Entrar com Google</>
                )}
              </Button>

              {error?.includes('domínio ainda não foi autorizado') && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-left">
                  <p className="text-blue-400 text-[10px] font-bold uppercase mb-2">Como resolver:</p>
                  <ol className="text-[10px] text-zinc-400 space-y-1 list-decimal ml-4">
                    <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-400 underline">Firebase Console</a>.</li>
                    <li>Vá em <b>Authentication</b> {'>'} <b>Settings</b> {'>'} <b>Authorized domains</b>.</li>
                    <li>Clique em <b>Add domain</b> e adicione:</li>
                    <li className="font-mono text-white bg-black/50 p-1 rounded mt-1 select-all">ais-dev-6qu467pzfxlkbsmszredbx-451291757229.us-east1.run.app</li>
                    <li className="font-mono text-white bg-black/50 p-1 rounded mt-1 select-all">ais-pre-6qu467pzfxlkbsmszredbx-451291757229.us-east1.run.app</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Seu Nome" 
                    required
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#D4AF37] outline-none placeholder:text-zinc-600"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  required
                  className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#D4AF37] outline-none placeholder:text-zinc-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  placeholder="Senha" 
                  required
                  className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#D4AF37] outline-none placeholder:text-zinc-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 text-lg rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                {isLoggingIn ? (
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                  />
                ) : (
                  mode === 'signup' ? 'Criar Conta' : 'Entrar'
                )}
              </Button>
              <button 
                type="button"
                onClick={() => setMode(mode === 'email' ? 'signup' : 'email')}
                className="text-xs text-zinc-500 hover:text-[#D4AF37]"
              >
                {mode === 'email' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre aqui'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
            Problemas com o acesso?
          </p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => window.location.reload()}
              className="text-zinc-400 text-xs hover:text-[#D4AF37] transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeView({ profile, churchConfig, setActiveTab, reminders }: { 
  profile: UserProfile | null, 
  churchConfig: ChurchConfig | null, 
  setActiveTab: (tab: string) => void,
  reminders: string[]
}) {
  const [prayer, setPrayer] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEvent[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'), limit(2));
    const unsub = onSnapshot(q, (snap) => {
      setUpcomingEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChurchEvent)));
    });
    return () => unsub();
  }, []);

  const toggleReminder = async (eventId: string) => {
    if (!profile) return;
    const isReminded = reminders.includes(eventId);
    const reminderRef = doc(db, `users/${profile.uid}/reminders`, eventId);
    
    if (isReminded) {
      await deleteDoc(reminderRef);
    } else {
      await setDoc(reminderRef, { createdAt: serverTimestamp() });
    }
  };

  const handlePrayer = async () => {
    if (!prayer.trim() || !profile) return;
    try {
      await addDoc(collection(db, 'prayers'), {
        userId: profile.uid,
        userName: profile.displayName,
        request: prayer,
        isAnonymous: false,
        intercessionCount: 0,
        createdAt: serverTimestamp()
      });
      setPrayer('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prayers');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paz do Senhor, {profile?.displayName.split(' ')[0]}!</h1>
          <p className="text-zinc-500">Bem-vindo ao seu portal espiritual diário.</p>
        </div>
        {profile?.lastRead && (
          <Button 
            variant="outline" 
            className="hidden md:flex gap-2 border-zinc-800 text-zinc-400 hover:text-[#D4AF37]"
            onClick={() => { /* This logic will be handled by the parent or a global state if needed, but for now just a shortcut */ }}
          >
            <Book className="w-4 h-4" /> Continuar: {profile.lastRead.book} {profile.lastRead.chapter}
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-gradient-to-br from-zinc-900 to-black border-[#D4AF37]/20 overflow-hidden p-0">
          {churchConfig?.dailyMessage?.imageUrl && (
            <div className="h-48 overflow-hidden">
              <img src={churchConfig.dailyMessage.imageUrl} alt="" className="w-full h-full object-cover opacity-60" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-2 text-[#D4AF37] mb-4">
              <Book className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Mensagem do Dia</span>
            </div>
            <p className="text-lg font-serif italic mb-4 leading-relaxed">
              "{churchConfig?.dailyMessage?.text || "O Senhor é o meu pastor, nada me faltará."}"
            </p>
            <p className="text-sm text-zinc-500">— {churchConfig?.dailyMessage?.author || "Salmos 23:1"}</p>
          </div>
        </Card>
      </div>

      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" /> Pedidos de Oração
        </h3>
        <Card className="p-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Qual o seu pedido de oração?" 
              className="flex-1 bg-zinc-800 border-none rounded-xl px-4 py-2 focus:ring-1 focus:ring-[#D4AF37]"
              value={prayer}
              onChange={(e) => setPrayer(e.target.value)}
            />
            <Button className="px-4" onClick={handlePrayer}><Send className="w-4 h-4" /></Button>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2 text-center italic">"Orai uns pelos outros, para que sareis." — Tiago 5:16</p>
          {churchConfig?.prayerEmail && (
            <p className="text-[9px] text-zinc-600 mt-1 text-center">Enviado para: {churchConfig.prayerEmail}</p>
          )}
        </Card>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-[#D4AF37]" /> Próximos Cultos
          </h3>
          <Button variant="ghost" size="sm" className="text-xs text-[#D4AF37]" onClick={() => setActiveTab('events')}>Ver Todos</Button>
        </div>
        <div className="space-y-4">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-[#D4AF37]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{event.title}</p>
                  <p className="text-xs text-zinc-500">{format(new Date(event.date), "EEEE, HH:mm", { locale: ptBR })} • {event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "p-2 rounded-full",
                    reminders.includes(event.id) ? "text-[#D4AF37] bg-[#D4AF37]/10" : "text-zinc-500"
                  )}
                  onClick={() => toggleReminder(event.id)}
                >
                  {reminders.includes(event.id) ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </Button>
                <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded-lg text-zinc-400 uppercase font-bold tracking-tighter">
                  {event.type}
                </span>
              </div>
            </div>
          ))}
          {upcomingEvents.length === 0 && (
            <div className="py-8 text-center text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-2xl">
              Nenhum evento cadastrado.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BibleView({ profile }: { profile: UserProfile | null }) {
  const [selectedBook, setSelectedBook] = useState<string | null>(profile?.lastRead?.book || null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(profile?.lastRead?.chapter || null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [translation, setTranslation] = useState('almeida');

  const translations = [
    { id: 'almeida', name: 'Almeida (PT)', lang: 'Português' },
    { id: 'nvi', name: 'NVI (PT)', lang: 'Português' },
    { id: 'ara', name: 'ARA (PT)', lang: 'Português' },
    { id: 'nvt', name: 'NVT (PT)', lang: 'Português' },
    { id: 'kjv', name: 'KJV (EN)', lang: 'Inglês' },
  ];

  useEffect(() => {
    if (selectedBook && selectedChapter) {
      fetchChapter(selectedBook, selectedChapter);
    }
  }, []);

  const saveBookmark = async (book: string, chapter: number) => {
    if (!profile) return;
    await updateDoc(doc(db, 'users', profile.uid), {
      lastRead: {
        book,
        chapter,
        timestamp: new Date().toISOString()
      }
    });
  };

  const fetchChapter = async (book: string, chapter: number, transId: string = translation) => {
    setLoading(true);
    try {
      // Mapping translations to bible-api.com supported ones or fallback
      // bible-api.com primarily supports 'almeida' for Portuguese
      let apiTrans = transId;
      if (['ara', 'nvt', 'nvi'].includes(transId)) {
        apiTrans = 'almeida';
      }
      
      const response = await fetch(`https://bible-api.com/${book}+${chapter}?translation=${apiTrans}`);
      const data = await response.json();
      if (data.text) {
        setContent(data.text);
      } else {
        const fallback = await fetch(`https://bible-api.com/${book}+${chapter}`);
        const fbData = await fallback.json();
        setContent(fbData.text || 'Erro ao carregar capítulo.');
      }
    } catch (error) {
      setContent('Erro ao conectar com o servidor da Bíblia.');
    } finally {
      setLoading(false);
    }
  };

  const navigateChapter = (direction: 'prev' | 'next') => {
    if (!selectedBook || !selectedChapter) return;
    const currentBookIndex = books.findIndex(b => b.name === selectedBook);
    const currentBook = books[currentBookIndex];

    let nextBook = selectedBook;
    let nextCh = selectedChapter;

    if (direction === 'next') {
      if (selectedChapter < currentBook.chapters) {
        nextCh = selectedChapter + 1;
      } else if (currentBookIndex < books.length - 1) {
        nextBook = books[currentBookIndex + 1].name;
        nextCh = 1;
      }
    } else {
      if (selectedChapter > 1) {
        nextCh = selectedChapter - 1;
      } else if (currentBookIndex > 0) {
        nextBook = books[currentBookIndex - 1].name;
        nextCh = books[currentBookIndex - 1].chapters;
      }
    }

    setSelectedBook(nextBook);
    setSelectedChapter(nextCh);
    fetchChapter(nextBook, nextCh);
    saveBookmark(nextBook, nextCh);
  };

  const filteredBooks = books.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedChapter && selectedBook) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedChapter(null)} className="p-2">
              <X className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">{selectedBook} {selectedChapter}</h1>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {translations.map(t => (
              <button
                key={t.id}
                onClick={() => { setTranslation(t.id); fetchChapter(selectedBook, selectedChapter, t.id); }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  translation === t.id 
                    ? "bg-[#D4AF37] text-black border-[#D4AF37]" 
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigateChapter('prev')} className="px-3">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <Button variant="outline" onClick={() => navigateChapter('next')} className="px-3">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Parchment Style Card */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#f4e4bc] rounded-3xl transform rotate-1 opacity-50 shadow-xl" />
          <Card className="relative bg-[#fdf6e3] border-[#e6d5a7] p-8 md:p-12 text-zinc-900 shadow-2xl overflow-hidden min-h-[400px]">
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]" />
            
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : (
              <div className="prose prose-zinc max-w-none font-serif text-xl leading-relaxed selection:bg-[#D4AF37]/30">
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-px bg-[#D4AF37]/30" />
                  <div className="mx-4 text-[#D4AF37] font-serif italic">Capítulo {selectedChapter}</div>
                  <div className="w-16 h-px bg-[#D4AF37]/30" />
                </div>
                {content.split('\n').map((line, i) => (
                  <p key={i} className="mb-6 first-letter:text-3xl first-letter:font-bold first-letter:text-[#D4AF37] first-letter:mr-1 first-letter:float-left">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => navigateChapter('prev')} className="text-zinc-500">
            Capítulo Anterior
          </Button>
          <Button variant="ghost" onClick={() => navigateChapter('next')} className="text-zinc-500">
            Próximo Capítulo
          </Button>
        </div>
      </div>
    );
  }

  if (selectedBook) {
    const book = books.find(b => b.name === selectedBook);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedBook(null)} className="p-2">
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">{selectedBook}</h1>
        </div>
        <p className="text-zinc-500">Selecione o capítulo:</p>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {Array.from({ length: book?.chapters || 0 }, (_, i) => i + 1).map(ch => (
            <button
              key={ch}
              onClick={() => { setSelectedChapter(ch); fetchChapter(selectedBook, ch); saveBookmark(selectedBook, ch); }}
              className="aspect-square flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all font-bold"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Bíblia Sagrada</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Pesquisar livro..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-[#D4AF37]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredBooks.map(book => (
          <button
            key={book.name}
            onClick={() => setSelectedBook(book.name)}
            className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-[#D4AF37] transition-all text-left group"
          >
            <p className="font-bold group-hover:text-[#D4AF37]">{book.name}</p>
            <p className="text-xs text-zinc-500">{book.chapters} capítulos</p>
          </button>
        ))}
        {filteredBooks.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500">
            Nenhum livro encontrado para "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

function AdminView({ churchConfig, setChurchConfig, regenerateDailyMessage }: { 
  churchConfig: ChurchConfig | null, 
  setChurchConfig: (config: ChurchConfig) => void,
  regenerateDailyMessage: () => Promise<void>
}) {
  const [adminTab, setAdminTab] = useState<'config' | 'events' | 'discipleship' | 'daily'>('config');
  
  // Config State
  const [email, setEmail] = useState(churchConfig?.prayerEmail || '');
  const [pix, setPix] = useState(churchConfig?.pixKey || '');
  const [qrCode, setQrCode] = useState(churchConfig?.pixQrCodeUrl || '');
  const [liveUrl, setLiveUrl] = useState(churchConfig?.liveStreamUrl || '');
  
  // Stats State
  const [memberCount, setMemberCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  
  // Daily Message State
  const [dailyText, setDailyText] = useState(churchConfig?.dailyMessage?.text || '');
  const [dailyAuthor, setDailyAuthor] = useState(churchConfig?.dailyMessage?.author || '');
  const [dailyImage, setDailyImage] = useState(churchConfig?.dailyMessage?.imageUrl || '');
  const [generatingImage, setGeneratingImage] = useState(false);

  // Events State
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<Partial<ChurchEvent> | null>(null);

  // Discipleship State
  const [lessons, setLessons] = useState<DiscipleshipLesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Partial<DiscipleshipLesson> | null>(null);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChurchEvent)));
    });
    const unsubLessons = onSnapshot(collection(db, 'discipleship'), (snap) => {
      setLessons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscipleshipLesson)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setMemberCount(snap.size);
    });
    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      setPostCount(snap.size);
    });
    return () => { unsubEvents(); unsubLessons(); unsubUsers(); unsubPosts(); };
  }, []);

  const handleSaveConfig = async () => {
    const newConfig: ChurchConfig = {
      ...churchConfig,
      prayerEmail: email,
      pixKey: pix,
      pixQrCodeUrl: qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${pix}`,
      liveStreamUrl: liveUrl,
      dailyMessage: {
        text: dailyText,
        author: dailyAuthor,
        imageUrl: dailyImage,
        timestamp: new Date().toISOString()
      }
    };
    await setDoc(doc(db, 'config', 'church'), newConfig);
    setChurchConfig(newConfig);
    alert('Configurações salvas com sucesso!');
  };

  const generateAIImage = async () => {
    if (!dailyText) return;
    setGeneratingImage(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: `Uma imagem cristã majestosa e inspiradora, estilo pintura artística ou fotografia cinematográfica, SEM NENHUM TEXTO, SEM LETRAS, SEM PALAVRAS. Foco em paisagens bíblicas, luz divina, ou símbolos sagrados (como um leão majestoso, uma cruz ao pôr do sol, ou montanhas sagradas). Estilo visual: Cores quentes, iluminação dramática, alta resolução. Tema: ${dailyText}` }],
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const rawImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          const resized = await resizeImage(rawImageUrl);
          setDailyImage(resized);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar imagem.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleRegenerate = async () => {
    setGeneratingImage(true);
    await regenerateDailyMessage();
    setGeneratingImage(false);
  };

  const handleDailyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const optimized = await resizeImage(base64, 800, 450);
      setDailyImage(optimized);
    };
    reader.readAsDataURL(file);
  };

  const saveEvent = async () => {
    if (!editingEvent?.title || !editingEvent?.date) return;
    if (editingEvent.id) {
      await updateDoc(doc(db, 'events', editingEvent.id), editingEvent);
    } else {
      await addDoc(collection(db, 'events'), { ...editingEvent, createdAt: serverTimestamp() });
    }
    setEditingEvent(null);
  };

  const deleteEvent = async (id: string) => {
    if (confirm('Deseja excluir este evento?')) {
      await deleteDoc(doc(db, 'events', id));
    }
  };

  const saveLesson = async () => {
    if (!editingLesson?.title || !editingLesson?.content) return;
    if (editingLesson.id) {
      await updateDoc(doc(db, 'discipleship', editingLesson.id), editingLesson);
    } else {
      await addDoc(collection(db, 'discipleship'), { ...editingLesson, createdAt: serverTimestamp() });
    }
    setEditingLesson(null);
  };

  const deleteLesson = async (id: string) => {
    if (confirm('Deseja excluir esta lição?')) {
      await deleteDoc(doc(db, 'discipleship', id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 overflow-x-auto no-scrollbar">
          {[
            { id: 'config', label: 'Configurações', icon: Settings },
            { id: 'events', label: 'Eventos', icon: Calendar },
            { id: 'daily', label: 'Mensagem Diária', icon: MessageSquare },
            { id: 'discipleship', label: 'Discipulado', icon: GraduationCap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                adminTab === tab.id ? "bg-[#D4AF37] text-black" : "text-zinc-400 hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {adminTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Configurações Gerais</h3>
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">E-mail para Orações</label>
              <input type="email" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">Chave PIX</label>
              <input type="text" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm" value={pix} onChange={(e) => setPix(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">Link Culto Online (YouTube/Facebook)</label>
              <input type="text" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://youtube.com/live/..." />
            </div>
            <Button onClick={handleSaveConfig} className="w-full">Salvar Configurações</Button>
          </Card>
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Estatísticas Reais</h3>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-emerald-500/20"><p className="text-xs text-zinc-500 uppercase tracking-widest">Membros</p><p className="text-2xl font-bold">{memberCount}</p></Card>
              <Card className="border-blue-500/20"><p className="text-xs text-zinc-500 uppercase tracking-widest">Postagens</p><p className="text-2xl font-bold">{postCount}</p></Card>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'events' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Gerenciar Eventos</h3>
            <Button onClick={() => setEditingEvent({ title: '', date: '', location: '', type: 'culto', description: '', imageUrl: 'https://picsum.photos/seed/event/800/400' })}>
              <Plus className="w-4 h-4" /> Novo Evento
            </Button>
          </div>

          {editingEvent && (
            <Card className="space-y-4 border-[#D4AF37]/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Título" className="bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
                <input type="datetime-local" className="bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingEvent.date} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} />
                <input placeholder="Local" className="bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingEvent.location} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} />
                <select className="bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingEvent.type} onChange={e => setEditingEvent({...editingEvent, type: e.target.value as any})}>
                  <option value="culto">Culto</option>
                  <option value="vigilia">Vigília</option>
                  <option value="conferencia">Conferência</option>
                  <option value="campanha">Campanha</option>
                </select>
              </div>
              <textarea placeholder="Descrição" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 h-24" value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} />
              <div className="flex gap-2">
                <Button onClick={saveEvent} className="flex-1">Salvar</Button>
                <Button variant="ghost" onClick={() => setEditingEvent(null)}>Cancelar</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(event => (
              <Card key={event.id} className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{event.title}</p>
                  <p className="text-xs text-zinc-500">{event.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingEvent(event)}><PenTool className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteEvent(event.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {adminTab === 'daily' && (
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Mensagem Diária do Pastor</h3>
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={generatingImage}>
              {generatingImage ? 'Gerando...' : 'Regenerar Tudo (IA)'}
            </Button>
          </div>
          <textarea 
            placeholder="Escreva a mensagem inspiradora de hoje..." 
            className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 h-32"
            value={dailyText}
            onChange={(e) => setDailyText(e.target.value)}
          />
          <input 
            placeholder="Autor (ex: Pr. João Silva)" 
            className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2"
            value={dailyAuthor}
            onChange={(e) => setDailyAuthor(e.target.value)}
          />
          
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase font-bold">Imagem da Mensagem</label>
            <div className="flex flex-wrap gap-2">
              <input 
                placeholder="URL da Imagem" 
                className="flex-1 min-w-[200px] bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2"
                value={dailyImage}
                onChange={(e) => setDailyImage(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="daily-image-upload"
                  onChange={handleDailyImageUpload}
                />
                <Button variant="outline" onClick={() => document.getElementById('daily-image-upload')?.click()}>
                  <Plus className="w-4 h-4" /> Galeria
                </Button>
                <Button variant="outline" onClick={generateAIImage} disabled={generatingImage || !dailyText}>
                  {generatingImage ? 'Gerando...' : 'Gerar com IA'}
                </Button>
              </div>
            </div>
            {dailyImage && (
              <div className="mt-4 rounded-xl overflow-hidden border border-zinc-800 aspect-video">
                <img src={dailyImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          
          <Button onClick={handleSaveConfig} className="w-full">Publicar Mensagem</Button>
        </Card>
      )}

      {adminTab === 'discipleship' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Gerenciar Lições de Discipulado</h3>
            <Button onClick={() => setEditingLesson({ title: '', content: '', order: lessons.length + 1, category: 'Fundamentos' })}>
              <Plus className="w-4 h-4" /> Nova Lição
            </Button>
          </div>

          {editingLesson && (
            <Card className="space-y-4 border-[#D4AF37]/30">
              <input placeholder="Título da Lição" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingLesson.title} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} />
              <textarea placeholder="Conteúdo da Lição (Markdown)" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 h-48" value={editingLesson.content} onChange={e => setEditingLesson({...editingLesson, content: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Ordem" type="number" className="bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingLesson.order} onChange={e => setEditingLesson({...editingLesson, order: parseInt(e.target.value)})} />
                <input placeholder="Categoria" className="bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingLesson.category} onChange={e => setEditingLesson({...editingLesson, category: e.target.value})} />
              </div>
              <input placeholder="URL do Vídeo (opcional)" className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2" value={editingLesson.videoUrl} onChange={e => setEditingLesson({...editingLesson, videoUrl: e.target.value})} />
              <div className="flex gap-2">
                <Button onClick={saveLesson} className="flex-1">Salvar Lição</Button>
                <Button variant="ghost" onClick={() => setEditingLesson(null)}>Cancelar</Button>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            {lessons.sort((a,b) => a.order - b.order).map(lesson => (
              <Card key={lesson.id} className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{lesson.order}. {lesson.title}</p>
                  <p className="text-xs text-zinc-500">{lesson.category}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingLesson(lesson)}><PenTool className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteLesson(lesson.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function AIBibleView() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: "Você é o 'Conselheiro Profético', uma IA bíblica avançada da Igreja Profética Rugido. Sua missão é responder perguntas bíblicas, explicar versículos, sugerir leituras e oferecer aconselhamento espiritual básico sempre baseado na Bíblia Sagrada. Seja acolhedor, sábio e use uma linguagem cristã respeitosa."
        }
      });
      setMessages(prev => [...prev, { role: 'ai', content: response.text || 'Desculpe, não consegui processar sua dúvida agora.' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Erro ao conectar com o Conselheiro Profético.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Conselheiro Profético</h1>
        <p className="text-zinc-500">IA Bíblica para tirar suas dúvidas e aconselhamento.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Comece perguntando algo sobre a Bíblia...</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Explique Romanos 8', 'Versículos sobre ansiedade', 'O que é a fé?'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-xs bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-[#D4AF37] transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-2xl",
              msg.role === 'user' ? "bg-[#D4AF37] text-black" : "bg-zinc-900 border border-zinc-800"
            )}>
              <div className="markdown-body prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl animate-pulse">
              Digitando...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Pergunte ao Conselheiro..." 
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4AF37]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} disabled={loading} className="px-6">
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function SermonGenView() {
  const [topic, setTopic] = useState('');
  const [sermon, setSermon] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSermon = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Gere um esboço de sermão sobre o tema: ${topic}` }] }],
        config: {
          systemInstruction: "Você é um assistente homilético para pastores da Igreja Profética Rugido. Sua tarefa é gerar esboços de sermões completos, incluindo introdução, pontos principais com versículos de apoio, aplicações práticas e conclusão. O tom deve ser inspirador e teologicamente sólido."
        }
      });
      setSermon(response.text || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gerador de Sermões</h1>
      <p className="text-zinc-500">Ferramenta auxiliar para pastores e líderes criarem esboços de mensagens.</p>

      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Tema do sermão (ex: Fé, Perdão, Família)..." 
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4AF37]"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <Button onClick={generateSermon} disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar Esboço'}
        </Button>
      </div>

      {sermon && (
        <Card className="bg-zinc-900 border-zinc-800">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{sermon}</ReactMarkdown>
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-800 flex gap-2">
            <Button variant="outline" className="flex-1">Copiar</Button>
            <Button variant="outline" className="flex-1">Salvar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function CommunityView({ profile }: { profile: UserProfile | null }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'prayers'>('feed');
  const [newPost, setNewPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
      setShowImageInput(true);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'prayers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerRequest)));
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if (!newPost.trim() || !profile) return;
    try {
      let finalImageUrl = imageUrl;
      if (imageUrl.startsWith('data:image')) {
        finalImageUrl = await resizeImage(imageUrl);
      }
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: newPost,
        imageUrl: finalImageUrl || null,
        type: finalImageUrl ? 'image' : 'text',
        likes: 0,
        createdAt: serverTimestamp()
      });
      setNewPost('');
      setImageUrl('');
      setShowImageInput(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleIntercession = async (prayerId: string) => {
    try {
      await updateDoc(doc(db, 'prayers', prayerId), {
        intercessionCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `prayers/${prayerId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Comunidade</h1>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button 
            onClick={() => setActiveSubTab('feed')}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeSubTab === 'feed' ? "bg-zinc-800 text-[#D4AF37]" : "text-zinc-500")}
          >
            Feed
          </button>
          <button 
            onClick={() => setActiveSubTab('prayers')}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeSubTab === 'prayers' ? "bg-zinc-800 text-[#D4AF37]" : "text-zinc-500")}
          >
            Orações
          </button>
        </div>
      </div>

      {activeSubTab === 'feed' ? (
        <>
          <Card className="p-4">
            <textarea 
              placeholder="Compartilhe um testemunho ou palavra..." 
              className="w-full bg-transparent border-none focus:ring-0 resize-none h-24 text-lg"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            
            {showImageInput && (
              <div className="mt-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-3">
                {imageUrl.startsWith('data:image') ? (
                  <div className="relative rounded-lg overflow-hidden aspect-video">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Cole a URL da imagem aqui..." 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                />
                <Button 
                  variant="ghost" 
                  className={cn("p-2", showImageInput && "text-[#D4AF37]")} 
                  onClick={() => cameraInputRef.current?.click()}
                  title="Tirar Foto"
                >
                  <Camera className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="p-2" 
                  onClick={() => fileInputRef.current?.click()}
                  title="Escolher da Galeria"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <Button onClick={handlePost} disabled={!newPost.trim()}>Postar</Button>
            </div>
          </Card>

          <div className="space-y-6">
            {posts.map(post => (
              <Card key={post.id} className="p-0 overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <img src={post.authorPhoto} alt="" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-bold">{post.authorName}</p>
                    <p className="text-xs text-zinc-500">
                      {post.createdAt?.toDate ? format(post.createdAt.toDate(), "d 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Agora mesmo'}
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-zinc-800">
                      <img src={post.imageUrl} alt="Post" className="w-full h-auto" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
                <div className="flex border-t border-zinc-800">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-[#D4AF37]"
                  >
                    <ThumbsUp className="w-4 h-4" /> {post.likes}
                  </button>
                  <button className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all text-zinc-400">
                    <MessageSquare className="w-4 h-4" /> Comentar
                  </button>
                  <button className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all text-zinc-400">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {prayers.map(p => (
            <Card key={p.id} className="border-l-4 border-l-[#D4AF37]">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-[#D4AF37]">{p.isAnonymous ? 'Anônimo' : p.userName}</p>
                <p className="text-[10px] text-zinc-500">
                  {p.createdAt?.toDate ? format(p.createdAt.toDate(), "d/MM HH:mm") : 'Agora'}
                </p>
              </div>
              <p className="text-zinc-300 italic">"{p.request}"</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs text-zinc-500">{p.intercessionCount || 0} intercessões</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs gap-2 text-zinc-500 hover:text-red-500"
                  onClick={() => handleIntercession(p.id)}
                >
                  <Heart className="w-3 h-3" /> Eu orei
                </Button>
              </div>
            </Card>
          ))}
          {prayers.length === 0 && (
            <div className="text-center py-12 text-zinc-500 italic">
              Nenhum pedido de oração no momento. Seja o primeiro a pedir!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventsView({ profile, reminders }: { profile: UserProfile | null, reminders: string[] }) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [registrations, setRegistrations] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChurchEvent)));
    });

    if (profile) {
      const qReg = query(collection(db, 'event_registrations'), where('userId', '==', profile.uid));
      const unsubReg = onSnapshot(qReg, (snapshot) => {
        setRegistrations(snapshot.docs.map(doc => doc.data().eventId));
      });
      return () => { unsubscribe(); unsubReg(); };
    }

    return () => unsubscribe();
  }, [profile]);

  const toggleReminder = async (eventId: string) => {
    if (!profile) return;
    const isReminded = reminders.includes(eventId);
    const reminderRef = doc(db, `users/${profile.uid}/reminders`, eventId);
    
    if (isReminded) {
      await deleteDoc(reminderRef);
    } else {
      await setDoc(reminderRef, { createdAt: serverTimestamp() });
    }
  };

  const togglePresence = async (eventId: string) => {
    if (!profile) return;
    const isRegistered = registrations.includes(eventId);
    
    if (isRegistered) {
      const q = query(collection(db, 'event_registrations'), where('userId', '==', profile.uid), where('eventId', '==', eventId));
      const snap = await getDocs(q);
      snap.forEach(async (d) => await deleteDoc(doc(db, 'event_registrations', d.id)));
    } else {
      await addDoc(collection(db, 'event_registrations'), {
        eventId,
        userId: profile.uid,
        createdAt: serverTimestamp()
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Eventos e Campanhas</h1>
        <Button variant="outline" onClick={() => alert('Seu calendário pessoal será sincronizado em breve!')}>
          <Calendar className="w-4 h-4" /> Meu Calendário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => {
          const isRegistered = registrations.includes(event.id);
          return (
            <Card key={event.id} className="p-0 overflow-hidden group cursor-pointer">
              <div className="relative h-48 overflow-hidden">
                <img src={event.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className="absolute top-4 left-4 bg-[#D4AF37] text-black text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                  {event.type}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{event.description}</p>
                <div className="space-y-2 text-sm text-zinc-400">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" /> 
                    {format(new Date(event.date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#D4AF37]" /> {event.location}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button 
                    variant="outline"
                    className={cn(
                      "gap-2",
                      reminders.includes(event.id) ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]" : "text-zinc-400 border-zinc-800"
                    )}
                    onClick={() => toggleReminder(event.id)}
                  >
                    {reminders.includes(event.id) ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    {reminders.includes(event.id) ? 'Lembrando' : 'Lembrar'}
                  </Button>
                  <Button 
                    className={cn(isRegistered && "bg-emerald-600 hover:bg-emerald-700")}
                    onClick={() => togglePresence(event.id)}
                  >
                    {isRegistered ? 'Confirmado' : 'Presença'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {events.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500">
            Nenhum evento programado no momento.
          </div>
        )}
      </div>
    </div>
  );
}

function LiveView({ churchConfig }: { churchConfig: ChurchConfig | null }) {
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const embedUrl = getYoutubeEmbedUrl(churchConfig?.liveStreamUrl || '');

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Cultos Online</h1>
      
      {embedUrl ? (
        <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
          <iframe 
            src={embedUrl} 
            className="w-full h-full" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen 
          />
        </div>
      ) : (
        <div className="aspect-video bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
          <img src="https://picsum.photos/seed/live/1280/720" alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <div className="relative z-10 text-center">
            <div 
              className="w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-110 transition-transform shadow-[0_0_30px_rgba(212,175,55,0.4)]"
              onClick={() => {
                if (churchConfig?.liveStreamUrl) {
                  window.open(churchConfig.liveStreamUrl, '_blank');
                } else {
                  alert('Nenhum culto ao vivo no momento. Verifique os horários dos eventos.');
                }
              }}
            >
              <Play className="text-black w-8 h-8 fill-current" />
            </div>
            <h2 className="text-2xl font-bold">Culto de Domingo - Ao Vivo</h2>
            <p className="text-red-500 font-bold flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> AO VIVO AGORA
            </p>
          </div>
        </div>
      )}

      <section>
        <h3 className="text-xl font-bold mb-4">Mensagens Recentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
              <div className="aspect-video bg-zinc-800 relative">
                <img src={`https://picsum.photos/seed/msg${i}/400/225`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-[10px] px-1.5 py-0.5 rounded">45:20</div>
              </div>
              <div className="p-4">
                <p className="font-bold text-sm line-clamp-2">Série: O Poder da Oração - Parte {i}</p>
                <p className="text-xs text-zinc-500 mt-1">Pr. João Silva • 2 dias atrás</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DiscipleshipView() {
  const [lessons, setLessons] = useState<DiscipleshipLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<DiscipleshipLesson | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'discipleship'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLessons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscipleshipLesson)));
    });
    return () => unsubscribe();
  }, []);

  if (selectedLesson) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedLesson(null)} className="p-2">
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>
        </div>

        {selectedLesson.videoUrl && (
          <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-zinc-800">
            <iframe 
              src={selectedLesson.videoUrl.replace('watch?v=', 'embed/')} 
              className="w-full h-full" 
              allowFullScreen 
            />
          </div>
        )}

        <Card className="p-8 prose prose-invert max-w-none bg-zinc-900/50 border-zinc-800">
          <ReactMarkdown>{selectedLesson.content}</ReactMarkdown>
        </Card>

        <div className="flex justify-between mt-8">
          <Button 
            variant="ghost" 
            disabled={selectedLesson.order === 1}
            onClick={() => {
              const prev = lessons.find(l => l.order === selectedLesson.order - 1);
              if (prev) setSelectedLesson(prev);
            }}
          >
            Lição Anterior
          </Button>
          <Button 
            variant="ghost"
            disabled={selectedLesson.order === lessons.length}
            onClick={() => {
              const next = lessons.find(l => l.order === selectedLesson.order + 1);
              if (next) setSelectedLesson(next);
            }}
          >
            Próxima Lição
          </Button>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(lessons.map(l => l.category)));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Discipulado Digital</h1>
      <p className="text-zinc-500">Cresça na graça e no conhecimento através de nossos cursos.</p>

      {categories.map(cat => (
        <section key={cat} className="space-y-4">
          <h2 className="text-xl font-bold text-[#D4AF37] uppercase tracking-widest text-sm">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lessons.filter(l => l.category === cat).map((lesson) => (
              <Card key={lesson.id} className="flex flex-col group hover:border-[#D4AF37] transition-all cursor-pointer" onClick={() => setSelectedLesson(lesson)}>
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                  <GraduationCap />
                </div>
                <h3 className="text-lg font-bold mb-2">{lesson.title}</h3>
                <p className="text-sm text-zinc-500 mb-6 line-clamp-2">Lição {lesson.order}</p>
                
                <div className="mt-auto">
                  <Button className="w-full">Estudar Agora</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {lessons.length === 0 && (
        <div className="py-12 text-center text-zinc-500">
          Nenhuma lição disponível no momento.
        </div>
      )}
    </div>
  );
}

function DonationsView({ churchConfig }: { churchConfig: ChurchConfig | null }) {
  return (
    <div className="max-w-2xl mx-auto space-y-8 text-center">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Heart className="w-10 h-10 fill-current" />
      </div>
      <h1 className="text-4xl font-bold">Dízimos e Ofertas</h1>
      <p className="text-zinc-400">"Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade; porque Deus ama ao que dá com alegria." — 2 Coríntios 9:7</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Card className="border-[#D4AF37]/30 bg-zinc-900/50">
          <h3 className="text-xl font-bold mb-4">PIX</h3>
          <div className="bg-white p-4 rounded-2xl inline-block mb-4">
            <img 
              src={churchConfig?.pixQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${churchConfig?.pixKey || 'CHAVE_PIX'}`} 
              alt="QR Code PIX" 
              className="w-32 h-32" 
            />
          </div>
          <p className="text-sm text-zinc-500 mb-2">Chave PIX:</p>
          <p className="font-mono font-bold text-[#D4AF37] break-all px-2">{churchConfig?.pixKey || "Configure no Painel Admin"}</p>
          <Button 
            variant="outline" 
            className="mt-4 w-full"
            onClick={() => {
              if (churchConfig?.pixKey) {
                navigator.clipboard.writeText(churchConfig.pixKey);
                alert('Chave PIX copiada!');
              }
            }}
          >
            Copiar Chave
          </Button>
        </Card>

        <Card className="bg-zinc-900/50">
          <h3 className="text-xl font-bold mb-4">Transferência</h3>
          <div className="text-left space-y-3 text-sm">
            <div>
              <p className="text-zinc-500">Banco</p>
              <p className="font-bold">Banco do Brasil (001)</p>
            </div>
            <div>
              <p className="text-zinc-500">Agência</p>
              <p className="font-bold">1234-5</p>
            </div>
            <div>
              <p className="text-zinc-500">Conta Corrente</p>
              <p className="font-bold">123456-7</p>
            </div>
            <div>
              <p className="text-zinc-500">Titular</p>
              <p className="font-bold">Igreja Profética Rugido</p>
            </div>
          </div>
          <Button variant="outline" className="mt-6 w-full">Ver Outros Bancos</Button>
        </Card>
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: UserProfile | null }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const optimizedImage = await resizeImage(base64, 400, 400);
        
        await updateDoc(doc(db, 'users', profile.uid), {
          photoURL: optimizedImage
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 rounded-full border-4 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)] overflow-hidden bg-zinc-900 flex items-center justify-center">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-zinc-700" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#D4AF37] text-black p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform">
            <Camera className="w-5 h-5" />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageChange}
          />
        </div>
        <h1 className="text-3xl font-bold mt-6">{profile?.displayName}</h1>
        <p className="text-[#D4AF37] font-bold uppercase tracking-widest text-sm">{profile?.role}</p>
        <p className="text-zinc-500 mt-2">Membro desde {profile?.createdAt ? format(new Date(profile.createdAt), "MMMM 'de' yyyy", { locale: ptBR }) : ''}</p>
        
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Button 
            variant="outline" 
            className="border-[#D4AF37]/30 text-[#D4AF37]"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-4 h-4" /> {uploading ? 'Enviando...' : 'Galeria'}
          </Button>
          <Button 
            variant="outline" 
            className="border-[#D4AF37]/30 text-[#D4AF37]"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4" /> {uploading ? 'Enviando...' : 'Tirar Foto'}
          </Button>
        </div>

        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="user" 
          onChange={handleImageChange}
        />

        <Button 
          variant="ghost" 
          className="mt-8 text-red-500 hover:bg-red-500/10 w-full max-w-xs"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" /> Sair da Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { label: 'Testemunhos', value: 12, icon: MessageSquare },
        ].map((stat, i) => (
          <Card key={i} className="text-center p-4">
            <stat.icon className="w-5 h-5 mx-auto mb-2 text-[#D4AF37]" />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Conquistas removed */}
    </div>
  );
}
