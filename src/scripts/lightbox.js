import PhotoSwipeLightbox from "./photoswipe/photoswipe-lightbox.esm.js";
import PhotoSwipe from "./photoswipe/photoswipe.esm.js";

let lightbox = null;

function initLightbox() {
  if (lightbox) {
    lightbox.destroy();
    lightbox = null;
  }

  // Busca el contenedor de proyectos o el de selected
  const gallery = document.querySelector("#project-gallery-container, #post-gallery");
  if (!gallery) return;

  const transEl = document.getElementById('lightbox-translations');
  const closeTitle = transEl?.dataset.close || 'Tancar';
  const zoomTitle = transEl?.dataset.zoom || 'Ampliar';
  const errorMsg = transEl?.dataset.error || 'La foto no es pot carregar';

  lightbox = new PhotoSwipeLightbox({
    gallery: gallery,
    // Añadimos .grid-item para detectar las imágenes de selected
    children: '.slider-item, .post-gallery-item, .grid-item',
    
    showHideAnimationType: "fade",
    bgOpacity: 0.9,
    pswpModule: PhotoSwipe,

    showAnimationDuration: 350,
    hideAnimationDuration: 250,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',

    imageClickAction: "close",
    tapAction: "close",
    bgClickAction: "close",
    pinchClose: "close",
    loop: true,

    padding: { top: 40, bottom: 40, left: 40, right: 40 },
    allowPanToNext: true,
    closeOnVerticalDrag: false,
    wheelToZoom: false,
    pinchToZoom: false,
    zoomToOpportunityThreshold: 0,

    closeTitle: closeTitle,
    zoomTitle: zoomTitle,
    errorMsg: errorMsg,
  });

  // --- AÑADIR BOTONES PERSONALIZADOS (FLECHAS) ---
  lightbox.on('uiRegister', function() {
    lightbox.pswp.ui.registerElement({
      name: 'custom-prev-arrow',
      order: 9,
      isButton: true,
      html: `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      `,
      onClick: (event, el) => { lightbox.pswp.prev(); }
    });

    lightbox.pswp.ui.registerElement({
      name: 'custom-next-arrow',
      order: 9,
      isButton: true,
      html: `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `,
      onClick: (event, el) => { lightbox.pswp.next(); }
    });
  });

  lightbox.on('contentActivate', ({ content }) => {
    if (content.element) {
      content.element.addEventListener('contextmenu', (e) => e.preventDefault());
      content.element.addEventListener('dragstart', (e) => e.preventDefault());
      content.element.addEventListener('touchstart', (e) => {
        content._touchTimer = setTimeout(() => e.preventDefault(), 500);
      }, { passive: false });
      content.element.addEventListener('touchend', () => clearTimeout(content._touchTimer));
      content.element.addEventListener('touchmove', () => clearTimeout(content._touchTimer));
    }
  });

  lightbox.on("change", () => {
    const target = lightbox.pswp?.currSlide?.data?.element?.dataset?.pswpTarget;
    if (target) history.replaceState("", document.title, `#${target}`);
  });

  lightbox.on("close", () => {
    history.replaceState("", document.title, window.location.pathname);
  });

  lightbox.init();

  const hash = window.location.hash.substring(1);
  if (hash.length > 1) {
    const items = gallery.querySelectorAll(".slider-item, .post-gallery-item, .grid-item");
    for (let index = 0; index < items.length; index++) {
      if (items[index].dataset.pswpTarget === hash) {
        lightbox.loadAndOpen(index, { gallery });
        break;
      }
    }
  }
}

document.addEventListener("astro:page-load", initLightbox);