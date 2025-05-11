"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { validateToken, saveAuthTokenClient } from "@/lib/auth";
import { saveAuthToken } from "@/lib/auth-actions";

export function LoginForm() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError("Please enter a Linear API token");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await validateToken(token);
      
      if (result.valid) {
        // Save the token on the server and client
        try {
          await saveAuthToken(token);
        } catch (err) {
          console.error("Error saving token on server:", err);
          // Continue anyway since we have client-side storage
        }

        // Always save to localStorage for client-side access
        saveAuthTokenClient(token);
        
        // Refresh the page to update auth state
        window.location.reload();
      } else {
        setError(result.error || "Invalid Linear API token");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Linear Authentication</h2>
        <p className="text-muted-foreground mt-2">
          Enter your Linear API token to connect your account
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Linear API Token</Label>
          <Input
            id="token"
            type="password"
            placeholder="lin_api_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isLoading}
            className="w-full"
          />
          {error && (
            <p className="text-sm text-destructive mt-1">{error}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            You can generate a Personal API token in Linear under Settings → API
          </p>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Validating..." : "Login"}
        </Button>
      </form>
    </Card>
  );
} 