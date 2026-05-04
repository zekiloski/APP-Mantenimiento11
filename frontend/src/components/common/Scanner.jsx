import React from 'react';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';

export function Scanner({ onScan }) {
  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <QrScanner
        onScan={onScan}
        onError={(error) => console.log(error?.message)}
        constraints={{ facingMode: 'environment' }}
      />
    </div>
  );
}
