"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
  Bell,
  Calendar,
  CheckCircle,
  FileText,
  GraduationCap,
  MessageSquare,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50 relative overflow-x-hidden">
      {/* Floating Blobs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-amber-200 rounded-full opacity-20 animate-pulse"></div>
      <div
        className="absolute top-40 right-20 w-48 h-48 bg-orange-200 rounded-full opacity-15 animate-bounce"
        style={{ animationDuration: "3s" }}
      ></div>
      <div
        className="absolute bottom-20 left-1/4 w-56 h-56 bg-yellow-200 rounded-full opacity-10 animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute bottom-40 right-10 w-40 h-40 bg-amber-300 rounded-full opacity-20 animate-bounce"
        style={{ animationDuration: "4s" }}
      ></div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="mx-auto max-w-4xl bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-amber-100">
          <GraduationCap className="mx-auto mb-6 h-20 w-20 text-amber-600" />
          <h1 className="mb-6 text-5xl font-bold text-gray-900 leading-tight">
            Welcome to <span className="text-amber-600">CampusHub</span>
          </h1>
          <p className="mb-8 text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
            Your centralized platform for student interactions, academic
            management, and campus services. Connect with peers, manage your
            schedule, share resources, and stay updated on campus life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button
                size="lg"
                className="px-8 py-4 text-lg bg-amber-600 hover:bg-amber-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg border-amber-600 text-amber-600 hover:bg-amber-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything You Need for Campus Life
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            CampusHub brings together all the tools and features to enhance your
            academic and social experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <Users className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              User Profiles
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Create and customize your profile, connect with classmates, and
              build your campus network.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <MessageSquare className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              Posts & Feed
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Share updates, announcements, and engage with the community
              through our dynamic feed.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <Calendar className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              Events & Calendar
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Stay organized with campus events, deadlines, and personal tasks
              in one unified calendar.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <MessageSquare className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              Real-time Chat
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Communicate instantly with private messages and group
              conversations.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <Bell className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              Notifications
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Never miss important updates with our comprehensive notification
              system.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <FileText className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              File Sharing
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Share documents, notes, and resources securely with your peers and
              instructors.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <Search className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              Smart Search
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Find users, posts, events, and content quickly with our powerful
              search functionality.
            </p>
          </Card>

          <Card className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl border-amber-100 hover:border-amber-300 bg-white/90 backdrop-blur-sm group">
            <CheckCircle className="h-14 w-14 text-amber-600 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">
              Task Management
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Organize your assignments, projects, and personal tasks with
              deadlines and progress tracking.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-linear-to-r from-amber-600 to-orange-600 text-white py-20 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-2xl mx-auto border border-white/20">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your Campus Experience?
            </h2>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
              Join thousands of students already using CampusHub to stay
              connected and organized.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                variant="secondary"
                className="px-10 py-4 text-lg bg-white text-amber-600 hover:bg-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Join CampusHub Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-linear-to-r from-gray-900 to-gray-800 text-white py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <GraduationCap className="h-10 w-10 text-amber-400 mr-3" />
            <span className="text-2xl font-bold">CampusHub</span>
          </div>
          <p className="text-gray-400 text-lg">
            © 2024 CampusHub. Empowering student connections and academic
            success.
          </p>
        </div>
      </footer>
    </div>
  );
}

