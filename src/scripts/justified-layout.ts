
/*!
 * Original work Copyright 2019 SmugMug, Inc.
 * Modified work Copyright 2025 Nico Kaiser
 * Licensed under the terms of the MIT license.
 */

export interface LayoutOptions {
  rowHeight: number;
  rowWidth: number;
  spacing: number;
  heightTolerance: number;
}

interface LayoutBox {
  aspectRatio: number;
  top?: number;
  width?: number;
  height?: number;
  left?: number;
}

/**
 * Row
 * Wrapper for each row in a justified layout.
 */
class Row {
  top: number;
  rowWidth: number;
  spacing: number;
  rowHeight: number;
  heightTolerance: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  items: LayoutBox[] = [];
  height = 0;

  constructor(params: LayoutOptions & { top: number }) {
    this.top = params.top;

    this.rowWidth = params.rowWidth;
    this.spacing = params.spacing;
    this.rowHeight = params.rowHeight;
    this.heightTolerance = params.heightTolerance;

    this.minAspectRatio =
      (this.rowWidth / params.rowHeight) *
      (1 - params.heightTolerance);

    this.maxAspectRatio =
      (this.rowWidth / params.rowHeight) *
      (1 + params.heightTolerance);
  }

  /**
   * Attempt to add a single item to the row.
   */
  addItem(aspectRatio: number): boolean {
    const itemData: LayoutBox = { aspectRatio };
    const newItems = this.items.concat(itemData);

    const rowWidthWithoutSpacing =
      this.rowWidth - (newItems.length - 1) * this.spacing;

    const newAspectRatio = newItems.reduce(
      (sum, item) => sum + item.aspectRatio,
      0,
    );

    const targetAspectRatio =
      rowWidthWithoutSpacing / this.rowHeight;

    if (newAspectRatio < this.minAspectRatio) {
      this.items.push(itemData);
      return true;
    }

    if (newAspectRatio > this.maxAspectRatio) {
      if (this.items.length === 0) {
        this.items.push(itemData);
        this.completeLayout(rowWidthWithoutSpacing / newAspectRatio);
        return true;
      }

      const previousRowWidthWithoutSpacing =
        this.rowWidth - (this.items.length - 1) * this.spacing;

      const previousAspectRatio = this.items.reduce(
        (sum, item) => sum + item.aspectRatio,
        0,
      );

      const previousTargetAspectRatio =
        previousRowWidthWithoutSpacing / this.rowHeight;

      if (
        Math.abs(newAspectRatio - targetAspectRatio) >
        Math.abs(previousAspectRatio - previousTargetAspectRatio)
      ) {
        this.completeLayout(
          previousRowWidthWithoutSpacing / previousAspectRatio,
        );

        return false;
      }

      this.items.push(itemData);
      this.completeLayout(rowWidthWithoutSpacing / newAspectRatio);

      return true;
    }

    this.items.push(itemData);
    this.completeLayout(rowWidthWithoutSpacing / newAspectRatio);

    return true;
  }

  /**
   * Set row height and compute item geometry from that height.
   */
  completeLayout(newHeight: number) {
    if (!this.items.length || !Number.isFinite(newHeight) || newHeight <= 0) {
      return;
    }

    const rowWidthWithoutSpacing =
      this.rowWidth - (this.items.length - 1) * this.spacing;

    const clampedHeight = Math.max(
      0.5 * this.rowHeight,
      Math.min(newHeight, 2 * this.rowHeight),
    );

    const clampedToNativeRatio =
      newHeight !== clampedHeight
        ? newHeight / clampedHeight
        : 1;

    this.height = clampedHeight;

    let itemWidthSum = 0;

    for (const item of this.items) {
      item.top = this.top;
      item.width =
        item.aspectRatio *
        this.height *
        clampedToNativeRatio;

      item.height = this.height;
      item.left = itemWidthSum;

      itemWidthSum += item.width + this.spacing;
    }
  }
}

/**
 * Takes in a list of aspect ratios and layout options.
 * Returns the geometry needed for a justified gallery.
 */
export default function (
  aspectRatios: number[],
  layoutOptions: LayoutOptions,
) {
  const {
    rowWidth,
    rowHeight,
    spacing,
    heightTolerance,
  } = layoutOptions;

  if (
    !Number.isFinite(rowWidth) ||
    !Number.isFinite(rowHeight) ||
    rowWidth <= 0 ||
    rowHeight <= 0 ||
    !Number.isFinite(spacing) ||
    spacing < 0 ||
    !Number.isFinite(heightTolerance) ||
    heightTolerance < 0 ||
    heightTolerance >= 1
  ) {
    return {
      containerHeight: 0,
      boxes: [],
    };
  }

  const validAspectRatios = aspectRatios.filter(
    (ratio) => Number.isFinite(ratio) && ratio > 0,
  );

  if (!validAspectRatios.length) {
    return {
      containerHeight: 0,
      boxes: [],
    };
  }

  let containerHeight = 0;
  let boxes: LayoutBox[] = [];
  let currentRow: Row | undefined;
  let lastRowHeight = rowHeight;

  for (const aspectRatio of validAspectRatios) {
    if (!currentRow) {
      currentRow = new Row({
        top: containerHeight,
        ...layoutOptions,
      });
    }

    const itemAdded = currentRow.addItem(aspectRatio);

    if (currentRow.height > 0) {
      lastRowHeight = currentRow.height;

      boxes = boxes.concat(currentRow.items);

      containerHeight +=
        currentRow.height + spacing;

      currentRow = new Row({
        top: containerHeight,
        ...layoutOptions,
      });

      if (!itemAdded) {
        currentRow.addItem(aspectRatio);

        if (currentRow.height > 0) {
          lastRowHeight = currentRow.height;

          boxes = boxes.concat(currentRow.items);

          containerHeight +=
            currentRow.height + spacing;

          currentRow = new Row({
            top: containerHeight,
            ...layoutOptions,
          });
        }
      }
    }
  }

  // Última fila: conserva una altura visual coherente.
  if (currentRow && currentRow.items.length) {
    currentRow.completeLayout(lastRowHeight);

    boxes = boxes.concat(currentRow.items);

    containerHeight += currentRow.height;
  }

  return {
    containerHeight: Math.max(0, containerHeight),
    boxes,
  };
}
