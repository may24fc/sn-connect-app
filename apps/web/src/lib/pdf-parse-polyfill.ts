/**
 * Polyfill browser globals required by pdf-parse v2.x's bundled pdfjs-dist.
 *
 * pdfjs-dist references DOMMatrix, Path2D, OffscreenCanvas and ImageData at
 * module-evaluation time — even when only text extraction is used. These stubs
 * satisfy the reference check so the module can load in Node.js / serverless
 * environments that lack a DOM.  No rendering calls are made at runtime so the
 * stubs are never exercised beyond construction.
 *
 * Must be imported (side-effect) **before** any `require('pdf-parse')` call.
 */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
const g = globalThis as Record<string, unknown>;

if (!g.DOMMatrix) {
  g.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
  };
}

if (!g.Path2D) {
  g.Path2D = class Path2D {
    constructor(_path?: string) { /* stub */ }
  };
}

if (!g.OffscreenCanvas) {
  g.OffscreenCanvas = class OffscreenCanvas {
    width: number;
    height: number;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
    }
    getContext() {
      return null;
    }
  };
}

if (!g.ImageData) {
  g.ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}
