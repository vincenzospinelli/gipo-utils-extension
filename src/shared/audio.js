export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const unitToPercent = (unitValue, fallbackPercent = 10) =>
  Math.round(
    clamp(
      Number.isFinite(unitValue) ? unitValue : (fallbackPercent || 0) / 100,
      0,
      1
    ) * 100
  );

export const percentToUnit = (percentValue) =>
  clamp((parseInt(percentValue, 10) || 0) / 100, 0, 1);

export const ensureUnitVolume = (value, fallback = 0.1) =>
  clamp(typeof value === "number" ? value : fallback, 0, 1);

export const applyVolume = (mediaElement, muted, volumeUnit) => {
  if (!mediaElement) return;
  mediaElement.volume = muted ? 0 : ensureUnitVolume(volumeUnit);
};
