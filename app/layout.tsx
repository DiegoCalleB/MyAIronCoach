import type {Metadata} from 'next';
import { Bebas_Neue, Exo_2, Rajdhani } from 'next/font/google';
import './globals.css'; // Global styles
import { FirebaseProvider } from '../components/FirebaseProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration';

const bebasNeue = Bebas_Neue({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue' 
});

const exo2 = Exo_2({ 
  subsets: ['latin'],
  variable: '--font-exo-2'
});

const rajdhani = Rajdhani({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani'
});

export const metadata: Metadata = {
  title: 'MyAIronCoach',
  description: 'El usuario fotografía su tabla de entrenamiento en papel, la IA (Gemini 2.0 Flash) analiza la imagen y genera automáticamente un plan con temporizador por ejercicio. Freemium.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('fitapp_theme');
                if (savedTheme === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                } else if (savedTheme === 'light-neutral') {
                  document.documentElement.setAttribute('data-theme', 'light-neutral');
                } else {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${bebasNeue.variable} ${exo2.variable} ${rajdhani.variable} antialiased font-rajdhani bg-dark text-text-brand transition-colors duration-300`} suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
