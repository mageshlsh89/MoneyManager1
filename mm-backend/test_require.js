import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const pdfModule = require('pdf-parse');
    const PDFParse = pdfModule.PDFParse;

    // Minimal valid PDF header and trailer to avoid "Invalid PDF structure" if possible, 
    // or just rely on the fact that we want to see the return TYPE even if it fails? 
    // No, it threw an error last time.

    // Let's try to mock the internal structure if we can't make a real PDF easily.
    // Actually, let's just look at the error object from the previous run? No, it just said "Invalid PDF structure".

    // I will try to use a minimal PDF base64 string.
    const minimalPdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSCgogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNCAwMDAwMCBuIAowMDAwMDAwMjI1IDAwMDAwIG4gCjAwMDAwMDAzMTIgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzY1CiUlRU9GCg==";
    const buffer = Buffer.from(minimalPdfBase64, 'base64');

    (async () => {
        try {
            const uint8 = new Uint8Array(buffer);
            const instance = new PDFParse(uint8);
            console.log('Calling getText...');
            const result = await instance.getText();
            console.log('Result type:', typeof result);
            console.log('Result:', result);
            if (typeof result === 'object') {
                console.log('Result keys:', Object.keys(result));
            }
        } catch (e) {
            console.log('Error getting text:', e.message);
        }
    })();
} catch (e) {
    console.error(e);
}
