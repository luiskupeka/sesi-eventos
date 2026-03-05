import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Users, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowLeft,
  Download,
  Search,
  Settings,
  X,
  PlusCircle,
  GripVertical,
  Copy,
  Printer,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface EventField {
  id?: number;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'select' | 'radio' | 'textarea';
  is_required: boolean;
  options?: string; // Comma separated
}

interface Event {
  id: number;
  name: string;
  type: string;
  description: string;
  date: string;
  time: string;
  max_vagas: number;
  deadline: string;
  classes_allowed: string;
  years_allowed: string;
  status: string;
  current_registrations: number;
  fields?: EventField[];
}

interface Registration {
  id: number;
  event_id: number;
  registration_date: string;
  data: Record<string, any>;
}

// --- Components ---

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'success' | 'danger' | 'warning' }) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
};

export default function App() {
  const [view, setView] = useState<'user' | 'admin'>('user');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isViewingRegs, setIsViewingRegs] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regFields, setRegFields] = useState<EventField[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isAdminSetup, setIsAdminSetup] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  // Form States
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    name: '',
    type: 'Oficina',
    description: '',
    date: '',
    time: '',
    max_vagas: 30,
    deadline: '',
    classes_allowed: '',
    years_allowed: '',
    fields: [
      { field_name: 'nome', field_label: 'Nome', field_type: 'text', is_required: true },
      { field_name: 'sobrenome', field_label: 'Sobrenome', field_type: 'text', is_required: true },
      { 
        field_name: 'ano_escolar', 
        field_label: 'Ano Escolar', 
        field_type: 'select', 
        is_required: true, 
        options: '6° Ano, 7° Ano, 8° Ano, 9° Ano, 1° Ano EM, 2° Ano EM, 3° Ano EM' 
      },
      { 
        field_name: 'turma_letra', 
        field_label: 'Letra da Turma', 
        field_type: 'select', 
        is_required: true, 
        options: 'A, B, C, D, E' 
      }
    ]
  });

  const [regData, setRegData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchEvents();
    checkAdminSetup();
  }, []);

  const checkAdminSetup = async () => {
    try {
      const res = await fetch('/api/admin/check-setup');
      const data = await res.json();
      setIsAdminSetup(data.isSet);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingSetup(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/events/${id}`);
      const data = await res.json();
      setSelectedEvent(data);
      return data;
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRegistrations = async (id: number) => {
    try {
      const res = await fetch(`/api/events/${id}/registrations`);
      const data = await res.json();
      setRegistrations(data.registrations);
      setRegFields(data.fields);
    } catch (err) {
      console.error(err);
    }
  };

  const resetNewEvent = () => {
    setNewEvent({
      name: '',
      type: 'Oficina',
      description: '',
      date: '',
      time: '',
      max_vagas: 30,
      deadline: '',
      classes_allowed: '',
      years_allowed: '',
      fields: [
        { field_name: 'nome', field_label: 'Nome', field_type: 'text', is_required: true },
        { field_name: 'sobrenome', field_label: 'Sobrenome', field_type: 'text', is_required: true },
        { 
          field_name: 'ano_escolar', 
          field_label: 'Ano Escolar', 
          field_type: 'select', 
          is_required: true, 
          options: '6° Ano, 7° Ano, 8° Ano, 9° Ano, 1° Ano EM, 2° Ano EM, 3° Ano EM' 
        },
        { 
          field_name: 'turma_letra', 
          field_label: 'Letra da Turma', 
          field_type: 'select', 
          is_required: true, 
          options: 'A, B, C, D, E' 
        }
      ]
    });
    setEditingEventId(null);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
    const method = editingEventId ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        setIsCreating(false);
        fetchEvents();
        resetNewEvent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditEvent = async (event: Event) => {
    const details = await fetchEventDetails(event.id);
    if (details) {
      setNewEvent({
        ...details,
        // Ensure date and deadline are correctly formatted for inputs if needed
        // but since we store them as strings from inputs, they should match
      });
      setEditingEventId(event.id);
      setIsCreating(true);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: regData })
      });
      if (res.ok) {
        alert('Inscrição realizada com sucesso!');
        setIsRegistering(false);
        setRegData({});
        fetchEvents();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao realizar inscrição');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const addField = () => {
    setNewEvent({
      ...newEvent,
      fields: [
        ...(newEvent.fields || []),
        { field_name: `campo_${Date.now()}`, field_label: 'Novo Campo', field_type: 'text', is_required: false }
      ]
    });
  };

  const removeField = (index: number) => {
    const fields = [...(newEvent.fields || [])];
    fields.splice(index, 1);
    setNewEvent({ ...newEvent, fields });
  };

  const updateField = (index: number, updates: Partial<EventField>) => {
    const fields = [...(newEvent.fields || [])];
    fields[index] = { ...fields[index], ...updates };
    setNewEvent({ ...newEvent, fields });
  };

  const isEventFull = (event: Event) => event.current_registrations >= event.max_vagas;
  const isDeadlinePassed = (event: Event) => new Date() > new Date(event.deadline);

  const exportToCSV = () => {
    if (!selectedEvent || registrations.length === 0) return;
    
    const headers = ['Data Inscrição', ...regFields.map(f => f.field_label)];
    const rows = registrations.map(r => [
      new Date(r.registration_date).toLocaleString(),
      ...regFields.map(f => r.data[f.field_name] || '')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inscricoes_${selectedEvent.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const copyToClipboard = () => {
    if (!selectedEvent || registrations.length === 0) return;
    
    const headers = ['Data Inscrição', ...regFields.map(f => f.field_label)];
    const rows = registrations.map(r => [
      new Date(r.registration_date).toLocaleString(),
      ...regFields.map(f => r.data[f.field_name] || '')
    ]);
    
    const text = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n');
    
    navigator.clipboard.writeText(text);
    alert('Lista copiada para a área de transferência!');
  };

  const printList = () => {
    window.print();
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!isAdminSetup) {
      // Setup mode
      try {
        const res = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPassword })
        });
        if (res.ok) {
          setIsAdminSetup(true);
          // Now login with the same password
          const loginRes = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
          });
          if (loginRes.ok) {
            setIsAdminAuthenticated(true);
            setShowLoginModal(false);
            setView('admin');
            setAdminPassword('');
          }
        } else {
          const data = await res.json();
          setLoginError(data.error || 'Erro ao configurar senha');
        }
      } catch (err) {
        setLoginError('Erro ao conectar ao servidor');
      }
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (res.ok) {
        setIsAdminAuthenticated(true);
        setShowLoginModal(false);
        setView('admin');
        setAdminPassword('');
      } else {
        setLoginError('Senha incorreta. Tente novamente.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar ao servidor.');
    }
  };

  const handleSwitchToAdmin = () => {
    if (isAdminAuthenticated) {
      setView('admin');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleSwitchToUser = () => {
    setView('user');
    setIsCreating(false);
    setIsViewingRegs(false);
    setIsRegistering(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      {/* Admin Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200"
            >
              <div className="text-center mb-8">
                <div className="bg-[#004a99] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-100">
                  <Settings className="w-8 h-8 text-[#fff200]" />
                </div>
                <h2 className="text-2xl font-black text-slate-800">
                  {isAdminSetup ? 'Acesso Restrito' : 'Configurar Painel'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {isAdminSetup ? 'Somente para pedagogos e administradores.' : 'Crie uma senha para o primeiro acesso.'}
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isAdminSetup ? 'Senha de Acesso' : 'Nova Senha'}
                  </label>
                  <input 
                    type="password" 
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none transition-all"
                    placeholder={isAdminSetup ? "Digite a senha..." : "Crie sua senha..."}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                  {loginError && (
                    <p className="text-rose-500 text-xs font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {loginError}
                    </p>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-[#004a99] text-white rounded-xl font-bold hover:bg-[#003d80] transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                  {isAdminSetup ? 'Entrar no Painel' : 'Criar Senha e Entrar'}
                </button>
                <div className="flex flex-col gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowLoginModal(false);
                      setShowForgotModal(true);
                    }}
                    className="w-full py-1 text-[#004a99] text-xs font-bold hover:underline transition-all"
                  >
                    Esqueci a senha
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="w-full py-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-slate-200"
            >
              <div className="text-center mb-6">
                <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800">Recuperar Senha</h2>
                <p className="text-slate-500 text-sm mt-2">
                  Por segurança, a redefinição de senha deve ser solicitada ao administrador do sistema ou alterada via variáveis de ambiente.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  A senha padrão é definida no servidor. Se você esqueceu a senha personalizada, entre em contato com o suporte técnico do SESI Internacional.
                </p>
              </div>

              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all active:scale-95"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#004a99] text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#fff200] p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-[#004a99]" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">SESI Internacional</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-80">Portal de Eventos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/10 p-1 rounded-full">
            <button 
              onClick={handleSwitchToUser}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'user' ? 'bg-[#fff200] text-[#004a99]' : 'hover:bg-white/10'}`}
            >
              Eventos
            </button>
            <button 
              onClick={handleSwitchToAdmin}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'admin' ? 'bg-[#fff200] text-[#004a99]' : 'hover:bg-white/10'}`}
            >
              Painel Admin
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User View */}
        {view === 'user' && !isRegistering && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Próximos Eventos</h2>
                <p className="text-slate-500">Confira as atividades disponíveis e garanta sua vaga.</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar eventos..."
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-[#004a99] focus:border-transparent outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004a99]"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events
                  .filter(e => {
                    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const hasSpots = !isEventFull(e);
                    const isWithinDeadline = !isDeadlinePassed(e);
                    return matchesSearch && hasSpots && isWithinDeadline;
                  })
                  .map(event => {
                    const full = isEventFull(event);
                    const closed = isDeadlinePassed(event);
                    return (
                      <motion.div 
                        key={event.id}
                        whileHover={{ y: -4 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
                      >
                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <Badge variant={event.type === 'Oficina' ? 'warning' : 'default'}>{event.type}</Badge>
                            {full && <Badge variant="danger">LOTADO</Badge>}
                            {!full && closed && <Badge variant="danger">ENCERRADO</Badge>}
                          </div>
                          <h3 className="text-xl font-bold mb-2 text-slate-800">{event.name}</h3>
                          <p className="text-slate-500 text-sm line-clamp-2 mb-4">{event.description}</p>
                          
                          <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#004a99]" />
                              <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#004a99]" />
                              <span>{event.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#004a99]" />
                              <span>{event.max_vagas - event.current_registrations} vagas restantes</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                          <button 
                            disabled={full || closed}
                            onClick={async () => {
                              const details = await fetchEventDetails(event.id);
                              setSelectedEvent(details);
                              setIsRegistering(true);
                            }}
                            className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${full || closed ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#fff200] text-[#004a99] hover:bg-[#ffe600] shadow-sm'}`}
                          >
                            {full ? 'Vagas Esgotadas' : closed ? 'Inscrições Encerradas' : 'Inscrever-se'}
                            {!full && !closed && <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </motion.div>
        )}

        {/* Registration Form */}
        {isRegistering && selectedEvent && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto bg-white sm:rounded-3xl shadow-xl border-x border-b sm:border border-slate-200 overflow-hidden"
          >
            <div className="bg-[#004a99] p-6 sm:p-8 text-white relative">
              <button 
                onClick={() => setIsRegistering(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Inscrição</h2>
              <p className="opacity-80 text-sm sm:text-base">{selectedEvent.name}</p>
            </div>
            
            <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {selectedEvent.fields?.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      {field.field_label}
                      {field.is_required && <span className="text-rose-500">*</span>}
                    </label>
                    
                    {field.field_type === 'text' && (
                      <input 
                        type="text"
                        required={field.is_required}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none transition-all"
                        onChange={(e) => setRegData({ ...regData, [field.field_name]: e.target.value })}
                      />
                    )}

                    {field.field_type === 'textarea' && (
                      <textarea 
                        required={field.is_required}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none transition-all"
                        onChange={(e) => setRegData({ ...regData, [field.field_name]: e.target.value })}
                      />
                    )}

                    {field.field_type === 'select' && (
                      <select 
                        required={field.is_required}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none transition-all"
                        onChange={(e) => setRegData({ ...regData, [field.field_name]: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {field.options?.split(',').map(opt => (
                          <option key={opt} value={opt.trim()}>{opt.trim()}</option>
                        ))}
                      </select>
                    )}

                    {field.field_type === 'radio' && (
                      <div className="flex flex-wrap gap-4 pt-2">
                        {field.options?.split(',').map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name={field.field_name}
                              required={field.is_required}
                              value={opt.trim()}
                              className="w-4 h-4 text-[#004a99] focus:ring-[#004a99]"
                              onChange={(e) => setRegData({ ...regData, [field.field_name]: e.target.value })}
                            />
                            <span className="text-sm text-slate-600">{opt.trim()}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-4 bg-[#fff200] text-[#004a99] rounded-2xl font-black text-lg hover:bg-[#ffe600] shadow-lg shadow-yellow-200 transition-all active:scale-95"
                >
                  Confirmar Inscrição
                </button>
                <p className="text-center text-xs text-slate-400 mt-4">
                  Ao clicar em confirmar, você concorda com os termos do evento.
                </p>
              </div>
            </form>
          </motion.div>
        )}

        {/* Admin Dashboard */}
        {view === 'admin' && !isCreating && !isViewingRegs && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestão Pedagógica</h2>
                <p className="text-slate-500 text-sm mt-1">Controle de eventos e monitoramento de vagas.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    resetNewEvent();
                    setIsCreating(true);
                  }}
                  className="bg-[#004a99] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#003d80] transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Novo Evento
                </button>
                <button 
                  onClick={() => {
                    setIsAdminAuthenticated(false);
                    setView('user');
                  }}
                  className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Sair
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {events.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
                  <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Nenhum evento cadastrado.</p>
                </div>
              ) : (
                events.map(event => (
                  <motion.div 
                    key={event.id}
                    layout
                    className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isEventFull(event) ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#004a99]'}`}>
                        {isEventFull(event) ? <Users className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 truncate">{event.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.date).toLocaleDateString('pt-BR')}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span>{event.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-8 w-full sm:w-auto">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ocupação</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${isEventFull(event) ? 'text-rose-500' : 'text-slate-700'}`}>
                            {event.current_registrations} / {event.max_vagas}
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${isEventFull(event) ? 'bg-rose-500' : 'bg-[#004a99]'}`}
                              style={{ width: `${Math.min(100, (event.current_registrations / event.max_vagas) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={async () => {
                            setSelectedEvent(event);
                            await fetchRegistrations(event.id);
                            setIsViewingRegs(true);
                          }}
                          className="p-2.5 text-slate-400 hover:text-[#004a99] hover:bg-blue-50 rounded-xl transition-all"
                          title="Ver Inscritos"
                        >
                          <Users className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleEditEvent(event)}
                          className="p-2.5 text-slate-400 hover:text-[#004a99] hover:bg-slate-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Create Event Form */}
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setEditingEventId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h2 className="text-3xl font-black text-slate-800">
                  {editingEventId ? 'Editar Evento' : 'Novo Evento'}
                </h2>
                {editingEventId && <p className="text-slate-500 text-sm">Alterando as informações do evento selecionado.</p>}
              </div>
            </div>

            <form onSubmit={handleSubmitEvent} className="space-y-6 sm:space-y-8">
              {/* Basic Info Section */}
              <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#004a99]">
                  <Settings className="w-5 h-5" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-600">Nome do Evento</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.name}
                      onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Tipo de Evento</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.type}
                      onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                    >
                      <option>Oficina</option>
                      <option>After</option>
                      <option>Palestra</option>
                      <option>Workshop</option>
                      <option>Esportivo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Máximo de Vagas</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.max_vagas}
                      onChange={e => setNewEvent({ ...newEvent, max_vagas: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Data do Evento</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.date}
                      onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Horário</label>
                    <input 
                      type="time" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.time}
                      onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600">Data Limite de Inscrição</label>
                    <input 
                      type="datetime-local" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.deadline}
                      onChange={e => setNewEvent({ ...newEvent, deadline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-600">Descrição</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004a99] outline-none"
                      value={newEvent.description}
                      onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-[#004a99]">
                    <PlusCircle className="w-5 h-5" />
                    Campos do Formulário
                  </h3>
                  <button 
                    type="button"
                    onClick={addField}
                    className="text-sm font-bold text-[#004a99] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-4">
                  {newEvent.fields?.map((field, index) => (
                    <motion.div 
                      key={index}
                      layout
                      className="p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-start"
                    >
                      <div className="pt-2 hidden md:block">
                        <GripVertical className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Rótulo (Label)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#004a99]"
                            value={field.field_label}
                            onChange={e => updateField(index, { field_label: e.target.value, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400">Tipo</label>
                          <select 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#004a99]"
                            value={field.field_type}
                            onChange={e => updateField(index, { field_type: e.target.value as any })}
                          >
                            <option value="text">Texto Simples</option>
                            <option value="textarea">Texto Longo</option>
                            <option value="select">Seleção (Dropdown)</option>
                            <option value="radio">Múltipla Escolha</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4 pt-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={field.is_required}
                              className="w-4 h-4 text-[#004a99] rounded"
                              onChange={e => updateField(index, { is_required: e.target.checked })}
                            />
                            <span className="text-xs font-bold text-slate-600">Obrigatório</span>
                          </label>
                          <button 
                            type="button"
                            onClick={() => removeField(index)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {(field.field_type === 'select' || field.field_type === 'radio') && (
                          <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Opções (separadas por vírgula)</label>
                            <input 
                              type="text" 
                              placeholder="Opção 1, Opção 2, Opção 3"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#004a99]"
                              value={field.options || ''}
                              onChange={e => updateField(index, { options: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-8 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-[#004a99] text-white rounded-2xl font-bold hover:bg-[#003d80] transition-all shadow-lg shadow-blue-100"
                >
                  {editingEventId ? 'Salvar Alterações' : 'Publicar Evento'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Registrations List View */}
        {isViewingRegs && selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsViewingRegs(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all no-print"
                >
                  <ArrowLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div>
                  <div className="hidden print:block mb-4">
                    <h1 className="text-3xl font-black text-[#004a99]">SESI Internacional</h1>
                    <p className="text-slate-500">Relatório de Inscrições</p>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedEvent.name}</h2>
                  <p className="text-slate-500">Lista de inscritos ({registrations.length} total)</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
                <button 
                  onClick={printList}
                  className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / PDF
                </button>
                <button 
                  onClick={exportToCSV}
                  className="bg-[#004a99] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#003d80] transition-all"
                >
                  <Download className="w-4 h-4" />
                  Excel (CSV)
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                      {regFields.map(field => (
                        <th key={field.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {field.field_label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrations.map(reg => (
                      <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(reg.registration_date).toLocaleString('pt-BR')}
                        </td>
                        {regFields.map(field => (
                          <td key={field.id} className="px-6 py-4 text-sm text-slate-700">
                            {reg.data[field.field_name] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {registrations.length === 0 && (
                      <tr>
                        <td colSpan={regFields.length + 1} className="px-6 py-20 text-center text-slate-400 italic">
                          Nenhuma inscrição realizada até o momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {registrations.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
                  <p className="text-slate-400 italic">Nenhuma inscrição realizada.</p>
                </div>
              ) : (
                registrations.map(reg => (
                  <div key={reg.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Data da Inscrição</span>
                      <span className="text-xs text-slate-500">{new Date(reg.registration_date).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {regFields.map(field => (
                        <div key={field.id} className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">{field.field_label}</span>
                          <span className="text-sm text-slate-700 font-medium break-words">{reg.data[field.field_name] || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
             <div className="bg-[#004a99] p-3 rounded-2xl">
                <Calendar className="w-8 h-8 text-[#fff200]" />
             </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">© 2024 Colégio SESI Internacional. Todos os direitos reservados.</p>
          <div className="mt-4 flex justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-[#004a99]">Privacidade</a>
            <a href="#" className="hover:text-[#004a99]">Termos</a>
            <a href="#" className="hover:text-[#004a99]">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
