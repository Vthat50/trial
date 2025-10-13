'use client';

import { useState } from 'react';

interface ExtractedCriteria {
  inclusion: string[];
  exclusion: string[];
}

interface ApiResponse {
  success: boolean;
  fileName: string;
  criteria: ExtractedCriteria;
  documentPreview: string;
  error?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-criteria', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing the document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
            Clinical Trial Criteria Extractor
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Upload a clinical trial document to automatically extract inclusion and exclusion criteria
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document (PDF, DOCX, or TXT)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100
                  cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold
                hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Extract Criteria'
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {result.fileName}
              </h2>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Inclusion Criteria
                </h3>
                <ul className="space-y-2 list-decimal list-inside">
                  {result.criteria.inclusion && result.criteria.inclusion.length > 0 ? (
                    result.criteria.inclusion.map((criterion, index) => (
                      <li key={index} className="text-gray-700 leading-relaxed">
                        {criterion}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No inclusion criteria found</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Exclusion Criteria
                </h3>
                <ul className="space-y-2 list-decimal list-inside">
                  {result.criteria.exclusion && result.criteria.exclusion.length > 0 ? (
                    result.criteria.exclusion.map((criterion, index) => (
                      <li key={index} className="text-gray-700 leading-relaxed">
                        {criterion}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No exclusion criteria found</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
