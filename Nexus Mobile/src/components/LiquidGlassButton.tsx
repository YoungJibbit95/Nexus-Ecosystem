import React, { CSSProperties, forwardRef } from 'react'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'

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
  color?: string
  borderRadius?: number
  size?: 'sm' | 'md' | 'lg'
  pill?: boolean
  title?: string
  ariaLabel?: string
}

/**
 * Legacy compatibility wrapper.
 * Liquid glass rendering has been removed for performance reasons.
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
    ref,
  ) {
    const t = useTheme()
    const isDark = t.mode === 'dark'
    const accentRgb = hexToRgb(color || t.accent)
    const effectiveRadius = pill ? 999 : borderRadius ?? 10
    const minHeight = size === 'sm' ? 28 : size === 'lg' ? 38 : 32

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
      border: isDark
        ? `1px solid rgba(${accentRgb}, 0.24)`
        : `1px solid rgba(${accentRgb}, 0.2)`,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      color: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)',
      background: isDark
        ? `linear-gradient(160deg, rgba(${accentRgb}, 0.14), rgba(${accentRgb}, 0.05))`
        : `linear-gradient(160deg, rgba(${accentRgb}, 0.1), rgba(${accentRgb}, 0.04))`,
      boxShadow: isDark
        ? `0 8px 16px rgba(${accentRgb}, 0.12)`
        : `0 6px 12px rgba(${accentRgb}, 0.1)`,
      overflow: 'hidden',
      WebkitFontSmoothing: 'antialiased' as any,
      transition:
        'background-color 170ms ease, border-color 170ms ease, color 170ms ease, opacity 170ms ease, transform 170ms ease',
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
        {children}
      </button>
    )
  },
)

LiquidGlassButton.displayName = 'LiquidGlassButton'
export default LiquidGlassButton
