import StoreNavigation from '@/components/StoreNavigation';

export default function GestorMensualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoreNavigation />
      <div className="bg-gray-50 min-h-screen pt-1">
        {children}
      </div>
    </>
  );
} 