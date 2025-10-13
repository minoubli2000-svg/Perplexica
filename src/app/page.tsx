'use client';
import dynamic from 'next/dynamic';

const Themis = dynamic(() => import('../components/Themis.tsx'), { 
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-red-600">
        <div className="text-6xl mb-4">⚖️</div>
        <div className="text-xl">Chargement de Thémis...</div>
      </div>
    </div>
  )
});

export default function Home() {
  return <Themis />;
}



