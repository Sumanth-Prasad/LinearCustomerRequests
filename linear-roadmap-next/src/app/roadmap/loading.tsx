import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoadmapLoading() {
  // Create a skeleton layout that matches our Kanban view
  return (
    <main className="p-4 md:p-8">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
        </div>
        
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Kanban board skeleton - horizontal layout */}
      <div className="flex overflow-x-auto pb-6 gap-6">
        {/* Generate 4 columns */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="min-w-[300px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <div className="ml-auto">
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Generate 3-5 cards per column */}
              {[...Array(3 + Math.floor(Math.random() * 3))].map((_, j) => (
                <Card key={j} className="p-4">
                  <Skeleton className="h-5 w-full mb-3" />
                  <div className="flex items-center mt-3">
                    <Skeleton className="h-5 w-5 rounded-full mr-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Floating action button skeleton */}
      <div className="fixed bottom-6 right-6">
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </main>
  );
}
