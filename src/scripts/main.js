
import "./lightbox.js";

// =========================================
// 1. ESTADO COMPARTIDO
// =========================================

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
// 3. MENÚ MÓVIL
// =========================================

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  // Abrir o cerrar mediante el botón.
  const button = target.closest("#menu-toggle");

  if (button) {
    event.preventDefault();

    const isOpen = button.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);

    return;
  }

  // Cerrar al seleccionar un enlace del menú.
  const menuLink = target.closest("#menu a");

  if (menuLink) {
    setMenuState(false);
  }
});


// =========================================
// 4. SCROLL: MENÚ Y HEADER
// =========================================

window.addEventListener(
  "scroll",
  () => {
    const header = document.getElementById("main-header");

    if (!header) return;

    const scrollingDown = window.scrollY > lastScrollY;

    // Cerrar el menú al desplazarse hacia abajo.
    if (scrollingDown && header.classList.contains("menu-open")) {
      setMenuState(false);
    }

    // Ocultar al bajar y mostrar al subir.
    if (scrollingDown && window.scrollY > 100) {
      header.classList.add("header-hidden");
    } else {
      header.classList.remove("header-hidden");
    }

    lastScrollY = window.scrollY;
  },
  { passive: true }
);


// =========================================
// 5. REINICIAR ESTADO EN CADA NAVEGACIÓN
// =========================================

document.addEventListener("astro:page-load", () => {
  setMenuState(false);

  lastScrollY = window.scrollY;

  const header = document.getElementById("main-header");
  header?.classList.remove("header-hidden");
});

// =========================================
// 6. PROTECCIÓN DE IMÁGENES
// =========================================

const isImageTarget = (target) => {
  if (!(target instanceof Element)) return false;

  if (target.closest("img")) return true;

  const link = target.closest("a");

  return Boolean(link?.querySelector("img"));
};

// Bloquear menú contextual sobre imágenes y sus enlaces.
document.addEventListener(
  "contextmenu",
  (event) => {
    if (isImageTarget(event.target)) {
      event.preventDefault();
    }
  },
  true
);

// Bloquear arrastre sobre imágenes y sus enlaces.
document.addEventListener(
  "dragstart",
  (event) => {
    if (isImageTarget(event.target)) {
      event.preventDefault();
    }
  },
  true
);
