# Panel de administrador (Firebase) y subida a IONOS

El panel está en **`admin.html`** (por ejemplo `https://tu-dominio.com/admin.html`).
El admin entra con su correo y su contraseña. Lo que cambie se guarda en Firebase y la web lo muestra al momento.

Se usa el **plan gratis de Firebase (Spark)**, que no pide tarjeta. Las fotos que subas se guardan dentro de la propia base de datos.

---

## Parte 1 · Crear Firebase (una sola vez, unos 10 minutos)

### 1. Crear el proyecto
1. Entra en <https://console.firebase.google.com> con tu cuenta de Google.
2. Pulsa **Crear un proyecto**, ponle de nombre `mendoza-automocion` y continúa.
3. Google Analytics no hace falta, así que puedes desactivarlo. Pulsa **Crear proyecto**.

### 2. Activar el acceso con correo y contraseña
1. En el menú izquierdo: **Compilación → Authentication → Comenzar**.
2. En **Método de acceso**, elige **Correo electrónico/contraseña**, actívalo y guarda.
3. Ve a la pestaña **Usuarios → Agregar usuario**. Escribe el **correo y la contraseña del admin**.
4. Para que nadie más pueda crearse una cuenta, ve a **Configuración → Acciones del usuario** y desmarca **Habilitar creación (registro)**.

### 3. Crear la base de datos
1. En el menú izquierdo: **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: **europe-west1 (Bélgica)** o **eur3 (Europa)**.
3. Elige **Iniciar en modo de producción** y pulsa **Crear**.
4. Entra en la pestaña **Reglas** y borra lo que haya. Pega **todo** el archivo **`firebase/firestore.rules`**, pero antes cambia `correo-del-admin@gmail.com` por el correo del paso 2. Pulsa **Publicar**.

### 4. Conectar la web con Firebase
1. Pulsa el engranaje ⚙ (arriba a la izquierda), entra en **Configuración del proyecto** y baja hasta **Tus apps**.
2. Pulsa el icono **`</>`** (Web), ponle de nombre `web` y pulsa **Registrar app**. No hace falta Hosting.
3. Te saldrá un bloque de código. Copia de ahí solo `apiKey` y `projectId`, y pégalos al final de **`js/config.js`**:

```js
firebase: {
  apiKey: "AIzaSy...",
  projectId: "mendoza-automocion"
}
```

La `apiKey` de Firebase es pública y no pasa nada porque se vea en la web. La seguridad la ponen las reglas del paso 3.

### 5. Primera entrada al panel
1. Abre `admin.html` y entra con el correo y la contraseña del admin.
2. Te saldrá el aviso **«La base de datos está vacía»**. Pulsa **Importar datos actuales**. Así se copian los 21 vehículos, los 15 vendidos, los datos del negocio y el horario. Solo se hace una vez.
3. A partir de aquí todo se cambia desde el panel.

---

## Parte 2 · Subir la web a tu dominio de IONOS

1. Entra en <https://my.ionos.es>, ve a **Hosting** y abre **Webspace** (*Explorador de webspace*).
2. Entra en la carpeta de la web (normalmente la principal, `/`). **Haz una copia** de lo que haya: descárgalo o muévelo a una carpeta `antigua`. Después **borra** los archivos viejos.
3. Descomprime **`mendoza-automocion-web.zip`** en tu ordenador. Sube **todo su contenido** (no la carpeta, lo de dentro) a esa carpeta de IONOS: `index.html`, `admin.html`, `css/`, `js/`, `img/`…
   - Si son muchos archivos, es más cómodo con **FileZilla** por SFTP. Los datos de acceso están en IONOS, en **Hosting → SFTP y SSH**.
4. En **Dominios y SSL**, comprueba que el dominio apunta a ese webspace y que el **certificado SSL** (https) está activado.
5. Abre `https://tu-dominio.com` y `https://tu-dominio.com/admin.html`.

Si el dominio ahora apunta a otro servidor (la web actual usa un servidor aparte para el stock), en **Dominios → Uso del dominio** cámbialo a **Webspace**.

---

## Qué se puede hacer desde el panel

| Pestaña | Qué hace |
|---|---|
| **Vehículos** | Añadir, editar y borrar coches y motos. Fotos (se reducen solas), orden de las fotos, precio, km, CV, garantía, descripción y equipamiento. Subir o bajar un coche en la lista y marcarlo como **Vendido**. |
| **Vendidos** | La cinta de vendidos. Se pueden editar, añadir a mano o devolver al stock. |
| **Datos y horario** | Teléfono/WhatsApp, correo, dirección, redes, total de vendidos y horario de cada día. |
| **Textos** | Todos los textos. `*así*` sale en rojo/cursiva, `**así**` en negrita y `{vendidos}` pone el número de vendidos. |
| **Fotos de la web** | Portada, Servicios, MD Auto Broker, Sobre nosotros y el fondo del final. |

Desde el menú del usuario (arriba a la derecha) se puede cambiar la contraseña.

## Cosas que conviene saber

- **Si Firebase no responde**, la web no se rompe: muestra los datos de `js/vehicles.js` y `js/config.js`.
- **Límites del plan gratis:** caben unos **1 GB de datos**, que son miles de fotos, y se pueden servir unos **10 GB al mes**. Una visita normal gasta alrededor de 1 MB, así que da para unas 10.000 visitas al mes. Si algún día se queda corto, se activa el plan Blaze y la web sigue igual.
- **Formato de las fotos:** las del iPhone en formato HEIC a veces no se pueden leer. Si una no sube, cámbiala a JPG o en el iPhone ve a *Ajustes → Cámara → Formatos → Más compatible*.
- **Otro administrador:** añade su correo a la lista de `firestore.rules` (separado por coma), publica las reglas y créale el usuario en Authentication.
