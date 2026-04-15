import React, { CSSProperties, forwardRef } from 'react'
import { LiquidGlassSurface } from './LiquidGlassSurface'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export interface LiquidGlassButtonProps {
  id?: string
  children: React.ReactNode
  className?: string
  style?: CSSProperties
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  onDoubleClick?: React.MouseEventHandler<HTMLButtonElement>
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>
  onFocus?: React.FocusEventHandler<HTMLButtonElement>
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>
  onPointerUp?: React.PointerEventHandler<HTMLButtonElement>
  onPointerCancel?: React.PointerEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Accent color override for subtle tint */
  color?: string
  /** Border radius override (defaults to 10) */
  borderRadius?: number
  /** Size preset */
  size?: 'sm' | 'md' | 'lg'
  /** If true, renders as a pill shape */
  pill?: boolean
  /** HTML title attribute */
  title?: string
  /** aria-label for accessibility */
  ariaLabel?: string
}

/**
 * iOS-style liquid glass button.
 *
 * Uses the full SVG displacement filter via LiquidGlassSurface variant="element"
 * for the edge refraction effect. Sizes match the original Segmented / sidebar buttons.
 */
export const LiquidGlassButton = forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  function LiquidGlassButton(
    {
      id,
      children,
      className = '',
      style,
      onClick,
      onDoubleClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      disabled = false,
      color,
      borderRadius,
      size = 'md',
      pill = false,
      title,
      ariaLabel,
    },
    ref
  ) {
    const t = useTheme()
    const isDark = t.mode === 'dark'
    const isLiquidGlass = ((t.glassmorphism as any)?.panelRenderer ?? 'blur') === 'liquid-glass'
    const liquidPreset = ((t.glassmorphism as any).liquidPreset ?? 'performance') as 'fidelity' | 'performance' | 'no-shader'
    const accentRgb = hexToRgb(color || t.accent)

    const effectiveRadius = pill ? 999 : (borderRadius ?? 10)
    const minHeight = size === 'sm' ? 28 : size === 'lg' ? 38 : 32
    const liquidPresetDefaults = liquidPreset === 'fidelity'
      ? { distortionScale: -180, displace: 0.5, saturation: 2.1 }
      : liquidPreset === 'no-shader'
        ? { distortionScale: -192, displace: 0.46, saturation: 2.2 }
        : { distortionScale: -132, displace: 0.34, saturation: 1.6 }
    const liquidDistortionScaleOverride = Number((t.glassmorphism as any).liquidDistortionScale)
    const liquidDisplaceOverride = Number((t.glassmorphism as any).liquidDisplace)
    const liquidSaturationOverride = Number((t.glassmorphism as any).liquidSaturation)
    const liquidDistortionScale = Number.isFinite(liquidDistortionScaleOverride)
      ? clampNumber(liquidDistortionScaleOverride, -320, 320)
      : liquidPresetDefaults.distortionScale
    const liquidDisplace = Number.isFinite(liquidDisplaceOverride)
      ? clampNumber(liquidDisplaceOverride, 0, 3)
      : liquidPresetDefaults.displace
    const liquidSaturation = Number.isFinite(liquidSaturationOverride)
      ? clampNumber(liquidSaturationOverride, 0.8, 2.8)
      : liquidPresetDefaults.saturation
    const useLiquidShader = isLiquidGlass && liquidPreset !== 'no-shader'

    // LiquidGlassButton is now an un-opinionated wrapper. It accepts padding, flex, font size
    const buttonStyle: CSSProperties = {
      position: 'relative',
      zIndex: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      lineHeight: 1.15,
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
      minHeight,
      flexShrink: 0,
      borderRadius: effectiveRadius,
      border: '1px solid transparent',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)',
      background: isLiquidGlass
        ? 'transparent'
        : isDark
          ? `rgba(${accentRgb}, 0.12)`
          : `rgba(${accentRgb}, 0.08)`,
      overflow: 'hidden',
      WebkitFontSmoothing: 'antialiased' as any,
      ...style,
    }

    return (
      <button
        ref={ref}
        id={id}
        className={`nx-liquid-glass-btn ${className}`}
        style={buttonStyle}
        onClick={disabled ? undefined : onClick}
        onDoubleClick={disabled ? undefined : onDoubleClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        aria-disabled={disabled}
      >
        {/* Full SVG liquid glass effect for buttons */}
        {isLiquidGlass && (
          <LiquidGlassSurface
            variant="element"
            interactive
            borderRadius={effectiveRadius}
            dark={isDark}
            lowPower={!useLiquidShader}
            backgroundOpacity={isDark ? 0.04 : 0.08}
            brightness={isDark ? 52 : 72}
            opacity={isDark ? 0.92 : 0.88}
            blur={liquidPreset === 'fidelity' ? 11 : liquidPreset === 'performance' ? 9 : 10}
            saturation={liquidSaturation}
            distortionScale={liquidDistortionScale}
            borderWidth={0.1}
            displace={liquidDisplace}
            accentColor={color || t.accent}
            style={{ zIndex: -1, pointerEvents: 'none' }}
          />
        )}

        {/* Non-liquid-glass fallback: subtle glass border */}
        {!isLiquidGlass && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              border: isDark
                ? '1px solid rgba(255,255,255,0.14)'
                : '1px solid rgba(0,0,0,0.08)',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
        )}

        {/* Content (No wrapper so flex layouts work natively) */}
        {children}
      </button>
    )
  }
)

LiquidGlassButton.displayName = 'LiquidGlassButton'
export default LiquidGlassButton
