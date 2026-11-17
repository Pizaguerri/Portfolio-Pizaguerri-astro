import "./lightbox.js";

// --- 1. MENÚ MÓVIL (Delegación de eventos) ---
document.addEventListener("click", (event) => {
  const button = event.target.closest("#menu-toggle");
  if (button) {
    event.preventDefault();
    const menu = document.getElementById("menu");
    if (menu) {
      const isOpen = button.getAttribute("aria-expanded") === "true";
      const nextState = !isOpen;
      button.setAttribute("aria-expanded", String(nextState));
      button.setAttribute("aria-label", nextState ? "Cerrar menú" : "Abrir menú");
      menu.classList.toggle("hidden", !nextState);
    }
  }
});

// --- 2. REINICIAR ESTADO EN CADA NAVEGACIÓN ---
document.addEventListener("astro:page-load", () => {
  // Forzar que el menú esté cerrado al cambiar de página
  const menu = document.getElementById("menu");
  const button = document.getElementById("menu-toggle");
  if (menu && button) {
    menu.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Abrir menú");
  }

  // --- 3. CERRAR EL MENÚ AL HACER SCROLL ---
  window.addEventListener("scroll", () => {
    const menu = document.getElementById("menu");
    const button = document.getElementById("menu-toggle");
    if (menu && button && !menu.classList.contains("hidden")) {
      menu.classList.add("hidden");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menú");
    }
  }, { passive: true });

  // --- 4. OCULTAR HEADER AL HACER SCROLL ---
  const header = document.getElementById("main-header");
  if (header && !header.dataset.initialized) {
    let lastScrollY = window.scrollY;
    window.addEventListener("scroll", () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        header.classList.add("header-hidden");
      } else {
        header.classList.remove("header-hidden");
      }
      lastScrollY = window.scrollY;
    });
    header.dataset.initialized = "true";
  }

  // --- 5. PROTECCIÓN DE IMÁGENES ---
  if (!document.body.dataset.imgProtected) {
    document.addEventListener("contextmenu", (e) => {
      if (e.target.tagName === "IMG") e.preventDefault();
    });
    document.addEventListener("dragstart", (e) => {
      if (e.target.tagName === "IMG") e.preventDefault();
    });

    let touchTimer;
    document.addEventListener("touchstart", (e) => {
      if (e.target.tagName === "IMG") {
        touchTimer = setTimeout(() => e.preventDefault(), 500);
      }
    }, { passive: false });

    document.addEventListener("touchend", () => clearTimeout(touchTimer));
    document.addEventListener("touchmove", () => clearTimeout(touchTimer));

    document.body.dataset.imgProtected = "true";
  }
});