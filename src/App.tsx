import React, { useState, useEffect } from 'react';
import { db, clearAllLocalHealthData } from './lib/db';
import { 
  deriveKeyFromPassphrase, 
  createNewSaltBase64, 
  initializeVault, 
  unlockVault, 
  unlockVaultWithRecoveryKey,
  generateMasterRecoveryKey,
  changePassword,
  getStoredVaultMetadata 
} from './lib/key-management';
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

// Auth Screen & API
import { AuthScreen } from './components/auth/AuthScreen';
import { authApi, getAuthToken } from './lib/api';
import type { UserProfile, DeviceInfo } from './types/auth';

// Health Views
import { HealthReportCard } from './components/health/HealthReportCard';
import { AddReportModal } from './components/health/AddReportModal';
import { AddHealthDataModal } from './components/health/AddHealthDataModal';
import { ViewReportModal } from './components/health/ViewReportModal';
import { VitalsTracker } from './components/health/VitalsTracker';
import { MedicationsTracker } from './components/health/MedicationsTracker';
import { HealthProfile } from './components/health/HealthProfile';
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
  const [userName, setUserName] = useState<string>('');
  const [recoveryKeySnippet, setRecoveryKeySnippet] = useState<string>('');
  const [fullRecoveryKey, setFullRecoveryKey] = useState<string>('');
  const [showFirstTimeWelcome, setShowFirstTimeWelcome] = useState<boolean>(false);

  // Authenticated user & device metadata
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);

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
    if (isUnlocked && encryptionKey) {
      loadReports(encryptionKey);
    }
  }, [isUnlocked, encryptionKey]);

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
      // Clean up legacy keys
      await db.settings.delete('vault_crypto_key').catch(() => {});
      await db.settings.delete('vault_recovery_key').catch(() => {});

      const metadata = await getStoredVaultMetadata();
      const saltRecord = await db.settings.get('vault_salt');
      const userIdRecord = await db.settings.get('vault_user_id');
      const nameRecord = await db.settings.get('vault_user_name');

      let currentSalt = metadata?.salt || saltRecord?.value;
      if (!currentSalt) {
        currentSalt = createNewSaltBase64();
        await db.settings.put({ key: 'vault_salt', value: currentSalt });
      }
      setSaltBase64(currentSalt);

      if (userIdRecord?.value) setUserId(userIdRecord.value);
      if (nameRecord?.value) setUserName(nameRecord.value);

      // Check for active Django auth token
      const token = getAuthToken();
      if (token) {
        try {
          const meRes = await authApi.getMe();
          if (meRes.success && meRes.user) {
            setCurrentUser(meRes.user);
            setUserName(meRes.user.name);
            setUserId(meRes.user.id);
          }
        } catch {
          // Token expired or server unreachable
        }
      }

      setEncryptionKey(null);
      setIsUnlocked(false);
      setIsInitialized(!!metadata);
    } catch (err) {
      console.error('Failed to initialize vault state from local database:', err);
      setIsInitialized(true);
      setIsUnlocked(false);
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
      } else {
        setDecryptedReports({});
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      await db.reports.delete(reportId);
      if (selectedReport?.id === reportId) setSelectedReport(null);
      if (aiReportId === reportId) setAiReportId('');
      await loadReports();
    } catch (err) {
      console.error('Failed to delete report from IndexedDB:', err);
    }
  };

  const handleAuthSuccess = async (
    user: UserProfile,
    dek: CryptoKey,
    device: DeviceInfo,
    passwordUsed?: string
  ) => {
    setEncryptionKey(dek);
    setIsUnlocked(true);
    setIsInitialized(true);
    setCurrentUser(user);
    setCurrentDevice(device);
    setUserId(user.id);
    setUserName(user.name);

    await db.settings.put({ key: 'vault_user_id', value: user.id });
    await db.settings.put({ key: 'vault_user_name', value: user.name });

    await loadReports(dek);
  };

  const handleUnlockVaultWithPassword = async (password: string): Promise<CryptoKey | null> => {
    try {
      const metadata = await getStoredVaultMetadata();
      if (metadata) {
        const dek = await unlockVault(password);
        return dek;
      } else {
        // Vault first-time envelope initialization
        const recoverySecret = generateMasterRecoveryKey();
        const { dek } = await initializeVault(password, recoverySecret);
        return dek;
      }
    } catch (err) {
      console.error('Password unlock failed:', err);
      return null;
    }
  };

  const handleUnlockVaultWithRecovery = async (recoverySecret: string): Promise<CryptoKey | null> => {
    try {
      const dek = await unlockVaultWithRecoveryKey(recoverySecret);
      return dek;
    } catch (err) {
      console.error('Recovery unlock failed:', err);
      return null;
    }
  };

  const handleInitializeVault = async (password: string, recoverySecret: string) => {
    const { metadata, dek } = await initializeVault(password, recoverySecret);
    setSaltBase64(metadata.salt);
    return { dek, recoverySecret };
  };

  const handleLockVault = () => {
    setEncryptionKey(null);
    setIsUnlocked(false);
    setDecryptedReports({});
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Strict in-memory clearance for cross-account safety
    setEncryptionKey(null);
    setIsUnlocked(false);
    setCurrentUser(null);
    setCurrentDevice(null);
    setDecryptedReports({});
    setReports([]);
    setUserId('');
    setUserName('');
    setSelectedReport(null);
    setAiReportId('');
  };

  const handleUpdateUserName = async (newName: string) => {
    await db.settings.put({ key: 'vault_user_name', value: newName });
    setUserName(newName);
  };

  const handleRestoreSuccess = async (newKey: CryptoKey, salt: string) => {
    const userIdVal = userId || `usr_${Date.now().toString(36)}`;
    await db.settings.put({ key: 'vault_salt', value: salt });
    await db.settings.put({ key: 'vault_user_id', value: userIdVal });
    setEncryptionKey(newKey);
    setSaltBase64(salt);
    setUserId(userIdVal);
    setIsInitialized(true);
    setIsUnlocked(true);
    await loadReports(newKey);
    setActiveTab('dashboard');
  };

  const handleDeleteAllData = async () => {
    await clearAllLocalHealthData();
    await db.settings.clear();
    setEncryptionKey(null);
    setIsUnlocked(false);
    setIsInitialized(false);
    setUserName('');
    setReports([]);
    setShowSplashScreen(false);
  };

  const filteredReports = reports.filter((r) => {
    const matchesCategory = categoryFilter === 'all' || r.type === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.doctorName && r.doctorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Render Splash Screen
  if (showSplashScreen) {
    return <SplashScreen onFinish={() => setShowSplashScreen(false)} durationMs={3200} />;
  }

  // Render Unified Auth & Device Verification Screen when locked
  if (!isUnlocked) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        onUnlockVaultWithPassword={handleUnlockVaultWithPassword}
        onUnlockVaultWithRecovery={handleUnlockVaultWithRecovery}
        onInitializeVault={handleInitializeVault}
      />
    );
  }

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
      <MobileHeader
        activeTab={activeTab}
        isUnlocked={isUnlocked}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        onLockVault={handleLockVault}
        onUnlockVault={() => {}}
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
        onUnlockVault={() => {}}
        onOpenRecoveryKey={() => setActiveTab('privacy')}
        onLogout={handleLogout}
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
                onUnlockRequest={() => setIsUnlocked(false)}
              />

              {/* Health Progression & Trajectory Graph (Increment / Decrement) */}
              <HealthTrajectoryChart
                encryptionKey={encryptionKey}
                userId={userId}
                reports={reports}
                onAddDataClick={() => setShowAddReportModal(true)}
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

          {/* GET INSIGHTS / LAB INSIGHTS TAB */}
          {activeTab === 'ai-advisor' && (
            <AIDietInsights
              reports={reports}
              decryptedReports={decryptedReports}
              encryptionKey={encryptionKey}
              userName={userName}
              selectedReportId={aiReportId}
              onSelectReport={(id) => setAiReportId(id)}
              onViewReport={(r) => setSelectedReport(r)}
              onNavigateToUpload={() => setShowAddReportModal(true)}
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
          onGetInsights={(reportId) => {
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
          userName={userName}
          onClose={() => setShowDriveModal(false)}
        />
      )}
    </div>
  );
}
