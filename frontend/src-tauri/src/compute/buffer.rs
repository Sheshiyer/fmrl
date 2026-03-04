use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PixelFormat {
    Gray8,
    Rgb8,
    Rgba8,
}

impl PixelFormat {
    pub fn channels(self) -> usize {
        match self {
            Self::Gray8 => 1,
            Self::Rgb8 => 3,
            Self::Rgba8 => 4,
        }
    }
}

#[derive(Debug, Clone)]
pub struct FrameBuffer {
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
    pub bytes: Vec<u8>,
}

impl FrameBuffer {
    pub fn expected_len(width: u32, height: u32, format: PixelFormat) -> usize {
        (width as usize)
            .saturating_mul(height as usize)
            .saturating_mul(format.channels())
    }

    pub fn try_new(
        width: u32,
        height: u32,
        format: PixelFormat,
        bytes: Vec<u8>,
    ) -> Result<Self, String> {
        if width == 0 || height == 0 {
            return Err("Frame dimensions must be > 0".to_string());
        }

        let expected = Self::expected_len(width, height, format);
        if bytes.len() != expected {
            return Err(format!(
                "Invalid byte length: expected {expected}, got {}",
                bytes.len()
            ));
        }

        Ok(Self {
            width,
            height,
            format,
            bytes,
        })
    }

    pub fn pixel_count(&self) -> usize {
        (self.width as usize).saturating_mul(self.height as usize)
    }
}
