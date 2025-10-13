# Clinical Trial Criteria Extractor

A Next.js application that uses OpenAI's GPT-4 to automatically extract inclusion and exclusion criteria from clinical trial documents.

## Features

- Upload documents in PDF, DOCX, or TXT format
- Automatic extraction of inclusion criteria
- Automatic extraction of exclusion criteria
- Beautiful, responsive UI with Tailwind CSS
- Powered by OpenAI GPT-4

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Deployment on Vercel

This project is configured to deploy automatically to Vercel:

1. Push your code to GitHub
2. The project will automatically deploy to Vercel
3. Make sure to add your `OPENAI_API_KEY` to Vercel environment variables:
   - Go to your project settings on Vercel
   - Navigate to Environment Variables
   - Add `OPENAI_API_KEY` with your API key

## Usage

1. Click "Choose File" and select a clinical trial document (PDF, DOCX, or TXT)
2. Click "Extract Criteria"
3. Wait for the AI to process the document
4. View the extracted inclusion and exclusion criteria

## Technology Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4
- **Document Parsing**:
  - PDF: pdf-parse
  - DOCX: mammoth
  - TXT: native

## License

ISC
