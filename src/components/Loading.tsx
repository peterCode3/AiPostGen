'use client';

export default function Loading() {
  return (
    <>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in 0.3s both;
        }
      `}</style>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full spinner"
        />
        
        <p className="mt-4 text-gray-600 text-lg font-medium fade-in">
          Loading, please wait...
        </p>
      </div>
    </>
  );
}
