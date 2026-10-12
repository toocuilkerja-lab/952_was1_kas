/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Trash2, 
  Search, 
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  User,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Transaction {
  id: number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  employee_name: string | null;
  month: string | null;
  date: string;
}

const EMPLOYEES = ["Ibu Endah", "aan", "adhi", "ardi", "ari", "arya", "dona", "fadli", "ime", "luken", "novi", "suel", "yuman"];
const HIDDEN_EMPLOYEES = ["aan", "adhi", "dona", "luken"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
  const [recapPage, setRecapPage] = useState(1);
  
  const TRANSACTIONS_PER_PAGE = 10;
  const [formData, setFormData] = useState({
    type: 'debit' as 'debit' | 'credit',
    amount: '',
    description: '',
    employee_name: '',
    month: format(new Date(), 'MMMM yyyy', { locale: localeID })
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, amount: value }));
  };

  const formatInputNumber = (val: string) => {
    if (!val) return '';
    return new Intl.NumberFormat('id-ID').format(Number(val));
  };

  useEffect(() => {
    fetchTransactions();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseInt(formData.amount)
        })
      });

      if (response.ok) {
        fetchTransactions();
        setShowAddModal(false);
        setFormData({
          type: 'debit',
          amount: '',
          description: '',
          employee_name: '',
          month: format(new Date(), 'MMMM yyyy', { locale: localeID })
        });
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const handleDelete = (id: number) => {
    setTransactionToDelete(id);
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deletePassword !== 'cuiL') {
      alert('Password salah!');
      return;
    }
    
    if (transactionToDelete === null) return;

    try {
      await fetch('/api/transactions/' + transactionToDelete, { method: 'DELETE' });
      fetchTransactions();
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const totalDebit = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCredit = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalDebit - totalCredit;

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (t.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                         (t.month?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesType && matchesSearch;
  });

  const totalTransactionPages = Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE,
    currentTransactionPage * TRANSACTIONS_PER_PAGE
  );

  useEffect(() => {
    setCurrentTransactionPage(1);
  }, [filterType, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getBalanceStatus = (amount: number) => {
    if (amount < 0) return { text: "tekor abangku", color: "text-rose-600", bg: "bg-rose-50" };
    if (amount <= 200000) return { text: "kendor abangku", color: "text-amber-600", bg: "bg-amber-50" };
    if (amount <= 1000000) return { text: "semangat abangku", color: "text-blue-600", bg: "bg-blue-50" };
    return { text: "menyala abangku", color: "text-emerald-600", bg: "bg-emerald-50" };
  };

  // Generate Recap Data
  const currentYear = new Date().getFullYear();
  const recapMonths = MONTHS.map(m => `${m} ${currentYear}`);
  
  const getPaymentStatus = (employee: string, month: string) => {
    const normalize = (name?: string | null) => name?.toLowerCase().replace(/[^a-z0-9]/g, '').trim() || '';
    return transactions.some(t => 
      t.type === 'debit' && 
      normalize(t.employee_name) === normalize(employee) && 
      t.month === month
    );
  };
  
  // Recap Data Split
  const activeEmployees = EMPLOYEES.filter(emp => !HIDDEN_EMPLOYEES.includes(emp));
  const hiddenEmployees = EMPLOYEES.filter(emp => HIDDEN_EMPLOYEES.includes(emp));
  const currentRecapEmployees = recapPage === 1 ? activeEmployees : hiddenEmployees;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#141414]/10 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif italic font-bold tracking-tight">952_was1_kas</h1>
            <p className="text-[10px] sm:text-xs text-[#141414]/50 uppercase tracking-widest font-mono">Uang Kas Seksi</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowRecap(!showRecap)}
              className="bg-white border border-[#141414]/10 text-[#141414] p-2 sm:px-4 sm:py-2 rounded-full flex items-center gap-2 hover:bg-[#F5F5F0] transition-all active:scale-95 shadow-sm"
              title={showRecap ? 'Lihat Riwayat' : 'Rekap Iuran'}
            >
              <Filter size={18} />
              <span className="text-sm font-medium hidden sm:inline">{showRecap ? 'Riwayat' : 'Rekap'}</span>
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#141414] text-white p-2 sm:px-4 sm:py-2 rounded-full flex items-center gap-2 hover:bg-[#141414]/90 transition-all active:scale-95 shadow-lg"
              title="Tambah Transaksi"
            >
              <Plus size={18} />
              <span className="text-sm font-medium hidden sm:inline">Tambah</span>
            </button>
          </div>
        </div>
      </header>

      {showInstallBanner && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] text-white px-4 py-3 flex justify-between items-center sticky top-[73px] sm:top-[81px] z-10 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Plus size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold">Gunakan sebagai Aplikasi</p>
              <p className="text-[10px] text-white/60">Pasang di layar utama untuk akses cepat</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
            >
              Nanti
            </button>
            <button 
              onClick={handleInstallClick}
              className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
            >
              Pasang
            </button>
          </div>
        </motion.div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-[#141414]/5 shadow-sm space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Wallet size={18} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-[#141414]/40 uppercase tracking-wider">Saldo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter">{formatCurrency(balance)}</h2>
            <div className="flex items-center gap-2">
              <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", getBalanceStatus(balance).bg, getBalanceStatus(balance).color)}>
                {getBalanceStatus(balance).text}
              </div>
            </div>
            <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-2/3" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-[#141414]/5 shadow-sm space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-[#141414]/40 uppercase tracking-wider">Masuk</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-emerald-600">{formatCurrency(totalDebit)}</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 sm:p-6 rounded-3xl border border-[#141414]/5 shadow-sm space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <TrendingDown size={18} />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-[#141414]/40 uppercase tracking-wider">Keluar</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-rose-600">{formatCurrency(totalCredit)}</h2>
          </motion.div>
        </div>

        {showRecap ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
              <h3 className="text-sm font-mono uppercase tracking-widest text-[#141414]/40">Rekap Checklist Iuran {currentYear}</h3>
              <div className="flex p-1 bg-white border border-[#141414]/10 rounded-xl shadow-sm self-stretch sm:self-auto">
                <button
                  onClick={() => setRecapPage(1)}
                  className={cn(
                    "flex-1 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    recapPage === 1 ? "bg-[#141414] text-white" : "text-[#141414]/40 hover:bg-[#141414]/5"
                  )}
                >
                  Halaman 1 (Aktif)
                </button>
                <button
                  onClick={() => setRecapPage(2)}
                  className={cn(
                    "flex-1 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    recapPage === 2 ? "bg-[#141414] text-white" : "text-[#141414]/40 hover:bg-[#141414]/5"
                  )}
                >
                  Halaman 2 (Lainnya)
                </button>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-x-auto no-scrollbar relative">
              {/* Scroll Hint for Mobile */}
              <div className="sm:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-20" />
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F0]/50">
                    <th className="p-3 sm:p-4 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#141414]/40 border-b border-[#141414]/5 sticky left-0 bg-[#F5F5F0] z-10">Pegawai</th>
                    {recapMonths.map(m => (
                      <th key={m} className="p-3 sm:p-4 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#141414]/40 border-b border-[#141414]/5 text-center min-w-[80px]">
                        {m.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRecapEmployees.map(emp => (
                    <tr key={emp} className="hover:bg-[#F5F5F0]/30 transition-all">
                      <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium capitalize border-b border-[#141414]/5 sticky left-0 bg-white z-10">{emp}</td>
                      {recapMonths.map(m => {
                        const paid = getPaymentStatus(emp, m);
                        return (
                          <td key={m} className="p-3 sm:p-4 border-b border-[#141414]/5 text-center">
                            <div className={cn(
                              "inline-flex p-1 rounded-full",
                              paid ? "bg-emerald-100 text-emerald-600" : "bg-[#F5F5F0] text-[#141414]/10"
                            )}>
                              {paid ? <Check size={12} /> : <X size={12} />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-center text-[#141414]/30 font-medium">
              Menampilkan {recapPage === 1 ? `${activeEmployees.length} Pegawai Aktif` : `${hiddenEmployees.length} Pegawai Tersembunyi`} (Halaman {recapPage}/2)
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-[#141414]/5 shadow-sm">
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {(['all', 'debit', 'credit'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-medium transition-all capitalize whitespace-nowrap",
                      filterType === type 
                        ? "bg-[#141414] text-white" 
                        : "bg-[#F5F5F0] text-[#141414]/60 hover:bg-[#141414]/5"
                    )}
                  >
                    {type === 'all' ? 'Semua' : type === 'debit' ? 'Masuk' : 'Keluar'}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#141414]/30" size={14} />
                <input 
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F5F5F0] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#141414]/10 transition-all outline-none"
                />
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#141414]/40">Riwayat Transaksi</h3>
                {totalTransactionPages > 1 && (
                  <span className="text-[10px] font-mono text-[#141414]/30 uppercase">Hal {currentTransactionPage} dari {totalTransactionPages}</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <AnimatePresence mode='popLayout'>
                  {paginatedTransactions.map((t) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={t.id}
                      className="group bg-white p-3 sm:p-4 rounded-2xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-all flex items-center gap-3 sm:gap-4"
                    >
                      <div className={cn(
                        "p-2.5 sm:p-3 rounded-xl shrink-0",
                        t.type === 'debit' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t.type === 'debit' ? <Plus size={18} /> : <Minus size={18} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                          <span className="text-[9px] sm:text-xs font-mono text-[#141414]/40">
                            {format(new Date(t.date), 'dd MMM yy', { locale: localeID })}
                          </span>
                          {t.month && (
                            <span className="flex items-center gap-1 text-[9px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-600 font-medium whitespace-nowrap">
                              <Calendar size={8} />
                              {t.month}
                            </span>
                          )}
                          {t.employee_name && (
                            <span className="flex items-center gap-1 text-[9px] bg-[#F5F5F0] px-2 py-0.5 rounded-full text-[#141414]/60 whitespace-nowrap">
                              <User size={8} />
                              {t.employee_name}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:font-medium text-[#141414] truncate leading-tight">{t.description}</h4>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn(
                          "font-bold text-base sm:text-lg tracking-tight",
                          t.type === 'debit' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {t.type === 'debit' ? '+' : '-'}{formatCurrency(t.amount).replace('Rp', '').trim()}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-[#141414]/20 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredTransactions.length === 0 && !loading && (
                  <div className="py-20 text-center space-y-4">
                    <div className="inline-flex p-4 bg-white rounded-full border border-[#141414]/5">
                      <Search size={32} className="text-[#141414]/10" />
                    </div>
                    <p className="text-[#141414]/40 text-sm italic">Tidak ada transaksi ditemukan</p>
                  </div>
                )}
              </div>

              {/* Transactions Pagination */}
              {totalTransactionPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                  <button
                    disabled={currentTransactionPage === 1}
                    onClick={() => setCurrentTransactionPage(prev => Math.max(1, prev - 1))}
                    className="p-2 bg-white border border-[#141414]/10 rounded-full text-[#141414] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#F5F5F0] transition-all"
                  >
                    <ChevronDown className="rotate-90" size={20} />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalTransactionPages }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all",
                          currentTransactionPage === i + 1 ? "bg-[#141414] w-4" : "bg-[#141414]/10"
                        )} 
                      />
                    ))}
                  </div>
                  <button
                    disabled={currentTransactionPage === totalTransactionPages}
                    onClick={() => setCurrentTransactionPage(prev => Math.min(totalTransactionPages, prev + 1))}
                    className="p-2 bg-white border border-[#141414]/10 rounded-full text-[#141414] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#F5F5F0] transition-all"
                  >
                    <ChevronDown className="-rotate-90" size={20} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden mt-auto sm:my-auto"
            >
              <div className="p-5 sm:p-6 border-b border-[#141414]/5 flex justify-between items-center bg-[#F5F5F0]/50 relative">
                {/* Mobile Handle */}
                <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#141414]/10 rounded-full" />
                <h2 className="text-lg sm:text-xl font-serif italic font-bold">Tambah Transaksi</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#141414]/5 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 sm:space-y-6 max-h-[85vh] overflow-y-auto pb-10 sm:pb-6">
                <div className="flex p-1 bg-[#F5F5F0] rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'debit' }))}
                    className={cn(
                      "flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2",
                      formData.type === 'debit' ? "bg-white shadow-sm text-emerald-600" : "text-[#141414]/40"
                    )}
                  >
                    <Plus size={14} /> Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'credit' }))}
                    className={cn(
                      "flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2",
                      formData.type === 'credit' ? "bg-white shadow-sm text-rose-600" : "text-[#141414]/40"
                    )}
                  >
                    <Minus size={14} /> Keluar
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[#141414]/40 ml-1">Jumlah (Rp)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="0"
                        value={formatInputNumber(formData.amount)}
                        onChange={handleAmountChange}
                        className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-[#141414]/10 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[#141414]/40 ml-1">Bulan Iuran</label>
                      <select 
                        value={formData.month}
                        onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414]/10 outline-none appearance-none"
                      >
                        {MONTHS.map(m => (
                          <option key={m} value={`${m} ${currentYear}`}>{m} {currentYear}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-[#141414]/40 ml-1">Keterangan</label>
                    <textarea 
                      required
                      placeholder="Contoh: Iuran kas bulan Maret"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414]/10 outline-none min-h-[80px] resize-none"
                    />
                  </div>

                  {formData.type === 'debit' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase tracking-widest text-[#141414]/40 ml-1">Nama Pegawai</label>
                      <select 
                        required
                        value={formData.employee_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#141414]/10 outline-none appearance-none"
                      >
                        <option value="">Pilih Pegawai...</option>
                        {EMPLOYEES.filter(emp => !HIDDEN_EMPLOYEES.includes(emp)).map(emp => (
                          <option key={emp} value={emp}>{emp.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold tracking-tight hover:bg-[#141414]/90 transition-all active:scale-[0.98] shadow-xl"
                >
                  Simpan Transaksi
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Password Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 space-y-4"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg">Konfirmasi Hapus</h3>
                <p className="text-xs text-[#141414]/40">Masukkan password untuk menghapus transaksi ini.</p>
              </div>

              <input 
                type="password"
                placeholder="Password"
                autoFocus
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-xl text-center font-bold focus:ring-2 focus:ring-rose-500/20 outline-none"
              />

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 text-sm font-medium text-[#141414]/40 hover:bg-[#F5F5F0] rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
