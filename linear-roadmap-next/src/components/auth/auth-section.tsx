"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "./user-profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { validateToken } from "@/lib/auth";

// Token key matching the one in auth.ts
const LINEAR_TOKEN_KEY = 'linear_auth_token';

export function AuthSection() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get token directly from localStorage
        const token = localStorage.getItem(LINEAR_TOKEN_KEY);
        
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        // Validate the token
        const result = await validateToken(token);
        
        if (result.valid && result.user) {
          setIsAuthenticated(true);
          setUser(result.user);
        } else {
          // Invalid token, clear it
          localStorage.removeItem(LINEAR_TOKEN_KEY);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // In a loading state, show a skeleton
  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  return (
    <>
      {isAuthenticated && user ? (
        <UserProfile initialUser={user} />
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Log in
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <LoginForm />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 