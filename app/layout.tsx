import type { Metadata } from "next";
import "./globals.css";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "Zenny Sudoku",
  description: "Sudoku carino in verde e giallo pastello",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={quicksand.className}>
        {children}
      </body>
    </html>
  );
}
