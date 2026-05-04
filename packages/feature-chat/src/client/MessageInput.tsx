"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSend(text);
      setContent("");
    } catch {
      // keep content on failure
    } finally {
      setSending(false);
    }
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setContent(e.target.value);
      if (onTyping) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          onTyping();
        }, 300);
      }
    },
    [onTyping],
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t bg-white">
      <Input
        value={content}
        onChange={handleChange}
        placeholder="Type a message..."
        disabled={disabled || sending}
        className="flex-1"
      />
      <Button type="submit" disabled={!content.trim() || sending || disabled}>
        {sending ? "..." : "Send"}
      </Button>
    </form>
  );
}
