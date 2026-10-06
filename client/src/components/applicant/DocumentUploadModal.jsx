import React, { useState } from 'react';
import api from '../../services/api';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck,
  Sparkles
} from 'lucide-react';

const DocumentUploadModal = ({ isOpen, onClose, application, documents, onRefresh }) => {
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  if (!isOpen || !application) return null;

  // Real or mock upload
  const handleUpload = async (docId, file = null) => {
    setUploadingDocId(docId);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/documents/${docId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Fast mock upload
        await api.post(`/documents/${docId}/upload`, {
          mockFileUrl: `/uploads/doc-${Date.now()}.pdf`,
          originalName: 'verified_document_copy.pdf',
        });
      }

      setUploadSuccess('Document submitted successfully!');
      onRefresh();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Error uploading document');
    } finally {
      setUploadingDocId(null);
    }
  };

  const getDocStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Clock className="h-3 w-3" />
            Under Verification
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <AlertCircle className="h-3 w-3" />
            Needs Re-upload
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="h-3 w-3" />
            Pending Upload
          </span>
        );
    }
  };

  const pendingCount = documents.filter((d) => d.status === 'PENDING' || d.status === 'REJECTED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600" />
              <span>Document Checklist & Uploads</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Application #{application.applicationNumber} — Required documents for{' '}
              {application.loanProductId?.name || 'Loan'}
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
        <div className="p-6 space-y-4">
          {uploadError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/70">
            <span className="text-slate-600">
              Total Required: <strong className="text-slate-900">{documents.length}</strong>
            </span>
            <span className="text-slate-600">
              Action Required:{' '}
              <strong className={pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {pendingCount} documents
              </strong>
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {documents.map((doc) => (
              <div key={doc._id} className="p-4 hover:bg-slate-50/50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900">{doc.title}</p>
                        {doc.isMandatory && (
                          <span className="text-[10px] text-rose-600 font-semibold">*Mandatory</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{doc.description}</p>

                      {doc.verificationRemarks && (
                        <div className="mt-2 text-[11px] p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                          <strong>Officer Remarks:</strong> {doc.verificationRemarks}
                        </div>
                      )}

                      {doc.originalName && doc.status !== 'PENDING' && (
                        <div className="mt-1 text-[11px] text-slate-400 font-mono">
                          File: {doc.originalName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getDocStatusBadge(doc.status)}

                    {/* Upload actions if not verified */}
                    {doc.status !== 'VERIFIED' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <label className="cursor-pointer px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition">
                          Browse File
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUpload(doc._id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={uploadingDocId === doc._id}
                          onClick={() => handleUpload(doc._id)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Simulate Upload</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
