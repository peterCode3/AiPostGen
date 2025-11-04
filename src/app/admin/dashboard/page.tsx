'use client';

import { useState, useEffect } from 'react';
import SourcesManager from '@/components/SourcesManager';
import GenerateContent from '@/components/GenerateContent';
import AdminLayout from '@/components/AdminLayout';
import AutoDentist from '@/components/AutoDentist';
import SourceList from '@/components/SourceList';
import toast, { Toaster } from 'react-hot-toast';

export default function DashboardPage() {
  const tabs = [
    { id: 'autodentist', label: 'Generate Blog Dentist' },
    { id: 'generate', label: 'Generate Content' },
    { id: 'articlelist', label: 'Article List' },
  ];

  const [activeTab, setActiveTab] = useState('autodentist');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined' && !token) {
      toast.error('Please log in to access the dashboard');
      window.location.href = '/admin/login';
    }
  }, [token]);

  return (
    <AdminLayout>
    <Toaster position="top-right" />
    <div className="page-container">
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{marginTop: '24px'}}>
        {activeTab === 'generate' && <GenerateContent />}
        {activeTab === 'articlelist' && <SourceList />}
        {activeTab === 'autodentist' && <AutoDentist onSuccess={() => setActiveTab('articlelist')} />}
      </div>
    </div>
    </AdminLayout>
  );
}

