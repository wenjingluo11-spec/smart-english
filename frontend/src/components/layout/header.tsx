"use client";

export default function Header() {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">初中 · 七年级</span>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
          U
        </div>
      </div>
    </header>
  );
}
