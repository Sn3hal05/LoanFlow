import { useState } from 'react';
import { Brain, Loader2, RefreshCw, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../services/api';

export default function AIRiskPanel({ applicationId }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/ai/risk-assessment/${applicationId}`);
      setAssessment(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate assessment');
    } finally {
      setLoading(false);
    }
  };

  const RISK_COLORS = {
    Low: 'text-green-600 bg-green-50 border-green-200',
    Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    High: 'text-red-600 bg-red-50 border-red-200',
    'Very High': 'text-red-700 bg-red-100 border-red-300',
  };

  const formatMarkdown = (text) => {
    return text
      .replace(/## (.+)/g, '<h3 class="font-semibold text-gray-900 text-sm mt-3 mb-1">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)/gm, '<li class="ml-4 text-sm text-gray-700 list-disc">$1</li>')
      .replace(/^(\d+)\. (.+)/gm, '<li class="ml-4 text-sm text-gray-700 list-decimal">$2</li>')
      .split('\n')
      .map((line) => (line.startsWith('<') ? line : `<p class="text-sm text-gray-700 mb-1">${line}</p>`))
      .join('');
  };

  return (
    <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">AI Credit Risk Assessment</p>
            <p className="text-xs text-gray-500">Powered by Gemini AI</p>
          </div>
        </div>

        <button
          onClick={loadAssessment}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          {assessment ? 'Regenerate' : 'Generate Report'}
        </button>
      </div>

      <div className="p-5">
        {!assessment && !loading && !error && (
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Click "Generate Report" for an AI-powered credit risk analysis</p>
            <p className="text-xs text-gray-400 mt-1">Analyzes credit score, DTI, income, documents, and officer notes</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Analyzing application with Gemini AI…</p>
            <p className="text-xs text-gray-400 mt-1">This takes 5-10 seconds</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {assessment && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${RISK_COLORS[assessment.riskLevel] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                  {assessment.riskLevel ? `${assessment.riskLevel} Risk` : 'Assessment Complete'}
                </span>
                {assessment.recommendation && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    assessment.recommendation === 'APPROVE' ? 'bg-green-100 text-green-700' :
                    assessment.recommendation === 'DECLINE' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {assessment.recommendation}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{assessment.source}</span>
            </div>

            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(assessment.report || '') }}
            />

            <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
              Generated {new Date(assessment.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
