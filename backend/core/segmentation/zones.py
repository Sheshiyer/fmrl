"""
Zone Creation from Body Segmentation Mask

Creates analysis zones using morphological dilation:
- Body (Zone 1): The segmented body region
- Proximal Field (Zone 2): Immediate aura around body
- Distal Field (Zone 3): Extended energy field
- Extended Field (Zone 4): Outer boundary
- Background (Zone 5): Everything else
"""
import cv2
import numpy as np
from typing import Dict, Any, Optional


class ZoneCreator:
    """
    Create analysis zones from body segmentation mask.
    """
    
    # Default zone distances (relative to body diagonal)
    DEFAULT_ZONES = {
        'proximal': 0.08,   # 8% of body diagonal
        'distal': 0.15,     # 15% of body diagonal
        'extended': 0.25    # 25% of body diagonal
    }
    
    def __init__(self, zone_config: Optional[Dict[str, float]] = None):
        """
        Initialize zone creator.
        
        Args:
            zone_config: Custom zone distances (relative or absolute)
        """
        self.zone_config = zone_config or self.DEFAULT_ZONES
    
    def create_zones(
        self, 
        body_mask: np.ndarray, 
        mode: str = 'relative'
    ) -> Dict[str, Any]:
        """
        Create all analysis zones from body mask.
        
        Args:
            body_mask: Binary mask (255 = body, 0 = background)
            mode: 'relative' (to body size) or 'absolute' (pixels)
            
        Returns:
            dict with zone masks and metadata
        """
        h, w = body_mask.shape[:2]
        
        # Find contours for body diagonal calculation
        contours, _ = cv2.findContours(
            body_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return self._empty_zones(h, w)
        
        largest = max(contours, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(largest)
        body_diagonal = np.sqrt(bw**2 + bh**2)
        
        # Calculate zone distances
        if mode == 'relative':
            proximal_dist = int(body_diagonal * self.zone_config['proximal'])
            distal_dist = int(body_diagonal * self.zone_config['distal'])
            extended_dist = int(body_diagonal * self.zone_config['extended'])
        else:
            proximal_dist = self.zone_config.get('proximal_px', 30)
            distal_dist = self.zone_config.get('distal_px', 60)
            extended_dist = self.zone_config.get('extended_px', 100)
        
        # Ensure minimum distances
        proximal_dist = max(proximal_dist, 5)
        distal_dist = max(distal_dist, proximal_dist + 5)
        extended_dist = max(extended_dist, distal_dist + 5)
        
        # Create kernels for dilation
        kernel_proximal = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (proximal_dist * 2 + 1, proximal_dist * 2 + 1)
        )
        kernel_distal = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (distal_dist * 2 + 1, distal_dist * 2 + 1)
        )
        kernel_extended = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (extended_dist * 2 + 1, extended_dist * 2 + 1)
        )
        
        # Dilate to create expanded regions
        dilated_proximal = cv2.dilate(body_mask, kernel_proximal)
        dilated_distal = cv2.dilate(body_mask, kernel_distal)
        dilated_extended = cv2.dilate(body_mask, kernel_extended)
        
        # Create zone masks (annular regions)
        zone_body = body_mask.copy()
        zone_proximal = cv2.subtract(dilated_proximal, body_mask)
        zone_distal = cv2.subtract(dilated_distal, dilated_proximal)
        zone_extended = cv2.subtract(dilated_extended, dilated_distal)
        zone_background = cv2.bitwise_not(dilated_extended)
        
        # Combined field mask (proximal + distal + extended)
        combined_field = cv2.bitwise_or(zone_proximal, zone_distal)
        combined_field = cv2.bitwise_or(combined_field, zone_extended)
        
        zones = {
            'body': {
                'mask': zone_body,
                'area': int(np.sum(zone_body > 0)),
                'zone_id': 1
            },
            'proximal_field': {
                'mask': zone_proximal,
                'area': int(np.sum(zone_proximal > 0)),
                'zone_id': 2,
                'distance_from_body': f"0-{proximal_dist}px"
            },
            'distal_field': {
                'mask': zone_distal,
                'area': int(np.sum(zone_distal > 0)),
                'zone_id': 3,
                'distance_from_body': f"{proximal_dist}-{distal_dist}px"
            },
            'extended_field': {
                'mask': zone_extended,
                'area': int(np.sum(zone_extended > 0)),
                'zone_id': 4,
                'distance_from_body': f"{distal_dist}-{extended_dist}px"
            },
            'background': {
                'mask': zone_background,
                'area': int(np.sum(zone_background > 0)),
                'zone_id': 5
            },
            'combined_field': {
                'mask': combined_field,
                'area': int(np.sum(combined_field > 0)),
                'zone_id': 0  # Special combined zone
            }
        }
        
        # Metadata
        zones['_metadata'] = {
            'body_diagonal': float(body_diagonal),
            'body_bounding_box': {'x': int(x), 'y': int(y), 'width': int(bw), 'height': int(bh)},
            'zone_distances': {
                'proximal': proximal_dist,
                'distal': distal_dist,
                'extended': extended_dist
            },
            'image_size': {'width': w, 'height': h}
        }
        
        return zones
    
    def _empty_zones(self, h: int, w: int) -> Dict[str, Any]:
        """Return empty zone structure when no body detected."""
        empty_mask = np.zeros((h, w), dtype=np.uint8)
        full_mask = np.ones((h, w), dtype=np.uint8) * 255
        
        return {
            'body': {'mask': empty_mask, 'area': 0, 'zone_id': 1},
            'proximal_field': {'mask': empty_mask, 'area': 0, 'zone_id': 2},
            'distal_field': {'mask': empty_mask, 'area': 0, 'zone_id': 3},
            'extended_field': {'mask': empty_mask, 'area': 0, 'zone_id': 4},
            'background': {'mask': full_mask, 'area': h * w, 'zone_id': 5},
            'combined_field': {'mask': empty_mask, 'area': 0, 'zone_id': 0},
            '_metadata': {
                'body_diagonal': 0,
                'body_bounding_box': None,
                'zone_distances': {'proximal': 0, 'distal': 0, 'extended': 0},
                'image_size': {'width': w, 'height': h}
            }
        }
    
    def visualize_zones(
        self, 
        image: np.ndarray, 
        zones: Dict[str, Any],
        alpha: float = 0.3
    ) -> np.ndarray:
        """
        Create visualization overlay of zones.
        
        Args:
            image: Original BGR image
            zones: Zone dict from create_zones
            alpha: Overlay transparency
        
        Returns:
            Image with colored zone overlay
        """
        overlay = image.copy()
        
        # Zone colors (BGR format)
        colors = {
            'body': (0, 255, 0),           # Green
            'proximal_field': (0, 255, 255),  # Yellow
            'distal_field': (0, 165, 255),    # Orange
            'extended_field': (0, 0, 255),    # Red
            'background': (128, 128, 128)     # Gray
        }
        
        for zone_name, zone_data in zones.items():
            if zone_name.startswith('_') or zone_name == 'combined_field':
                continue
            
            if 'mask' not in zone_data:
                continue
            
            mask = zone_data['mask']
            color = colors.get(zone_name, (255, 255, 255))
            
            colored = np.zeros_like(overlay)
            colored[mask > 0] = color
            
            overlay = cv2.addWeighted(overlay, 1, colored, alpha, 0)
        
        return overlay
