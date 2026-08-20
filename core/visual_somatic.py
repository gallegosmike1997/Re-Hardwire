"""
visual_somatic.py - Somatic Experience Visual Embedding Pipeline (Offline, Pure PyTorch)

This module provides:
- PIL → Tensor conversion
- Resize, normalize, crop
- Flattened visual embedding for somatic-experience visuals
- Pure PyTorch implementation (no torchvision)
"""

from __future__ import annotations
from typing import Tuple

import numpy as np
import torch
from PIL import Image


# ---------------------------
# Core tensor transforms
# ---------------------------
def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    """
    Convert a PIL image to a float32 tensor in CHW format, normalized to [0, 1].
    """
    arr = np.array(img).astype("float32") / 255.0
    if arr.ndim == 2:  # grayscale
        arr = np.expand_dims(arr, -1)
    return torch.from_numpy(arr).permute(2, 0, 1)


def resize_tensor(tensor: torch.Tensor, size: Tuple[int, int]) -> torch.Tensor:
    """
    Resize a CHW tensor to (H, W) using bilinear interpolation.
    """
    return torch.nn.functional.interpolate(
        tensor.unsqueeze(0),
        size=size,
        mode="bilinear",
        align_corners=False,
    ).squeeze(0)


def normalize_tensor(
    tensor: torch.Tensor,
    mean = (0.485, 0.456, 0.406),
    std = (0.229, 0.224, 0.225),
) -> torch.Tensor:
    """
    Normalize tensor channels using given mean and std (ImageNet-style by default).
    """
    mean_t = torch.tensor(mean, dtype=tensor.dtype)[:, None, None]
    std_t = torch.tensor(std, dtype=tensor.dtype)[:, None, None]
    return (tensor - mean_t) / std_t


def crop_tensor(
    tensor: torch.Tensor,
    top: int,
    left: int,
    height: int,
    width: int,
) -> torch.Tensor:
    """
    Crop a CHW tensor to the given region.
    """
    return tensor[:, top:top + height, left:left + width]


# ---------------------------
# Somatic visual embedding
# ---------------------------
def somatic_visual_embedding(img: Image.Image) -> torch.Tensor:
    """
    Convert a somatic-experience visual into a compact embedding vector.

    Pipeline:
    - PIL → tensor
    - resize to 128x128
    - normalize (ImageNet-style)
    - center crop to 96x96
    - flatten to 1D embedding
    """
    t = pil_to_tensor(img)
    t = resize_tensor(t, (128, 128))
    t = normalize_tensor(t)

    h, w = t.shape[1], t.shape[2]
    crop_h, crop_w = 96, 96
    top = (h - crop_h) // 2
    left = (w - crop_w) // 2
    t = crop_tensor(t, top, left, crop_h, crop_w)

    return t.flatten().float()


# ---------------------------
# Convenience helper
# ---------------------------
def somatic_visual_embedding_from_path(path: str) -> torch.Tensor:
    """
    Load an image from disk and compute its somatic visual embedding.
    """
    img = Image.open(path).convert("RGB")
    return somatic_visual_embedding(img)


if __name__ == "__main__":
    print("visual_somatic.py loaded successfully.")
