# Guia para generar APK con EAS (Expo / React Native)

## 1. Instalar EAS CLI

```bash
npm install -g eas-cli
```

---

## 2. Iniciar sesión en Expo

```bash
eas login
```

---

## 3. Configurar EAS en el proyecto

Ejecutar en la raíz del proyecto:

```bash
eas build:configure
```

Esto creará el archivo:

```
eas.json
```

---

## 4. Configurar build para generar APK

Editar `eas.json`:

```json
{
  "cli": {
    "version": ">= 18.0.5",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 5. Generar la build APK

```bash
eas build --platform android --profile preview
```

---

## 6. Descargar el APK

Al finalizar, EAS mostrará un link como:

```
https://expo.dev/artifacts/xxxxxxxx.apk
```

Descargar y probar en el dispositivo.

---

## 7. (Opcional) Build para producción (AAB - Play Store)

```bash
eas build --platform android --profile production
```

Este genera un archivo:

```
.aab
```

Para subir a Google Play.

---

## 8. Build para iOS

Pendiente / Próximamente
(Requiere cuenta de Apple Developer)