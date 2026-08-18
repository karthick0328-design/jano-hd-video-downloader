import { ChevronDown, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function FaqSection() {
  const faqs = [
    {
      question: 'How do I download YouTube videos in 1080p Full HD with Jano HD?',
      answer:
        'Simply copy the YouTube video link from your browser or app, paste it into the input box above, click "Analyze", select 1080p HD, and click "Download Video". The system automatically fetches and compiles the high-definition video stream.',
    },
    {
      question: 'Can I download Instagram Reels and YouTube Shorts on my phone?',
      answer:
        'Yes! Jano HD is 100% responsive and mobile-optimized. You can use your mobile phone browser (Safari on iOS or Chrome on Android) to paste Instagram Reel or YouTube Short links directly.',
    },
    {
      question: 'Why do some videos max out at 360p or 720p?',
      answer:
        'The available resolutions depend on the highest quality provided by the original creator. Jano HD preserves the authentic source resolutions without fake upscaling, ensuring maximum image fidelity.',
    },
    {
      question: 'Are there any hidden fees or account registration required?',
      answer:
        'No. Jano HD is completely free to use with zero registration, zero subscription fees, and no app installation required.',
    },
    {
      question: 'What video formats are supported for download?',
      answer:
        'All media files are output in standard MP4 (or WebM for native short formats), ensuring complete playback compatibility across iPhones, iPads, Android devices, Mac, and Windows PCs.',
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="w-full my-12 space-y-6 max-w-3xl mx-auto text-center flex flex-col items-center justify-center">
      
      <div className="text-center space-y-2 flex flex-col items-center justify-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2 text-center">
          <HelpCircle className="w-6 h-6 text-indigo-600" /> Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium text-center">
          Everything you need to know about downloading HD media with Jano HD.
        </p>
      </div>

      <div className="space-y-3 w-full">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full px-5 py-4 flex items-center justify-between text-left font-extrabold text-sm text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3 text-left">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
