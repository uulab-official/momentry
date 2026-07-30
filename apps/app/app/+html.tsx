import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>모멘트리</title>
        <meta name="description" content="로그인 없이 일기, 영화, 책의 소중한 순간을 기기에 기록하는 개인 기억 보관함" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="모멘트리" />
        <meta property="og:description" content="일기, 영화, 책의 소중한 순간을 간직하는 개인 기억 보관함" />
        <meta property="og:image" content="/favicon.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="모멘트리" />
        <meta name="twitter:description" content="일기, 영화, 책의 소중한 순간을 간직하는 개인 기억 보관함" />
        <meta name="twitter:image" content="/favicon.png" />
        <link rel="icon" href="/favicon.png" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Match the app's light-only canvas before React mounts. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #F7F8F7;
  color-scheme: light;
}`;
