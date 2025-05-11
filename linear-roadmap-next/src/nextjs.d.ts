// Fix for Next.js App Router type checking issues

// Augment the Next.js namespace
declare namespace NextJS {
  // Define common page component props
  interface PageProps {
    params?: Record<string, string>;
    searchParams?: Record<string, string | string[] | undefined>;
  }
  
  // Define props for dynamic route segments
  interface DynamicRouteProps<T = Record<string, string>> {
    params: T;
    searchParams?: Record<string, string | string[] | undefined>;
  }
}

// Ensure TypeScript doesn't complain about JSX.Element
declare global {
  namespace JSX {
    // Keep the Element interface minimal but valid
    interface Element {
      readonly type: unknown;
    }
  }
}

// Augment the module system
declare module "next" {
  // Ensure the PageProps interface accepts our props
  export interface PageProps {
    params?: Record<string, string>;
    searchParams?: Record<string, string | string[] | undefined>;
  }
} 