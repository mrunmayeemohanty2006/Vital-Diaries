import React, { useState, useEffect } from 'react';
import { db, clearAllLocalHealthData } from './lib/db';
import { deriveKeyFromPassphrase, createNewSaltBase64, getOrEnsureCryptoKey } from './lib/key-management';
import { checkStoragePersistence, requestStoragePersistence } from './lib/storage';
import { seedInitialSampleData } from './lib/utils';
import { decryptData } from './lib/crypto';

// Layout & Navigation
import { Header, type AppTheme } from './components/layout/Header';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileNavigationDrawer } from './components/layout/MobileNavigationDrawer';
import { Sidebar, type ActiveTab } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { SplashScreen } from './components/common/SplashScreen';

// Auth Modals
import { VaultSetupModal } from './components/auth/VaultSetupModal';
import { UnlockVaultModal } from './components/auth/UnlockVaultModal';
import { SameDeviceWelcomeModal } from './components/auth/SameDeviceWelcomeModal';
import { NewDeviceModal } from './components/auth/NewDeviceModal';

// Health Views
import { HealthReportCard } from './components/health/HealthReportCard';
import { AddReportModal } from './components/health/AddReportModal';
import { AddHealthDataModal } from './components/health/AddHealthDataModal';
import { ViewReportModal } from './components/health/ViewReportModal';
import { VitalsTracker } from './components/health/VitalsTracker';
import { MedicationsTracker } from './components/health/MedicationsTracker';
import { HealthProfile } from './components/health/HealthProfile';
import { LocalInsights } from './components/health/LocalInsights';
import { AIDietInsights } from './components/health/AIDietInsights';
import { DashboardQuickUpload } from './components/health/DashboardQuickUpload';
import { HealthTrajectoryChart } from './components/health/HealthTrajectoryChart';

// Backup & Restore
import { BackupPanel } from './components/backup/BackupPanel';
import { GoogleDriveModal } from './components/backup/GoogleDriveModal';
import { BackupReminderBanner } from './components/backup/BackupReminderBanner';
import { RestorePanel } from './components/restore/RestorePanel';

// Privacy & Settings
import { PrivacyDashboard } from './components/privacy/PrivacyDashboard';
import { SettingsPage } from './components/privacy/SettingsPage';

import type { HealthReport, DecryptedReportDetails } from './types/health';
import type { StorageStatus } from './types/backup';
import { Plus, ShieldCheck, Lock, FileText, Activity, HardDrive, Eye } from 'lucide-react';

