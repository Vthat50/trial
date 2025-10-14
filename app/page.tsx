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

interface ScriptResponse {
  success: boolean;
  script: string;
  error?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [script, setScript] = useState<string>('');
  const [editedScript, setEditedScript] = useState<string>('');
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [agentId, setAgentId] = useState<string>('');
  const [agentUrl, setAgentUrl] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<string>('');
  const [initiatingCall, setInitiatingCall] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('');
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
      setScript('');
      setEditedScript('');
    }
  };

  const handleGenerateScript = async () => {
    if (!result) return;

    setGeneratingScript(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inclusion: result.criteria.inclusion,
          exclusion: result.criteria.exclusion,
          studyName: result.fileName.replace(/\.(pdf|docx|txt)$/i, ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate script');
      }

      setScript(data.script);
      setEditedScript(data.script);
    } catch (err: any) {
      setError(err.message || 'Failed to generate pre-screening script');
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleCreateVoiceAgent = async () => {
    if (!editedScript || !result) return;

    setCreatingAgent(true);
    setError(null);

    try {
      const response = await fetch('/api/create-voice-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: editedScript,
          studyName: result.fileName.replace(/\.(pdf|docx|txt)$/i, ''),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create voice agent');
      }

      setAgentId(data.agentId);
      setAgentUrl(data.agentUrl);
      alert(`Voice agent created successfully! Agent ID: ${data.agentId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create voice agent');
    } finally {
      setCreatingAgent(false);
    }
  };

  const handleInitiateCall = async () => {
    if (!agentId || !phoneNumber) {
      setError('Please create a voice agent first and enter a phone number');
      return;
    }

    setInitiatingCall(true);
    setError(null);
    setCallStatus('');

    try {
      const response = await fetch('/api/initiate-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: agentId,
          phoneNumber: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setCallStatus(`Call initiated successfully! Conversation ID: ${data.conversationId}`);
      alert(data.message);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate call');
    } finally {
      setInitiatingCall(false);
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

              <div className="mb-8">
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

              <div className="border-t pt-6">
                <button
                  onClick={handleGenerateScript}
                  disabled={generatingScript}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold
                    hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                    transition duration-200"
                >
                  {generatingScript ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Pre-Screening Script...
                    </span>
                  ) : (
                    'Generate Pre-Screening Script'
                  )}
                </button>
              </div>
            </div>
          )}

          {script && (
            <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Pre-Screening Phone Script
              </h2>
              <p className="text-gray-600 mb-6">
                Edit the script below and save when ready. This script includes plain language translations and Pass/Fail/Unknown branching logic.
              </p>

              <textarea
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                rows={Math.max(20, editedScript.split('\n').length + 2)}
                className="w-full p-4 border border-gray-300 rounded-lg font-mono text-sm
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Pre-screening script will appear here..."
              />

              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(editedScript);
                    alert('Script copied to clipboard!');
                  }}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold
                    hover:bg-indigo-700 transition duration-200"
                >
                  Copy Script
                </button>
                <button
                  onClick={() => setEditedScript(script)}
                  className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold
                    hover:bg-gray-700 transition duration-200"
                >
                  Reset to Original
                </button>
              </div>

              <div className="mt-4 border-t pt-4">
                <button
                  onClick={handleCreateVoiceAgent}
                  disabled={creatingAgent}
                  className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold
                    hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                    transition duration-200"
                >
                  {creatingAgent ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Voice Agent...
                    </span>
                  ) : (
                    'Send to ElevenLabs Voice Agent'
                  )}
                </button>
                {agentId && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-semibold mb-2">Voice Agent Created!</p>
                    <p className="text-gray-700 text-sm mb-2">Agent ID: {agentId}</p>
                    <a
                      href={agentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline text-sm"
                    >
                      View Agent in ElevenLabs Dashboard →
                    </a>

                    <div className="mt-6 pt-6 border-t border-green-200">
                      <p className="text-gray-900 font-semibold mb-4">Initiate Pre-Screening Call</p>
                      <p className="text-sm text-gray-600 mb-4">
                        Calling from: +1 650 376 7509 (Your Twilio number)
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Phone Number
                          </label>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1234567890"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg
                              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">The number to call for pre-screening</p>
                        </div>

                        <button
                          onClick={handleInitiateCall}
                          disabled={initiatingCall || !phoneNumber}
                          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold
                            hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                            transition duration-200"
                        >
                          {initiatingCall ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Initiating Call...
                            </span>
                          ) : (
                            'Call Now'
                          )}
                        </button>

                        {callStatus && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-blue-800 text-sm">{callStatus}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
