import type { AppProps } from "next/app";
import Head from "next/head";
import { AppShell } from "../components/AppShell";
import { AuthProvider } from "../components/AuthProvider";
import { ItemsProvider } from "../components/ItemsProvider";
import { RequireStaff } from "../components/RequireStaff";
import { ToastProvider } from "../components/ui/Toasts";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Ketos — Backoffice</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <AuthProvider>
        <ToastProvider>
          <RequireStaff>
            <ItemsProvider>
              <AppShell>
                <Component {...pageProps} />
              </AppShell>
            </ItemsProvider>
          </RequireStaff>
        </ToastProvider>
      </AuthProvider>
    </>
  );
}
