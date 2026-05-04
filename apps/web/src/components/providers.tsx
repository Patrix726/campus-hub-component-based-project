"use client";

import { Toaster } from "@repo/ui/components/sonner";

import { ThemeProvider } from "./theme-provider";
import { RealtimeWrapper } from "./realtime-wrapper";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <RealtimeWrapper>
        {children}
      </RealtimeWrapper>
      <Toaster richColors />
    </ThemeProvider>
  );
}
