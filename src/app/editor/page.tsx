'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';

function EditorContent() {
  const { storeRecordId, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && storeRecordId) {
      router.push(`/editor/${storeRecordId}`);
    }
  }, [storeRecordId, loading, router]);
  
  return (
    <RouteGuard>
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </RouteGuard>
  );
}

// Fallback para Suspense
function EditorFallback() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function EditorRedirectPage() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <EditorContent />
    </Suspense>
  );
} 