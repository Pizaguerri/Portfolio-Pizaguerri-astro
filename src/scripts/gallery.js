
import justifiedLayout from "./justified-layout.js";

/**
 * Inicializa una galería con distribución justificada.
 *
 * @param {HTMLElement} gallery
 * @param {Object} options
 * @param {string} options.itemSelector
 * @param {number} options.targetRowHeight
 * @param {number} options.spacing
 * @param {number} options.heightTolerance
 * @returns {Function} cleanup
 */
export function initJustifiedGallery(gallery, options = {}) {
  if (!gallery) {
    return () => {};
  }

  const {
    itemSelector = ".gallery-item",
    targetRowHeight = 288,
    spacing = 8,
    heightTolerance = 0.25,
  } = options;

  const items = Array.from(gallery.querySelectorAll(itemSelector));

  if (!items.length) {
    return () => {};
  }

  // Guardar los estilos originales.
  const originalGalleryStyle = gallery.getAttribute("style");

  const originalItemStyles = new Map();
  const originalImageStyles = new Map();

  items.forEach((item) => {
    originalItemStyles.set(item, item.getAttribute("style"));

    const img = item.querySelector("img");

    if (img) {
      originalImageStyles.set(img, img.getAttribute("style"));
    }
  });

  let containerWidth = 0;
  let destroyed = false;
  let resizeObserver = null;
  let resizeFrame = null;

  const images = items
    .map((item) => item.querySelector("img"))
    .filter(Boolean);

  const getAspectRatios = () =>
    items.map((item) => {
      const img = item.querySelector("img");

      if (!img) {
        return 1;
      }

      const width =
        img.naturalWidth ||
        Number.parseFloat(img.getAttribute("width"));

      const height =
        img.naturalHeight ||
        Number.parseFloat(img.getAttribute("height"));

      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return 1;
      }

      return width / height;
    });

  /**
   * Calcula y aplica la distribución.
   *
   * @param {boolean} force Fuerza el cálculo aunque el ancho no cambie.
   */
  const updateGallery = (force = false) => {
    if (destroyed) {
      return;
    }

    const width = gallery.getBoundingClientRect().width;

    if (!width) {
      return;
    }

    if (!force && Math.abs(width - containerWidth) < 0.5) {
      return;
    }

    containerWidth = width;

    const aspectRatios = getAspectRatios();

    if (!aspectRatios.length) {
      gallery.style.height = "0px";
      return;
    }

    const layout = justifiedLayout(aspectRatios, {
      rowWidth: width,
      spacing,
      rowHeight: targetRowHeight,
      heightTolerance,
    });

    gallery.style.position = "relative";
    gallery.style.height = `${layout.containerHeight}px`;

    items.forEach((item, index) => {
      const box = layout.boxes[index];

      if (!box) {
        return;
      }

      const {
        width: boxWidth,
        height,
        top,
        left,
      } = box;

      item.style.position = "absolute";
      item.style.width = `${boxWidth}px`;
      item.style.height = `${height}px`;
      item.style.top = `${top}px`;
      item.style.left = `${left}px`;
      item.style.overflow = "hidden";

      const img = item.querySelector("img");

      if (img) {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
      }
    });
  };

  // Agrupar las actualizaciones para evitar cálculos repetidos.
  const scheduleUpdate = (force = false) => {
    if (destroyed) {
      return;
    }

    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      updateGallery(force);
    });
  };

  // Recalcular cuando las imágenes terminan de cargar.
  const handleImageLoad = () => scheduleUpdate(true);

  images.forEach((img) => {
    img.addEventListener("load", handleImageLoad);
    img.addEventListener("error", handleImageLoad);
  });

  // Observar cambios de tamaño del contenedor.
  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });

    resizeObserver.observe(gallery);
  } else {
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("orientationchange", scheduleUpdate);
  }

  // Primera distribución.
  updateGallery(true);

  // Comprobar imágenes que ya terminaron de cargar.
  if (images.some((img) => img.complete)) {
    scheduleUpdate(true);
  }

  // Función de limpieza.
  return function cleanup() {
    if (destroyed) {
      return;
    }

    destroyed = true;

    if (resizeFrame !== null) {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("orientationchange", scheduleUpdate);
    }

    // Eliminar listeners de imágenes.
    images.forEach((img) => {
      img.removeEventListener("load", handleImageLoad);
      img.removeEventListener("error", handleImageLoad);
    });

    // Restaurar estilos originales.
    if (originalGalleryStyle === null) {
      gallery.removeAttribute("style");
    } else {
      gallery.setAttribute("style", originalGalleryStyle);
    }

    originalItemStyles.forEach((style, item) => {
      if (style === null) {
        item.removeAttribute("style");
      } else {
        item.setAttribute("style", style);
      }
    });

    originalImageStyles.forEach((style, img) => {
      if (style === null) {
        img.removeAttribute("style");
      } else {
        img.setAttribute("style", style);
      }
    });
  };
}
