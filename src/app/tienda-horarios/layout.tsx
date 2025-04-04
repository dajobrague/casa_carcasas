import StoreNavigation from '@/components/StoreNavigation';

export default function TiendaHorariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoreNavigation />
      <div className="bg-gray-50 min-h-screen">
        {children}
      </div>
    </>
  );
} 