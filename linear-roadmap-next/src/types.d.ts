// Override Next.js internal types to fix build-time typing issues
import type { ReactNode } from 'react';

declare module 'next' {
  export interface PageProps {
    params?: Record<string, string>;
    searchParams?: Record<string, string | string[] | undefined>;
    children?: ReactNode;
  }
  
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: any;
  }
  
  export interface NextConfig {
    reactStrictMode?: boolean;
    experimental?: Record<string, any>;
    [key: string]: any;
  }
}

// Force TypeScript to reload configuration
export {}; 