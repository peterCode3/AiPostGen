'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    router.push(token ? '/admin/dashboard' : '/admin/login');
  }, [router]);

  return (
    <main style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>Redirecting to Admin...</h1>
    </main>
  );
}




// // /admin/new-article.tsx
// 'use client'
// import { useState } from 'react';
// import toast from 'react-hot-toast';

// export default function NewArticle() {
//   const [keyword, setKeyword] = useState('');

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     const res = await fetch('/api/generate', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ keyword }),
//     });
//     const data = await res.json();
//     toast.success(`Article generated: ${data.meta.title}`);
//   }

//   return (
//     <form onSubmit={handleSubmit} className="p-6 space-y-4">
//       <input
//         type="text"
//         placeholder="Enter keyword"
//         className="border p-2 w-full rounded"
//         value={keyword}
//         onChange={e => setKeyword(e.target.value)}
//       />
//       <button className="bg-blue-600 text-white px-4 py-2 rounded">Generate</button>
//     </form>
//   );
// }
