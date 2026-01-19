"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout

export function SessionTimeout() {
  const router = useRouter();
  const { addToast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // Update last activity on user interaction
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen to user activity events
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, true);
    });

    // Check session expiration periodically
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          // Session expired or invalid
          handleLogout();
          return;
        }

        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= SESSION_TIMEOUT) {
          // User inactive for 30 minutes
          handleLogout();
          return;
        }

        // Show warning if 5 minutes remaining
        const timeRemaining = SESSION_TIMEOUT - timeSinceLastActivity;
        if (timeRemaining <= WARNING_TIME && timeRemaining > WARNING_TIME - 60000) {
          // Show warning only once per minute
          const minutesRemaining = Math.ceil(timeRemaining / 60000);
          addToast({
            type: "warning",
            title: "Session Expiring Soon",
            message: `Your session will expire in ${minutesRemaining} minute${minutesRemaining > 1 ? "s" : ""}. Please save your work.`,
          });
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    // Check session every minute
    const sessionCheckInterval = setInterval(checkSession, 60000);
    
    // Initial check
    checkSession();

    // Handle browser close/tab close
    const handleBeforeUnload = () => {
      // Clear session on browser close
      fetch("/api/auth/logout", {
        method: "POST",
        keepalive: true, // Ensure request completes even if page is closing
      }).catch(() => {
        // Ignore errors during page unload
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity, true);
      });
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(sessionCheckInterval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [router, addToast]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      addToast({
        type: "warning",
        title: "Session Expired",
        message: "Your session has expired due to inactivity. Please login again.",
      });
      
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error during logout:", error);
      router.push("/login");
      router.refresh();
    }
  };

  return null; // This component doesn't render anything
}