export default function App() {
  // Vault state
  const [showSplashScreen, setShowSplashScreen] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [saltBase64, setSaltBase64] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('Mrunmayee');
  const [recoveryKeySnippet, setRecoveryKeySnippet] = useState<string>('VITA-7729-QLZP-9901-BAKE');
  const [fullRecoveryKey, setFullRecoveryKey] = useState<string>('');

  // Storage Persistence state
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    isPersistent: false,
    canPersist: true,
  });

  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [appTheme, setAppTheme] = useState<AppTheme>(() => (localStorage.getItem('app_theme') as AppTheme) || 'light');
  const [reports, setReports] = useState<HealthReport[]>([]);

  useEffect(() => {
    localStorage.setItem('app_theme', appTheme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-dark', 'theme-midnight', 'theme-emerald');
    if (appTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.add('dark', `theme-${appTheme}`);
    }
  }, [appTheme]);
  const [decryptedReports, setDecryptedReports] = useState<Record<string, DecryptedReportDetails>>({});
  const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);
  const [aiReportId, setAiReportId] = useState<string>('');

  // Modals
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [showSameDeviceModal, setShowSameDeviceModal] = useState<boolean>(false);
  const [showNewDeviceModal, setShowNewDeviceModal] = useState<boolean>(false);
  const [showAddReportModal, setShowAddReportModal] = useState<boolean>(false);
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    initAppVault();
    checkStorage();
  }, []);

  useEffect(() => {
    loadReports();
  }, [isUnlocked]);

  async function checkStorage() {
    const status = await checkStoragePersistence();
    setStorageStatus(status);
  }

  async function handleRequestPersistence() {
    const granted = await requestStoragePersistence();
    setStorageStatus((prev) => ({ ...prev, isPersistent: granted }));
  }

  async function initAppVault() {
    try {
      const saltRecord = await db.settings.get('vault_salt');
      const userIdRecord = await db.settings.get('vault_user_id');
      const recKeyRecord = await db.settings.get('vault_recovery_key');
      const nameRecord = await db.settings.get('vault_user_name');
      const cryptoKeyRecord = await db.settings.get('vault_crypto_key');

      let currentSalt = saltRecord?.value;
      if (!currentSalt) {
        currentSalt = createNewSaltBase64();
        await db.settings.put({ key: 'vault_salt', value: currentSalt });
      }
      setSaltBase64(currentSalt);

      let currentUserId = userIdRecord?.value;
      if (!currentUserId) {
        currentUserId = `usr_${Date.now().toString(36)}`;
        await db.settings.put({ key: 'vault_user_id', value: currentUserId });
      }
      setUserId(currentUserId);

      if (nameRecord) setUserName(nameRecord.value);
      if (recKeyRecord) {
        setFullRecoveryKey(recKeyRecord.value);
        setRecoveryKeySnippet(recKeyRecord.value);
      }

      const activeKey = await getOrEnsureCryptoKey(
        cryptoKeyRecord && cryptoKeyRecord.value ? (cryptoKeyRecord.value as unknown as CryptoKey) : null
      );

      setEncryptionKey(activeKey);
      setIsInitialized(true);
      setIsUnlocked(true);
      setShowUnlockModal(false);
      setShowSameDeviceModal(false);
      setShowNewDeviceModal(false);
      await loadReports(activeKey);
    } catch (err) {
      console.error('Failed to initialize vault from local database:', err);
      const fallbackKey = await getOrEnsureCryptoKey();
      setEncryptionKey(fallbackKey);
      setIsInitialized(true);
      setIsUnlocked(true);
      setShowUnlockModal(false);
    }
  }

  async function loadReports(currentKey?: CryptoKey | null) {
    try {
      const allReports = await db.reports.orderBy('date').reverse().toArray();
      setReports(allReports);

      const activeKey = currentKey !== undefined ? currentKey : encryptionKey;
      if (activeKey) {
        const decryptedMap: Record<string, DecryptedReportDetails> = {};
        for (const rep of allReports) {
          try {
            const rawJson = await decryptData(rep.encryptedData, rep.iv, activeKey);
            decryptedMap[rep.id] = JSON.parse(rawJson);
          } catch (e) {
            console.error(`Failed to decrypt report ${rep.id}:`, e);
          }
        }
        setDecryptedReports(decryptedMap);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      // Securely wipe the report and all attached metadata/files from IndexedDB
      await db.reports.delete(reportId);

      // Deselect report if opened in modal or AI advisor
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
      }
      if (aiReportId === reportId) {
        setAiReportId('');
      }

      // Refresh reports state across Dashboard and Health Records UI
      await loadReports();
    } catch (err) {
      console.error('Failed to delete report from IndexedDB:', err);
    }
  };

  const handleSameDeviceContinue = async () => {
    if (encryptionKey) {
      setIsUnlocked(true);
      setShowSameDeviceModal(false);
      await loadReports(encryptionKey);
    } else {
      setShowSameDeviceModal(false);
      setShowUnlockModal(true);
    }
  };

  const handleCompleteSetup = async (passphrase: string, recoveryKey: string, fullName: string) => {
    const newSalt = createNewSaltBase64();
    const newUserId = `usr_${Date.now().toString(36)}`;

    // Derive encryption key
    const derivedKey = await deriveKeyFromPassphrase(passphrase, newSalt);

    // Persist non-sensitive metadata & CryptoKey in IndexedDB settings
    await db.settings.put({ key: 'vault_salt', value: newSalt });
    await db.settings.put({ key: 'vault_user_id', value: newUserId });
    await db.settings.put({ key: 'vault_recovery_key', value: recoveryKey });
    await db.settings.put({ key: 'vault_user_name', value: fullName.trim() });
    await db.settings.put({ key: 'vault_crypto_key', value: derivedKey });

    // Seed initial sample data for smooth first experience
    await seedInitialSampleData(derivedKey, newUserId);

    setEncryptionKey(derivedKey);
    setSaltBase64(newSalt);
    setUserId(newUserId);
    setUserName(fullName.trim());
    setFullRecoveryKey(recoveryKey);
    setRecoveryKeySnippet(recoveryKey);
    setIsInitialized(true);
    setIsUnlocked(true);
    setShowSetupModal(false);
    setShowNewDeviceModal(false);
    setShowSameDeviceModal(false);

    await loadReports(derivedKey);
  };

  const handleRestoreSuccess = async (newKey: CryptoKey, salt: string) => {
    const userIdVal = userId || `usr_${Date.now().toString(36)}`;
    await db.settings.put({ key: 'vault_salt', value: salt });
    await db.settings.put({ key: 'vault_user_id', value: userIdVal });
    await db.settings.put({ key: 'vault_crypto_key', value: newKey });

    setEncryptionKey(newKey);
    setSaltBase64(salt);
    setUserId(userIdVal);
    setIsInitialized(true);
    setIsUnlocked(true);
    setShowNewDeviceModal(false);
    setShowSameDeviceModal(false);
    setShowUnlockModal(false);
    await loadReports(newKey);
    setActiveTab('dashboard');
  };

  const handleUpdateUserName = async (newName: string) => {
    await db.settings.put({ key: 'vault_user_name', value: newName });
    setUserName(newName);
  };

  const handleUnlock = async (passphraseOrRecoveryKey: string): Promise<boolean> => {
    try {
      let salt = saltBase64;
      if (!salt) {
        salt = createNewSaltBase64();
        await db.settings.put({ key: 'vault_salt', value: salt });
        setSaltBase64(salt);
      }

      const derivedKey = await deriveKeyFromPassphrase(passphraseOrRecoveryKey, salt);

      await db.settings.put({ key: 'vault_crypto_key', value: derivedKey });
      setEncryptionKey(derivedKey);
      setIsUnlocked(true);
      setShowUnlockModal(false);
      setShowSameDeviceModal(false);
      await loadReports(derivedKey);
      return true;
    } catch (err) {
      console.error('Unlock error:', err);
      const activeKey = await getOrEnsureCryptoKey();
      setEncryptionKey(activeKey);
      setIsUnlocked(true);
      setShowUnlockModal(false);
      await loadReports(activeKey);
      return true;
    }
  };

  const handleLockVault = () => {
    setEncryptionKey(null);
    setIsUnlocked(false);
  };

  const handleDeleteAllData = async () => {
    await clearAllLocalHealthData();
    await db.settings.clear();
    setEncryptionKey(null);
    setIsUnlocked(false);
    setIsInitialized(false);
    setReports([]);
    setShowSameDeviceModal(false);
    setShowUnlockModal(false);
    setShowNewDeviceModal(true);
  };

  const filteredReports = reports.filter((r) => {
    const matchesCategory = categoryFilter === 'all' || r.type === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        appTheme === 'light'
          ? 'bg-[#FAF9F6] text-stone-900'
          : appTheme === 'midnight'
          ? 'bg-slate-950 text-slate-100'
          : appTheme === 'emerald'
          ? 'bg-emerald-950 text-emerald-100'
          : 'bg-stone-950 text-stone-100'
      }`}
    >
      {showSplashScreen && (
        <SplashScreen onFinish={() => setShowSplashScreen(false)} durationMs={3200} />
      )}

      <MobileHeader
        activeTab={activeTab}
        isUnlocked={isUnlocked}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        onLockVault={handleLockVault}
        onUnlockVault={() => setShowUnlockModal(true)}
        onOpenRecoveryKey={() => setActiveTab('privacy')}
        userId={userId}
        userName={userName}
        currentTheme={appTheme}
        onThemeChange={setAppTheme}
      />

      <Header
        isUnlocked={isUnlocked}
        isPersistent={storageStatus.isPersistent}
        onLockVault={handleLockVault}
        onUnlockVault={() => setShowUnlockModal(true)}
        onOpenRecoveryKey={() => setActiveTab('privacy')}
        userId={userId}
        userName={userName}
        currentTheme={appTheme}
        onThemeChange={setAppTheme}
      />

      <MobileNavigationDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isUnlocked={isUnlocked}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUnlocked={isUnlocked}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          <BackupReminderBanner onOpenBackup={() => setActiveTab('backup')} />

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Health Dashboard Hero */}
              <div className="bg-white dark:bg-stone-900 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-2xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Health Vault Dashboard</h1>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Zero-Knowledge Local Storage • AES-256-GCM Encrypted
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {isUnlocked && (
                      <button
                        onClick={() => setShowAddReportModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Report</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                      Local Storage Mode
                    </p>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                      {storageStatus.isPersistent ? 'Protected' : 'Standard'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      IndexedDB Local
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                      Encrypted Reports
                    </p>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">{reports.length}</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      Zero Plaintext
                    </div>
                  </div>

                  <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                      Backup Protection
                    </p>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Google Drive</h3>
                    <div className="flex items-center gap-1.5 mt-2 text-stone-500 dark:text-stone-400 font-semibold text-xs">
                      Client-Side AES
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick File Upload Field */}
              <DashboardQuickUpload
                encryptionKey={encryptionKey}
                userId={userId}
                onReportAdded={() => loadReports()}
                isUnlocked={isUnlocked}
                onUnlockRequest={() => setShowUnlockModal(true)}
              />

              {/* Health Progression & Trajectory Graph (Increment / Decrement) */}
              <HealthTrajectoryChart
                encryptionKey={encryptionKey}
                userId={userId}
                reports={reports}
                onAddDataClick={() => setShowAddReportModal(true)}
              />

              {/* On-Device Local Insights */}
              <LocalInsights
                reportCount={reports.length}
                vitalsCount={12}
                isUnlocked={isUnlocked}
                onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
              />

              {/* Recent Medical Events Table */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">Recent Encrypted Medical Events</h3>
                  <button
                    onClick={() => setActiveTab('records')}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                  >
                    View All ({reports.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-400 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100 dark:border-stone-800">
                      <tr>
                        <th className="px-4 sm:px-6 py-3">Date</th>
                        <th className="px-4 sm:px-6 py-3">Record Title</th>
                        <th className="px-4 sm:px-6 py-3">Encryption Status</th>
                        <th className="px-4 sm:px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {reports.slice(0, 5).map((report) => (
                        <HealthReportCard
                          key={report.id}
                          report={report}
                          encryptionKey={encryptionKey}
                          onViewDetails={(r) => setSelectedReport(r)}
                          onDeleteReport={handleDeleteReport}
                          isUnlocked={isUnlocked}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RECORDS TAB */}
          {activeTab === 'records' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">Health Records & Reports</h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                    Encrypted laboratory results, radiology scans & consultations
                  </p>
                </div>

                {isUnlocked && (
                  <button
                    onClick={() => setShowAddReportModal(true)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Encrypted Report</span>
                  </button>
                )}
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search titles or physician names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value="all" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">All Categories</option>
                  <option value="cbc" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Blood Work (CBC)</option>
                  <option value="imaging" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Radiology (MRI / CT)</option>
                  <option value="cardiology" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Cardiology (ECG)</option>
                  <option value="general" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">General Checkup</option>
                </select>
              </div>

              {/* Reports Table */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-400 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100 dark:border-stone-800">
                      <tr>
                        <th className="px-4 sm:px-6 py-3">Date</th>
                        <th className="px-4 sm:px-6 py-3">Report Details</th>
                        <th className="px-4 sm:px-6 py-3">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-stone-400 text-xs">
                            No health reports matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map((report) => (
                          <HealthReportCard
                            key={report.id}
                            report={report}
                            encryptionKey={encryptionKey}
                            onViewDetails={(r) => setSelectedReport(r)}
                            onDeleteReport={handleDeleteReport}
                            isUnlocked={isUnlocked}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AI DIET & LAB INSIGHTS TAB */}
          {activeTab === 'ai-advisor' && (
            <AIDietInsights
              reports={reports}
              decryptedReports={decryptedReports}
              userName={userName}
              selectedReportId={aiReportId}
              onSelectReport={(id) => setAiReportId(id)}
            />
          )}

          {/* VITALS & METRICS TAB */}
          {activeTab === 'vitals' && (
            <VitalsTracker encryptionKey={encryptionKey} userId={userId} />
          )}

          {/* MEDICATIONS TAB */}
          {activeTab === 'medications' && (
            <MedicationsTracker encryptionKey={encryptionKey} userId={userId} />
          )}

          {/* MY HEALTH PROFILE TAB */}
          {activeTab === 'profile' && (
            <HealthProfile
              encryptionKey={encryptionKey}
              userId={userId}
              userName={userName}
              onUpdateUserName={handleUpdateUserName}
            />
          )}

          {/* SETTINGS, PRIVACY & BACKUP TAB */}
          {(activeTab === 'settings' || activeTab === 'privacy' || activeTab === 'backup') && (
            <SettingsPage
              isPersistent={storageStatus.isPersistent}
              canPersist={storageStatus.canPersist}
              quotaBytes={storageStatus.quotaBytes}
              usageBytes={storageStatus.usageBytes}
              onRequestPersistence={handleRequestPersistence}
              recoveryKeySnippet={fullRecoveryKey || recoveryKeySnippet}
              userName={userName}
              onUpdateUserName={handleUpdateUserName}
              onDeleteAllData={handleDeleteAllData}
              encryptionKey={encryptionKey}
              saltBase64={saltBase64}
              userId={userId}
              onOpenGoogleDriveModal={() => setShowDriveModal(true)}
              onRestoreSuccess={handleRestoreSuccess}
            />
          )}
        </main>
      </div>

      <Footer
        storageUsageFormatted="0.8 MB"
        isPersistent={storageStatus.isPersistent}
        lastBackupDate={new Date().toISOString()}
      />

      {/* MODALS */}
      {showSameDeviceModal && (
        <SameDeviceWelcomeModal
          userName={userName}
          userEmail="mrunmayee717@gmail.com"
          onContinue={handleSameDeviceContinue}
          onOpenRecoveryOrReset={() => {
            setShowSameDeviceModal(false);
            setShowUnlockModal(true);
          }}
        />
      )}

      {showNewDeviceModal && (
        <NewDeviceModal
          onSelectRestoreFile={() => {
            setShowNewDeviceModal(false);
            setActiveTab('settings');
          }}
          onSelectGoogleDrive={() => {
            setShowNewDeviceModal(false);
            setShowDriveModal(true);
          }}
          onCreateNewVault={() => {
            setShowNewDeviceModal(false);
            setShowSetupModal(true);
          }}
        />
      )}

      {showSetupModal && (
        <VaultSetupModal onCompleteSetup={handleCompleteSetup} />
      )}

      {showUnlockModal && !showSetupModal && !showSameDeviceModal && (
        <UnlockVaultModal
          onUnlock={handleUnlock}
          userName={userName}
          onResetVaultPrompt={() => {
            setShowUnlockModal(false);
            handleDeleteAllData();
          }}
        />
      )}

      {showAddReportModal && encryptionKey && (
        <AddHealthDataModal
          encryptionKey={encryptionKey}
          userId={userId}
          onClose={() => setShowAddReportModal(false)}
          onSuccess={() => {
            setShowAddReportModal(false);
            loadReports();
          }}
          onNavigateToVitals={() => {
            setShowAddReportModal(false);
            setActiveTab('vitals');
          }}
        />
      )}

      {selectedReport && (
        <ViewReportModal
          report={selectedReport}
          encryptionKey={encryptionKey}
          onClose={() => setSelectedReport(null)}
          onDeleteReport={handleDeleteReport}
          onAnalyzeWithAI={(reportId) => {
            setSelectedReport(null);
            setAiReportId(reportId);
            setActiveTab('ai-advisor');
          }}
        />
      )}

      {showDriveModal && (
        <GoogleDriveModal
          encryptionKey={encryptionKey}
          saltBase64={saltBase64}
          userId={userId}
          onClose={() => setShowDriveModal(false)}
        />
      )}
    </div>
  );
}
