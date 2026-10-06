import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Calculator, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';

const NewEnquiryModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultNotice, setResultNotice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRec, setAiRec] = useState(null);

  // Form fields
  const [requestedAmount, setRequestedAmount] = useState(15000);
  const [requestedTenureMonths, setRequestedTenureMonths] = useState(24);
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome || 5500);
  const [existingMonthlyDebt, setExistingMonthlyDebt] = useState(user?.existingMonthlyDebt || 450);
  const [creditScore, setCreditScore] = useState(user?.creditScore || 720);

  // Fetch loan products
  useEffect(() => {
    if (!isOpen) return;
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data);
        if (res.data.length > 0) {
          setSelectedProductId(res.data[0]._id);
          setRequestedAmount(Math.min(res.data[0].maxAmount, Math.max(res.data[0].minAmount, 15000)));
          setRequestedTenureMonths(res.data[0].minTenureMonths || 24);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    fetchProducts();
    setError(null);
    setResultNotice(null);
  }, [isOpen]);

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  // When selected product changes, adjust boundaries
  const handleProductChange = (prodId) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p._id === prodId);
    if (prod) {
      setRequestedAmount(Math.min(prod.maxAmount, Math.max(prod.minAmount, 20000)));
      setRequestedTenureMonths(Math.min(prod.maxTenureMonths, Math.max(prod.minTenureMonths, 36)));
    }
  };

  const handleGetAiRecommendation = async () => {
    setAiLoading(true);
    setAiRec(null);
    try {
      const res = await api.post('/ai/recommend', {
        creditScore: Number(creditScore),
        monthlyIncome: Number(monthlyIncome),
        existingMonthlyDebt: Number(existingMonthlyDebt),
        desiredAmount: Number(requestedAmount),
      });
      if (res.data.success && res.data.recommendation) {
        setAiRec(res.data.recommendation);
        const match = products.find((p) =>
          p.name.toLowerCase().includes(res.data.recommendation.productName.toLowerCase())
        );
        if (match) handleProductChange(match._id);
      }
    } catch (err) {
      console.error('AI rec failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Live calculation
  const calculateLiveMetrics = () => {
    if (!selectedProduct || !requestedAmount || !requestedTenureMonths) {
      return { emi: 0, dti: 0, isEligible: true, issues: [] };
    }

    const rate = selectedProduct.baseInterestRate / 12 / 100;
    const factor = Math.pow(1 + rate, requestedTenureMonths);
    const emi = rate > 0 ? (requestedAmount * rate * factor) / (factor - 1) : requestedAmount / requestedTenureMonths;
    const roundedEmi = Math.round(emi * 100) / 100;

    const totalDebt = (Number(existingMonthlyDebt) || 0) + roundedEmi;
    const dti = monthlyIncome > 0 ? Math.round((totalDebt / monthlyIncome) * 1000) / 10 : 100;

    const issues = [];
    if (creditScore < selectedProduct.minCreditScore) {
      issues.push(`Credit score (${creditScore}) is below required minimum (${selectedProduct.minCreditScore})`);
    }
    if (monthlyIncome < selectedProduct.minMonthlyIncome) {
      issues.push(`Monthly income ($${monthlyIncome}) is below minimum requirement ($${selectedProduct.minMonthlyIncome})`);
    }
    if (dti > selectedProduct.maxDtiRatio) {
      issues.push(`Projected DTI (${dti}%) exceeds max policy ceiling (${selectedProduct.maxDtiRatio}%)`);
    }

    return {
      emi: roundedEmi,
      dti,
      isEligible: issues.length === 0,
      issues,
    };
  };

  const metrics = calculateLiveMetrics();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultNotice(null);

    try {
      const payload = {
        loanProductId: selectedProductId,
        requestedAmount: Number(requestedAmount),
        requestedTenureMonths: Number(requestedTenureMonths),
        monthlyIncome: Number(monthlyIncome),
        existingMonthlyDebt: Number(existingMonthlyDebt || 0),
        creditScore: Number(creditScore),
      };

      const res = await api.post('/applications', payload);
      const application = res.data.application;

      if (application.status === 'Rejected') {
        setResultNotice({
          type: 'rejected',
          title: 'Enquiry Auto-Rejected by Policy Engine',
          reason: application.rejectionReason,
          message: application.rejectionRemarks || 'Criteria not met.',
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        setResultNotice({
          type: 'success',
          title: 'Enquiry Approved for Next Stage!',
          message: `Application #${application.applicationNumber} created. Status: Documents-Pending. Please upload the required documents.`,
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.message || 'Duplicate active application detected.');
      } else {
        setError(err.response?.data?.message || 'Error submitting loan enquiry');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-600" />
              <span>Submit New Loan Enquiry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant server-side algorithmic eligibility check & document checklist assignment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Application Blocked</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {resultNotice && (
            <div
              className={`rounded-lg border p-4 text-xs ${
                resultNotice.type === 'rejected'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {resultNotice.type === 'rejected' ? (
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                )}
                <span>{resultNotice.title}</span>
              </div>
              <p className="mt-1">{resultNotice.message}</p>
            </div>
          )}

          {/* Product Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Select Loan Product
              </label>
              <button
                type="button"
                onClick={handleGetAiRecommendation}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 px-2 py-1 rounded-md transition"
              >
                <Sparkles className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                <span>{aiLoading ? 'AI Recommending…' : 'AI Match Product'}</span>
              </button>
            </div>

            {aiRec && (
              <div className="mb-3 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>AI Recommended: {aiRec.productName}</span>
                  {aiRec.estimatedEligibility && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-mono ml-auto">
                      Eligibility: {aiRec.estimatedEligibility}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[11px]">{aiRec.rationale}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {products.map((prod) => (
                <button
                  type="button"
                  key={prod._id}
                  onClick={() => handleProductChange(prod._id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedProductId === prod._id
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="font-semibold text-xs text-slate-900">{prod.name}</p>
                  <p className="text-[11px] text-indigo-600 font-mono mt-1 font-semibold">
                    {prod.baseInterestRate}% APR
                  </p>
                  <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                    <p>Min Score: {prod.minCreditScore}</p>
                    <p>Max DTI: {prod.maxDtiRatio}%</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <span>{selectedProduct.description}</span>
              <span className="font-medium text-slate-800">
                Range: ${selectedProduct.minAmount.toLocaleString()} - ${selectedProduct.maxAmount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Loan Amount & Tenure Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-700">Requested Amount ($)</label>
                <span className="text-xs font-mono font-semibold text-indigo-600">
                  ${Number(requestedAmount).toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                min={selectedProduct?.minAmount || 1000}
                max={selectedProduct?.maxAmount || 1000000}
                step={500}
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-700">Tenure (Months)</label>
                <span className="text-xs font-mono font-semibold text-indigo-600">
                  {requestedTenureMonths} months ({Math.round((requestedTenureMonths / 12) * 10) / 10} yrs)
                </span>
              </div>
              <input
                type="number"
                min={selectedProduct?.minTenureMonths || 6}
                max={selectedProduct?.maxTenureMonths || 360}
                value={requestedTenureMonths}
                onChange={(e) => setRequestedTenureMonths(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Financial Profile Fields */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
              Financial Underwriting Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Monthly Gross Income ($)
                </label>
                <input
                  type="number"
                  min={1}
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Existing Monthly Debt ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={existingMonthlyDebt}
                  onChange={(e) => setExistingMonthlyDebt(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Credit Score (FICO)
                </label>
                <input
                  type="number"
                  min={300}
                  max={850}
                  value={creditScore}
                  onChange={(e) => setCreditScore(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Real-time Pre-Check Indicator Card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Live Pre-Check Estimate
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  metrics.isEligible
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {metrics.isEligible ? 'Likely Eligible' : 'Eligibility Warning'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                <span className="text-[11px] text-slate-500 block">Est. Monthly EMI</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${metrics.emi.toLocaleString()}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                <span className="text-[11px] text-slate-500 block">Projected DTI Ratio</span>
                <span
                  className={`font-bold text-sm ${
                    metrics.dti > (selectedProduct?.maxDtiRatio || 50)
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  {metrics.dti}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Max: {selectedProduct?.maxDtiRatio}%
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/60 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 block">Min Score Required</span>
                <span
                  className={`font-bold text-sm ${
                    creditScore < (selectedProduct?.minCreditScore || 650)
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {creditScore} / {selectedProduct?.minCreditScore}
                </span>
              </div>
            </div>

            {metrics.issues.length > 0 && (
              <div className="mt-3 pt-2 border-t border-indigo-100/60 text-[11px] text-rose-700 space-y-1">
                {metrics.issues.map((issue, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-rose-500" />
                    <span>{issue}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Evaluating...</span>
              ) : (
                <>
                  <span>Submit Application</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewEnquiryModal;
