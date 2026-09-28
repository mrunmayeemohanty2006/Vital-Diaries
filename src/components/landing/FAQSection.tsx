import React, { useState, useId } from 'react';
import { SITE_CONFIG } from './config';
import {
  ChevronDown,
  Lock,
  RefreshCw,
  FileCheck,
  Search,
  X,
  HelpCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface FAQSectionProps {
  onNavigateAuth: (route: string) => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onNavigateAuth }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Set of open accordion IDs (default first one open for discovery)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(['faq-encryption-1']));
  const searchInputId = useId();

  // Category Icon Resolver
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'encryption':
        return Lock;
      case 'sync':
        return RefreshCw;
      case 'access':
        return FileCheck;
      default:
        return HelpCircle;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'encryption':
        return 'Encryption';
      case 'sync':
        return 'Device Syncing';
      case 'access':
        return 'Data Accessibility';
      default:
        return 'General';
    }
  };

  // Filter items based on active category and search term
  const filteredItems = SITE_CONFIG.faqItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    const matchesSearch =
      searchQuery.trim() === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenIds(new Set(filteredItems.map((item) => item.id)));
  };

  const collapseAll = () => {
    setOpenIds(new Set());
  };

  return (
    <section id="faq" className="relative py-20 sm:py-24 bg-white border-t border-slate-200/80 tech-dot-matrix">
      <div className="absolute inset-0 bg-white/80 pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Answers & Transparency</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Clear answers about your data and privacy.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Everything you need to know about our cryptographic model, multi-device synchronization, and personal data sovereignty.
          </p>
        </div>

        {/* Filter Controls: Search & Category Tabs */}
        <div className="space-y-4 mb-8">
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <label htmlFor={searchInputId} className="sr-only">
              Search frequently asked questions
            </label>
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search encryption, syncing, exports, or privacy..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50/90 hover:bg-white focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200/90 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 font-mono">
            {SITE_CONFIG.faqCategories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? SITE_CONFIG.faqItems.length
                  : SITE_CONFIG.faqItems.filter((i) => i.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-2xs ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-emerald-700/60 text-emerald-100'
                        : 'bg-slate-200/90 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Accordion Controls Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pb-3 mb-2 px-1 border-b border-slate-100 font-mono">
          <span>
            Showing <strong className="text-slate-800 font-semibold">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'question' : 'questions'}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-emerald-700 font-medium cursor-pointer transition-colors"
            >
              Expand all
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-emerald-700 font-medium cursor-pointer transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Accordion List */}
        {filteredItems.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl glass-card-subtle space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              No questions found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn’t find an answer matching "{searchQuery}". Try refining your search query or reset filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 hover:text-emerald-800 pt-1 cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isOpen = openIds.has(item.id);
              const Icon = getCategoryIcon(item.category);
              const categoryLabel = getCategoryLabel(item.category);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl transition-all duration-200 text-left overflow-hidden ${
                    isOpen
                      ? 'glass-card border-emerald-400 shadow-sm ring-1 ring-emerald-300/40'
                      : 'glass-card-interactive border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Accordion Trigger Button */}
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`${item.id}-content`}
                    id={`${item.id}-button`}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors shadow-2xs ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-white text-slate-500 border border-slate-200/80'
                        }`}
                        aria-hidden="true"
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-medium">
                            {categoryLabel}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-semibold text-slate-900 tracking-tight leading-snug">
                          {item.question}
                        </h3>
                      </div>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen
                          ? 'rotate-180 bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Accordion Content Panel */}
                  {isOpen && (
                    <div
                      id={`${item.id}-content`}
                      role="region"
                      aria-labelledby={`${item.id}-button`}
                      className="px-4 pb-5 pt-0 sm:px-5 sm:pb-6 text-left border-t border-emerald-100/70 mt-1"
                    >
                      <div className="pl-11.5 pr-2 pt-3">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Security Deep-Dive Notice Card */}
        <div className="mt-12 p-6 rounded-2xl glass-card-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Want to review the technical details?
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                Explore our step-by-step cryptographic diagram illustrating how records travel between devices without ever exposing unencrypted health information.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono">
            <a
              href="#architecture"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-lg transition-colors shadow-2xs"
            >
              <span>View Architecture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => onNavigateAuth(SITE_CONFIG.routes.signup)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <span>Get Started</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
