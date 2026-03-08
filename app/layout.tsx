import type { Metadata } from 'next';
import './globals.css';
import ThemeToggle from './components/ThemeToggle';

export const metadata: Metadata = {
  title: 'JobFinder — AI-Powered Job Matching',
  description:
    'Find top jobs from Indeed, LinkedIn, and Instahyre, matched against your resume using AI. Upload your resume, search across platforms, and discover the best-fit opportunities instantly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
