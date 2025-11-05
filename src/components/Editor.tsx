'use client';
import { useState, useEffect } from 'react';

type EditorProps = {
  initial: string;
  onChange?: (markdown: string, html: string) => void;
};

export default function Editor({ initial, onChange }: EditorProps) {
  const [md, setMd] = useState(initial);

  useEffect(() => {
    setMd(initial);
  }, [initial]);

  const handleChange = (value: string) => {
    setMd(value);
    if (onChange) {
      const html = value.replace(/\n/g, '<br/>');
      onChange(value, html);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <textarea 
        value={md} 
        onChange={e => handleChange(e.target.value)} 
        style={{ width: '100%', height: 600 }} 
      />
      <iframe 
        style={{ width: '100%', height: 600, background: '#fff' }} 
        srcDoc={md.replace(/\n/g,'<br/>')} 
      />
    </div>
  );
}
