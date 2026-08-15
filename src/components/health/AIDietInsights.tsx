import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Utensils, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  Apple, 
  Info, 
  Send, 
  Loader2, 
  FileText, 
  ChevronRight, 
  Heart, 
  Salad 
} from 'lucide-react';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';

interface AIDietInsightsProps {
  reports: HealthReport[];
  decryptedReports: Record<string, DecryptedReportDetails>;
  userName?: string;
  selectedReportId?: string;
  onSelectReport?: (reportId: string) => void;
}

export const AIDietInsights: React.FC<AIDietInsightsProps> = ({
  reports,
  decryptedReports,
  userName = 'User',
  selectedReportId,
  onSelectReport,
}) => {
  // Sort reports chronologically
  const sortedReports = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [activeReportId, setActiveReportId] = useState<string>(
    selectedReportId || (sortedReports[0]?.id || '')
  );

  useEffect(() => {
    if (selectedReportId) {
      setActiveReportId(selectedReportId);
    } else if (sortedReports[0]?.id && !activeReportId) {
      setActiveReportId(sortedReports[0].id);
    }
  }, [selectedReportId, sortedReports]);

  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [error, setError] = useState('');

  // Interactive QA state
  const [userQuestion, setUserQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);

  const currentReportObj = sortedReports.find((r) => r.id === activeReportId);
  const currentDecrypted = activeReportId ? decryptedReports[activeReportId] : null;

  // Gather historical reports for comparison
  const previousReportsData = sortedReports
    .filter((r) => r.id !== activeReportId && decryptedReports[r.id])
    .map((r) => ({
      title: r.title,
      date: r.date,
      results: decryptedReports[r.id]?.results || {},
    }));

  const fetchInsights = async () => {
    if (!currentReportObj || !currentDecrypted) return;

    setIsLoading(true);
    setError('');

    try {
      const payload = {
        userName,
        currentReport: {
          title: currentReportObj.title,
          date: currentReportObj.date,
          doctorName: currentReportObj.doctorName,
          facility: currentDecrypted.facility,
          results: currentDecrypted.results || {},
          notes: currentDecrypted.notes,
        },
        previousReports: previousReportsData,
      };

      const response = await fetch('/api/health-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Failed to analyze lab results');
      }

      setInsights(resData.data);
    } catch (err: any) {
      setError(err.message || 'Error generating health insights.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeReportId && decryptedReports[activeReportId]) {
      fetchInsights();
    } else {
      setInsights(null);
    }
  }, [activeReportId]);

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    const qText = userQuestion.trim();
    setUserQuestion('');
    setChatHistory((prev) => [...prev, { sender: 'user', text: qText }]);
    setIsAsking(true);

    try {
      const response = await fetch('/api/ask-health-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuestion: qText,
          reportContext: {
            title: currentReportObj?.title,
            results: currentDecrypted?.results,
            insightsSummary: insights?.clinicalSummary,
          },
        }),
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Failed to get answer');
      }

      setChatHistory((prev) => [...prev, { sender: 'ai', text: resData.answer }]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: `Sorry, I couldn't process that question: ${err.message}` },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="p-8 bg-white rounded-[2.5rem] border border-stone-200 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-emerald-700" />
        </div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">No Health Reports Found</h3>
        <p className="text-sm text-stone-600 mb-6 leading-relaxed">
          Upload or add your lab report PDF/Image scan first. Gemini AI will analyze your parameters, track improvements over time, and generate a personalized dietary plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Report Selector */}
      <div className="bg-gradient-to-br from-emerald-900 via-stone-900 to-emerald-950 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Health & Dietary Assistant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Lab Analysis & Nutrition Plan for {userName}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Gemini translates your encrypted lab readings into targeted dietary guidance, flags abnormal values, and measures health improvement over time.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0">
            <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-widest mb-1.5">
              Select Report to Analyze
            </label>
            <select
              value={activeReportId}
              onChange={(e) => setActiveReportId(e.target.value)}
              className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-bold text-xs px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full sm:w-56 shadow-2xs"
            >
              {sortedReports.map((rep) => (
                <option key={rep.id} value={rep.id} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">
                  {rep.title} ({rep.date})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 bg-white rounded-[2.5rem] border border-stone-200 text-center shadow-xs">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-900 mb-1">Analyzing Lab Results & Historical Trajectory...</h3>
          <p className="text-xs text-stone-500">Evaluating reference ranges, food synergies, and health improvement metrics</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchInsights} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold">
            Retry
          </button>
        </div>
      )}

      {insights && !isLoading && (
        <div className="space-y-8">
          {/* Section 1: Health Improvement & Trajectory Score */}
          <div className="bg-white rounded-[2.5rem] border border-stone-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Health Improvement Trajectory</h2>
                  <p className="text-xs text-stone-500">Tracking progress compared to earlier historical lab records</p>
                </div>
              </div>

              {insights.healthImprovement?.improvementScore !== undefined && (
                <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">
                      Overall Score
                    </span>
                    <span className="text-xs font-bold text-emerald-900">
                      {insights.healthImprovement.overallStatus || 'Improved'}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-emerald-600 text-white font-extrabold rounded-xl flex items-center justify-center text-base shadow-xs">
                    {insights.healthImprovement.improvementScore}%
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-stone-700 leading-relaxed mb-6 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
              {insights.healthImprovement?.summaryText || insights.clinicalSummary}
            </p>

            {/* Metric Comparison Table */}
            {Array.isArray(insights.healthImprovement?.comparisonMetrics) &&
              insights.healthImprovement.comparisonMetrics.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                    Metric-by-Metric Comparison
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {insights.healthImprovement.comparisonMetrics.map((item: any, idx: number) => {
                      const isImproved = item.trend === 'improved';
                      const isDeclined = item.trend === 'declined';
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            isImproved
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : isDeclined
                              ? 'bg-amber-50/60 border-amber-200'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-stone-900">{item.metric}</span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full flex items-center gap-1 ${
                                isImproved
                                  ? 'bg-emerald-200 text-emerald-800'
                                  : isDeclined
                                  ? 'bg-amber-200 text-amber-800'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {isImproved && <TrendingUp className="w-3 h-3" />}
                              {isDeclined && <TrendingDown className="w-3 h-3" />}
                              {!isImproved && !isDeclined && <Minus className="w-3 h-3" />}
                              <span className="capitalize">{item.trend || 'Stable'}</span>
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between text-xs font-mono mb-2 text-stone-700">
                            <span>Prev: {item.previousValue || 'N/A'}</span>
                            <ChevronRight className="w-3 h-3 text-stone-400" />
                            <span className="font-bold text-stone-900">Curr: {item.currentValue}</span>
                          </div>

                          {item.message && (
                            <p className="text-[11px] text-stone-600 leading-normal">{item.message}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Key Progress Highlights */}
            {Array.isArray(insights.healthImprovement?.keyHighlights) && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Key Health Progress Milestones
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {insights.healthImprovement.keyHighlights.map((hl: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-xs text-stone-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Dietary Recommendations & Meal Plan */}
          <div className="bg-white rounded-[2.5rem] border border-stone-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Utensils className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">Targeted Nutrition & Dietary Plan</h2>
                <p className="text-xs text-stone-500">Tailored specifically to balance your lab parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Foods to Prioritize */}
              <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-4">
                  <Salad className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider">
                    Foods to Prioritize
                  </h3>
                </div>
                <div className="space-y-3">
                  {insights.dietaryPlan?.prioritizeFoods?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                      <span className="text-xs font-bold text-stone-900 block mb-0.5">
                        {item.foodCategory}
                      </span>
                      <p className="text-xs font-medium text-emerald-800 mb-1">{item.examples}</p>
                      <p className="text-[11px] text-stone-600 leading-relaxed">{item.healthReason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Foods to Limit */}
              <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <Apple className="w-5 h-5 text-amber-700" />
                  <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Foods to Limit / Avoid
                  </h3>
                </div>
                <div className="space-y-3">
                  {insights.dietaryPlan?.limitFoods?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                      <span className="text-xs font-bold text-stone-900 block mb-1">
                        {item.foodCategory}
                      </span>
                      <p className="text-[11px] text-stone-600 leading-relaxed">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sample Daily Meal Plan */}
            {insights.dietaryPlan?.dailySampleMenu && (
              <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  <span>Sample 1-Day Nutrient-Dense Menu</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                      Breakfast
                    </span>
                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {insights.dietaryPlan.dailySampleMenu.breakfast}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                      Lunch
                    </span>
                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {insights.dietaryPlan.dailySampleMenu.lunch}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                      Dinner
                    </span>
                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {insights.dietaryPlan.dailySampleMenu.dinner}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                      Snack / Beverage
                    </span>
                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                      {insights.dietaryPlan.dailySampleMenu.snack}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Interactive Q&A Assistant */}
          <div className="bg-white rounded-[2.5rem] border border-stone-200 p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">Ask Gemini Health Assistant</h2>
                <p className="text-xs text-stone-500">Ask custom questions regarding these lab readings & nutrition</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
              {chatHistory.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-2xl text-center text-xs text-stone-500">
                  Examples: "Why is my hemoglobin value important?", "What breakfast options help control glucose?", "Should I take iron supplements with vitamin C?"
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-emerald-700 text-white font-medium rounded-br-xs'
                          : 'bg-stone-100 text-stone-900 border border-stone-200 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendQuestion} className="flex gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Ask about your lab readings, dietary choices, or health improvements..."
                className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isAsking || !userQuestion.trim()}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Ask AI</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
