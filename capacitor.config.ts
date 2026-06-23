import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.jtcinterlink",
  appName: "Peacely",
  webDir: "dist",
  server: {
    // Carrega o app diretamente do site publicado.
    // Toda alteração feita no Lovable aparece instantaneamente no celular
    // (basta o usuário reabrir o app — não precisa recompilar o APK).
    url: "https://jtc-interlink.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#000000",
  },
};

export default config;
