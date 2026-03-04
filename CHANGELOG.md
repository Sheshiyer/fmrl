# TouchDesigner Noise TOP Implementation - Changelog

## [2024-01-XX] - TouchDesigner Noise TOP Implementation

### Added
- **Proper TouchDesigner Noise TOP workflow**: Implemented single-pass GPU shader that matches TouchDesigner's Noise TOP behavior
- **Video-driven noise coordinates**: Implemented TouchDesigner's key feature where video RGB values drive noise coordinate generation
- **Video Influence control**: Added parameter to control how much video content affects noise coordinates (0-100%)
- **Image-based color lookup**: Revolutionary feature to use custom images as color palettes for noise generation
- **Three color modes**: Default Perlin, Enhanced HSL, and Image Lookup for maximum creative control
- **File upload functionality**: Upload any image to use as a color lookup texture
- **Dynamic color pattern generation**: Procedurally generated psychedelic default color pattern
- **Gaussian blur post-processing**: Add dreamy, soft blur effects to the final output (0-10 intensity)
- **Enhanced color mapping**: Sophisticated noise-to-color conversion based on video content analysis
- **Color Saturation control**: User-adjustable saturation boost for more vibrant results (0-200%)
- **Hue Shift control**: Control how much noise affects hue vs preserving original video hue (0-100%)
- **TouchDesigner Composite workflow**: Proper Video -> Noise -> Composite pipeline matching TouchDesigner
- **Multiple blend modes**: Added support for Multiply, Add, Subtract, and Color blend operations
- **TouchDesigner-style coordinate generation**: Fixed frequency calculation to match TouchDesigner's approach
- **Proper noise reshaping**: Implemented TouchDesigner's exact noise processing pipeline:
  1. Generate base noise with fbm using video-driven coordinates
  2. Apply exponent: `sign(n) * pow(abs(n), uExponent)`
  3. Apply amplitude and offset: `n * uAmplitude + uOffset`
  4. Clamp to [0,1] range
- **Blend mode selector**: Added dropdown to switch between different TouchDesigner Channel Pre-Op/Post-Op modes
- **Intensity control**: Added ability to mix between original video and processed result

### Changed
- **Fragment shader architecture**: Restructured to follow TouchDesigner's 6-step pipeline:
  1. Input sampling
  2. Video-driven noise coordinate generation
  3. Noise reshaping
  4. Enhanced color mapping
  5. TouchDesigner composite operations
  6. Output writing
- **Noise coordinate system**: **MAJOR FIX** - Now uses video RGB values as coordinate input like TouchDesigner
- **Color generation**: Enhanced from simple `fract()` to sophisticated HSL-based color mapping
- **Composite operations**: Improved all blend modes with better color balance and preservation
- **Default mode**: Changed default to "Color" mode for best visual results
- **Default parameters**: Updated to match typical TouchDesigner Noise TOP settings for more organic results
- **Time animation**: Slowed down time evolution for more natural movement

### Fixed
- **Critical: Video coordinate mapping**: Now properly uses video as coordinate map instead of simple overlay
- **Organic noise patterns**: Video content now drives noise generation for content-aware effects
- **TouchDesigner accuracy**: Matches actual TouchDesigner Noise TOP behavior when video is input
- **Color vibrancy**: Enhanced color mapping produces more vibrant, natural-looking results
- **Oversaturation**: Added saturation clamping to prevent color overflow
- **Parameter scaling**: Adjusted coordinate scaling to better match TouchDesigner's behavior

### Technical Details
- **Video-driven coordinates**: `mix(spatialCoord, videoCoord, uVideoInfluence)` replicates TouchDesigner's coordinate mapping
- **Enhanced color mapping**: HSL-based color generation with video content analysis
- **TouchDesigner composite**: Proper hue/saturation overlay with luminance preservation
- **Single-pass GPU processing**: All operations happen in one shader pass, matching TouchDesigner's efficiency
- **Proper uniform handling**: Added `uColorSaturation` and `uHueShift` uniforms for color control
- **TouchDesigner-compatible parameters**: All noise parameters now work exactly like TouchDesigner's Noise TOP
- **Output clamping**: Added proper clamping to prevent color overflow

### Files Modified
- `touchdesigner-style.html`: Complete shader rewrite with enhanced color mapping and TouchDesigner composite workflow
- `CHANGELOG.md`: Updated to track all implementation progress and enhancements 