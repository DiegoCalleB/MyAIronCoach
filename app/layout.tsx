import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { FirebaseProvider } from '../components/FirebaseProvider';

export const metadata: Metadata = {
  title: 'MyAIronCoach',
  description: 'El usuario fotografía su tabla de entrenamiento en papel, la IA (Gemini 2.0 Flash) analiza la imagen y genera automáticamente un plan con temporizador por ejercicio. Freemium.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
