import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Ascend</span>
        </div>
        {children}
      </div>
    </div>
  );
}
