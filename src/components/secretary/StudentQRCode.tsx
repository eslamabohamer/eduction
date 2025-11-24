// src/components/secretary/StudentQRCode.tsx
// مكون توليد وطباعة كود الطالب
// Component to generate and print Student QR Code.

import { useRef } from 'react';
import QRCode from 'react-qr-code';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer } from 'lucide-react';

interface Props {
  studentName: string;
  studentCode: string;
  tenantName?: string;
}

export function StudentQRCode({ studentName, studentCode, tenantName = 'EduPlatform' }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `ID-${studentCode}`,
  });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Printable Area */}
      <div className="hidden">
        <div ref={printRef} className="p-8 flex flex-col items-center justify-center border-2 border-black w-[300px] h-[450px] text-center bg-white">
          <h2 className="text-xl font-bold mb-2">{tenantName}</h2>
          <div className="w-full h-px bg-black mb-6"></div>
          
          <div className="mb-6">
            <QRCode value={studentCode} size={180} />
          </div>
          
          <h3 className="text-2xl font-bold mb-2">{studentName}</h3>
          <p className="text-lg font-mono border px-4 py-1 rounded mb-4">{studentCode}</p>
          
          <p className="text-sm text-gray-500 mt-auto">بطاقة طالب رسمية</p>
        </div>
      </div>

      {/* Display Area */}
      <Card className="p-6 flex flex-col items-center bg-white">
        <QRCode value={studentCode} size={150} />
        <div className="mt-4 text-center">
          <p className="font-bold text-lg">{studentName}</p>
          <p className="font-mono text-muted-foreground">{studentCode}</p>
        </div>
        <Button onClick={() => handlePrint()} className="mt-4 w-full gap-2" variant="outline">
          <Printer className="h-4 w-4" />
          طباعة البطاقة
        </Button>
      </Card>
    </div>
  );
}
