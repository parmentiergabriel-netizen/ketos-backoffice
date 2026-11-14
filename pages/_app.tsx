import type { AppProps } from "next/app";
import { AuthProvider } from "../components/AuthProvider";
import { RequireStaff } from "../components/RequireStaff";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <RequireStaff>
        <Component {...pageProps} />
      </RequireStaff>
    </AuthProvider>
  );
}
