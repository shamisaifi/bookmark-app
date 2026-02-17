"use client";

import SignOutButton from "./signOutButton";

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">
          Bookmark Manager
        </h1>
        <SignOutButton />
      </div>
    </header>
  );
}
