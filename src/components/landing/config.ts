/**
 * Configuration file for Vital Diaries Landing Page
 * Centralized settings for copy, links, navigation, and theme colors.
 */

export const SITE_CONFIG = {
  name: "Vital Diaries",
  tagline: "Your health records. Your privacy. Your control.",
  eyebrow: "PRIVATE BY DESIGN",
  heroDescription:
    "Vital Diaries gives you one secure place to organize your health records, reports, prescriptions, and important medical information — while keeping your data under your control.",
  
  // Routes for Authentication Handoff
  routes: {
    signup: "/signup",
    login: "/login",
    home: "#home",
    howItWorks: "#how-it-works",
    trust: "#privacy-trust",
    features: "#features",
    architecture: "#architecture",
    crossDevice: "#cross-device",
    faq: "#faq",
  },

  // Color Palette Definitions (White & Green Minimalist Theme)
  colors: {
    canvas: "#F8FAFC", // Off-white / light slate canvas
    surface: "#FFFFFF", // Pure white card surfaces
    surfaceDark: "#0B1320", // Deep charcoal for privacy architecture section
    textPrimary: "#0F172A", // Deep navy / slate 900
    textSecondary: "#475569", // Slate 600
    textMuted: "#64748B", // Slate 500
    accentGreen: "#059669", // Emerald 600 primary trust green
    accentGreenHover: "#047857", // Emerald 700 hover state
    accentGreenLight: "#ECFDF5", // Emerald 50 soft background
    accentBorder: "#A7F3D0", // Emerald 200 soft border
    borderSubtle: "#E2E8F0", // Slate 200 hairline border
  },

  // Navigation Links
  navLinks: [
    { label: "Home", href: "#home" },
    { label: "Privacy", href: "#privacy-trust" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Architecture", href: "#architecture" },
    { label: "FAQ", href: "#faq" },
  ],

  // Trust Cards
  trustCards: [
    {
      id: "encrypted-before-sync",
      title: "Encrypted Before Sync",
      description: "Medical records are encrypted before they leave the device.",
      icon: "ShieldLock",
      detail: "Client-side cryptographic envelope created locally prior to network transmission.",
    },
    {
      id: "you-hold-the-key",
      title: "You Hold the Key",
      description: "Your vault is unlocked locally using your credentials.",
      icon: "KeyRound",
      detail: "Master decryption keys are derived on your hardware and never shared with our servers.",
    },
    {
      id: "local-processing",
      title: "Local Processing",
      description: "Search and health insights are designed to work locally whenever possible.",
      icon: "Cpu",
      detail: "Index lookups and lab trend parses happen on your local runtime, not external cloud AI engines.",
    },
    {
      id: "access-across-devices",
      title: "Access Across Devices",
      description: "Your encrypted records can sync across your devices and be decrypted locally after you unlock your vault.",
      icon: "RefreshCw",
      detail: "Encrypted ciphertext is synchronized seamlessly; each authorized device unlocks records client-side.",
    },
  ],

  // 3-Step "How It Works" Flow
  steps: [
    {
      step: "01",
      tag: "UPLOAD",
      title: "Add your records",
      description: "Upload your medical reports, documents, and other health information.",
      subtext: "Accepts lab PDFs, doctor summaries, vaccination slips, and digital prescriptions.",
    },
    {
      step: "02",
      tag: "ENCRYPT",
      title: "Your data is encrypted",
      description: "Your records are encrypted before cloud synchronization.",
      subtext: "Encrypted using high-standard client cryptography so readable content never traverses the wire.",
    },
    {
      step: "03",
      tag: "ACCESS",
      title: "Access them securely",
      description: "Sign in from another device, unlock your vault, and access your records locally.",
      subtext: "Enter your vault credentials on your phone or secondary computer to decrypt on-the-fly.",
    },
  ],

  // Product Features
  features: [
    {
      title: "Medical Records",
      description: "Keep reports and important health documents organized in one place.",
      icon: "FileText",
      benefit: "Structured record categorization without clutter.",
    },
    {
      title: "Health Timeline",
      description: "Understand your health history through a chronological view of your records.",
      icon: "Clock",
      benefit: "Chronological continuity across consults and labs.",
    },
    {
      title: "Local Search",
      description: "Find information across your records without sending your medical data to an external AI service.",
      icon: "Search",
      benefit: "Zero external queries for personal record queries.",
    },
    {
      title: "Lab Insights",
      description: "Understand supported laboratory results through transparent, deterministic health information.",
      icon: "Activity",
      benefit: "Deterministic reference ranges, no probabilistic guesses.",
    },
    {
      title: "Prescriptions",
      description: "Keep prescriptions and medication-related information organized.",
      icon: "Pill",
      benefit: "Dosage logs and refill reminders stored securely.",
    },
    {
      title: "Cross-Device Access",
      description: "Access your encrypted vault across your devices.",
      icon: "Laptop",
      benefit: "Synchronized ciphertext decrypted on demand.",
    },
  ],

  // Frequently Asked Questions
  faqCategories: [
    { id: "all", label: "All Questions" },
    { id: "encryption", label: "Encryption" },
    { id: "sync", label: "Device Syncing" },
    { id: "access", label: "Data Accessibility" },
  ],

  faqItems: [
    {
      id: "faq-encryption-1",
      category: "encryption",
      question: "How are my health records encrypted before syncing?",
      answer:
        "Every file, lab report, and prescription is encrypted locally in your device sandbox using authenticated AES-256-GCM cryptography before it ever touches a network connection. Cloud sync workers only receive opaque, sealed ciphertext payloads with zero metadata leakage.",
    },
    {
      id: "faq-encryption-2",
      category: "encryption",
      question: "Can Vital Diaries or cloud hosts view my medical records?",
      answer:
        "No. Vital Diaries follows a zero-knowledge architecture. Decryption keys are derived directly on your personal hardware using your credentials. Because our servers never store or possess your master keys, no engineer, third party, or database administrator can decrypt or read your records.",
    },
    {
      id: "faq-encryption-3",
      category: "encryption",
      question: "What happens if I lose my master credentials?",
      answer:
        "Because there is no backdoor or server-side key escrow, you generate an emergency offline recovery key when initializing your vault. If you forget your primary credentials, this recovery kit is required to restore access on a new device. Without your keys or recovery kit, data cannot be recovered.",
    },
    {
      id: "faq-sync-1",
      category: "sync",
      question: "How does device syncing work across phones and computers?",
      answer:
        "Your encrypted records synchronize quietly in the background over TLS 1.3. When you open Vital Diaries on a new device, you authenticate with your passkey or vault credentials. The device downloads the encrypted bundle and decrypts records locally on-the-fly in memory.",
    },
    {
      id: "faq-sync-2",
      category: "sync",
      question: "Can I access and view my health records offline?",
      answer:
        "Yes. Once unlocked, records cached on your device remain accessible in your local sandbox even without an active internet connection. You can review past blood tests, doctor summaries, and medication instructions anywhere, including medical clinics with poor reception.",
    },
    {
      id: "faq-sync-3",
      category: "sync",
      question: "What happens if one of my synced devices is lost or stolen?",
      answer:
        "You can instantly revoke authorization for that device from any other active session. Additionally, because records on device are secured by your hardware enclave, device biometrics, and local app timeout, unauthenticated users cannot access decrypted files.",
    },
    {
      id: "faq-access-1",
      category: "access",
      question: "How can I export or take my records with me?",
      answer:
        "You maintain complete ownership of your health records. At any time, you can trigger a full vault export to standard, open formats (including decrypted PDFs, structured JSON, and standardized medical record summaries). There are no proprietary lock-ins or export fees.",
    },
    {
      id: "faq-access-2",
      category: "access",
      question: "Can I share a specific report or prescription with my doctor?",
      answer:
        "Yes. You can export clean, single-document PDF summaries or generate time-bounded, encrypted read-only links for your practitioner. You select exactly which document to share without exposing your entire health vault.",
    },
    {
      id: "faq-access-3",
      category: "access",
      question: "Are my health records used to train third-party AI models?",
      answer:
        "Never. Search indexing, timeline sorting, and lab reference comparisons run locally on your device using transparent, deterministic code. Your medical files are never transmitted to external AI providers, LLMs, advertising brokers, or data aggregators.",
    },
  ],
};
