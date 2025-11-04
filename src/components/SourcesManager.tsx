'use client';

import { useState, useEffect } from 'react';

export default function SourcesManager() {
  const [sources, setSources] = useState<{ _id: string; url: string }[]>([]);
  const [newSource, setNewSource] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch all sources
  const fetchSources = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/sources/list', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      console.log(data, 'aya h pr')
      setSources(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [token]);

  // Add new source
  const handleAddSource = async () => {
    if (!newSource.trim()) return;
    try {
      const res = await fetch('/api/sources/scrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: newSource }),
      });
      const data = await res.json();
      setMessage(`Added source: ${data.url || newSource}`);
      setNewSource('');
      console.log(data)
      fetchSources(); 
    } catch (err) {
      console.error(err);
      setMessage('Error adding source');
    }
  };

  // Toggle selection
  const toggleSource = (id: string) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 border rounded-md mt-4">
      <h2 className="text-lg font-bold mb-2">Sources</h2>

      {/* Add new source */}
      <div className="mb-2">
        <input
          type="text"
          placeholder="New source URL"
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          className="border rounded-md p-2 w-full mb-2"
        />
        <button onClick={handleAddSource} className="bg-black text-white px-4 py-2 rounded">
          Add Source
        </button>
        {message && <p className="mt-2 text-green-600">{message}</p>}
      </div>

      {/* List of sources */}
      {sources.map(s => (
        <label key={s._id} className="block">
          <input
            type="checkbox"
            value={s._id}
            checked={selectedSources.includes(s._id)}
            onChange={() => toggleSource(s._id)}
          />
          {s.url}
        </label>
      ))}
    </div>
  );
}
