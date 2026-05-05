"use client";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { NotificationBellWrapper } from "./notification-bell-wrapper";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/chat", label: "Chat" },
    { to: "/profile", label: "Profile" },
    { to: "/files", label: "Files" },
    { to: "/payments", label: "Payments" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-row items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <GraduationCap className="h-8 w-8 text-amber-600" />
            <span className="text-xl font-bold text-gray-900">CampusHub</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                // @ts-expect-error some links aren't existing
                href={to}
                className="text-gray-700 hover:text-amber-600 font-medium transition-colors duration-200 hover:scale-105 transform"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <NotificationBellWrapper />
            <ModeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
