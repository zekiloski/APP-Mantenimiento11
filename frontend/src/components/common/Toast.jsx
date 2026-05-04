import React from 'react';

let _addToast = null;

export function toast(message, type = 'success') {
  if (_addToast) _addToast(message, type);
  else console.log('[Toast]', type, message);
}

const TOAST_COLORS = {
  success: 'linear-gradient(135deg,rgba(16,185,129,0.97),rgba(5,150,105,0.97))',
  error:   'linear-gradient(135deg,rgba(239,68,68,0.97),rgba(185,28,28,0.97))',
  warning: 'linear-gradient(135deg,rgba(245,158,11,0.97),rgba(217,119,6,0.97))',
  info:    'linear-gradient(135deg,rgba(59,130,246,0.97),rgba(37,99,235,0.97))',
};

const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    _addToast = (message, type = 'success') => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { _addToast = null; };
  }, []);

  return (
    <div style={{ position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', zIndex:99999, display:'flex', flexDirection:'column', gap:'10px', alignItems:'center', pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ 
            background: TOAST_COLORS[t.type] || TOAST_COLORS.success, 
            color:'white', 
            padding:'14px 28px', 
            borderRadius:'14px', 
            boxShadow:'0 12px 40px rgba(0,0,0,0.4)', 
            animation:'fadeIn 0.3s ease', 
            maxWidth:'460px', 
            textAlign:'center', 
            fontSize:'0.95rem', 
            fontWeight:'600', 
            backdropFilter:'blur(12px)', 
            border:'1px solid rgba(255,255,255,0.2)', 
            letterSpacing:'0.01em' 
        }}>
          {TOAST_ICONS[t.type] || '✅'} {t.message}
        </div>
      ))}
    </div>
  );
}
