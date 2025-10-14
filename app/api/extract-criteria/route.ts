import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { createWorker } from 'tesseract.js';
import { createCanvas, Image } from 'canvas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure pdfjs worker
if (typeof window === 'undefined') {
  const pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.entry');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Function to find pages containing criteria keywords (fast OCR-like scan)
async function findCriteriaPages(pdf: any, maxPages: number = 50): Promise<number[]> {
  const criteriaPages: Set<number> = new Set();
  const keywords = ['inclusion criteria', 'exclusion criteria', 'eligibility criteria', 'inclusion', 'exclusion'];

  console.log('Scanning for criteria pages...');

  // Quick scan of all pages in parallel batches
  const batchSize = 20;
  for (let start = 1; start <= maxPages; start += batchSize) {
    const end = Math.min(start + batchSize - 1, maxPages);
    const batchPromises = [];

    for (let pageNum = start; pageNum <= end; pageNum++) {
      batchPromises.push(
        pdf.getPage(pageNum)
          .then((page: any) => page.getTextContent())
          .then((content: any) => {
            const text = content.items.map((item: any) => item.str).join(' ').toLowerCase();
            const hasKeyword = keywords.some(keyword => text.includes(keyword));
            return { pageNum, hasKeyword, text };
          })
          .catch(() => ({ pageNum, hasKeyword: false, text: '' }))
      );
    }

    const results = await Promise.all(batchPromises);
    results.forEach(result => {
      if (result.hasKeyword) {
        // Add this page and surrounding pages (criteria often span multiple pages)
        criteriaPages.add(result.pageNum);
        if (result.pageNum > 1) criteriaPages.add(result.pageNum - 1);
        if (result.pageNum < maxPages) criteriaPages.add(result.pageNum + 1);
      }
    });

    // Early exit if we found criteria pages
    if (criteriaPages.size > 0) {
      console.log(`Found criteria keywords on pages: ${Array.from(criteriaPages).sort((a, b) => a - b).join(', ')}`);
      break;
    }
  }

  return Array.from(criteriaPages).sort((a, b) => a - b);
}

// Optimized function to extract text from specific PDF pages using GPT-4o Vision
async function extractPDFTextWithVision(buffer: Buffer, openaiClient: OpenAI, targetPages?: number[]): Promise<string> {
  try {
    console.log('Starting optimized GPT-4o Vision extraction...');

    // Load the PDF
    const data = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    console.log(`PDF has ${pdf.numPages} pages`);

    // If no target pages specified, find them first
    let pagesToProcess = targetPages;
    if (!pagesToProcess || pagesToProcess.length === 0) {
      pagesToProcess = await findCriteriaPages(pdf, Math.min(pdf.numPages, 50));

      // If still no pages found, fall back to first 5 pages
      if (pagesToProcess.length === 0) {
        console.log('No criteria pages found, processing first 5 pages');
        pagesToProcess = Array.from({ length: Math.min(5, pdf.numPages) }, (_, i) => i + 1);
      }
    }

    // Limit to max 8 pages to keep it fast
    pagesToProcess = pagesToProcess.slice(0, 8);
    console.log(`Processing ${pagesToProcess.length} pages: ${pagesToProcess.join(', ')}`);

    // Convert pages to images in parallel with lower resolution for speed
    const imagePromises = pagesToProcess.map(async (pageNum) => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); // Reduced from 2.0 for 44% faster processing

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context as any,
        viewport: viewport,
      }).promise;

      const imageBuffer = canvas.toBuffer('image/png');
      const base64Image = imageBuffer.toString('base64');

      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:image/png;base64,${base64Image}`,
          detail: 'high' as const
        },
      };
    });

    const images = await Promise.all(imagePromises);
    console.log(`Converted ${images.length} pages to images, sending to GPT-4o...`);

    // Use GPT-4o Vision to extract text
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract ALL the text from these clinical trial document pages, focusing on inclusion and exclusion criteria sections. Return ONLY the raw text content, maintaining the original structure.',
            },
            ...images,
          ],
        },
      ],
      max_tokens: 4000,
    });

    const extractedText = response.choices[0].message.content || '';
    console.log(`GPT-4o Vision extracted ${extractedText.length} characters from ${images.length} pages`);

    return extractedText;
  } catch (error) {
    console.error('Vision extraction failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Extract text from document based on file type
    let documentText = '';
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // For PDFs, try text extraction first, then use Vision as fallback
      console.log('Processing PDF...');

      try {
        // First, try direct text extraction using pdfjs
        const data = new Uint8Array(fileBuffer);
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        let extractedText = '';

        console.log(`PDF has ${pdf.numPages} pages, using parallel extraction...`);

        // Strategy: Extract pages in parallel batches for speed
        const batchSize = 10;
        const maxPages = Math.min(pdf.numPages, 50);
        let allPages: Array<{ pageNum: number; text: string }> = [];

        // Process pages in batches of 10 for speed
        for (let start = 1; start <= maxPages; start += batchSize) {
          const end = Math.min(start + batchSize - 1, maxPages);
          console.log(`Processing pages ${start}-${end}...`);

          const batchPromises = [];
          for (let pageNum = start; pageNum <= end; pageNum++) {
            batchPromises.push(
              pdf.getPage(pageNum)
                .then(page => page.getTextContent())
                .then(content => ({
                  pageNum,
                  text: content.items.map((item: any) => item.str).join(' ')
                }))
                .catch(() => ({ pageNum, text: '' }))
            );
          }

          const batchResults = await Promise.all(batchPromises);
          allPages.push(...batchResults);

          // Check if we found both criteria in this batch
          const batchText = batchResults.map(p => p.text.toLowerCase()).join(' ');
          const foundInclusion = batchText.includes('inclusion criteria') || batchText.includes('eligibility criteria');
          const foundExclusion = batchText.includes('exclusion criteria');

          if (foundInclusion && foundExclusion) {
            console.log(`Found both criteria sections by page ${end}, processing 2 more batches...`);
            // Get 2 more batches to ensure we have all criteria
            const extraBatches = 2;
            for (let i = 0; i < extraBatches && (end + (i + 1) * batchSize) <= pdf.numPages; i++) {
              const extraStart = end + 1 + (i * batchSize);
              const extraEnd = Math.min(extraStart + batchSize - 1, pdf.numPages);
              const extraPromises = [];

              for (let pageNum = extraStart; pageNum <= extraEnd; pageNum++) {
                extraPromises.push(
                  pdf.getPage(pageNum)
                    .then(page => page.getTextContent())
                    .then(content => ({
                      pageNum,
                      text: content.items.map((item: any) => item.str).join(' ')
                    }))
                    .catch(() => ({ pageNum, text: '' }))
                );
              }

              const extraResults = await Promise.all(extraPromises);
              allPages.push(...extraResults);
            }
            break;
          }
        }

        // Combine all page texts
        extractedText = allPages
          .sort((a, b) => a.pageNum - b.pageNum)
          .map(p => p.text)
          .join('\n\n');

        console.log(`Extracted ${allPages.length} pages in parallel`);


        // Clean up extracted text
        const cleanedText = extractedText
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        console.log(`Text extraction: ${cleanedText.length} characters`);

        // If we got good text, use it
        if (cleanedText.length > 500) {
          documentText = cleanedText;
          console.log('Using directly extracted text');
        } else {
          // Otherwise, fall back to Vision
          console.log('Text extraction insufficient, using GPT-4o Vision...');
          documentText = await extractPDFTextWithVision(fileBuffer, openai);
          console.log(`Vision extraction: ${documentText.length} characters`);
        }

        if (documentText.length < 100) {
          return NextResponse.json(
            { error: 'Could not extract sufficient text from PDF. The document may be empty, corrupted, or contain only images.' },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error('PDF processing error:', error);
        return NextResponse.json(
          { error: 'Failed to process PDF: ' + error.message },
          { status: 500 }
        );
      }
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      documentText = result.value;
    } else if (file.type === 'text/plain') {
      documentText = await file.text();
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
        { status: 400 }
      );
    }

    // Use OpenAI to extract inclusion and exclusion criteria
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing clinical trial protocols and extracting eligibility criteria.

Your task is to carefully read the document and identify ALL inclusion and exclusion criteria. These may be labeled as:
- "Inclusion Criteria" or "Eligibility Criteria" or "Patient Selection Criteria"
- "Exclusion Criteria" or "Exclusionary Criteria"

Look for sections that describe:
- Who CAN participate (inclusion)
- Who CANNOT participate (exclusion)
- Patient requirements, age ranges, diagnoses, medical conditions, prior treatments, etc.

Return your response as a JSON object with this exact format:
{
  "inclusion": ["criterion 1", "criterion 2", ...],
  "exclusion": ["criterion 1", "criterion 2", ...]
}

Each criterion should be a complete, standalone statement. Extract ALL criteria you find, even if there are many. If a section truly has no criteria, use an empty array.`,
        },
        {
          role: 'user',
          content: `Please analyze this clinical trial document and extract ALL inclusion and exclusion criteria:\n\n${documentText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const extractedCriteria = JSON.parse(
      completion.choices[0].message.content || '{}'
    );

    console.log('Extracted criteria:', JSON.stringify(extractedCriteria, null, 2));

    return NextResponse.json({
      success: true,
      fileName: file.name,
      criteria: extractedCriteria,
      documentPreview: documentText.substring(0, 500) + '...',
    });
  } catch (error: any) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process document' },
      { status: 500 }
    );
  }
}
