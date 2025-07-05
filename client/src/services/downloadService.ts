import JSZip from 'jszip';
import { MediaItem } from '../types';

// Verbesserte Download-Funktion mit besserer Fehlerbehandlung
const downloadFileWithFetch = async (url: string, filename: string): Promise<Blob> => {
  try {
    console.log(`📥 Downloading: ${filename}`);
    
    // Versuche direkten Download
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error(`Empty file: ${filename}`);
    }
    
    console.log(`✅ Downloaded: ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
    return blob;
    
  } catch (error) {
    console.error(`❌ Download failed for ${filename}:`, error);
    throw error;
  }
};

export const downloadAllMedia = async (mediaItems: MediaItem[]): Promise<void> => {
  try {
    const zip = new JSZip();
    const mediaFolder = zip.folder('Hochzeitsbilder_Kristin_Maurizio');
    
    if (!mediaFolder) {
      throw new Error('ZIP-Ordner konnte nicht erstellt werden');
    }

    // Nur downloadbare Medien filtern
    const downloadableItems = mediaItems.filter(item => item.type !== 'note' && item.url);
    
    if (downloadableItems.length === 0) {
      throw new Error('Keine Medien zum Herunterladen vorhanden');
    }

    console.log(`🚀 Starte Download von ${downloadableItems.length} Dateien...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Sequenzieller Download für bessere Stabilität
    for (let i = 0; i < downloadableItems.length; i++) {
      const item = downloadableItems[i];
      
      try {
        const blob = await downloadFileWithFetch(item.url, item.name);
        
        // Dateiname mit Zeitstempel und Uploader
        const timestamp = new Date(item.uploadedAt).toISOString().slice(0, 10);
        const cleanUploaderName = item.uploadedBy.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
        const fileExtension = item.type === 'video' ? 'mp4' : 'jpg';
        const fileName = `${timestamp}_${cleanUploaderName}_${String(i + 1).padStart(3, '0')}.${fileExtension}`;
        
        mediaFolder.file(fileName, blob);
        successCount++;
        
        console.log(`✅ ${successCount}/${downloadableItems.length} - ${fileName} hinzugefügt`);
        
      } catch (error) {
        console.error(`❌ Fehler bei ${item.name}:`, error);
        errorCount++;
        
        const errorMessage = `Fehler: ${item.name}\nUploader: ${item.uploadedBy}\nDatum: ${new Date(item.uploadedAt).toLocaleString('de-DE')}\nFehler: ${error}`;
        errors.push(errorMessage);
        
        // Fehler-Info in ZIP
        const errorFileName = `FEHLER_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        mediaFolder.file(errorFileName, errorMessage);
      }
      
      // Kleine Pause zwischen Downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Notizen als Textdatei hinzufügen
    const notes = mediaItems.filter(item => item.type === 'note' && item.noteText);
    if (notes.length > 0) {
      let notesContent = '=== 💌 HOCHZEITSNOTIZEN ===\n\n';
      notesContent += `${notes.length} liebevolle Nachricht${notes.length > 1 ? 'en' : ''} von den Gästen:\n\n`;
      
      notes.forEach((note, index) => {
        const timestamp = new Date(note.uploadedAt).toLocaleString('de-DE');
        notesContent += `${index + 1}. 💕 Von: ${note.uploadedBy}\n`;
        notesContent += `   📅 ${timestamp}\n`;
        notesContent += `   💌 "${note.noteText}"\n`;
        notesContent += `   ${'='.repeat(50)}\n\n`;
      });
      
      mediaFolder.file('💌_Hochzeitsnotizen.txt', notesContent);
    }

    // Übersichtsdatei erstellen
    const summary = `=== 📸 HOCHZEITS-MEDIEN DOWNLOAD ===

Heruntergeladen: ${new Date().toLocaleString('de-DE')}
Website: kristinundmauro.de

📊 STATISTIKEN:
✅ Erfolgreich: ${successCount} Dateien
❌ Fehlgeschlagen: ${errorCount} Dateien
📝 Notizen: ${notes.length}
📁 Gesamt: ${mediaItems.length} Beiträge

📈 AUFSCHLÜSSELUNG:
📸 Bilder: ${mediaItems.filter(item => item.type === 'image').length}
🎥 Videos: ${mediaItems.filter(item => item.type === 'video').length}
💌 Notizen: ${notes.length}

👥 GÄSTE:
${Array.from(new Set(mediaItems.map(item => item.uploadedBy)))
  .map(uploader => {
    const userItems = mediaItems.filter(item => item.uploadedBy === uploader);
    return `- ${uploader}: ${userItems.length} Beitrag${userItems.length > 1 ? 'e' : ''}`;
  }).join('\n')}

${errorCount > 0 ? `
⚠️ PROBLEME:
${errorCount} Datei${errorCount > 1 ? 'en' : ''} konnte${errorCount > 1 ? 'n' : ''} nicht geladen werden.
Siehe FEHLER_*.txt Dateien für Details.
` : '✅ Alle Dateien erfolgreich heruntergeladen!'}

💕 Vielen Dank für die wunderschönen Erinnerungen!
💍 Kristin & Maurizio

---
Erstellt mit ❤️ von kristinundmauro.de
`;

    mediaFolder.file('📊_Download_Übersicht.txt', summary);

    console.log('📦 Erstelle ZIP-Datei...');
    
    // ZIP generieren
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    console.log(`✅ ZIP erstellt: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Download starten
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const today = new Date().toISOString().slice(0, 10);
    link.download = `Hochzeitsbilder_Kristin_Maurizio_${today}.zip`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('🎉 Download abgeschlossen!');
    
    if (errorCount > 0) {
      throw new Error(`Download teilweise erfolgreich: ${successCount} von ${downloadableItems.length} Dateien heruntergeladen.`);
    }
    
  } catch (error) {
    console.error('💥 Download-Fehler:', error);
    throw error;
  }
};