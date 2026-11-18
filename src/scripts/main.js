
import "./lightbox.js";

// =========================================
// 1. ESTADO COMPARTIDO
// =========================================

let lastScrollY = window.scrollY;

// =========================================
// 2. MENÚ MÓVIL
// =========================================

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest("#menu-toggle");

  if (!button) return;

  event.preventDefault();

  const menu = document.getElementById("menu");

  if (!menu) return;

  const isOpen = button.getAttribute("aria-expanded") === "true";
  const nextState = !isOpen;

  button.setAttribute("aria-expanded", String(nextState));
  button.setAttribute(
    "aria-label",
    nextState ? "Cerrar menú" : "Abrir menú"
  );

  menu.classList.toggle("hidden", !nextState);
});

// =========================================
// 3. SCROLL: MENÚ Y HEADER
// =========================================

window.addEventListener(
  "scroll",
  () => {
    const menu = document.getElementById("menu");
    const button = document.getElementById("menu-toggle");

    if (menu && button && !menu.classList.contains("hidden")) {
      menu.classList.add("hidden");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menú");
    }

    const header = document.getElementById("main-header");

    if (header) {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        header.classList.add("header-hidden");
      } else {
        header.classList.remove("header-hidden");
      }
    }

    lastScrollY = window.scrollY;
  },
  { passive: true }
);

// =========================================
// 4. REINICIAR ESTADO EN CADA NAVEGACIÓN
// =========================================

document.addEventListener("astro:page-load", () => {
  const menu = document.getElementById("menu");
  const button = document.getElementById("menu-toggle");

  if (menu && button) {
    menu.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Abrir menú");
  }

  lastScrollY = window.scrollY;

  const header = document.getElementById("main-header");
  header?.classList.remove("header-hidden");
});

// =========================================
// 5. PROTECCIÓN DE IMÁGENES
// =========================================

const isImageTarget = (target) => {
  if (!(target instanceof Element)) return false;

  // El evento puede comenzar directamente sobre la imagen.
  if (target.closest("img")) return true;

  // También puede comenzar sobre el enlace que contiene la imagen.
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
