# Pablo Izaguerri — Photography & Visual Anthropology

Portfolio fotográfico, proyectos de antropología visual y espacio de escritura personal. Un sitio web independiente construido con Astro para publicar fotografía documental, proyectos visuales y textos sin depender de plataformas comerciales.

**Web:** [pabloizaguerri.org](https://pabloizaguerri.org)

---

## Sobre el proyecto

Este proyecto nace de la voluntad de disponer de un espacio propio en internet para mostrar mi trabajo fotográfico y compartir reflexiones sobre imagen, territorio, identidad y cultura visual.

Frente a la dependencia de plataformas como Instagram, el objetivo es construir una presencia digital autónoma, personalizable y duradera, donde las fotografías y los textos puedan presentarse en su propio contexto.

El sitio funciona como portfolio, archivo de proyectos y blog, con contenidos en catalán, español e inglés.

## Objetivos

- **Autonomía digital:** mantener un espacio propio, independiente de las plataformas comerciales.
- **Portfolio fotográfico:** presentar proyectos de fotografía documental y antropología visual.
- **Archivo y escritura:** publicar textos, investigaciones y reflexiones en el blog.
- **Multilingüismo:** ofrecer contenidos en catalán, español e inglés.
- **Sostenibilidad:** utilizar tecnologías estáticas, ligeras y de bajo coste de mantenimiento.

## Tecnologías

- [Astro](https://astro.build/) — generador de sitios web.
- [Sass](https://sass-lang.com/) — preprocesador CSS.
- JavaScript — interacciones y funcionalidades del sitio.
- Markdown — gestión de proyectos, artículos y contenidos editoriales.
- [PhotoSwipe](https://photoswipe.com/) — visualización de imágenes.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) — infraestructura prevista para el despliegue.
- [GitHub](https://github.com/) — control de versiones y repositorio del proyecto.
- [Obsidian](https://obsidian.md/) — herramienta de escritura y organización de contenidos.

## Estructura del proyecto

```text
Astro-Portfolio-Pizaguerri/
├── public/
│   ├── fonts/                 # Tipografías
│   ├── images/                # Imágenes generales
│   ├── favicon.*              # Iconos del sitio
│   └── profilepic.svg
│
├── src/
│   ├── assets/                # Recursos procesados por Astro
│   │
│   ├── components/            # Componentes reutilizables
│   │
│   ├── content/
│   │   ├── about/             # Biografía y CV
│   │   ├── blog/              # Artículos y sus imágenes
│   │   ├── projects/          # Proyectos y sus imágenes
│   │   └── selected/          # Selección de fotografías
│   │
│   ├── i18n/                  # Traducciones y utilidades lingüísticas
│   │
│   ├── layouts/               # Estructuras generales de página
│   ├── pages/                 # Rutas y páginas Astro
│   ├── scripts/               # JavaScript y galerías
│   ├── styles/                # Estilos SCSS y CSS
│   └── utils/                 # Funciones auxiliares
│
├── astro.config.mjs           # Configuración de Astro
├── package.json               # Dependencias y scripts
├── package-lock.json          # Versiones bloqueadas
├── tsconfig.json
├── wrangler.jsonc             # Configuración de Cloudflare
└── README.md
```

## Desarrollo local

### Requisitos

- Node.js 22.23.4 o superior.
- npm.

### Instalación

Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd Astro-Portfolio-Pizaguerri
```

Instalar las dependencias:

```bash
npm ci
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Astro estará disponible normalmente en:

```text
http://localhost:4321
```

### Compilación

Generar la versión de producción:

```bash
npm run build
```

Los archivos generados se guardan en `dist/`.

Para previsualizar la compilación:

```bash
npm run preview
```

## Gestión de contenidos

El contenido se organiza mediante colecciones de Astro y archivos Markdown.

### Proyectos

Los proyectos se almacenan en:

```text
src/content/projects/
```

Cada proyecto tiene su propio directorio, donde se guardan los archivos Markdown y las fotografías correspondientes.

### Blog

Los artículos se almacenan en:

```text
src/content/blog/
```

Cada entrada tiene su directorio propio, con los archivos Markdown por idioma y sus imágenes.

### Biografía y CV

Los contenidos biográficos se encuentran en:

```text
src/content/about/
```

Incluyen las versiones lingüísticas de la biografía y la información curricular.

### Selected

La selección de fotografías se gestiona en:

```text
src/content/selected/
```

Los textos están organizados por idioma y las imágenes se almacenan junto a ellos.

### Idiomas

El sitio trabaja con tres idiomas:

- Catalán (`ca`)
- Español (`es`)
- Inglés (`en`)

Las traducciones de la interfaz se gestionan en `src/i18n/`, mientras que los contenidos editoriales utilizan archivos Markdown específicos para cada idioma.

## Despliegue

El proyecto está previsto para desplegarse en **Cloudflare Workers mediante Static Assets**.

El proceso de publicación utilizará:

- GitHub como repositorio de código.
- Wrangler para gestionar los despliegues.
- Astro para generar los archivos estáticos en `dist/`.
- Cloudflare para servir el sitio bajo el dominio propio.

La configuración y el procedimiento de despliegue se documentarán una vez completada la integración con Cloudflare.

## Derechos de autor

Las fotografías, textos y demás contenidos originales de este sitio son propiedad de Pablo Izaguerri, salvo que se indique expresamente lo contrario.

Su reproducción, distribución o utilización requiere autorización previa.

Las herramientas y dependencias de terceros conservan sus respectivas licencias.

---

© Pablo Izaguerri