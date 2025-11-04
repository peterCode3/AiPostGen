'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/AdminLayout';
import Loading from '@/components/Loading';
import Editor from '@/components/Editor';
import SeoWidget from '@/components/SeoWidget';

export default function ArticlePage() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/articles/draft/${params.id}`, {
                    headers: { authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Failed to load article');
                const json = await res.json();
                setData(json);
                setFeaturedImage(json.featuredImage || '');
            } catch (err) {
                toast.error('Error loading article ⚠️');
            }
        })();
    }, [params.id]);

    const saveChanges = async () => {
        try {
            const res = await fetch(`/api/articles/draft/${params.id}`, {
                method: 'PATCH',
                headers: {
                    authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: data.content,
                    metaTitle: data.metaTitle,
                    metaDescription: data.metaDescription,
                    keywords: data.keywords,
                    featuredImage
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            toast.success('💾 Changes saved successfully');
        } catch (err) {
            toast.error('Failed to save changes');
        }
    };
    async function uploadImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        return json.url;
    }

    const handleImageUpload = async (file: File) => {
        try {
            const url = await uploadImage(file);
            setFeaturedImage(url);
            toast.success('Featured image uploaded ✅');
        } catch (err) {
            toast.error('Image upload failed ❌');
        }
    };

    const reject = async () => {
        if (!confirm('Are you sure you want to reject this article?')) return;
        try {
            const res = await fetch(`/api/articles/draft/${params.id}/reject`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Reject failed');
            toast.success('❌ Article rejected successfully');
        } catch (err) {
            toast.error('Failed to reject article');
        }
    };

    const approve = async () => {
        if (!scheduleDate) return toast.error('Please select a schedule date first.');
        try {
            const res = await fetch(`/api/articles/draft/${params.id}/schedule`, {
                method: 'POST',
                headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledAt: scheduleDate }),
            });
            if (!res.ok) throw new Error('Schedule failed');
            toast.success(`✅ Scheduled for ${new Date(scheduleDate).toLocaleString()}`);
        } catch (err) {
            toast.error('Failed to schedule article');
        }
    };

    const publish = async () => {
        try {
            const res = await fetch(`/api/articles/draft/${params.id}/publish`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Publish failed');
            toast.success('🚀 Article published successfully');
        } catch (err) {
            toast.error('Failed to publish article');
        }
    };

    if (!data) return <AdminLayout><Loading /></AdminLayout>;

    return (
        <AdminLayout>
            <main style={{ padding: '20px' }}>
                <h1>Edit Article: {data.title}</h1>

                {/* SEO Widget */}
                <SeoWidget title={data.metaTitle || data.title} description={data.metaDescription || ''} />

                {/* Metadata Editor */}
                <div style={{ marginBottom: 16 }}>
                    <input
                        type="text"
                        placeholder="Meta Title"
                        value={data.metaTitle || ''}
                        onChange={(e) => setData({ ...data, metaTitle: e.target.value })}
                        style={{ width: '100%', marginBottom: 8 }}
                    />
                    <textarea
                        placeholder="Meta Description"
                        value={data.metaDescription || ''}
                        onChange={(e) => setData({ ...data, metaDescription: e.target.value })}
                        style={{ width: '100%', marginBottom: 8 }}
                    />
                    <input
                        type="text"
                        placeholder="Keywords (comma separated)"
                        value={data.keywords?.join(', ') || ''}
                        onChange={(e) => setData({ ...data, keywords: e.target.value.split(',').map(k => k.trim()) })}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Featured Image */}
                <div style={{ marginBottom: 16 }}>
                    <label>Featured Image:</label>
                    <input type="file" onChange={e => e.target.files && handleImageUpload(e.target.files[0])} />
                    {featuredImage && <img src={featuredImage} alt="Featured" style={{ width: 200, marginTop: 8 }} />}
                </div>

                {/* Markdown Editor */}
                <Editor initial={data.content?.markdown || ''} onChange={(markdown, html) => setData({ ...data, content: { markdown, html } })} />

                {/* Sources */}
                <div style={{ marginTop: 16 }}>
                    <h3>Sources:</h3>
                    {data.sourceRefs?.map((src, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                            <input
                                type="text"
                                placeholder="Title"
                                value={src.title}
                                onChange={e => {
                                    const newSources = [...data.sourceRefs];
                                    newSources[idx].title = e.target.value;
                                    setData({ ...data, sourceRefs: newSources });
                                }}
                            />
                            <input
                                type="text"
                                placeholder="URL"
                                value={src.url}
                                onChange={e => {
                                    const newSources = [...data.sourceRefs];
                                    newSources[idx].url = e.target.value;
                                    setData({ ...data, sourceRefs: newSources });
                                }}
                            />
                        </div>
                    ))}

                </div>

                {/* Schedule / Actions */}
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
                    <div>
                        <label>Schedule Date:</label>
                        <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} style={{ marginLeft: 8 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveChanges}>💾 Save</button>
                        <button onClick={approve}>Schedule</button>
                        <button onClick={reject}>Reject</button>
                        <button onClick={publish}>Publish Now</button>
                    </div>
                </div>

                {data.scheduledAt && (
                    <p style={{ marginTop: 10, color: '#666' }}>Scheduled Date: {new Date(data.scheduledAt).toLocaleString()}</p>
                )}
            </main>
        </AdminLayout>
    );
}
