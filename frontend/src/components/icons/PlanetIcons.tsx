interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const S = ({ size = 24, color = "currentColor", ...props }: IconProps & React.SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props} />
);

export const Sun = (p: IconProps) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></S>;
export const Moon = (p: IconProps) => <S {...p}><path d="M12 3a9 9 0 1 0 9 9c0-5-4-9-9-9z" /></S>;
export const Mars = (p: IconProps) => <S {...p}><circle cx="10" cy="14" r="5" /><path d="M14 10l4-4M14 6h4v4" /></S>;
export const Mercury = (p: IconProps) => <S {...p}><circle cx="12" cy="10" r="4" /><path d="M12 14v8" /><path d="M9 18h6" /></S>;
export const Jupiter = (p: IconProps) => <S {...p}><path d="M8 6h8M12 6v12M8 12c0 3 2 4 4 4" /></S>;
export const Venus = (p: IconProps) => <S {...p}><circle cx="12" cy="10" r="4" /><path d="M12 14v8" /><path d="M9 18h6" /></S>;
export const Saturn = (p: IconProps) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M4 12h16" /><path d="M8 8l-4-4M16 8l4-4" /></S>;
export const Rahu = (p: IconProps) => <S {...p}><circle cx="12" cy="12" r="5" /><path d="M12 7v10" /><path d="M7 12h10" /></S>;
export const Ketu = (p: IconProps) => <S {...p}><circle cx="12" cy="12" r="5" /><path d="M12 7v5" /><path d="M9 14l3 3 3-3" /></S>;

export const planetIcons: Record<string, React.ComponentType<IconProps>> = {
  Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu,
};

export const planetColors: Record<string, string> = {
  Sun: "#D6B875",
  Moon: "#A6A5B8",
  Mars: "#E85D5D",
  Mercury: "#5DC88F",
  Jupiter: "#B5A4F4",
  Venus: "#E8A0BF",
  Saturn: "#6B5CE7",
  Rahu: "#7A7A8E",
  Ketu: "#8A7A6A",
};
