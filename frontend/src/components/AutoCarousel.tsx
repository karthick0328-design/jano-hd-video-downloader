'use client';

import React from 'react';

export function AutoCarousel() {
  const slides = [
    { id: 1, image: '/images/coverflow_1.jpg' },
    { id: 2, image: '/images/coverflow_2.jpg' },
    { id: 3, image: '/images/coverflow_3.jpg' },
    { id: 4, image: '/images/coverflow_4.jpg' },
    { id: 5, image: '/images/coverflow_5.jpg' },
  ];

  // Double the slides array for smooth continuous infinite loop
  const streamSlides = [...slides, ...slides];

  return (
    <div className="w-full overflow-hidden py-3 sm:py-6 relative rounded-2xl sm:rounded-[2.5rem]">
      
      {/* Subtle Soft Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />

      {/* Responsive Studio Streaming Showcase Track (Mobile Phone & Desktop Compatible) */}
      <div className="animate-marquee-stream flex items-center space-x-3.5 sm:space-x-6">
        {streamSlides.map((slide, index) => (
          <div
            key={`${slide.id}-${index}`}
            className="w-[260px] sm:w-[460px] aspect-[4/3] rounded-xl sm:rounded-[2rem] overflow-hidden border border-slate-200/80 bg-white shadow-md hover:shadow-xl transition-all duration-300 flex-shrink-0 cursor-pointer group"
          >
            <img
              src={slide.image}
              alt="3D Media Showcase"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            />
          </div>
        ))}
      </div>

    </div>
  );
}
