"""
Nonlinear Dynamics Metrics
Implements: Fractal Dimension, Hurst Exponent, Lyapunov Exponent, Correlation Dimension, DFA
"""
import numpy as np
from typing import Dict, Optional, Tuple
import math


class NonlinearMetrics:
    """Calculates nonlinear dynamics metrics for complexity analysis."""
    
    def __init__(self, embedding_dim: int = 10, min_box_size: int = 2, max_box_size: int = 64):
        self.embedding_dim = embedding_dim
        self.min_box_size = min_box_size
        self.max_box_size = max_box_size
    
    def calculate(self, image: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict:
        """
        Calculate all nonlinear dynamics metrics.
        
        Args:
            image: Grayscale or RGB image
            mask: Optional binary mask for ROI
        
        Returns:
            Dictionary with nonlinear metrics
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = np.mean(image, axis=2)
        else:
            gray = image.astype(float)
        
        # Apply mask if provided
        if mask is not None:
            gray = gray * (mask > 0).astype(float)
        
        # Convert to 1D time series (row-by-row scan)
        time_series = gray.flatten()
        
        # Remove zeros if masked
        if mask is not None:
            time_series = time_series[time_series > 0]
        
        # Normalize
        if len(time_series) > 0 and np.std(time_series) > 0:
            time_series = (time_series - np.mean(time_series)) / np.std(time_series)
        
        # Calculate metrics
        fractal_dim = self._box_counting_dimension(gray)
        hurst = self._hurst_exponent(time_series)
        lyapunov = self._lyapunov_exponent(time_series)
        corr_dim = self._correlation_dimension(time_series)
        dfa_alpha = self._dfa(time_series)
        
        # Sample entropy (simplified)
        sample_entropy = self._sample_entropy(time_series, m=2, r=0.2)
        
        return {
            "fractal_dimension": float(fractal_dim),
            "hurst_exponent": float(hurst),
            "lyapunov_exponent": float(lyapunov),
            "correlation_dimension": float(corr_dim),
            "dfa_alpha": float(dfa_alpha),
            "sample_entropy": float(sample_entropy),
        }
    
    def _box_counting_dimension(self, image: np.ndarray) -> float:
        """
        Calculate fractal dimension using box-counting method.
        
        D = -lim(log(N(s)) / log(s)) as s -> 0
        """
        # Threshold to binary
        threshold = np.mean(image)
        binary = (image > threshold).astype(np.uint8)
        
        if not binary.any():
            return 1.0
        
        # Prepare box sizes (powers of 2)
        min_dim = min(binary.shape)
        max_box = min(self.max_box_size, min_dim // 2)
        min_box = self.min_box_size
        
        box_sizes = []
        counts = []
        
        size = max_box
        while size >= min_box:
            # Count boxes that contain at least one pixel
            count = self._count_boxes(binary, size)
            if count > 0:
                box_sizes.append(size)
                counts.append(count)
            size //= 2
        
        if len(box_sizes) < 2:
            return 1.0
        
        # Linear regression on log-log scale
        log_sizes = np.log(box_sizes)
        log_counts = np.log(counts)
        
        # Calculate slope (negative of fractal dimension)
        slope, _ = np.polyfit(log_sizes, log_counts, 1)
        
        return max(1.0, min(2.0, -slope))
    
    def _count_boxes(self, binary: np.ndarray, box_size: int) -> int:
        """Count number of boxes containing at least one pixel."""
        h, w = binary.shape
        count = 0
        
        for y in range(0, h, box_size):
            for x in range(0, w, box_size):
                y_end = min(y + box_size, h)
                x_end = min(x + box_size, w)
                if binary[y:y_end, x:x_end].any():
                    count += 1
        
        return count
    
    def _hurst_exponent(self, series: np.ndarray, max_k: int = 100) -> float:
        """
        Calculate Hurst exponent using R/S analysis.
        H > 0.5: persistent (trend-following)
        H < 0.5: anti-persistent (mean-reverting)
        H = 0.5: random walk
        """
        n = len(series)
        if n < 20:
            return 0.5
        
        # Range of scales
        max_k = min(max_k, n // 4)
        scales = []
        rs_values = []
        
        for k in range(10, max_k, 10):
            rs_list = []
            for start in range(0, n - k, k):
                segment = series[start:start + k]
                if len(segment) < k:
                    continue
                
                mean = np.mean(segment)
                std = np.std(segment)
                if std == 0:
                    continue
                
                # Cumulative deviation from mean
                cumsum = np.cumsum(segment - mean)
                r = np.max(cumsum) - np.min(cumsum)
                
                rs_list.append(r / std)
            
            if rs_list:
                scales.append(k)
                rs_values.append(np.mean(rs_list))
        
        if len(scales) < 2:
            return 0.5
        
        # Linear regression on log-log scale
        log_scales = np.log(scales)
        log_rs = np.log(rs_values)
        
        slope, _ = np.polyfit(log_scales, log_rs, 1)
        
        return max(0.0, min(1.0, slope))
    
    def _lyapunov_exponent(self, series: np.ndarray, tau: int = 1) -> float:
        """
        Estimate largest Lyapunov exponent using Rosenstein method (simplified).
        lambda > 0: chaotic
        lambda < 0: stable
        lambda = 0: edge of chaos
        """
        n = len(series)
        if n < 50:
            return 0.0
        
        m = self.embedding_dim
        
        # Create delay embedding
        embedded = np.zeros((n - (m - 1) * tau, m))
        for i in range(m):
            embedded[:, i] = series[i * tau:n - (m - 1 - i) * tau]
        
        n_points = embedded.shape[0]
        if n_points < 20:
            return 0.0
        
        # Find nearest neighbors and track divergence
        divergence = []
        
        for i in range(min(100, n_points - 10)):
            # Find nearest neighbor (excluding neighbors in time)
            distances = np.linalg.norm(embedded - embedded[i], axis=1)
            distances[max(0, i - 5):min(n_points, i + 5)] = np.inf
            
            j = np.argmin(distances)
            if distances[j] == np.inf:
                continue
            
            # Track divergence over time
            for k in range(1, min(10, n_points - max(i, j))):
                d = np.linalg.norm(embedded[i + k] - embedded[j + k])
                if d > 0:
                    divergence.append((k, np.log(d / (distances[j] + 1e-10))))
        
        if len(divergence) < 10:
            return 0.0
        
        # Average divergence at each step
        steps = np.array([d[0] for d in divergence])
        divs = np.array([d[1] for d in divergence])
        
        # Simple linear fit
        if len(np.unique(steps)) < 2:
            return 0.0
        
        slope, _ = np.polyfit(steps, divs, 1)
        
        return slope
    
    def _correlation_dimension(self, series: np.ndarray, tau: int = 1) -> float:
        """
        Estimate correlation dimension using Grassberger-Procaccia algorithm.
        """
        n = len(series)
        if n < 100:
            return 2.0
        
        m = self.embedding_dim
        
        # Create delay embedding
        embedded = np.zeros((n - (m - 1) * tau, m))
        for i in range(m):
            embedded[:, i] = series[i * tau:n - (m - 1 - i) * tau]
        
        n_points = embedded.shape[0]
        if n_points < 50:
            return 2.0
        
        # Sample points for efficiency
        sample_size = min(200, n_points)
        indices = np.random.choice(n_points, sample_size, replace=False)
        
        # Calculate pairwise distances
        r_values = []
        c_values = []
        
        for r_frac in [0.1, 0.2, 0.3, 0.4, 0.5]:
            all_dists = []
            for i in indices:
                dists = np.linalg.norm(embedded - embedded[i], axis=1)
                all_dists.extend(dists[dists > 0])
            
            if not all_dists:
                continue
            
            r = np.percentile(all_dists, r_frac * 100)
            
            # Count pairs within distance r
            count = sum(1 for d in all_dists if d < r)
            c = count / (len(all_dists) + 1)
            
            if c > 0 and r > 0:
                r_values.append(np.log(r))
                c_values.append(np.log(c))
        
        if len(r_values) < 2:
            return 2.0
        
        slope, _ = np.polyfit(r_values, c_values, 1)
        
        return max(1.0, min(10.0, slope))
    
    def _dfa(self, series: np.ndarray) -> float:
        """
        Detrended Fluctuation Analysis.
        alpha = 0.5: white noise
        alpha = 1.0: 1/f noise (pink noise)
        alpha = 1.5: Brownian noise
        """
        n = len(series)
        if n < 100:
            return 1.0
        
        # Integrate the series
        y = np.cumsum(series - np.mean(series))
        
        # Range of segment sizes
        scales = []
        fluctuations = []
        
        for scale in [16, 32, 64, 128, 256]:
            if scale >= n // 4:
                continue
            
            n_segments = n // scale
            if n_segments < 4:
                continue
            
            f_sum = 0
            for i in range(n_segments):
                segment = y[i * scale:(i + 1) * scale]
                
                # Fit linear trend
                x = np.arange(scale)
                coeffs = np.polyfit(x, segment, 1)
                trend = np.polyval(coeffs, x)
                
                # Calculate fluctuation
                f_sum += np.mean((segment - trend) ** 2)
            
            f = np.sqrt(f_sum / n_segments)
            scales.append(scale)
            fluctuations.append(f)
        
        if len(scales) < 2:
            return 1.0
        
        # Linear regression on log-log scale
        log_scales = np.log(scales)
        log_fluct = np.log(fluctuations)
        
        slope, _ = np.polyfit(log_scales, log_fluct, 1)
        
        return max(0.0, min(2.0, slope))
    
    def _sample_entropy(self, series: np.ndarray, m: int = 2, r: float = 0.2) -> float:
        """
        Calculate sample entropy (simplified).
        Higher values indicate more complexity/irregularity.
        """
        n = len(series)
        if n < 30:
            return 0.0
        
        # Tolerance
        tolerance = r * np.std(series)
        if tolerance == 0:
            return 0.0
        
        # Count template matches for m and m+1
        def count_matches(m_val):
            count = 0
            templates = []
            
            for i in range(n - m_val):
                templates.append(series[i:i + m_val])
            
            for i in range(len(templates)):
                for j in range(i + 1, len(templates)):
                    if np.max(np.abs(templates[i] - templates[j])) < tolerance:
                        count += 1
            
            return count
        
        a = count_matches(m)
        b = count_matches(m + 1)
        
        if a == 0 or b == 0:
            return 0.0
        
        return -np.log(b / a)
