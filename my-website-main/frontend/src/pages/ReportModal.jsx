import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const ReportModal = ({ target, onClose }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please write a reason before submitting');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reports', {
        target_type: target.target_type || 'confession',
        target_id: target.id,
        reason: reason.trim()
      });
      setSuccess(true);
      toast.success('Report submitted. Thank you for keeping the community safe!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error reporting:', error);
      const msg = error?.response?.data?.detail || 'Failed to submit report. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0F0A0A] border border-white/[0.08] rounded-2xl shadow-[0_0_40px_rgba(230,57,70,0.08)] max-w-md w-full p-6 animate-fade-in" data-testid="report-modal">
        <div className="flex justify-between items-start mb-5">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Report Content</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-full hover:bg-white/[0.05]" data-testid="close-report-btn">
            <X size={22} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="bg-green-500/15 border border-green-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Report Submitted</p>
            <p className="text-white/40 text-sm">Thank you for helping keep our community safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="reason" className="block text-sm font-semibold text-white/70 mb-2">
                Why are you reporting this?
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please describe the issue..."
                rows={4}
                className="w-full bg-[#1A1010] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/40 transition-all outline-none placeholder:text-white/25 resize-none text-sm"
                data-testid="report-reason-input"
              />
            </div>

            <div className="bg-[#FFB703]/8 border border-[#FFB703]/15 rounded-xl p-3 mb-5">
              <p className="text-[#FFB703] text-xs leading-relaxed">
                Reports are reviewed by moderators. False reports may result in restrictions on your account.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/[0.06] text-white/70 rounded-full px-6 py-3 font-semibold hover:bg-white/[0.1] transition-all active:scale-95 border border-white/[0.05]"
                data-testid="cancel-report-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason.trim() || submitting}
                className="flex-1 bg-[#E63946] text-white rounded-full px-6 py-3 font-bold hover:bg-[#D62828] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_16px_rgba(230,57,70,0.25)]"
                data-testid="submit-report-btn"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReportModal;