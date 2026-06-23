import React, { useState } from 'react';
import { Crown, X, Check, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const IDEAL_BANKS = ['ABN AMRO', 'Rabobank', 'ING', 'SNS Bank', 'ASN Bank', 'Bunq', 'Knab', 'Triodos'];
const GRAD = 'linear-gradient(135deg, #FF6B4A 0%, #FF9A3C 100%)';

const FEATURES = [
  'Zie alle profielfoto\'s ongeblurd',
  'Prioriteit in de matchlijst',
  'Volledige Pinpoint kaart toegang',
  'Zie wie je profiel heeft geliked',
];

export default function PremiumModal({ onClose, onUpgrade, userProfile }) {
  const [step, setStep] = useState('overview');
  const [selectedBank, setSelectedBank] = useState('');
  const [dots, setDots] = useState(1);

  const handlePayment = async () => {
    if (!selectedBank) return;
    setStep('processing');
    const interval = setInterval(() => setDots(d => (d % 3) + 1), 500);
    await new Promise(r => setTimeout(r, 2500));
    clearInterval(interval);
    if (userProfile?.id) {
      await base44.entities.PremiumSubscription.create({
        user_email: userProfile.user_email || '',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      });
      await base44.entities.UserProfile.update(userProfile.id, { is_premium: true });
    }
    setStep('success');
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-[32px] p-6 overflow-y-auto"
        style={{ maxHeight: '90vh', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', animation: 'modalIn 0.3s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.92) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

        {step === 'overview' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900">Welove Premium</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-[24px] p-5 mb-5 text-center" style={{ background: GRAD }}>
              <Crown className="w-10 h-10 text-yellow-200 mx-auto mb-2" />
              <p className="text-white text-4xl font-black">€4,99<span className="text-lg font-normal opacity-80">/mnd</span></p>
              <p className="text-white/70 text-sm mt-1">Op elk moment opzegbaar · Direct toegang</p>
            </div>
            <div className="space-y-3 mb-6">
              {FEATURES.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,74,0.12)' }}>
                    <Check className="w-3.5 h-3.5" style={{ color: '#FF6B4A' }} />
                  </div>
                  <span className="text-gray-700 text-sm">{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep('payment')} className="w-full text-white py-4 rounded-[18px] font-black text-base" style={{ background: GRAD, boxShadow: '0 8px 24px rgba(142,84,233,0.4)' }}>
              Doorgaan naar betaling →
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep('overview')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg leading-none">←</button>
              <h2 className="text-xl font-black text-gray-900">Betalen via iDEAL</h2>
              <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex justify-between items-center border border-gray-100">
              <span className="text-gray-600 text-sm">Welove Premium · 1 maand</span>
              <span className="font-black text-gray-900">€4,99</span>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-2">Selecteer je bank</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {IDEAL_BANKS.map(bank => (
                <button
                  key={bank}
                  onClick={() => setSelectedBank(bank)}
                  className={`py-3 px-3 rounded-[14px] text-sm font-semibold text-left border-2 transition-all ${selectedBank === bank ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-orange-200'}`}
                >
                  {bank}
                </button>
              ))}
            </div>
            <button
              onClick={handlePayment}
              disabled={!selectedBank}
              className="w-full py-4 rounded-[18px] font-black text-base transition-all"
              style={selectedBank ? { background: GRAD, color: 'white', boxShadow: '0 8px 24px rgba(142,84,233,0.4)' } : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }}
            >
              Betaal €4,99 via iDEAL
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: GRAD }}>
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Betaling verwerken</h3>
            <p className="text-gray-500 text-sm">Verbinden met {selectedBank}{'.'.repeat(dots)}</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Welkom bij Premium! 🎉</h3>
            <p className="text-gray-500 text-sm mb-6">Alle profielfoto's zijn nu ontgrendeld. Vind jouw match!</p>
            <button onClick={onUpgrade} className="w-full text-white py-4 rounded-[18px] font-black" style={{ background: GRAD }}>
              Begin met verkennen ✨
            </button>
          </div>
        )}
      </div>
    </div>
  );
}