
import "./lightbox.js";

// =========================================
// 1. ESTADO COMPARTIDO
// =========================================

const HEADER_SHOW_THRESHOLD = 100;

let lastScrollY = window.scrollY;

// =========================================
// 2. ESTADO DEL MENÚ
// =========================================

const setMenuState = (isOpen) => {
  const header = document.getElementById("main-header");
  const button = document.getElementById("menu-toggle");

  if (!header || !button) return;

  header.classList.toggle("menu-open", isOpen);

  button.setAttribute("aria-expanded", String(isOpen));
  button.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú"
  );
};

// =========================================
// 3. VISIBILIDAD DEL HEADER
// =========================================

const updateHeaderVisibility = () => {
  const header = document.getElementById("main-header");

  if (!header) return;

  header.classList.toggle(
    "header-hidden",
    window.scrollY > HEADER_SHOW_THRESHOLD
  );
};

// =========================================
// 4. MENÚ MÓVIL
// =========================================

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest("#menu-toggle");

  if (button) {
    event.preventDefault();

    const isOpen = button.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);

    return;
  }

  const menuLink = target.closest("#menu a");

  if (menuLink) {
    setMenuState(false);
  }
});

// =========================================
// 5. SCROLL: MENÚ Y HEADER
// =========================================

window.addEventListener(
  "scroll",
  () => {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;

    const header = document.getElementById("main-header");

    if (!header) return;

    if (scrollingDown && header.classList.contains("menu-open")) {
      setMenuState(false);
    }

    updateHeaderVisibility();

    lastScrollY = currentScrollY;
  },
  { passive: true }
);

// =========================================
// 6. CARGA SUAVE DE IMÁGENES
// =========================================

const initImageLoading = () => {
  const images = document.querySelectorAll(
    "img:not(.pswp__item img)"
  );

  images.forEach((img) => {
    if (img.dataset.loadingInitialized === "true") return;

    img.dataset.loadingInitialized = "true";

    if (img.complete) {
      img.dataset.loading =
        img.naturalWidth > 0 ? "loaded" : "error";

      return;
    }

    img.dataset.loading = "true";

    img.addEventListener(
      "load",
      () => {
        img.dataset.loading = "loaded";
      },
      { once: true }
    );

    img.addEventListener(
      "error",
      () => {
        img.dataset.loading = "error";
      },
      { once: true }
    );
  });
};

// =========================================
// 7. REINICIAR ESTADO EN CADA NAVEGACIÓN
// =========================================

document.addEventListener("astro:page-load", () => {
  setMenuState(false);

  lastScrollY = window.scrollY;

  updateHeaderVisibility();

  initImageLoading();
});

// Primera carga de la página.
updateHeaderVisibility();
initImageLoading();

// =========================================
// 8. PROTECCIÓN DE IMÁGENES
// =========================================

const isImageTarget = (target) => {
  if (!(target instanceof Element)) return false;

  if (target.closest("img")) return true;

  const link = target.closest("a");

  return Boolean(link?.querySelector("img"));
};

document.addEventListener(
  "contextmenu",
  (event) => {
    if (isImageTarget(event.target)) {
      event.preventDefault();
    }
  },
  true
);

document.addEventListener(
  "dragstart",
  (event) => {
    if (isImageTarget(event.target)) {
      event.preventDefault();
    }
  },
  true
);
