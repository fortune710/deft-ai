import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Path to the PDF file in the public directory
    const pdfPath = join(process.cwd(), 'public', 'pitch-deck.pdf');
    
    // Read the PDF file
    const pdfBuffer = await readFile(pdfPath) as any;
    
    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="pitch-deck.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json(
      { error: 'Failed to serve PDF' },
      { status: 500 }
    );
  }
}
