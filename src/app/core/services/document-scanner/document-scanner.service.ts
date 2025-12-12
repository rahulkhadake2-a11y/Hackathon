import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import Tesseract from 'tesseract.js';

// Extracted document data interface
export interface ExtractedDocumentData {
  documentType: 'invoice' | 'grn' | 'purchase_order' | 'unknown';
  vendorName: string | null;
  invoiceNumber: string | null;
  grnNumber: string | null;
  poNumber: string | null;
  totalAmount: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  taxRate: number | null;
  dueDate: string | null;
  invoiceDate: string | null;
  deliveryDate: string | null;
  currency: string;
  lineItems: LineItem[];
  rawText: string;
  confidence: number;
  extractedFields: ExtractedField[];
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  position?: { x: number; y: number };
}

export interface ScanProgress {
  status: 'loading' | 'recognizing' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentScannerService {
  // OCR patterns for data extraction
  private patterns = {
    // Invoice/Document numbers
    invoiceNumber: [
      /invoice\s*(?:#|no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/i,
      /inv\s*(?:#|no\.?)?[:\s]*([A-Z0-9\-\/]+)/i,
      /bill\s*(?:#|no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/i,
      /document\s*(?:#|no\.?)?[:\s]*([A-Z0-9\-\/]+)/i,
    ],

    // GRN numbers
    grnNumber: [
      /grn\s*(?:#|no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/i,
      /goods\s*receipt\s*(?:#|no\.?)?[:\s]*([A-Z0-9\-\/]+)/i,
      /receipt\s*(?:#|no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/i,
    ],

    // PO numbers
    poNumber: [
      /p\.?o\.?\s*(?:#|no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/i,
      /purchase\s*order\s*(?:#|no\.?)?[:\s]*([A-Z0-9\-\/]+)/i,
      /order\s*(?:#|no\.?|number)?[:\s]*([A-Z0-9\-\/]+)/i,
    ],

    // Total amount patterns
    totalAmount: [
      /total\s*(?:amount)?[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /grand\s*total[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /amount\s*due[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /balance\s*due[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /net\s*(?:amount|total)?[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
    ],

    // Subtotal patterns
    subtotal: [
      /sub\s*total[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /subtotal[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
    ],

    // Tax patterns
    tax: [
      /tax\s*(?:amount)?[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /vat\s*(?:amount)?[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /gst\s*(?:amount)?[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
      /sales\s*tax[:\s]*[\$€£₹]?\s*([\d,]+\.?\d*)/i,
    ],

    // Tax rate patterns
    taxRate: [
      /tax\s*(?:rate)?[:\s]*(\d+(?:\.\d+)?)\s*%/i,
      /vat\s*(?:rate)?[:\s]*(\d+(?:\.\d+)?)\s*%/i,
      /gst\s*(?:rate)?[:\s]*(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s*(?:tax|vat|gst)/i,
    ],

    // Date patterns
    date: [
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
      /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
    ],

    // Due date patterns
    dueDate: [
      /due\s*(?:date)?[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /payment\s*due[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /pay\s*by[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    ],

    // Invoice date patterns
    invoiceDate: [
      /invoice\s*date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*of\s*invoice[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /bill\s*date[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    ],

    // Currency symbols
    currency: [
      /[\$]/, // USD
      /[€]/, // EUR
      /[£]/, // GBP
      /[₹]/, // INR
      /USD|EUR|GBP|INR|AUD|CAD/i,
    ],

    // Vendor/Company name patterns
    vendorName: [
      /from[:\s]*([A-Za-z0-9\s&.,]+?)(?:\n|$)/i,
      /vendor[:\s]*([A-Za-z0-9\s&.,]+?)(?:\n|$)/i,
      /supplier[:\s]*([A-Za-z0-9\s&.,]+?)(?:\n|$)/i,
      /sold\s*by[:\s]*([A-Za-z0-9\s&.,]+?)(?:\n|$)/i,
      /company[:\s]*([A-Za-z0-9\s&.,]+?)(?:\n|$)/i,
    ],
  };

  constructor() {}

  /**
   * Scan a document image and extract data
   */
  scanDocument(
    file: File,
    progressCallback?: (progress: ScanProgress) => void
  ): Observable<ExtractedDocumentData> {
    return new Observable((observer) => {
      // Validate file type
      if (!this.isValidFileType(file)) {
        observer.error(
          new Error(
            'Invalid file type. Please upload an image (PNG, JPG, JPEG) or PDF.'
          )
        );
        return;
      }

      // Report loading status
      if (progressCallback) {
        progressCallback({
          status: 'loading',
          progress: 0,
          message: 'Loading document...',
        });
      }

      // Convert file to image URL
      const imageUrl = URL.createObjectURL(file);

      // Perform OCR with Tesseract
      Tesseract.recognize(imageUrl, 'eng', {
        logger: (m) => {
          if (progressCallback && m.status === 'recognizing text') {
            progressCallback({
              status: 'recognizing',
              progress: Math.round(m.progress * 80),
              message: `Recognizing text... ${Math.round(m.progress * 100)}%`,
            });
          }
        },
      })
        .then(({ data }) => {
          // Report processing status
          if (progressCallback) {
            progressCallback({
              status: 'processing',
              progress: 85,
              message: 'Extracting data...',
            });
          }

          // Extract structured data from OCR text
          const extractedData = this.parseOcrText(data.text, data.confidence);

          // Report complete status
          if (progressCallback) {
            progressCallback({
              status: 'complete',
              progress: 100,
              message: 'Document processed successfully!',
            });
          }

          // Cleanup
          URL.revokeObjectURL(imageUrl);

          observer.next(extractedData);
          observer.complete();
        })
        .catch((error) => {
          URL.revokeObjectURL(imageUrl);
          if (progressCallback) {
            progressCallback({
              status: 'error',
              progress: 0,
              message: 'Failed to process document',
            });
          }
          observer.error(error);
        });
    });
  }

  /**
   * Parse OCR text and extract structured data
   */
  private parseOcrText(
    text: string,
    confidence: number
  ): ExtractedDocumentData {
    const extractedFields: ExtractedField[] = [];

    // Detect document type
    const documentType = this.detectDocumentType(text);

    // Extract invoice number
    const invoiceNumber = this.extractPattern(
      text,
      this.patterns.invoiceNumber
    );
    if (invoiceNumber) {
      extractedFields.push({
        fieldName: 'Invoice Number',
        value: invoiceNumber,
        confidence: 0.9,
      });
    }

    // Extract GRN number
    const grnNumber = this.extractPattern(text, this.patterns.grnNumber);
    if (grnNumber) {
      extractedFields.push({
        fieldName: 'GRN Number',
        value: grnNumber,
        confidence: 0.9,
      });
    }

    // Extract PO number
    const poNumber = this.extractPattern(text, this.patterns.poNumber);
    if (poNumber) {
      extractedFields.push({
        fieldName: 'PO Number',
        value: poNumber,
        confidence: 0.9,
      });
    }

    // Extract vendor name
    const vendorName = this.extractVendorName(text);
    if (vendorName) {
      extractedFields.push({
        fieldName: 'Vendor Name',
        value: vendorName,
        confidence: 0.85,
      });
    }

    // Extract total amount
    const totalAmountStr = this.extractPattern(text, this.patterns.totalAmount);
    const totalAmount = totalAmountStr
      ? this.parseAmount(totalAmountStr)
      : null;
    if (totalAmount !== null) {
      extractedFields.push({
        fieldName: 'Total Amount',
        value: totalAmount.toString(),
        confidence: 0.95,
      });
    }

    // Extract subtotal
    const subtotalStr = this.extractPattern(text, this.patterns.subtotal);
    const subtotal = subtotalStr ? this.parseAmount(subtotalStr) : null;
    if (subtotal !== null) {
      extractedFields.push({
        fieldName: 'Subtotal',
        value: subtotal.toString(),
        confidence: 0.9,
      });
    }

    // Extract tax amount
    const taxStr = this.extractPattern(text, this.patterns.tax);
    const taxAmount = taxStr ? this.parseAmount(taxStr) : null;
    if (taxAmount !== null) {
      extractedFields.push({
        fieldName: 'Tax Amount',
        value: taxAmount.toString(),
        confidence: 0.9,
      });
    }

    // Extract tax rate
    const taxRateStr = this.extractPattern(text, this.patterns.taxRate);
    const taxRate = taxRateStr ? parseFloat(taxRateStr) : null;
    if (taxRate !== null) {
      extractedFields.push({
        fieldName: 'Tax Rate',
        value: `${taxRate}%`,
        confidence: 0.9,
      });
    }

    // Extract dates
    const dueDate = this.extractPattern(text, this.patterns.dueDate);
    if (dueDate) {
      extractedFields.push({
        fieldName: 'Due Date',
        value: dueDate,
        confidence: 0.85,
      });
    }

    const invoiceDate = this.extractPattern(text, this.patterns.invoiceDate);
    if (invoiceDate) {
      extractedFields.push({
        fieldName: 'Invoice Date',
        value: invoiceDate,
        confidence: 0.85,
      });
    }

    // Detect currency
    const currency = this.detectCurrency(text);

    // Extract line items
    const lineItems = this.extractLineItems(text);

    return {
      documentType,
      vendorName,
      invoiceNumber,
      grnNumber,
      poNumber,
      totalAmount,
      subtotal,
      taxAmount,
      taxRate,
      dueDate: dueDate ? this.normalizeDate(dueDate) : null,
      invoiceDate: invoiceDate ? this.normalizeDate(invoiceDate) : null,
      deliveryDate: null,
      currency,
      lineItems,
      rawText: text,
      confidence: confidence / 100,
      extractedFields,
    };
  }

  /**
   * Detect document type from text
   */
  private detectDocumentType(
    text: string
  ): 'invoice' | 'grn' | 'purchase_order' | 'unknown' {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('invoice') || lowerText.includes('bill')) {
      return 'invoice';
    }
    if (
      lowerText.includes('grn') ||
      lowerText.includes('goods receipt') ||
      lowerText.includes('delivery note')
    ) {
      return 'grn';
    }
    if (
      lowerText.includes('purchase order') ||
      lowerText.includes('p.o.') ||
      lowerText.includes('po number')
    ) {
      return 'purchase_order';
    }

    return 'unknown';
  }

  /**
   * Extract vendor name from text using multiple strategies
   */
  private extractVendorName(text: string): string | null {
    // Try pattern matching first
    const patternMatch = this.extractPattern(text, this.patterns.vendorName);
    if (patternMatch) {
      return this.cleanVendorName(patternMatch);
    }

    // Try to get the first prominent text (usually company name at top)
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      // Check if line looks like a company name (capitalized, reasonable length)
      if (line.length >= 3 && line.length <= 50 && /^[A-Z]/.test(line)) {
        // Exclude common header text
        const excludePatterns = [
          'invoice',
          'bill',
          'receipt',
          'date',
          'number',
          'total',
          'tax',
          'address',
        ];
        if (!excludePatterns.some((p) => line.toLowerCase().includes(p))) {
          return this.cleanVendorName(line);
        }
      }
    }

    return null;
  }

  /**
   * Clean vendor name string
   */
  private cleanVendorName(name: string): string {
    return name
      .replace(/[^\w\s&.,'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Extract pattern from text using multiple regex patterns
   */
  private extractPattern(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number | null {
    try {
      // Remove currency symbols and commas
      const cleaned = amountStr.replace(/[^\d.]/g, '');
      const amount = parseFloat(cleaned);
      return isNaN(amount) ? null : amount;
    } catch {
      return null;
    }
  }

  /**
   * Detect currency from text
   */
  private detectCurrency(text: string): string {
    if (/\$|USD/i.test(text)) return 'USD';
    if (/€|EUR/i.test(text)) return 'EUR';
    if (/£|GBP/i.test(text)) return 'GBP';
    if (/₹|INR|Rs\.?/i.test(text)) return 'INR';
    if (/AUD/i.test(text)) return 'AUD';
    if (/CAD/i.test(text)) return 'CAD';
    return 'USD'; // Default
  }

  /**
   * Normalize date string to ISO format
   */
  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  /**
   * Extract line items from text
   */
  private extractLineItems(text: string): LineItem[] {
    const lineItems: LineItem[] = [];

    // Pattern for line items: description, quantity, unit price, total
    const lineItemPattern =
      /([A-Za-z\s]+)\s+(\d+)\s+[\$€£₹]?([\d,]+\.?\d*)\s+[\$€£₹]?([\d,]+\.?\d*)/g;

    let match;
    while ((match = lineItemPattern.exec(text)) !== null) {
      const description = match[1].trim();
      const quantity = parseInt(match[2], 10);
      const unitPrice = this.parseAmount(match[3]) || 0;
      const total = this.parseAmount(match[4]) || 0;

      if (description && quantity > 0) {
        lineItems.push({ description, quantity, unitPrice, total });
      }
    }

    return lineItems;
  }

  /**
   * Validate file type
   */
  private isValidFileType(file: File): boolean {
    const validTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    return validTypes.includes(file.type);
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf'];
  }

  /**
   * Create purchase order from extracted data
   */
  createPurchaseFromExtracted(data: ExtractedDocumentData): any {
    return {
      vendorName: data.vendorName || '',
      purchaseOrderNumber: data.poNumber || data.invoiceNumber || '',
      orderDate: data.invoiceDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: data.dueDate || '',
      status: 'pending',
      items: data.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: data.subtotal || 0,
      tax: data.taxAmount || 0,
      totalAmount: data.totalAmount || 0,
      notes: `Extracted from ${data.documentType} document. Invoice #: ${
        data.invoiceNumber || 'N/A'
      }`,
    };
  }
}
