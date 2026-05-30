import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { ResumeData } from '../types';

export const PdfService = {
  downloadPdf: async (data: ResumeData, filename: string, element: HTMLElement) => {
    if (!element) {
      console.error('PDF-FEL: Inget element att exportera');
      return;
    }

    try {
      // Rensa namnet från svenska tecken, mellanslag och konstiga symboler för max kompatibilitet
      const safeName = filename.trim()
        .replace(/å|ä/g, 'a').replace(/Å|Ä/g, 'A')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_') // Ta bort dubbla understreck
        .replace(/_$/, ''); // Ta bort understreck i slutet

      // Skapa en helt unik tidsstämpel för att förhindra krockar och OneDrive-låsningar
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.getHours().toString().padStart(2, '0') + 
                      now.getMinutes().toString().padStart(2, '0') + 
                      now.getSeconds().toString().padStart(2, '0');

      const finalFileName = `${safeName}_${dateStr}_${timeStr}.pdf`;

      // Skapa en klon för att slippa problem med scroll, föräldra-element och transformeringar
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Placera klonen absolut högestellt upp till vänster, gömd bakom allt
      clone.style.position = 'absolute';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.zIndex = '-9999';
      clone.style.transform = 'none'; // Ingen skalning
      clone.style.margin = '0';
      // Tvinga fram svart text och synlighet om föräldern hade det
      clone.style.color = '#000000';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      
      document.body.appendChild(clone);
      
      // 1. Fånga klonen som en bild
      const canvas = await html2canvas(clone, {
        scale: 2, // Högre upplösning
        useCORS: true, // Viktigt för profilbilder från Firebase
        backgroundColor: '#ffffff',
        logging: false, // Stäng av debug-loggning i produktion
        // Tvinga ritmotorn att titta på 0,0 utan scroll
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight
      });

      // Städa bort klonen direkt
      document.body.removeChild(clone);

      // Om canvas är tom/noll, logga ett specifikt fel
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("html2canvas skapade en tom bild (0x0 pixlar).");
      }

      // 2. Skapa PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Konvertera bilden till rätt proportioner för A4 (210x297mm)
      const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Räkna hur hög bilden är i mm
      const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;

      // Beräkna antal sidor med en tröskel för att undvika nästan tomma sidor.
      // Om överskottet på sista sidan är < 10mm räknar vi det inte som en ny sida.
      const rawPageCount = imgHeightMm / pdfPageHeight;
      const overflow = (rawPageCount % 1) * pdfPageHeight; // mm som "spiller" ut på nästa sida
      const pageCount = overflow > 0 && overflow < 10
        ? Math.floor(rawPageCount)   // Sista sidan är nästan tom – hoppa över den
        : Math.ceil(rawPageCount);   // Annars ta med alla sidor

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage();
        // Förskjut bilden uppåt för varje ny sida
        const yOffset = -(page * pdfPageHeight);
        pdf.addImage(imgData, 'JPEG', 0, yOffset, pdfWidth, imgHeightMm);
      }


      // 3. Konvertera till ArrayBuffer för metadata
      const pdfArrayBuffer = pdf.output('arraybuffer');
      
      // 4. Metadata Stamping (PDF-LIB)
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      
      // Skapa en lättviktig kopia av datan för metadatan
      const dataForMetadata = { ...data };
      if (dataForMetadata.personal && dataForMetadata.personal.photoUrl) {
        // Om det är en base64-bild, skapa en pytteliten version för metadatan 
        // så datan blir så kompakt som möjligt
        if (dataForMetadata.personal.photoUrl.startsWith('data:image')) {
          try {
            const thumbnail = await PdfService.createThumbnail(dataForMetadata.personal.photoUrl, 150);
            dataForMetadata.personal = { ...dataForMetadata.personal, photoUrl: thumbnail };
          } catch (e) {
            console.warn("Kunde inte skapa miniatyr för metadata, rensar bilden", e);
            dataForMetadata.personal = { ...dataForMetadata.personal, photoUrl: '' };
          }
        }
      }
      
      let jsonData = JSON.stringify(dataForMetadata);
      let base64Data = btoa(encodeURIComponent(jsonData).replace(/%([0-9A-F]{2})/g, (match, p1) => {
          return String.fromCharCode(parseInt(p1, 16));
      }));
      
      // Säkerställ att metadatat aldrig överstiger 50KB (vilket annars korrumperar PDF:en och skapar "systemfiler" i Chrome)
      if (base64Data.length >= 50000 && dataForMetadata.personal && dataForMetadata.personal.photoUrl) {
        console.warn("Metadatat är för stort (>50KB), rensar profilbilden från metadatan för att undvika korruption.");
        dataForMetadata.personal = { ...dataForMetadata.personal, photoUrl: '' };
        jsonData = JSON.stringify(dataForMetadata);
        base64Data = btoa(encodeURIComponent(jsonData).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
      }

      // Bifoga endast metadata om den ligger under den säkra gränsen på 50KB för att förhindra krascher i Windows/Chrome PDF-läsare
      if (base64Data.length < 50000) {
        pdfDoc.setKeywords([`AVENTUS_DATA:${base64Data}`]);
      } else {
        console.warn("Metadatat är fortfarande för stort efter bildrensning (>50KB), sparar utan metadata.");
      }
      
      pdfDoc.setProducer('Aventus CV');
      pdfDoc.setTitle(finalFileName);
      
      const finalPdfBytes = await pdfDoc.save();
      
      // 5. Ladda ner direkt till Hämtade filer som en PDF
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFileName;
      
      document.body.appendChild(link);
      link.click();
      
      // Använd en längre timeout (10 sekunder) innan vi rensar URL:en 
      // för att garantera att Windows/OneDrive hinner skriva färdigt filen till disk
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 10000);

    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Kunde inte skapa PDF:en: ' + (error instanceof Error ? error.message : 'Okänt fel'));
    }
  },

  createThumbnail: (base64: string, maxWidth: number): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64 || !base64.startsWith('data:image')) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = maxWidth / img.width;
          if (scale >= 1) {
            canvas.width = img.width;
            canvas.height = img.height;
          } else {
            canvas.width = maxWidth;
            canvas.height = img.height * scale;
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.4));
        } catch (e) {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = base64;
    });
  }
};
