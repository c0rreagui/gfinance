/**
 * G-Hub — Root Layout
 * Built with Next.js, TS & Supabase Security (RLS Audited)
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "G-Hub | Command Center",
  description: "Immersive 3D Glassmorphic Command Center (G-Finance & G-Work)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <head>
        {/* Blocking theme-initialization script to prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <script 
          type="module" 
          src="https://unpkg.com/@splinetool/viewer@1.0.27/build/spline-viewer.js"
          async
        ></script>
      </head>
      <body className="h-screen flex overflow-hidden">
        <div className="mesh-gradient"></div>
        <div id="root" className="flex-1 flex overflow-hidden w-full h-full">
          <div className="flex w-full h-full transition-colors duration-500">
            <Suspense fallback={<div className="w-64 bg-slate-950/20 border-r border-slate-800/80 backdrop-blur-xl"></div>}>
              <Sidebar />
            </Suspense>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <div className="flex-1 overflow-hidden">
                {children}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
