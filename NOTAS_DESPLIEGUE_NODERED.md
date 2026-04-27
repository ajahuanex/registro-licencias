# NOTA IMPORTANTE: Error de Mixed Content (HTTPS vs HTTP) en Node-RED

## El Problema
Al subir el frontend al servidor remoto con el dominio seguro `https://lic.transportespuno.gob.pe`, el navegador web (Chrome, Edge, etc.) aplicará una regla de seguridad inquebrantable llamada **Mixed Content (Contenido Mixto)**.

Esta regla **bloquea cualquier petición HTTP (insegura)** que se intente hacer desde una página que haya cargado por **HTTPS (segura)**. 

Dado que el servidor de firmas de Node-RED está alojado en `http://casillas.transportespuno.gob.pe:1880/api/v2` (sin certificado SSL), el navegador corta inmediatamente la conexión por seguridad antes de siquiera llegar al servidor. **Esto no se puede evadir con código en Angular.**

---

## Soluciones Posibles (A nivel de infraestructura)

Para solucionar esto, el tráfico hacia Node-RED debe ir cifrado por HTTPS. Hay dos métodos recomendados:

### Opción 1: Certificado SSL Directo en Node-RED (Recomendado)
Consiste en proteger el servidor donde está instalado Node-RED.
1. Instala o configura **Nginx Proxy Manager** en el servidor de Node-RED (`casillas.transportespuno.gob.pe`).
2. Crea un **Proxy Host** apuntando al puerto `1880`.
3. Genérale un certificado **Let's Encrypt** gratuito.
4. **En el código de Angular (`casilla.service.ts`)**: Cambiaríamos la URL a `https://casillas.transportespuno.gob.pe/api/v2` (Desaparece el puerto 1880 y se agrega la 's' a HTTP).

### Opción 2: Proxy Inverso desde el Frontend
Consiste en hacer que el mismo servidor que aloja `lic.transportespuno.gob.pe` haga de "puente" hacia Node-RED.
1. Entrar al Nginx del servidor del proyecto Angular (`lic.transportespuno.gob.pe`).
2. Añadir un bloque de localización (`location /api-firmas { proxy_pass http://casillas.transportespuno.gob.pe:1880; }`).
3. **En el código de Angular (`casilla.service.ts`)**: Cambiaríamos la URL a `https://lic.transportespuno.gob.pe/api-firmas/api/v2`.
De esta manera, el navegador envía la petición al sitio seguro, y el propio servidor internamente consulta al Node-RED en el puerto 1880.

---
*Documento generado automáticamente para referencia futura del equipo de despliegue y DevOps.*
