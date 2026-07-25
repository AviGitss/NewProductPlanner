import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "MfgPlan — Manufacturing Line Planning Platform",
  description: "Plan, score, and visualize manufacturing lines for new components.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppChrome sidebar={<Sidebar />}>{children}</AppChrome>
      </body>
    </html>
  );
}
