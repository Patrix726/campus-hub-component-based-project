"use client";

import { Toaster } from "@repo/ui/components/sonner";
import { RealtimeWrapper } from "./realtime-wrapper";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={{ type: "application/json" }}
    >
      <RealtimeWrapper>{children}</RealtimeWrapper>
      <Toaster richColors />
    </ThemeProvider>
  );
}
