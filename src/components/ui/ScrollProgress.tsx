'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const scaleX = useSpring(0, { stiffness: 200, damping: 30 });

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight > 0) {
        setProgress(scrollTop / docHeight);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    scaleX.set(progress);
  }, [progress, scaleX]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-gray-900 origin-left z-50"
      style={{ scaleX }}
    />
  );
}

export { ScrollProgress };
