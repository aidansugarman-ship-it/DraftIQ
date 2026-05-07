import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { typography } from '@constants/typography';
import { colors } from '@constants/colors';

type TypographyVariant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: color ?? colors.textPrimary },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}
