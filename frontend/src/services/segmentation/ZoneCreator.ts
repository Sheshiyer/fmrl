/**
 * Zone Creator - Creates analysis zones from body segmentation mask
 * Generates body, proximal field, distal field, extended field, and background zones
 */
import type { SegmentationResult } from './BodySegmenter';

export interface ZoneConfig {
  proximal: number;  // Relative distance (0-1) from body
  distal: number;
  extended: number;
}

export interface ZoneMasks {
  body: Uint8Array;
  proximalField: Uint8Array;
  distalField: Uint8Array;
  extendedField: Uint8Array;
  background: Uint8Array;
  combinedField: Uint8Array;
}

export interface ZoneData {
  masks: ZoneMasks;
  areas: {
    body: number;
    proximalField: number;
    distalField: number;
    extendedField: number;
    background: number;
    combinedField: number;
  };
  metadata: {
    bodyDiagonal: number;
    zoneDistances: {
      proximal: number;
      distal: number;
      extended: number;
    };
    imageSize: { width: number; height: number };
  };
}

const DEFAULT_ZONE_CONFIG: ZoneConfig = {
  proximal: 0.08,
  distal: 0.15,
  extended: 0.25,
};

export class ZoneCreator {
  private config: ZoneConfig;

  constructor(config: ZoneConfig = DEFAULT_ZONE_CONFIG) {
    this.config = config;
  }

  createZones(
    segmentationResult: SegmentationResult
  ): ZoneData {
    const { mask, width, height, boundingBox } = segmentationResult;

    // Calculate body diagonal for relative zone distances
    let bodyDiagonal = Math.sqrt(width * width + height * height) * 0.3; // Default
    if (boundingBox) {
      bodyDiagonal = Math.sqrt(
        boundingBox.width * boundingBox.width +
          boundingBox.height * boundingBox.height
      );
    }

    // Calculate zone distances in pixels
    const proximalDist = Math.max(5, Math.round(bodyDiagonal * this.config.proximal));
    const distalDist = Math.max(proximalDist + 5, Math.round(bodyDiagonal * this.config.distal));
    const extendedDist = Math.max(distalDist + 5, Math.round(bodyDiagonal * this.config.extended));

    // Create dilated masks
    const dilatedProximal = this.dilateMask(mask, width, height, proximalDist);
    const dilatedDistal = this.dilateMask(mask, width, height, distalDist);
    const dilatedExtended = this.dilateMask(mask, width, height, extendedDist);

    // Create zone masks (annular regions)
    const bodyMask = new Uint8Array(mask);
    const proximalField = this.subtractMasks(dilatedProximal, mask, width, height);
    const distalField = this.subtractMasks(dilatedDistal, dilatedProximal, width, height);
    const extendedField = this.subtractMasks(dilatedExtended, dilatedDistal, width, height);
    const background = this.invertMask(dilatedExtended, width, height);

    // Combined field (proximal + distal + extended)
    const combinedField = new Uint8Array(width * height);
    for (let i = 0; i < combinedField.length; i++) {
      combinedField[i] = proximalField[i] || distalField[i] || extendedField[i] ? 255 : 0;
    }

    // Calculate areas
    const areas = {
      body: this.countPixels(bodyMask),
      proximalField: this.countPixels(proximalField),
      distalField: this.countPixels(distalField),
      extendedField: this.countPixels(extendedField),
      background: this.countPixels(background),
      combinedField: this.countPixels(combinedField),
    };

    return {
      masks: {
        body: bodyMask,
        proximalField,
        distalField,
        extendedField,
        background,
        combinedField,
      },
      areas,
      metadata: {
        bodyDiagonal,
        zoneDistances: {
          proximal: proximalDist,
          distal: distalDist,
          extended: extendedDist,
        },
        imageSize: { width, height },
      },
    };
  }

  private dilateMask(
    mask: Uint8Array,
    width: number,
    height: number,
    radius: number
  ): Uint8Array {
    const result = new Uint8Array(width * height);
    const radiusSquared = radius * radius;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Check if any pixel within radius is set
        let found = false;
        for (let dy = -radius; dy <= radius && !found; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;

          for (let dx = -radius; dx <= radius && !found; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;

            // Check if within circular radius
            if (dx * dx + dy * dy <= radiusSquared) {
              const nidx = ny * width + nx;
              if (mask[nidx] > 0) {
                found = true;
              }
            }
          }
        }

        result[idx] = found ? 255 : 0;
      }
    }

    return result;
  }

  private subtractMasks(
    mask1: Uint8Array,
    mask2: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const result = new Uint8Array(width * height);
    for (let i = 0; i < result.length; i++) {
      result[i] = mask1[i] > 0 && mask2[i] === 0 ? 255 : 0;
    }
    return result;
  }

  private invertMask(
    mask: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    const result = new Uint8Array(width * height);
    for (let i = 0; i < result.length; i++) {
      result[i] = mask[i] === 0 ? 255 : 0;
    }
    return result;
  }

  private countPixels(mask: Uint8Array): number {
    let count = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) count++;
    }
    return count;
  }

  setConfig(config: Partial<ZoneConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ZoneConfig {
    return { ...this.config };
  }
}
