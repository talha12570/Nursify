import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions for scaling (iPhone 12 Pro as reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Width percentage - converts width percentage to pixels
 * @param {number} widthPercent - Percentage of screen width (0-100)
 * @returns {number} - Pixel value
 */
export const wp = (widthPercent) => {
  const elemWidth = typeof widthPercent === "number" ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * elemWidth) / 100);
};

/**
 * Height percentage - converts height percentage to pixels
 * @param {number} heightPercent - Percentage of screen height (0-100)
 * @returns {number} - Pixel value
 */
export const hp = (heightPercent) => {
  const elemHeight = typeof heightPercent === "number" ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * elemHeight) / 100);
};

/**
 * Font size scaling based on screen width
 * @param {number} size - Base font size
 * @returns {number} - Scaled font size
 */
export const fp = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive spacing values
 */
export const spacing = {
  xs: wp(1),        // 4px on standard device
  sm: wp(2),        // 8px
  base: wp(3),      // 12px - commonly used for base spacing
  md: wp(4),        // 16px
  lg: wp(6),        // 24px
  xl: wp(8),        // 32px
  '2xl': wp(10),    // 40px
  xxl: wp(10),      // alias for 2xl
  '3xl': wp(12),    // 48px
  inputPadding: wp(3.5), // Input field padding
};

/**
 * Responsive component sizes
 */
export const componentSizes = {
  buttonHeight: hp(6),
  inputHeight: hp(6),
  iconSize: wp(6),
  avatarSize: wp(20),
  cardRadius: wp(3),
  headerHeight: hp(8),
  touchTarget: {
    min: wp(11), // Minimum touch target size (44px on standard devices)
    recommended: wp(12),
  },
  card: {
    borderRadius: wp(4),
    padding: spacing.md,
    margin: spacing.sm,
  },
  button: {
    borderRadius: wp(3),
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
};

/**
 * Shadow styles for both iOS and Android
 */
export const shadows = {
  small: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
  }),
  large: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
};

/**
 * Check if device is small (width < 375)
 * @returns {boolean}
 */
export const isSmallDevice = () => SCREEN_WIDTH < 375;

/**
 * Check if device is tablet
 * @returns {boolean}
 */
export const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio < 1.6;
};

/**
 * Device dimensions
 */
export const device = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

export default {
  wp,
  hp,
  fp,
  spacing,
  componentSizes,
  shadows,
  isSmallDevice,
  isTablet,
  device,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
