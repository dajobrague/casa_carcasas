declare module 'html2pdf.js' {
  interface Options {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      logging?: boolean;
      letterRendering?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: 'portrait' | 'landscape';
    };
  }

  interface Html2Pdf {
    from(element: HTMLElement | string): Html2Pdf;
    set(options: Options): Html2Pdf;
    save(): Promise<void>;
    toPdf(): Promise<Blob>;
    toCanvas(): Promise<HTMLCanvasElement>;
    output(type: 'datauristring'): Promise<string>;
    output(type: 'blob'): Promise<Blob>;
  }

  function html2pdf(): Html2Pdf;
  export = html2pdf;
} 