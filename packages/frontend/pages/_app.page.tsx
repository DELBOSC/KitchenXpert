import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import '../src/styles/globals.css';

// Dynamically import App with SSR disabled since it uses BrowserRouter
const App = dynamic(() => import('../src/App'), { ssr: false });

export default function MyApp({ Component, pageProps }: AppProps) {
  return <App />;
}
