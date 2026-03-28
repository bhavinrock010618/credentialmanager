import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Copy, Edit2, Trash2, Eye, EyeOff, Check, ExternalLink, Shield, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Credential {
  id: number;
  url: string;
  username: string;
  password: string;
  project: string;
  protocol: string;
  host: string;
  login_type: string;
  ftp_user: string;
  ftp_pass: string;
  secret_key: string;
  public_key: string;
  note: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    url: '', username: '', password: '', project: 'General',
    protocol: '', host: '', login_type: '',
    ftp_user: '', ftp_pass: '', secret_key: '', public_key: '',
    note: ''
  });
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<{ id: number, field: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credRes, projRes] = await Promise.all([
        fetch('/api/credentials'),
        fetch('/api/projects')
      ]);
      const creds = await credRes.json();
      const projs = await projRes.json();
      setCredentials(creds);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const masterPass = import.meta.env.VITE_ACCESS_PASSWORD || 'password123';
    if (accessPassword === masterPass) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      const matchesSearch = c.url.toLowerCase().includes(search.toLowerCase()) ||
                          c.username.toLowerCase().includes(search.toLowerCase()) ||
                          (c.host && c.host.toLowerCase().includes(search.toLowerCase()));
      const matchesProject = selectedProject === 'All Projects' || c.project === selectedProject;
      return matchesSearch && matchesProject;
    });
  }, [credentials, search, selectedProject]);

  const handleCopy = async (id: number, text: string, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId({ id, field });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (id: number, field: string) => {
    const key = `${id}-${field}`;
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isPasswordVisible = (id: number, field: string) => {
    return !!showPasswords[`${id}-${field}`];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.url && !formData.host) {
      alert("Either Website URL or Host Name is required.");
      return;
    }

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/credentials/${editingId}` : '/api/credentials';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchData();
        closeModal();
      }
    } catch (err) {
      console.error('Failed to save credential', err);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (res.ok) {
        const updatedProjects = await res.json();
        setProjects(updatedProjects);
        setFormData({ ...formData, project: newProjectName.trim() });
        setIsProjectModalOpen(false);
        setNewProjectName('');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add project');
      }
    } catch (err) {
      console.error('Failed to add project', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
      const res = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete credential', err);
    }
  };

  const openModal = (credential?: Credential) => {
    if (credential) {
      setEditingId(credential.id);
      setFormData({
        url: credential.url || '',
        username: credential.username || '',
        password: credential.password || '',
        project: credential.project || 'General',
        protocol: credential.protocol || '',
        host: credential.host || '',
        login_type: credential.login_type || '',
        ftp_user: credential.ftp_user || '',
        ftp_pass: credential.ftp_pass || '',
        secret_key: credential.secret_key || '',
        public_key: credential.public_key || '',
        note: credential.note || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        url: '', username: '', password: '', project: projects[0] || 'General',
        protocol: '', host: '', login_type: '',
        ftp_user: '', ftp_pass: '', secret_key: '', public_key: '',
        note: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-12"
        >
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center rotate-6 shadow-sm border border-blue-100">
              <Shield className="w-10 h-10 text-blue-600 -rotate-6" />
            </div>
          </div>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Secure Vault</h1>
            <p className="text-slate-500 text-sm">Enter your master password to unlock your credentials.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="Master Password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50 border ${authError ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'} rounded-2xl focus:outline-none transition-all text-lg`}
                />
              </div>
              {authError && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-red-500 text-xs font-semibold pl-1"
                >
                  Incorrect password. Please try again.
                </motion.p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              Unlock Vault
            </button>
          </form>
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">AES-256 Encrypted Storage</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              Credential Manager
            </h1>
            <p className="text-slate-500 mt-1">Manage projects and secure credentials with ease</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Lock Vault
            </button>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Add Project
            </button>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Credential
            </button>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by URL, username, or host..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option>All Projects</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="text-sm font-medium text-slate-500 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 whitespace-nowrap">
            {filteredCredentials.length} {filteredCredentials.length === 1 ? 'Record' : 'Records'}
          </div>
        </div>

        {/* Credentials List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading vault...</div>
          ) : filteredCredentials.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredCredentials.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded border border-blue-100">
                            {c.project}
                          </span>
                          {c.protocol === 'SFTP' ? (
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold uppercase rounded border border-green-100 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" />
                              Secure (SFTP)
                            </span>
                          ) : c.protocol === 'FTP' ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
                              Standard (FTP)
                            </span>
                          ) : c.protocol && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
                              {c.protocol}
                            </span>
                          )}
                          {c.login_type && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded border border-indigo-100">
                              {c.login_type}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold truncate text-slate-800">{c.url}</h3>
                          <a
                            href={c.url.startsWith('http') ? c.url : `https://${c.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        {c.host && <p className="text-sm text-slate-400 font-mono">{c.host}</p>}
                      </div>
                      <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(c)}
                          className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 pt-4 border-t border-slate-50">
                      {/* Login Info */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Details</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">User:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{c.username}</span>
                              <button onClick={() => handleCopy(c.id, c.username, 'username')} className="p-1 hover:bg-slate-100 rounded text-slate-400 relative">
                                {copiedId?.id === c.id && copiedId?.field === 'username' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Pass:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700">{isPasswordVisible(c.id, 'password') ? c.password : '••••••••'}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => togglePasswordVisibility(c.id, 'password')} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                  {isPasswordVisible(c.id, 'password') ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleCopy(c.id, c.password, 'password')} className="p-1 hover:bg-slate-100 rounded text-slate-400 relative">
                                  {copiedId?.id === c.id && copiedId?.field === 'password' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FTP Info */}
                      {(c.ftp_user || c.ftp_pass) && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FTP Details</h4>
                          <div className="space-y-2">
                            {c.ftp_user && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">User:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-700">{c.ftp_user}</span>
                                  <button onClick={() => handleCopy(c.id, c.ftp_user, 'ftp_user')} className="p-1 hover:bg-slate-100 rounded text-slate-400 relative">
                                    {copiedId?.id === c.id && copiedId?.field === 'ftp_user' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {c.ftp_pass && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Pass:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-slate-700">{isPasswordVisible(c.id, 'ftp_pass') ? c.ftp_pass : '••••••••'}</span>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => togglePasswordVisibility(c.id, 'ftp_pass')} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                      {isPasswordVisible(c.id, 'ftp_pass') ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={() => handleCopy(c.id, c.ftp_pass, 'ftp_pass')} className="p-1 hover:bg-slate-100 rounded text-slate-400 relative">
                                      {copiedId?.id === c.id && copiedId?.field === 'ftp_pass' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Keys Info */}
                      {(c.secret_key || c.public_key) && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Keys</h4>
                          <div className="flex gap-2">
                            {c.secret_key && (
                              <button
                                onClick={() => handleCopy(c.id, c.secret_key, 'secret_key')}
                                className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors relative"
                              >
                                {copiedId?.id === c.id && copiedId?.field === 'secret_key' ? <Check className="w-3 h-3 text-green-500" /> : <Lock className="w-3 h-3" />}
                                SECRET KEY
                              </button>
                            )}
                            {c.public_key && (
                              <button
                                onClick={() => handleCopy(c.id, c.public_key, 'public_key')}
                                className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors relative"
                              >
                                {copiedId?.id === c.id && copiedId?.field === 'public_key' ? <Check className="w-3 h-3 text-green-500" /> : <ExternalLink className="w-3 h-3" />}
                                PUBLIC KEY
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    {c.note && (
                      <div className="pt-4 border-t border-slate-50">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap italic">
                          "{c.note}"
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No records found</h3>
              <p className="text-slate-500">Try adjusting your filters or add a new record.</p>
            </div>
          )}
        </div>
      </div>

      {/* Credential Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? 'Edit Credential' : 'Add New Credential'}</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Basic Info</h3>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Project</label>
                      <select
                        value={formData.project}
                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        {projects.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Website URL</label>
                      <input type="text" placeholder="https://example.com" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Host / Server</label>
                      <input type="text" placeholder="ftp.example.com or 1.2.3.4" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Protocol</label>
                        <select value={formData.protocol} onChange={(e) => setFormData({ ...formData, protocol: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                          <option value="">Select Protocol</option>
                          <option value="SFTP">SFTP</option>
                          <option value="FTP">FTP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Login Type</label>
                        <select value={formData.login_type} onChange={(e) => setFormData({ ...formData, login_type: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                          <option value="">Select Login Type</option>
                          <option value="Anonymous">Anonymous</option>
                          <option value="Normal">Normal</option>
                          <option value="Ask Password">Ask Password</option>
                          <option value="Interactive">Interactive</option>
                          <option value="Key file">Key file</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Credentials</h3>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
                      <input type="text" placeholder="admin" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                      <input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                    <div className="pt-2">
                      <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Optional FTP Details</h4>
                      <div className="space-y-3">
                        <input type="text" placeholder="FTP Username" value={formData.ftp_user} onChange={(e) => setFormData({ ...formData, ftp_user: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all" />
                        <input type="password" placeholder="FTP Password" value={formData.ftp_pass} onChange={(e) => setFormData({ ...formData, ftp_pass: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Additional Information</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Note</label>
                    <textarea rows={3} placeholder="Add notes (optional)" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Security Keys</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Secret Key</label>
                      <textarea rows={3} placeholder="Paste secret key here..." value={formData.secret_key} onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Public Key</label>
                      <textarea rows={3} placeholder="Paste public key here..." value={formData.public_key} onChange={(e) => setFormData({ ...formData, public_key: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
                    {editingId ? 'Save Changes' : 'Add Credential'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Modal */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProjectModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Add New Project</h2>
              <form onSubmit={handleAddProject} className="space-y-4">
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="Project Name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors active:scale-95">Add Project</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
