
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a dummy PDF file
const dummyPdfPath = path.join(__dirname, 'dummy_country_test.pdf');
fs.writeFileSync(dummyPdfPath, '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 21 >>\nstream\nBT /F1 12 Tf (Hello) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000224 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n295\n%%EOF');

async function testUpload(country) {
    const form = new FormData();
    form.append('file', fs.createReadStream(dummyPdfPath));
    if (country) form.append('country', country);

    try {
        console.log(`Testing upload with country: ${country || 'undefined'}`);
        const response = await axios.post('http://localhost:4000/api/import/pdf', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log(`Response status: ${response.status}`);
        // We can't easily check backend logs from here, but a 200 OK means it was received.
        // The backend logs should show the country.
    } catch (error) {
        console.error('Upload failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

(async () => {
    await testUpload('UK');
    await testUpload('USA');

    // Cleanup
    try {
        fs.unlinkSync(dummyPdfPath);
    } catch (e) { }
})();
