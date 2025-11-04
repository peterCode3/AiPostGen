'use client';
import { useState } from 'react';

export default function Editor({ initial }: { initial: string }) {
  const [md, setMd] = useState(initial);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <textarea value={md} onChange={e=>setMd(e.target.value)} style={{ width: '100%', height: 600 }} />
      <iframe style={{ width: '100%', height: 600, background: '#fff' }} srcDoc={md.replace(/\n/g,'<br/>')} />
    </div>
  );
}
