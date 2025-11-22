import * as pdfParseModule from 'pdf-parse';
import pdfParseDefault from 'pdf-parse';

console.log('Type of pdfParseModule:', typeof pdfParseModule);
console.log('Keys of pdfParseModule:', Object.keys(pdfParseModule));
console.log('Type of pdfParseModule.default:', typeof pdfParseModule.default);

console.log('Type of pdfParseDefault:', typeof pdfParseDefault);

const pdfParse = pdfParseModule.default || pdfParseModule;
console.log('Type of resolved pdfParse:', typeof pdfParse);

try {
    if (typeof pdfParse === 'function') {
        console.log('pdfParse is a function');
    } else {
        console.log('pdfParse is NOT a function');
    }
} catch (e) {
    console.error(e);
}
