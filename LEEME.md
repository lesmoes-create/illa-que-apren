# Illa que aprèn · Guía para Carmen

Web del recorrido formativo del CEP de Formentera con Miguel Ángel Tirado.
Todo está hecho para que **no tengas que tocar código**: subes cada archivo con el nombre exacto a la carpeta indicada y aparece solo en la web.

## 1. Publicar la web en GitHub Pages (una sola vez)

1. Entra en GitHub con tu usuario y pulsa **New repository**. Nombre: `illa-que-apren`. Público. Crear.
2. En el repositorio vacío, pulsa **uploading an existing file**.
3. Arrastra **todo el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `LEEME.md`, `.nojekyll` y las carpetas `assets`, `espai` y `recursos`.
4. Pulsa **Commit changes**.
5. Ve a **Settings › Pages**. En *Branch* elige `main` y `/ (root)`. **Save**.
6. En uno o dos minutos la web estará en `https://lesmoes-create.github.io/illa-que-apren/` (si tu usuario de GitHub es otro, cambia `lesmoes-create`).

Para enlazarla o incrustarla en el WordPress del CEP: enlace normal, o un bloque HTML con
`<iframe src="https://lesmoes-create.github.io/illa-que-apren/" style="width:100%;height:90vh;border:0"></iframe>`.

## 2. Dónde va cada cosa

Hay **dos tipos de sesión**:

- **Ponencia de Miguel Ángel Tirado**: presentación, pódcast, resumen y materiales.
- **Formación al centro**: el equipo trabaja con los recursos de Tirado hasta llegar a sus conclusiones y protocolos. No hay audio, ni resumen, ni tarjetas: solo se publica lo que produce el equipo.

Cada formación tiene su carpeta y cada sesión una subcarpeta numerada:

```
recursos/
  353/  (CEIP Mestre Lluís Andreu)
    sessio-01/   29/09/2026  Ponencia
    sessio-02 a sessio-07    Formación al centro
    sessio-08/   16/02/2027  Ponencia
    sessio-09/   23/02/2027  Formación al centro
  354/  (IES Marc Ferrer)
    sessio-01/   28/09/2026  Ponencia
    sessio-02 a sessio-05    Formación al centro
    sessio-06/   15/02/2027  Ponencia (última sesión)
  355/  (CEIP Sant Ferran)
    sessio-01/   28/09/2026  Ponencia
    sessio-02 a sessio-08    Formación al centro
    sessio-09/   15/02/2027  Ponencia
    sessio-10 a sessio-12    Formación al centro
  eina-lectura/              Herramienta de comprensión lectora (v1.1)
```

**Sesiones de ponencia**: usa **exactamente** estos nombres dentro de la carpeta:

| Archivo | Qué es | Cómo aparece en la web |
|---|---|---|
| `presentacio.pdf` | Presentación de la sesión | Botón «Presentació» |
| `podcast.mp3` | Pódcast | Reproductor |
| `resum.txt` | Resumen e ideas clave (texto plano) | Desplegable «Resum i idees clau» |
| `materials.pdf` | Materiales de la ponencia | Botón «Materials i productes» |

**Sesiones de formación al centro**: un solo archivo.

| Archivo | Qué es | Cómo aparece en la web |
|---|---|---|
| `materials.pdf` | Conclusiones, acuerdos y protocolos del equipo | Botón «Conclusions i protocols de l'equip» |

Mientras un archivo no está, la web muestra un recuadro discontinuo «pendent». En cuanto lo subes con el nombre correcto, aparece solo.

**Ejemplo:** la presentación de la primera ponencia del Marc Ferrer va en `recursos/354/sessio-01/presentacio.pdf`.

## 3. Tarjetas de repaso (flashcards)

Se hacen solo con el contenido de las ponencias de Tirado (las sesiones de formación al centro no generan tarjetas). Archivo `recursos/354/targetes.json` (y lo mismo para 355 y 353), con este formato:

```json
[
  {"pregunta": "Texto de la cara delantera", "resposta": "Texto de la cara trasera"},
  {"pregunta": "Otra pregunta", "resposta": "Otra respuesta"}
]
```

Si me pasas las flashcards de NotebookLM, yo te preparo este archivo. Las de la 355 ya están puestas.

## 3b. Test de autoevaluación

Archivo `recursos/354/test.json` (y lo mismo para 355 y 353):

```json
[
  {"pregunta": "Texto de la pregunta", "opcions": ["A", "B", "C", "D"], "correcta": 0, "explicacio": "Por qué es la correcta"}
]
```

`"correcta"` es la posición de la respuesta buena empezando por 0. `"explicacio"` es opcional.

## 3c. Pódcasts y vídeos

Los archivos van en `recursos/355/mitjans/` (o 354, 353) y se listan en `recursos/355/mitjans.json`:

```json
[
  {"titol": "Títol", "tipus": "video", "fitxer": "nom.mp4", "poster": "nom.jpg", "durada": "8 min", "descripcio": "Una frase"},
  {"titol": "Títol", "tipus": "audio", "fitxer": "nom.mp3", "durada": "8 min", "descripcio": "Una frase"}
]
```

Lo más fácil: pásame el audio o el vídeo y te devuelvo el archivo comprimido y el JSON hechos.

## 3d. Mapa conceptual

Archivo `recursos/355/mapa.json`, con la estructura `{"titol": "...", "fills": [{"titol": "...", "nota": "...", "fills": []}]}`.

## 4. Subir o cambiar un archivo más adelante

En GitHub, entra en la carpeta (por ejemplo `recursos/354/sessio-02`), pulsa **Add file › Upload files**, arrastra el archivo con su nombre exacto y **Commit changes**. Para sustituir uno, sube otro con el mismo nombre.

## 5. Antes de subir nada, comprueba

- Las grabaciones completas de las sesiones no se publican (hablan docentes): son de uso interno.
- Fotos y audios: solo con consentimiento de las personas que aparecen o hablan.
- Nunca listas de participantes, hojas de firmas ni datos personales.
- Los audios pesan: GitHub admite archivos de hasta 100 MB. Si un audio pesa más, pásamelo y lo comprimo.
