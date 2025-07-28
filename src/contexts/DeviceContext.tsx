"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceContextValue {
  device: DeviceType;
  width: number;
}

const DeviceContext = createContext<DeviceContextValue>({
  device: 'desktop',
  width: 1200,
});

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [width, setWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    setWidth(window.innerWidth);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (width < 768) setDevice('mobile');
    else if (width < 1024) setDevice('tablet');
    else setDevice('desktop');
  }, [width]);

  return (
    <DeviceContext.Provider value={{ device, width }}>
      {children}
    </DeviceContext.Provider>
  );
};
