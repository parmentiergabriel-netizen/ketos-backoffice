import { Head, Html, Main, NextScript } from "next/document";
import { themeBootScript } from "../components/ui/theme";

const favicon =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b7cff"/><stop offset="1" stop-color="#14c4b0"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path fill="#fff" transform="translate(8 6) scale(.75)" d="M6 36c0-9.4 8.6-16 19.5-16C35 20 41 24.6 44 31.5c.6 1.4 2.4 1.8 3.5.8L52 28c1-1 2.7-.1 2.4 1.3l-1 5 .1.4 3.5 3.6c1 1-.1 2.6-1.4 2.1l-5.5-2c-1.5-.5-3 .3-3.6 1.7C43.5 46.4 36 50 27 50 14.6 50 6 44.6 6 36z"/></svg>`
  );

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        <link rel="icon" href={favicon} />
        <meta name="theme-color" content="#04182d" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
