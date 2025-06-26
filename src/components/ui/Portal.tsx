'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  selector?: string;
}

export default function Portal({ children, selector = 'body' }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const [portalElement, setPortalElement] = useState<Element | null>(null);

  useEffect(() => {
    setMounted(true);
    const element = document.querySelector(selector);
    setPortalElement(element);
    
    return () => setMounted(false);
  }, [selector]);

  if (!mounted || !portalElement) {
    return null;
  }

  return createPortal(children, portalElement);
} 