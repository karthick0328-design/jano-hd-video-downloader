'use client';

import { useEffect, useState } from 'react';
import { AutoCarousel } from '../components/AutoCarousel';
import { DownloadProgress } from '../components/DownloadProgress';
import { FaqSection } from '../components/FaqSection';
import { FeaturesSection } from '../components/FeaturesSection';
import { HistoryList } from '../components/HistoryList';
import { MediaPreview } from '../components/MediaPreview';
import { QualitySelector } from '../components/QualitySelector';
import { ResolutionTable } from '../components/ResolutionTable';
import { StepsSection } from '../components/StepsSection';
import { UrlInput } from '../components/UrlInput';
import { analyzeUrl, checkJobStatus, triggerDownload } from '../lib/api';
import { HistoryItem, JobStatusResponse, MediaAnalysisResponse } from '../types';

export default function HomePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MediaAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<JobStatusResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hd_download_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const updated = [item, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('hd_download_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('hd_download_history');
    } catch {}
  };

  // Poll active download job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await checkJobStatus(activeJob.jobId);
        setActiveJob(updated);
      } catch (e) {
        // Retry silently
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob]);

  // Handle URL Analysis & Automatic Download Trigger
  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setActiveJob(null);

    try {
      const result = await analyzeUrl(url);
      if (result.success) {
        setAnalysisResult(result);
        const topQuality = result.maxAvailableQuality || '1080p';
        const topFormatId = result.formats && result.formats.length > 0 ? result.formats[0].formatId : undefined;

        // Automatically trigger download job for immediate mobile download
        const res = await triggerDownload(
          result.url,
          topQuality,
          'mp4',
          result.title,
          topFormatId
        );

        if (res.success) {
          const initialJobStatus: JobStatusResponse = {
            success: true,
            jobId: res.jobId,
            status: 'completed',
            progress: 100,
            title: result.title,
            quality: topQuality,
            format: 'mp4',
            downloadUrl: res.downloadUrl || `/api/download/${res.jobId}/file`,
          };
          setActiveJob(initialJobStatus);

          saveHistory({
            id: res.jobId,
            url: result.url,
            platform: result.platform,
            title: result.title,
            thumbnail: result.thumbnail,
            quality: topQuality,
            downloadedAt: new Date().toISOString(),
          });
        } else {
          setActiveJob(null);
          setAnalysisError(res.error || 'Unable to verify or retrieve media stream for this link.');
        }
      } else {
        setActiveJob(null);
        setAnalysisError(result.error || 'Unable to inspect URL. Please verify the link.');
      }
    } catch (err: any) {
      setActiveJob(null);
      setAnalysisError(err.message || 'Failed to connect to analysis service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Manual Quality Selection Download Trigger
  const handleStartDownload = async (selectedQuality: string, selectedFormatId?: string) => {
    if (!analysisResult) return;

    try {
      const res = await triggerDownload(
        analysisResult.url,
        selectedQuality,
        'mp4',
        analysisResult.title,
        selectedFormatId
      );

      if (res.success) {
        const initialJobStatus: JobStatusResponse = {
          success: true,
          jobId: res.jobId,
          status: 'completed',
          progress: 100,
          title: analysisResult.title,
          quality: selectedQuality,
          format: 'mp4',
          downloadUrl: res.downloadUrl || `/api/download/${res.jobId}/file`,
        };
        setActiveJob(initialJobStatus);

        saveHistory({
          id: res.jobId,
          url: analysisResult.url,
          platform: analysisResult.platform,
          title: analysisResult.title,
          thumbnail: analysisResult.thumbnail,
          quality: selectedQuality,
          downloadedAt: new Date().toISOString(),
        });
      } else {
        setActiveJob(null);
        setAnalysisError(res.error || 'Could not queue download job.');
      }
    } catch (err: any) {
      setActiveJob(null);
      setAnalysisError(err.message || 'Failed to trigger download job.');
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setActiveJob(null);
    setAnalysisError(null);
  };

  return (
    <div className="space-y-12 py-4 max-w-7xl mx-auto w-full relative">
      
      {/* Apple Studio Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4 pb-4">
        
        {/* Hero Left Content */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-1 rounded-full">
            <span>Jano HD Studio • Fast & Free</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            Download Videos <br />
            from <span className="gradient-text-blue-purple">Anywhere</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-lg font-normal leading-relaxed">
            High-definition video processing for YouTube, Instagram, Facebook, and ShareChat up to 4K.
          </p>

          {/* Search URL Bar */}
          <UrlInput
            onAnalyze={handleAnalyze}
            isLoading={isAnalyzing}
            error={analysisError}
          />
        </div>

        {/* Hero Right Auto-Swiping Showcase Carousel */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <AutoCarousel />
        </div>

      </div>

      {/* Active Processing / Download States */}
      {activeJob && (
        <div className="max-w-3xl mx-auto">
          <DownloadProgress job={activeJob} onReset={handleReset} />
        </div>
      )}

      {/* Media Analysis Result Preview */}
      {analysisResult && !activeJob && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <MediaPreview data={analysisResult} />
        </div>
      )}

      {/* Lower Section 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-4">
        <StepsSection />
        
        {analysisResult && !activeJob ? (
          <QualitySelector
            formats={analysisResult.formats}
            maxQuality={analysisResult.maxAvailableQuality}
            onDownload={handleStartDownload}
            isDownloading={false}
          />
        ) : (
          <QualitySelector
            formats={[
              { quality: '1080p', height: 1080, format: 'mp4', formatId: '96', hasVideo: true, hasAudio: true, needsMerge: false },
              { quality: '720p', height: 720, format: 'mp4', formatId: '95', hasVideo: true, hasAudio: true, needsMerge: false },
              { quality: '480p', height: 480, format: 'mp4', formatId: '94', hasVideo: true, hasAudio: true, needsMerge: false },
            ]}
            maxQuality="1080p"
            onDownload={() => {}}
            isDownloading={false}
          />
        )}
      </div>

      {/* Recent Downloads History */}
      <HistoryList
        items={history}
        onSelect={handleAnalyze}
        onClear={clearHistory}
      />

      {/* Additional Features & FAQs */}
      <div className="space-y-12 pt-8 border-t border-slate-200">
        <FeaturesSection />
        <ResolutionTable />
        <FaqSection />
      </div>

    </div>
  );
}
