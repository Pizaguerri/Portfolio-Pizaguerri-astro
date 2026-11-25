
import PhotoSwipeLightbox from "./photoswipe/photoswipe-lightbox.esm.js";
import PhotoSwipe from "./photoswipe/photoswipe.esm.js";

// =========================================
// 1. ESTADO
// =========================================

let lightbox = null;
let isNavigating = false;

const gallerySelector =
  "#work-gallery-container, #project-gallery-container, #post-gallery";

// En proyectos solo se incluyen las imágenes
// pertenecientes a la vista activa.
const projectImageSelector =
  '[data-pswp-active="true"] a[data-pswp-width]';

// En galerías editoriales se incluyen todos
// los elementos de imagen.
const editorialImageSelector = ".post-gallery-item";

// Evita registrar varias veces los eventos
// sobre una misma imagen de PhotoSwipe.
const protectedImages = new WeakSet();

// =========================================
// 2. DESTRUCCIÓN DE PHOTOSWIPE
// =========================================

function destroyLightbox() {
  if (!lightbox) return;

  lightbox.destroy();
  lightbox = null;
}

// =========================================
// 3. PROTECCIÓN DE IMÁGENES
// =========================================

function protectImage(element) {
  if (!element || protectedImages.has(element)) return;

  protectedImages.add(element);

  element.style.setProperty("-webkit-touch-callout", "none");
  element.style.setProperty("-webkit-user-select", "none");
  element.style.setProperty("user-select", "none");
  element.style.setProperty("-webkit-user-drag", "none");

  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  element.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
}

// =========================================
// 4. INICIALIZACIÓN
// =========================================

function initLightbox() {
  destroyLightbox();

  const gallery = document.querySelector(gallerySelector);

  if (!gallery) return;

  const isProjectGallery =
    gallery.id === "work-gallery-container" ||
    gallery.id === "project-gallery-container";

  const imageSelector = isProjectGallery
    ? projectImageSelector
    : editorialImageSelector;

  const transEl = document.getElementById("lightbox-translations");

  const closeTitle = transEl?.dataset.close || "Tancar";
  const zoomTitle = transEl?.dataset.zoom || "Ampliar";
  const errorMsg = transEl?.dataset.error || "La foto no es pot carregar";

  lightbox = new PhotoSwipeLightbox({
    gallery,
    children: imageSelector,

    showHideAnimationType: "fade",
    bgOpacity: 0.9,
    pswpModule: PhotoSwipe,

    showAnimationDuration: 350,
    hideAnimationDuration: 250,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",

    imageClickAction: "close",
    tapAction: "close",
    bgClickAction: "close",
    pinchClose: "close",
    loop: true,

    padding: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
    },

    allowPanToNext: true,
    closeOnVerticalDrag: false,
    wheelToZoom: false,
    pinchToZoom: false,
    zoomToOpportunityThreshold: 0,

    closeTitle,
    zoomTitle,
    errorMsg,
  });

  // =========================================
  // 5. FLECHAS PERSONALIZADAS
  // =========================================

  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "custom-prev-arrow",
      order: 9,
      isButton: true,
      html: `
        <svg width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      `,
      onClick: () => {
        lightbox?.pswp?.prev();
      },
    });

    lightbox.pswp.ui.registerElement({
      name: "custom-next-arrow",
      order: 9,
      isButton: true,
      html: `
        <svg width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `,
      onClick: () => {
        lightbox?.pswp?.next();
      },
    });
  });

  // =========================================
  // 6. PROTECCIÓN DE IMÁGENES EN PHOTOSWIPE
  // =========================================

  lightbox.on("contentActivate", ({ content }) => {
    if (content.element) {
      protectImage(content.element);
    }
  });

  // =========================================
  // 7. ACTUALIZAR HASH AL CAMBIAR DE IMAGEN
  // =========================================

  lightbox.on("change", () => {
    const target =
      lightbox?.pswp?.currSlide?.data?.element?.dataset?.pswpTarget;

    if (!target) return;

    history.replaceState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}#${target}`
    );
  });

  // =========================================
  // 8. LIMPIAR HASH AL CERRAR
  // =========================================

  lightbox.on("close", () => {
    if (isNavigating) return;

    history.replaceState(
      "",
      document.title,
      `${window.location.pathname}${window.location.search}`
    );
  });

  // =========================================
  // 9. INICIAR PHOTOSWIPE
  // =========================================

  lightbox.init();

  // =========================================
  // 10. ABRIR IMAGEN INDICADA EN LA URL
  // =========================================

  const hash = window.location.hash.substring(1);

  if (hash.length > 1) {
    const items = gallery.querySelectorAll(imageSelector);

    for (let index = 0; index < items.length; index++) {
      if (items[index].dataset.pswpTarget === hash) {
        lightbox.loadAndOpen(index, { gallery });
        break;
      }
    }
  }
}

// =========================================
// 11. CICLO DE VIDA DE ASTRO
// =========================================

document.addEventListener("astro:before-swap", () => {
  isNavigating = true;
  destroyLightbox();
});

document.addEventListener("astro:page-load", () => {
  isNavigating = false;
  initLightbox();
});
