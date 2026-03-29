import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { ThemeProvider } from "../components/ThemeProvider";
import "../styles/globals.css";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </ThemeProvider>
    </SessionProvider>
  );
}
